// Signed US landed-cost estimate for AI commerce agents. Given a counterparty-
// supplied HTS code, country of origin, and customs value, it estimates the
// import duty (base column rate + the Chapter 99 add-on layers TF can link from
// the HTS footnotes) plus CBP fees (MPF, HMF) and the total landed cost.
//
// Load-bearing posture (liability): this is a PLANNING ESTIMATE, never a customs
// filing or legal/customs advice. HTS classification is the importer's legal
// judgment, so TF takes the code as an INPUT and never auto-classifies. The 2026
// add-on tariff layers change weekly via Federal Register notices and some are
// under active litigation (a figure correct today can be refunded later), so each
// layer carries a status flag, a citation, and a data_as_of date. When the HTS
// source is unavailable the verdict is a no-charge "unavailable" rather than a
// guess. The CH99_LAYERS config below is the dated, maintained part.
import type { Env } from './types';
import { safePut } from './kill-switch';
import {
  fetchHtsRecord,
  fetchChapter99Record,
  extractChapter99Codes,
  type HtsRecord,
} from './hts-source';
import { parseRateString, computeDutyUsd } from './tariff-rates';

// === Configs (the maintained, dated surface) ===

export const CH99_DATA_AS_OF = '2026-06-28';

// Non-NTR origins screened to Column 2 per HTSUS General Note 3(b).
const COLUMN2_COUNTRIES = new Set(['CU', 'KP']);

const OCEAN_MODES = new Set(['ocean', 'sea', 'vessel', 'maritime']);

// FY2026 CBP user fees (Federal Register CBP Dec. 25-10).
const FEES = { mpf_pct: 0.3464, mpf_min: 33.58, mpf_max: 651.5, hmf_pct: 0.125 };

interface Ch99Layer {
  section: string;
  name: string;
  match: RegExp;
  appliesTo: (originUpper: string) => boolean;
  status: 'active' | 'under_appeal';
  ambient: boolean; // applies regardless of HTS footnote linkage
  defaultRatePct: number | null;
  citation: string;
  note: string;
}

const CH99_LAYERS: Ch99Layer[] = [
  {
    section: '301',
    name: 'Section 301 (China)',
    match: /^9903\.88\./,
    appliesTo: (o) => o === 'CN',
    status: 'active',
    ambient: false,
    defaultRatePct: null,
    citation: 'https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions',
    note: 'Section 301 China duty. It survived the 2026 litigation; USTR opened a second four-year review in May 2026, so rates can move.',
  },
  {
    section: '122',
    name: 'Section 122 (global surcharge)',
    match: /^9903\.03\.01/,
    appliesTo: () => true,
    status: 'under_appeal',
    ambient: true,
    defaultRatePct: 10,
    citation: 'https://content.govdelivery.com/accounts/USDHSCBP/bulletins/40b3b7b',
    note: 'Section 122 global 10% surcharge, effective Feb 24 2026, sunset Jul 24 2026. Ruled unlawful by the Court of International Trade on May 7 2026 but collected under an appellate stay, so it may be refunded. Known exemptions include FTA-origin goods, civil aircraft, certain agricultural goods, and in-transit shipments. Verify applicability.',
  },
  {
    section: '232',
    name: 'Section 232 (steel, aluminum, copper)',
    match: /^9903\.(80|81|82|85)\./,
    appliesTo: () => true,
    status: 'active',
    ambient: false,
    defaultRatePct: null,
    citation: 'https://www.cbp.gov/trade/programs-administration/entry-summary/232-tariffs-aluminum-and-steel-faqs',
    note: 'Section 232 metals duty, assessed on the full customs value of covered articles as of the April 2026 proclamation.',
  },
];

const SECTION_ORDER: Record<string, number> = { '301': 0, '122': 1, '232': 2, '201': 3 };

// === Types ===

export type LandedCostStatus = 'estimated' | 'partial' | 'unavailable';

export interface AppliedDutyLayer {
  section: string;
  name: string;
  chapter99_code: string | null;
  rate_pct: number | null;
  duty_usd: number | null;
  status: 'active' | 'under_appeal';
  citation: string;
  note: string;
}

export interface LandedCostInputs {
  hts: string;
  origin: string;
  valueUsd: number;
  mode?: string;
  fta?: string;
  quantity?: number;
  unit?: string;
}

export interface LandedCostResult {
  ok: true;
  status: LandedCostStatus;
  capturedAt: string | null;
  data_as_of: string;
  hts: string;
  hts_description: string | null;
  origin: string;
  customs_value_usd: number;
  column_used: 'general' | 'special' | 'column2' | null;
  base_rate: { column: string; rate_text: string; parsed_kind: string; duty_usd: number | null } | null;
  additional_duties: AppliedDutyLayer[];
  fees: { mpf_usd: number; hmf_usd: number; hmf_applies: boolean; basis: string };
  total_duty_usd: number | null;
  total_landed_cost_usd: number | null;
  claim: string;
  disclaimer: string;
  notes: string[];
  attribution: { source: string; license: string };
}

export interface LandedCostPreview {
  ok: true;
  preview: true;
  status: LandedCostStatus;
  hts: string;
  origin: string;
  customs_value_usd: number;
  column_used: 'general' | 'special' | 'column2' | null;
  total_duty_usd: number | null;
  total_landed_cost_usd: number | null;
  additional_duty_count: number;
  claim: string;
  captured_at: string | null;
}

const DISCLAIMER =
  'This is a planning estimate, not a customs filing or binding ruling, and not legal or customs advice. HTS classification is the importer\'s responsibility; TF takes the code as an input and does not classify goods. Additional tariff layers change frequently via Federal Register notices and some are under active litigation, so a figure correct today can change or be refunded later. Verify against a licensed customs broker before entry.';

const ATTRIBUTION = {
  source:
    'USITC Harmonized Tariff Schedule (hts.usitc.gov), US Customs and Border Protection fee schedule, and USTR and CBP Chapter 99 tariff actions. All US Government works in the public domain.',
  license:
    'Public domain (US Government work). Estimate computed by TensorFeed; receipts Ed25519-signed per the AFTA spec.',
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function stripParenthetical(s: string): string {
  return s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

function specialSPIs(special: string): string[] {
  const m = /\(([^)]*)\)/.exec(special);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((p) => p.trim().toUpperCase())
    .filter((p) => p.length > 0);
}

function unavailableResult(inputs: LandedCostInputs, capturedAt: string | null): LandedCostResult {
  return {
    ok: true,
    status: 'unavailable',
    capturedAt,
    data_as_of: CH99_DATA_AS_OF,
    hts: inputs.hts,
    hts_description: null,
    origin: inputs.origin.toUpperCase(),
    customs_value_usd: inputs.valueUsd,
    column_used: null,
    base_rate: null,
    additional_duties: [],
    fees: { mpf_usd: 0, hmf_usd: 0, hmf_applies: false, basis: 'customs value' },
    total_duty_usd: null,
    total_landed_cost_usd: null,
    claim: `The USITC HTS source was unavailable or HTS ${inputs.hts} was not found, so TF could not estimate a landed cost. No charge was made. This is a planning tool, not a customs filing and not legal or customs advice.`,
    disclaimer: DISCLAIMER,
    notes: ['No charge was made for this call.'],
    attribution: ATTRIBUTION,
  };
}

export function buildLandedCostVerdict(
  inputs: LandedCostInputs,
  htsRecord: HtsRecord | null,
  ch99Rates: Record<string, string>,
  capturedAt: string | null,
): LandedCostResult {
  if (!htsRecord) return unavailableResult(inputs, capturedAt);

  const originUpper = inputs.origin.toUpperCase();
  const notes: string[] = [];

  // 1. Column selection by origin.
  let column: 'general' | 'special' | 'column2';
  let rateText: string;
  if (COLUMN2_COUNTRIES.has(originUpper)) {
    column = 'column2';
    rateText = htsRecord.other;
  } else if (inputs.fta && specialSPIs(htsRecord.special).includes(inputs.fta.toUpperCase())) {
    column = 'special';
    rateText = stripParenthetical(htsRecord.special);
    notes.push(
      `The Special (FTA) rate is shown as claimed under program ${inputs.fta.toUpperCase()}; it assumes the goods qualify under the relevant rules of origin, which TF does not verify.`,
    );
  } else {
    column = 'general';
    rateText = htsRecord.general;
  }

  const parsedBase = parseRateString(rateText);
  const baseDuty = computeDutyUsd(parsedBase, {
    valueUsd: inputs.valueUsd,
    quantity: inputs.quantity,
    unit: inputs.unit,
  });
  const baseRate = {
    column,
    rate_text: rateText,
    parsed_kind: parsedBase.kind,
    duty_usd: baseDuty != null ? round2(baseDuty) : null,
  };

  // 2. Chapter 99 add-on layers.
  const applied: AppliedDutyLayer[] = [];
  const usedSections = new Set<string>();
  const pushLayer = (layer: Ch99Layer, code: string | null, ratePct: number | null) => {
    const duty = ratePct != null ? round2((inputs.valueUsd * ratePct) / 100) : null;
    applied.push({
      section: layer.section,
      name: layer.name,
      chapter99_code: code,
      rate_pct: ratePct,
      duty_usd: duty,
      status: layer.status,
      citation: layer.citation,
      note: layer.note,
    });
    usedSections.add(layer.section);
  };

  for (const code of extractChapter99Codes(htsRecord.footnotes)) {
    const layer = CH99_LAYERS.find((l) => l.match.test(code) && l.appliesTo(originUpper));
    if (!layer) continue;
    const text = ch99Rates[code];
    const parsed = text ? parseRateString(text) : null;
    const ratePct = parsed?.addon_pct ?? parsed?.advalorem_pct ?? layer.defaultRatePct;
    pushLayer(layer, code, ratePct);
  }
  for (const layer of CH99_LAYERS) {
    if (!layer.ambient || usedSections.has(layer.section) || !layer.appliesTo(originUpper)) continue;
    pushLayer(layer, null, layer.defaultRatePct);
  }
  applied.sort((a, b) => (SECTION_ORDER[a.section] ?? 99) - (SECTION_ORDER[b.section] ?? 99));

  // 3. CBP fees.
  const mpf = round2(Math.min(Math.max((inputs.valueUsd * FEES.mpf_pct) / 100, FEES.mpf_min), FEES.mpf_max));
  const hmfApplies = OCEAN_MODES.has((inputs.mode ?? '').toLowerCase());
  const hmf = hmfApplies ? round2((inputs.valueUsd * FEES.hmf_pct) / 100) : 0;

  // 4. Totals.
  const addonTotal = applied.reduce((sum, l) => sum + (l.duty_usd ?? 0), 0);
  const totalDuty = baseDuty != null ? round2(baseDuty + addonTotal) : null;
  const totalLanded = totalDuty != null ? round2(inputs.valueUsd + totalDuty + mpf + hmf) : null;

  // 5. Status + framing notes.
  const anyUnresolved = baseDuty == null || applied.some((l) => l.duty_usd == null);
  const status: LandedCostStatus = anyUnresolved ? 'partial' : 'estimated';

  notes.unshift(
    `Duty is estimated from the HTS ${column} column selected by origin, plus the Chapter 99 add-on layers TF can link from the HTS footnotes, plus CBP MPF${hmfApplies ? ' and HMF' : ''} fees.`,
  );
  if (applied.some((l) => l.status === 'under_appeal')) {
    notes.push('One or more applied tariff layers is under active litigation (status under_appeal) and may be refunded if struck down; treat the total as provisional.');
  }
  if (baseDuty == null) {
    notes.push(`The base duty rate "${rateText}" could not be parsed automatically; compute it manually from the cited HTS line before relying on the total.`);
  }
  if (applied.some((l) => l.duty_usd == null)) {
    notes.push('Some add-on rates could not be resolved to a number (shown as null); compute those manually from the cited Chapter 99 codes.');
  }

  const claim =
    status === 'estimated'
      ? `Estimated US landed cost for ${inputs.valueUsd} USD of HTS ${inputs.hts} from ${originUpper} is about ${totalLanded} USD: ${totalDuty} in duty plus ${round2(mpf + hmf)} in CBP fees, as of ${CH99_DATA_AS_OF}. This is a planning estimate, not a customs filing and not legal or customs advice.`
      : `Partial landed-cost estimate for ${inputs.valueUsd} USD of HTS ${inputs.hts} from ${originUpper}: some rates could not be resolved automatically, so the total may be incomplete. See the notes and cited sources. This is a planning estimate, not a customs filing and not legal or customs advice.`;

  return {
    ok: true,
    status,
    capturedAt,
    data_as_of: CH99_DATA_AS_OF,
    hts: inputs.hts,
    hts_description: htsRecord.description || null,
    origin: originUpper,
    customs_value_usd: inputs.valueUsd,
    column_used: column,
    base_rate: baseRate,
    additional_duties: applied,
    fees: { mpf_usd: mpf, hmf_usd: hmf, hmf_applies: hmfApplies, basis: 'customs value' },
    total_duty_usd: totalDuty,
    total_landed_cost_usd: totalLanded,
    claim,
    disclaimer: DISCLAIMER,
    notes,
    attribution: ATTRIBUTION,
  };
}

export function redactLandedCostVerdictForPreview(full: LandedCostResult): LandedCostPreview {
  return {
    ok: true,
    preview: true,
    status: full.status,
    hts: full.hts,
    origin: full.origin,
    customs_value_usd: full.customs_value_usd,
    column_used: full.column_used,
    total_duty_usd: full.total_duty_usd,
    total_landed_cost_usd: full.total_landed_cost_usd,
    additional_duty_count: full.additional_duties.length,
    claim: full.claim,
    captured_at: full.capturedAt,
  };
}

// === Compute layer (live I/O) ===

export interface RawLandedCostQuery {
  hts?: string | null;
  origin?: string | null;
  value_usd?: string | null;
  mode?: string | null;
  fta?: string | null;
  quantity?: string | null;
  unit?: string | null;
}

export function normalizeLandedCostInputs(q: RawLandedCostQuery): LandedCostInputs | null {
  const htsRaw = (q.hts ?? '').trim();
  const htsDigits = htsRaw.replace(/\D/g, '');
  // HTS lines are 8 (subheading) to 10 (statistical) digits.
  if (htsDigits.length < 8 || htsDigits.length > 10) return null;
  const origin = (q.origin ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(origin)) return null;
  const valueUsd = parseFloat(q.value_usd ?? '');
  if (!Number.isFinite(valueUsd) || valueUsd <= 0 || valueUsd > 1e12) return null;
  const q4 = q.quantity != null && q.quantity !== '' ? parseFloat(q.quantity) : NaN;
  return {
    hts: htsRaw,
    origin,
    valueUsd,
    mode: q.mode?.trim().toLowerCase() || undefined,
    fta: q.fta?.trim().toUpperCase() || undefined,
    quantity: Number.isFinite(q4) && q4 > 0 ? q4 : undefined,
    unit: q.unit?.trim().toLowerCase() || undefined,
  };
}

export async function computeLandedCostVerdict(
  env: Env,
  inputs: LandedCostInputs,
): Promise<LandedCostResult> {
  const record = await fetchHtsRecord(env, inputs.hts);
  const capturedAt = new Date().toISOString();
  if (!record) return buildLandedCostVerdict(inputs, null, {}, capturedAt);

  // Fetch only the footnote-linked Chapter 99 rates that map to a known layer.
  const codes = extractChapter99Codes(record.footnotes);
  const ch99Rates: Record<string, string> = {};
  await Promise.all(
    codes.map(async (code) => {
      const rec = await fetchChapter99Record(env, code);
      if (rec) ch99Rates[code] = rec.rate_text;
    }),
  );
  return buildLandedCostVerdict(inputs, record, ch99Rates, capturedAt);
}

// Free-preview rate limit. Mirrors the other commerce verdict preview limits:
// TENSORFEED_CACHE, a JSON { count } value, safePut with a 48h TTL.
export async function checkLandedCostPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:landed-cost-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), {
    expirationTtl: 60 * 60 * 48,
  });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
