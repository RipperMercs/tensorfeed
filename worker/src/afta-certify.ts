/**
 * AFTA Certification self-check.
 *
 * Publishers that want to be listed on TensorFeed's AFTA-Certified
 * Publishers directory hit /api/afta-certify/check?domain=X and get a
 * structured scorecard of which AFTA tenets their public surfaces
 * already satisfy. The check is read-only and idempotent: it fetches
 * a handful of well-known URLs from the target domain and validates
 * the JSON shape against the canonical Coinbase x402 V2 + AFTA
 * standards.
 *
 * It does NOT grant certification. Certification is manual: a publisher
 * passes this check, emails contact@tensorfeed.ai with their domain
 * and payTo wallet, pays the $100 USDC annual listing fee, and we add
 * them to the X402_ADOPTERS catalog with afta_certified: true.
 *
 * Why automated checks:
 *   - Publishers self-discover what's missing before reaching out
 *   - Removes back-and-forth on "what does AFTA mean?"
 *   - Each check produces a deterministic score we can cite when
 *     onboarding (e.g. "your /.well-known/x402 is correct but you're
 *     missing a published receipt key")
 *
 * Failure modes are intentionally informative, not gatekeeping. A 5/6
 * score is still useful; we tell the publisher exactly what to fix.
 */

export interface AftaCheck {
  /** Stable identifier for the check, used in tooling output. */
  id: string;
  /** Short human label. */
  name: string;
  /** Did this check pass? */
  passed: boolean;
  /** Human-readable explanation of pass or fail. */
  details: string;
  /** Optional URL the publisher should look at to fix this. */
  fixUrl?: string;
}

export interface AftaCertifyResult {
  ok: boolean;
  domain: string;
  checked_at: string;
  checks: AftaCheck[];
  score: number;
  max: number;
  verdict: 'certified-eligible' | 'almost-eligible' | 'not-yet-eligible';
  afta_certified: boolean;
  next_step: string;
  applied_to_directory: boolean;
}

const FETCH_TIMEOUT_MS = 8000;

async function tryFetchJson(url: string): Promise<{ ok: boolean; data?: unknown; status?: number; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'tensorfeed-afta-certifier/1.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) {
      return { ok: false, status: res.status, error: `non-JSON content-type: ${ct}` };
    }
    const data = await res.json();
    return { ok: true, data, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  // Strip protocol and trailing slash if user pasted a URL
  const stripped = trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  // Basic shape check: at least one dot, only allowed chars
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(stripped)) return null;
  return stripped;
}

export async function certifyDomain(domain: string): Promise<AftaCertifyResult> {
  const normalized = normalizeDomain(domain);
  if (!normalized) {
    return {
      ok: false,
      domain,
      checked_at: new Date().toISOString(),
      checks: [],
      score: 0,
      max: 0,
      verdict: 'not-yet-eligible',
      afta_certified: false,
      next_step: 'Provide a valid hostname (e.g. example.com or api.example.com).',
      applied_to_directory: false,
    };
  }

  const base = `https://${normalized}`;
  const x402Url = `${base}/.well-known/x402.json`;
  const aftaUrl = `${base}/.well-known/agent-fair-trade.json`;
  // Common receipt-key locations. Publishers may put keys at any of these.
  const receiptKeyCandidates = [
    `${base}/.well-known/tensorfeed-receipt-key.json`,
    `${base}/.well-known/afta-receipt-key.json`,
    `${base}/.well-known/agent-fair-trade-key.json`,
  ];

  const checks: AftaCheck[] = [];

  // Check 1: /.well-known/x402.json exists and parses
  const x402 = await tryFetchJson(x402Url);
  checks.push({
    id: 'wellknown_x402',
    name: 'Publishes /.well-known/x402.json',
    passed: x402.ok,
    details: x402.ok ? `Fetched and parsed ${x402Url}.` : `Could not fetch ${x402Url}: ${x402.error}.`,
    fixUrl: 'https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md',
  });

  // Check 2: x402Version is 2 (canonical Coinbase x402 V2)
  const x402Data = (x402.data ?? {}) as Record<string, unknown>;
  const isV2 = x402.ok && x402Data.x402Version === 2;
  checks.push({
    id: 'x402_version_2',
    name: 'x402Version is 2 (canonical Coinbase x402 V2)',
    passed: isV2,
    details: isV2
      ? 'Manifest declares x402Version: 2.'
      : `Manifest is missing x402Version: 2 (found: ${JSON.stringify(x402Data.x402Version)}).`,
    fixUrl: 'https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md',
  });

  // Check 3: at least one paid item declared with valid accepts shape
  const items = Array.isArray((x402Data as { items?: unknown }).items)
    ? ((x402Data as { items: unknown[] }).items as Record<string, unknown>[])
    : [];
  const itemsWithAccepts = items.filter(it => Array.isArray(it.accepts) && (it.accepts as unknown[]).length > 0);
  checks.push({
    id: 'has_paid_items',
    name: 'Has at least one paid item with an accepts[] block',
    passed: itemsWithAccepts.length > 0,
    details:
      itemsWithAccepts.length > 0
        ? `Found ${itemsWithAccepts.length} paid item(s) with accepts entries.`
        : 'No items with a non-empty accepts[] array. Each paid endpoint must declare its scheme/network/amount/asset/payTo.',
  });

  // Check 4: every accepts entry has the per-network domain hint (extra.name + extra.version)
  let allHaveExtra = itemsWithAccepts.length > 0;
  let badItem: string | null = null;
  for (const it of itemsWithAccepts) {
    const accepts = (it.accepts as unknown[]) as Record<string, unknown>[];
    for (const a of accepts) {
      const extra = a.extra as Record<string, unknown> | undefined;
      if (!extra || typeof extra.name !== 'string' || typeof extra.version !== 'string') {
        allHaveExtra = false;
        badItem = String(it.resource ?? it.id ?? 'unknown');
        break;
      }
    }
    if (!allHaveExtra) break;
  }
  checks.push({
    id: 'extra_domain_hint',
    name: 'All accepts entries declare extra.name + extra.version (EIP-712 domain hint)',
    passed: allHaveExtra,
    details: allHaveExtra
      ? 'Every accepts entry includes extra.name and extra.version.'
      : `Item ${badItem ?? '(?)'} is missing extra.name or extra.version. Reminder: Base mainnet uses name="USD Coin"; Base Sepolia uses name="USDC".`,
    fixUrl: 'https://tensorfeed.ai/x402#manifest',
  });

  // Check 5: /.well-known/agent-fair-trade.json exists and declares the AFTA tenets
  const afta = await tryFetchJson(aftaUrl);
  const aftaData = (afta.data ?? {}) as Record<string, unknown>;
  const guarantees = Array.isArray(aftaData.no_charge_guarantees) ? aftaData.no_charge_guarantees : null;
  // Canonical AFTA field is `receipts` (see TensorFeed's reference manifest);
  // `signed_receipts` is accepted as an alias for adopters that named it
  // differently. Either nested object satisfies the check.
  const receiptsField = (aftaData.receipts ?? aftaData.signed_receipts) as
    | Record<string, unknown>
    | undefined;
  const hasReceiptDecl =
    receiptsField != null &&
    typeof receiptsField === 'object' &&
    (receiptsField.signed === true ||
      typeof receiptsField.algorithm === 'string' ||
      typeof receiptsField.public_key_url === 'string');
  const aftaPassed = afta.ok && guarantees != null && guarantees.length > 0 && hasReceiptDecl;
  checks.push({
    id: 'wellknown_afta',
    name: 'Publishes /.well-known/agent-fair-trade.json with no-charge guarantees and signed-receipt declaration',
    passed: aftaPassed,
    details: !afta.ok
      ? `Could not fetch ${aftaUrl}: ${afta.error}.`
      : !guarantees
        ? 'AFTA manifest is present but missing no_charge_guarantees array.'
        : !hasReceiptDecl
          ? 'AFTA manifest is missing the receipts declaration (object with signed/algorithm/public_key_url).'
          : `AFTA manifest declares ${guarantees.length} no-charge guarantee(s) and a signed-receipts policy.`,
    fixUrl: 'https://tensorfeed.ai/agent-fair-trade',
  });

  // Check 6: published receipt public key (Ed25519 or similar) at one of the
  // common .well-known locations
  let receiptKeyOk = false;
  let receiptKeyUrl: string | null = null;
  for (const u of receiptKeyCandidates) {
    const r = await tryFetchJson(u);
    if (r.ok && r.data && typeof r.data === 'object') {
      const d = r.data as Record<string, unknown>;
      if (typeof d.kty === 'string' || typeof d.publicKey === 'string' || typeof d.x === 'string') {
        receiptKeyOk = true;
        receiptKeyUrl = u;
        break;
      }
    }
  }
  checks.push({
    id: 'receipt_key_published',
    name: 'Publishes a receipt-signing public key at /.well-known/',
    passed: receiptKeyOk,
    details: receiptKeyOk
      ? `Found a public key JWK at ${receiptKeyUrl}.`
      : `No public key found at any of: ${receiptKeyCandidates.join(', ')}. Publishers should expose a JWK so agents can verify response receipts.`,
    fixUrl: 'https://tensorfeed.ai/agent-fair-trade#receipts',
  });

  const score = checks.filter(c => c.passed).length;
  const max = checks.length;
  let verdict: AftaCertifyResult['verdict'];
  if (score === max) verdict = 'certified-eligible';
  else if (score >= max - 1) verdict = 'almost-eligible';
  else verdict = 'not-yet-eligible';

  const eligible = verdict === 'certified-eligible';
  const nextStep = eligible
    ? `All AFTA checks pass. Email contact@tensorfeed.ai with subject "AFTA Certification: ${normalized}" and your payTo wallet address to begin the listing review. Annual fee is $100 USDC over x402; once paid we add you to /x402-adopters with afta_certified: true.`
    : `${max - score} check(s) need work. Fix the failing items above and re-run /api/afta-certify/check?domain=${normalized}. Re-checks are free and idempotent.`;

  return {
    ok: true,
    domain: normalized,
    checked_at: new Date().toISOString(),
    checks,
    score,
    max,
    verdict,
    afta_certified: false,
    next_step: nextStep,
    applied_to_directory: false,
  };
}
