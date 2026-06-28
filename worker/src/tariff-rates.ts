// Parser + duty math for US HTS rate strings.
//
// The USITC HTS reststop API returns duty rates as FREE-TEXT strings, never
// numbers: "Free", "6.8%", "2.5c/kg" (cents per unit), "4.4c/kg + 6%" (compound),
// and Chapter 99 add-ons phrased relative to the base line ("The duty provided in
// the applicable subheading + 7.5%"). This module is the correctness core of the
// landed-cost estimator: it turns those strings into a structured rate and
// computes the duty in USD. Pure, no I/O. The cent sign is matched as ¢ so
// this source stays ASCII.

export interface SpecificComponent {
  amount_usd: number; // per one unit (cents already converted to dollars)
  per_unit: string;
}

export type ParsedRateKind =
  | 'free'
  | 'advalorem'
  | 'specific'
  | 'compound'
  | 'addon'
  | 'unparseable';

export interface ParsedRate {
  kind: ParsedRateKind;
  advalorem_pct: number | null;
  specific: SpecificComponent[];
  addon_pct: number | null; // for Chapter 99 add-ons expressed as "+ X%"
  raw: string;
}

function unparseable(raw: string): ParsedRate {
  return { kind: 'unparseable', advalorem_pct: null, specific: [], addon_pct: null, raw };
}

function parseAdValorem(part: string): number | null {
  const m = /^([\d.]+)\s*%$/.exec(part.trim());
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) ? v : null;
}

function parseSpecific(part: string): SpecificComponent | null {
  // "2.5c/kg" (c = ¢ cents), "$1.50/liter", "44 cents/kg", "1.5/no."
  const m = /^\$?\s*([\d.]+)\s*(¢|cents?|\$)?\s*\/\s*([a-z0-9.]+)$/i.exec(part.trim());
  if (!m) return null;
  const amount = parseFloat(m[1]);
  if (!Number.isFinite(amount)) return null;
  const symbol = (m[2] || '').toLowerCase();
  const perUnit = m[3].toLowerCase();
  const isCents = symbol === '¢' || symbol.startsWith('cent');
  // Round the cents-to-dollars conversion to kill binary-float noise
  // (4.4 / 100 = 0.044000000000000004). 8 places is ample for per-unit rates.
  const amountUsd = isCents ? Math.round((amount / 100) * 1e8) / 1e8 : amount;
  return { amount_usd: amountUsd, per_unit: perUnit };
}

export function parseRateString(input: string): ParsedRate {
  const raw = input;
  const s = (input || '').trim();
  if (!s) return unparseable(raw);

  if (/^free$/i.test(s)) {
    return { kind: 'free', advalorem_pct: 0, specific: [], addon_pct: null, raw };
  }

  // Chapter 99 add-on relative to the base subheading.
  const addon = /applicable subheading\s*\+\s*([\d.]+)\s*%/i.exec(s);
  if (addon) {
    const pct = parseFloat(addon[1]);
    if (Number.isFinite(pct)) {
      return { kind: 'addon', advalorem_pct: null, specific: [], addon_pct: pct, raw };
    }
  }

  // A compound rate is parts joined by '+', each either ad valorem or specific.
  const parts = s.split('+').map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) return unparseable(raw);

  let advalorem: number | null = null;
  const specific: SpecificComponent[] = [];
  for (const part of parts) {
    const av = parseAdValorem(part);
    if (av !== null) {
      advalorem = advalorem === null ? av : advalorem + av;
      continue;
    }
    const sp = parseSpecific(part);
    if (sp) {
      specific.push(sp);
      continue;
    }
    // An unclassifiable part makes the whole rate unparseable: returning null
    // duty and flagging it is safer than silently undercounting.
    return unparseable(raw);
  }

  const hasAv = advalorem !== null;
  const hasSp = specific.length > 0;
  if (hasAv && hasSp) {
    return { kind: 'compound', advalorem_pct: advalorem, specific, addon_pct: null, raw };
  }
  if (hasSp) {
    return { kind: 'specific', advalorem_pct: null, specific, addon_pct: null, raw };
  }
  if (hasAv) {
    return { kind: 'advalorem', advalorem_pct: advalorem, specific: [], addon_pct: null, raw };
  }
  return unparseable(raw);
}

export interface DutyInputs {
  valueUsd: number;
  quantity?: number;
  unit?: string;
}

/**
 * Duty in USD for a parsed rate. Ad valorem and add-on use customs value;
 * specific needs quantity (and a matching unit if one is supplied) or returns
 * null so the caller can flag "quantity required" rather than undercount.
 */
export function computeDutyUsd(rate: ParsedRate, inputs: DutyInputs): number | null {
  const { valueUsd, quantity, unit } = inputs;
  switch (rate.kind) {
    case 'free':
      return 0;
    case 'advalorem':
      return (valueUsd * (rate.advalorem_pct ?? 0)) / 100;
    case 'addon':
      return (valueUsd * (rate.addon_pct ?? 0)) / 100;
    case 'specific':
    case 'compound': {
      let duty = rate.kind === 'compound' ? (valueUsd * (rate.advalorem_pct ?? 0)) / 100 : 0;
      for (const comp of rate.specific) {
        if (quantity == null) return null;
        if (unit != null && unit.toLowerCase() !== comp.per_unit) return null;
        duty += comp.amount_usd * quantity;
      }
      return duty;
    }
    case 'unparseable':
    default:
      return null;
  }
}
