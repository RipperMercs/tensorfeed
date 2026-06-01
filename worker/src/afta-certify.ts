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
 *
 * Abuse note: this endpoint aims an outbound fetch at a caller-supplied
 * domain, so the route handler rate limits it and normalizeDomain below
 * rejects private-network / service-discovery hosts (SSRF guard).
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
  /** Set when this domain is a federation member; certification routes through the host. */
  federation_parent?: string;
  /** True only when TensorFeed can verify the membership against its own federation roster (vs a self-declared claim). */
  federation_verified?: boolean;
}

const FETCH_TIMEOUT_MS = 8000;

// TensorFeed's authoritative federation roster. We host this federation, so a
// domain's membership claim can be verified against our own records instead of
// trusting its self-declaration. Keep in sync with
// public/.well-known/agent-fair-trade.json -> adoption.network_federation.
const TF_FEDERATION_ROSTER: Record<string, string[]> = {
  'tensorfeed.ai': ['tensorfeed.ai', 'terminalfeed.io'],
};

// Private-network and service-discovery suffixes we refuse to certify-fetch.
// Allowing them would let an unauthenticated caller aim the Worker's fetch at
// internal infrastructure (SSRF). The Workers runtime has no route to a VPC or
// cloud-metadata endpoint, so this is defense in depth on top of the route's
// rate limit.
const SSRF_FORBIDDEN_SUFFIXES = [
  '.internal',
  '.local',
  '.localhost',
  '.localdomain',
  '.lan',
  '.intranet',
  '.corp',
  '.consul',
  '.home.arpa',
];

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

/**
 * Validate that fetched JSON actually carries usable public-key material, not
 * just a key-shaped field. OKP/EC keys carry a non-empty `x`, RSA carries `n`;
 * a non-empty generic `publicKey` (PEM-ish) is also accepted. Guards against a
 * publisher "passing" the receipt-key check with an empty or junk JWK.
 */
function looksLikeJwk(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const nonEmpty = (v: unknown): boolean => typeof v === 'string' && v.length > 0;
  const kty = typeof d.kty === 'string' ? d.kty : null;
  if (kty === 'OKP' || kty === 'EC') return nonEmpty(d.x);
  if (kty === 'RSA') return nonEmpty(d.n);
  return nonEmpty(d.publicKey);
}

function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  // Strip protocol and trailing slash if user pasted a URL
  const stripped = trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  // Drop any embedded credentials or port (user:pass@host or host:port)
  const hostOnly = stripped.replace(/^[^@/]*@/, '').replace(/:\d+$/, '');
  // Basic shape check: at least one dot, only allowed chars. The [a-z]{2,} TLD
  // requirement also rejects bare IPv4 literals (numeric final label).
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(hostOnly)) return null;
  // Reject IPv4 literals explicitly (defense in depth; the regex blocks most).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostOnly)) return null;
  // Reject private-network / service-discovery suffixes (SSRF guard).
  if (SSRF_FORBIDDEN_SUFFIXES.some(s => hostOnly.endsWith(s))) return null;
  return hostOnly;
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
      next_step: 'Provide a valid public hostname (e.g. example.com or api.example.com). Private-network and service-discovery hosts are not accepted.',
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
      : itemsWithAccepts.length === 0
        ? 'No paid items with an accepts[] block to check (see the previous check).'
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

  // Check 6: published receipt public key (Ed25519 or similar).
  // Authoritative source: the receipts.public_key_url the AFTA manifest above
  // already declared. We accept that URL only if it stays on the publisher's
  // own domain, so a crafted manifest cannot redirect our fetch off-host. Then
  // a brand-prefixed candidate derived from the domain (e.g. terminalfeed.io ->
  // terminalfeed-receipt-key.json), then the generic well-known candidates.
  // This fixes the false-negative where a publisher names its key after its
  // brand rather than one of the three hard-coded filenames, and looksLikeJwk
  // rejects a key-shaped-but-empty file.
  const declaredKeyUrl =
    receiptsField &&
    typeof receiptsField.public_key_url === 'string' &&
    (receiptsField.public_key_url as string).startsWith(`${base}/`)
      ? (receiptsField.public_key_url as string)
      : null;
  const brandSlug = normalized.split('.')[0];
  const keyUrls: string[] = [];
  if (declaredKeyUrl) keyUrls.push(declaredKeyUrl);
  keyUrls.push(`${base}/.well-known/${brandSlug}-receipt-key.json`);
  for (const c of receiptKeyCandidates) {
    if (!keyUrls.includes(c)) keyUrls.push(c);
  }

  let receiptKeyOk = false;
  let receiptKeyUrl: string | null = null;
  for (const u of keyUrls) {
    const r = await tryFetchJson(u);
    if (r.ok && looksLikeJwk(r.data)) {
      receiptKeyOk = true;
      receiptKeyUrl = u;
      break;
    }
  }
  checks.push({
    id: 'receipt_key_published',
    name: 'Publishes a receipt-signing public key at /.well-known/',
    passed: receiptKeyOk,
    details: receiptKeyOk
      ? `Found a public key JWK at ${receiptKeyUrl}.`
      : `No usable public key JWK found at any of: ${keyUrls.join(', ')}. Declare receipts.public_key_url in your AFTA manifest and serve a JWK (kty + key material) so agents can verify response receipts.`,
    fixUrl: 'https://tensorfeed.ai/agent-fair-trade#receipts',
  });

  // Federation detection: if the domain publishes an AFTA manifest that
  // declares federation membership (e.g. TerminalFeed pointing at TF),
  // we record it. Federation members typically delegate the x402
  // manifest to the federation host and won't pass checks 1-4 on their
  // own surface; manual review is the path for them.
  //
  // The membership claim is self-declared by the target. We can only VERIFY
  // it for federations TensorFeed itself hosts, by cross-checking our own
  // roster. For any other host we still surface the claim but mark it
  // unverified, so a domain cannot fake a TensorFeed endorsement.
  let federationParent: string | null = null;
  let federationVerified = false;
  if (afta.ok && afta.data && typeof afta.data === 'object') {
    const d = afta.data as Record<string, unknown>;
    const adoption = (d.adoption as Record<string, unknown>) ?? {};
    const fed = (adoption.network_federation as Record<string, unknown>) ?? {};
    const current = Array.isArray(fed.current_federation) ? (fed.current_federation as Array<Record<string, unknown>>) : [];
    for (const f of current) {
      const host = typeof f.host === 'string' ? f.host : null;
      const members = Array.isArray(f.members) ? (f.members as unknown[]).map(String) : [];
      if (host && members.includes(normalized) && host !== normalized) {
        federationParent = host;
        federationVerified = (TF_FEDERATION_ROSTER[host] ?? []).includes(normalized);
        break;
      }
    }
  }

  const score = checks.filter(c => c.passed).length;
  const max = checks.length;
  let verdict: AftaCertifyResult['verdict'];
  if (score === max) verdict = 'certified-eligible';
  else if (score >= max - 1) verdict = 'almost-eligible';
  else verdict = 'not-yet-eligible';

  const eligible = verdict === 'certified-eligible';
  let nextStep: string;
  if (eligible) {
    nextStep = `All AFTA checks pass. Email contact@tensorfeed.ai with subject "AFTA Certification: ${normalized}" and your payTo wallet address to begin the listing review. Annual fee is $100 USDC over x402; once paid we add you to /x402-adopters with afta_certified: true.`;
  } else if (federationParent && federationVerified) {
    nextStep = `${normalized} is a verified member of the ${federationParent} AFTA federation. Federation members may delegate the x402 manifest to the host and will not always pass the manifest checks above on their own surface; that is by design. For certification, email contact@tensorfeed.ai referencing ${federationParent}; we certify verified federation members through the host's certification plus manual review.`;
  } else if (federationParent) {
    nextStep = `${normalized} self-declares membership in a federation hosted by ${federationParent}, but that is not a federation TensorFeed hosts or can verify, so we treat it as unverified. Fix the ${max - score} failing check(s) above and re-run /api/afta-certify/check?domain=${normalized}. Re-checks are free and idempotent.`;
  } else {
    nextStep = `${max - score} check(s) need work. Fix the failing items above and re-run /api/afta-certify/check?domain=${normalized}. Re-checks are free and idempotent.`;
  }

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
    ...(federationParent ? { federation_parent: federationParent, federation_verified: federationVerified } : {}),
  };
}
