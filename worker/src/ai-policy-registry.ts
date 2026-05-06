/**
 * AI Policy Registry.
 *
 * Editorial catalog of significant AI policy actions: executive orders,
 * statutes, regulations, guidance, international declarations. Source
 * material is government publication (mostly public domain in the US;
 * EU and UK material is government work distributed under their own
 * open terms, with citation). The catalog itself is TensorFeed's
 * editorial work product, hand-curated, refreshed on redeploy.
 *
 * Sister to benchmark-registry.ts (meta-catalog of AI evals) and
 * afta-adopters.ts (machine-readable directory). Same shape: factual
 * underlying data, opinionated curation, structured response.
 *
 * Served at /api/policy/ai/registry. Free, no auth, agent-friendly.
 */

export type Jurisdiction =
  | 'US-Federal'
  | 'US-State'
  | 'EU'
  | 'UK'
  | 'China'
  | 'International';

export type PolicyType =
  | 'executive-order'
  | 'statute'
  | 'regulation'
  | 'guidance'
  | 'declaration'
  | 'agency-action';

export type PolicyStatus =
  | 'active'
  | 'phased'           // takes effect in stages over time
  | 'pending'          // signed, not yet effective
  | 'rescinded'        // formally withdrawn
  | 'vetoed'           // passed legislature but vetoed by executive
  | 'proposed';        // introduced but not enacted

export type PolicyScope =
  | 'general'
  | 'transparency'
  | 'safety'
  | 'high-risk'
  | 'discrimination'
  | 'deepfakes'
  | 'consumer-protection'
  | 'export-controls'
  | 'national-security'
  | 'public-sector'
  | 'workplace';

export interface PolicyEntry {
  id: string;
  title: string;
  jurisdiction: Jurisdiction;
  type: PolicyType;
  status: PolicyStatus;
  /** Date enacted / signed / issued (ISO YYYY-MM-DD). */
  enacted_date: string;
  /** Date the policy takes effect, when distinct from enacted (e.g. statutes with deferred effective date). null when same as enacted or rolling. */
  effective_date: string | null;
  /** 1-3 sentence neutral summary. */
  summary: string;
  /** Primary canonical source (gov publication URL). */
  source_url: string;
  /** Additional supporting citations (analyses, follow-on actions). */
  citations: string[];
  scope: PolicyScope[];
}

export const POLICY_REGISTRY: PolicyEntry[] = [
  // ── US Federal ────────────────────────────────────────────────
  {
    id: 'us-eo-14110-biden',
    title: 'EO 14110: Safe, Secure, and Trustworthy Development and Use of Artificial Intelligence',
    jurisdiction: 'US-Federal',
    type: 'executive-order',
    status: 'rescinded',
    enacted_date: '2023-10-30',
    effective_date: '2023-10-30',
    summary:
      'Biden-era executive order setting reporting requirements for foundation models above a compute threshold (10^26 FLOPs), AI safety testing standards via NIST, and obligations across federal agencies. Rescinded by EO 14179 on 2025-01-20.',
    source_url: 'https://www.federalregister.gov/documents/2023/11/01/2023-24283/safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence',
    citations: ['https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/'],
    scope: ['general', 'safety', 'transparency', 'national-security'],
  },
  {
    id: 'us-eo-14179-trump',
    title: 'EO 14179: Removing Barriers to American Leadership in Artificial Intelligence',
    jurisdiction: 'US-Federal',
    type: 'executive-order',
    status: 'active',
    enacted_date: '2025-01-23',
    effective_date: '2025-01-23',
    summary:
      'Trump executive order rescinding EO 14110 and directing the development of an AI Action Plan focused on US AI leadership. Removed Biden-era reporting requirements; directed agencies to identify and rescind AI policies seen as inconsistent with US leadership goals.',
    source_url: 'https://www.federalregister.gov/documents/2025/01/31/2025-02172/removing-barriers-to-american-leadership-in-artificial-intelligence',
    citations: [],
    scope: ['general', 'national-security'],
  },
  {
    id: 'us-bis-ai-diffusion-rule',
    title: 'BIS Framework for Artificial Intelligence Diffusion',
    jurisdiction: 'US-Federal',
    type: 'regulation',
    status: 'phased',
    enacted_date: '2025-01-13',
    effective_date: '2025-05-15',
    summary:
      'Bureau of Industry and Security export-control framework establishing tiered country lists for AI model weights and advanced compute. Sets per-country compute caps and validated end-user license pathways for advanced AI deployment outside the US.',
    source_url: 'https://www.bis.doc.gov/index.php/policy-guidance/regulations',
    citations: [],
    scope: ['export-controls', 'national-security', 'high-risk'],
  },

  // ── US State ──────────────────────────────────────────────────
  {
    id: 'us-co-sb24-205',
    title: 'Colorado SB 24-205: Consumer Protections for Artificial Intelligence',
    jurisdiction: 'US-State',
    type: 'statute',
    status: 'pending',
    enacted_date: '2024-05-17',
    effective_date: '2026-02-01',
    summary:
      'First comprehensive US state AI statute. Imposes risk-management obligations on developers and deployers of "high-risk" AI systems making consequential decisions in employment, lending, insurance, and similar domains. Effective 2026-02-01.',
    source_url: 'https://leg.colorado.gov/bills/sb24-205',
    citations: [],
    scope: ['high-risk', 'consumer-protection', 'discrimination'],
  },
  {
    id: 'us-ut-hb-333',
    title: 'Utah Artificial Intelligence Policy Act (HB 333)',
    jurisdiction: 'US-State',
    type: 'statute',
    status: 'active',
    enacted_date: '2024-03-13',
    effective_date: '2024-05-01',
    summary:
      'Establishes the Utah Office of Artificial Intelligence Policy and a regulatory mitigation program (sandbox), and clarifies that consumer-protection laws apply to acts performed by generative AI on behalf of regulated entities.',
    source_url: 'https://le.utah.gov/~2024/bills/static/HB0333.html',
    citations: [],
    scope: ['consumer-protection', 'transparency'],
  },
  {
    id: 'us-ca-ab-2013',
    title: 'California AB 2013: Generative AI Training Data Transparency',
    jurisdiction: 'US-State',
    type: 'statute',
    status: 'pending',
    enacted_date: '2024-09-28',
    effective_date: '2026-01-01',
    summary:
      'Requires developers of generative AI systems used by Californians to publicly post a summary of the data used to train each system. Disclosure must include data source descriptions, copyright status, and license terms where known.',
    source_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB2013',
    citations: [],
    scope: ['transparency'],
  },
  {
    id: 'us-ca-sb-1047',
    title: 'California SB 1047: Safe and Secure Innovation for Frontier Artificial Intelligence Models Act',
    jurisdiction: 'US-State',
    type: 'statute',
    status: 'vetoed',
    enacted_date: '2024-09-29',
    effective_date: null,
    summary:
      'Would have imposed safety testing, kill-switch, and incident-reporting requirements on frontier AI models above a defined compute and cost threshold. Passed the legislature, vetoed by Governor Newsom on 2024-09-29.',
    source_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB1047',
    citations: ['https://www.gov.ca.gov/wp-content/uploads/2024/09/SB-1047-Veto-Message.pdf'],
    scope: ['safety', 'high-risk'],
  },
  {
    id: 'us-ca-sb-942',
    title: 'California SB 942: AI Transparency Act',
    jurisdiction: 'US-State',
    type: 'statute',
    status: 'pending',
    enacted_date: '2024-09-19',
    effective_date: '2026-01-01',
    summary:
      'Requires covered providers of generative AI systems used by Californians to offer a free public AI-detection tool and to embed disclosures (manifest plus latent) in generated content.',
    source_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB942',
    citations: [],
    scope: ['transparency', 'deepfakes'],
  },

  // ── EU ────────────────────────────────────────────────────────
  {
    id: 'eu-ai-act',
    title: 'EU AI Act (Regulation 2024/1689)',
    jurisdiction: 'EU',
    type: 'regulation',
    status: 'phased',
    enacted_date: '2024-07-12',
    effective_date: '2024-08-01',
    summary:
      'First comprehensive horizontal AI law. Risk-tiered: unacceptable-risk practices prohibited from 2025-02-02; general-purpose AI obligations from 2025-08-02; high-risk system rules from 2026-08-02; high-risk in regulated products from 2027-08-02.',
    source_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ%3AL_202401689',
    citations: ['https://artificialintelligenceact.eu/'],
    scope: ['general', 'high-risk', 'transparency', 'discrimination'],
  },

  // ── UK ────────────────────────────────────────────────────────
  {
    id: 'uk-pro-innovation-paper',
    title: "UK 'Pro-Innovation' AI Regulation Approach",
    jurisdiction: 'UK',
    type: 'guidance',
    status: 'active',
    enacted_date: '2023-03-29',
    effective_date: '2023-03-29',
    summary:
      'Sectoral, principles-based UK approach: existing regulators (ICO, CMA, FCA, etc.) apply five cross-cutting principles (safety, transparency, fairness, accountability, contestability) within their remits, no horizontal AI statute. Updated by subsequent government responses.',
    source_url: 'https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach',
    citations: [],
    scope: ['general', 'safety', 'transparency'],
  },
  {
    id: 'uk-ai-safety-institute',
    title: 'UK AI Safety Institute Establishment',
    jurisdiction: 'UK',
    type: 'agency-action',
    status: 'active',
    enacted_date: '2023-11-02',
    effective_date: '2023-11-02',
    summary:
      'Government-funded body within DSIT focused on pre-deployment frontier-model safety evaluation, conducting voluntary access agreements with major labs. Renamed AI Security Institute in 2025.',
    source_url: 'https://www.aisi.gov.uk/',
    citations: [],
    scope: ['safety', 'national-security'],
  },

  // ── China ─────────────────────────────────────────────────────
  {
    id: 'cn-genai-provisions',
    title: 'Interim Measures for the Management of Generative AI Services',
    jurisdiction: 'China',
    type: 'regulation',
    status: 'active',
    enacted_date: '2023-07-13',
    effective_date: '2023-08-15',
    summary:
      "Cyberspace Administration of China rule for public-facing generative AI services in mainland China. Requires algorithm filings, security assessments, content review, and adherence to 'core socialist values' in model outputs.",
    source_url: 'http://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm',
    citations: [],
    scope: ['transparency', 'safety', 'public-sector'],
  },
  {
    id: 'cn-deep-synthesis-provisions',
    title: 'Provisions on the Administration of Deep Synthesis Internet Information Services',
    jurisdiction: 'China',
    type: 'regulation',
    status: 'active',
    enacted_date: '2022-11-25',
    effective_date: '2023-01-10',
    summary:
      'Pre-dates the GenAI Provisions and remains in force. Requires labeling of synthetic media (deepfakes, voice clones, generated text), provider security assessments, and registration of deep-synthesis services.',
    source_url: 'http://www.cac.gov.cn/2022-12/11/c_1672221949354811.htm',
    citations: [],
    scope: ['deepfakes', 'transparency'],
  },

  // ── International ─────────────────────────────────────────────
  {
    id: 'intl-bletchley',
    title: 'Bletchley Declaration on AI Safety',
    jurisdiction: 'International',
    type: 'declaration',
    status: 'active',
    enacted_date: '2023-11-01',
    effective_date: '2023-11-01',
    summary:
      'Joint declaration from 28 countries plus the EU at the inaugural AI Safety Summit, recognizing risks from frontier AI and committing to inclusive cross-border safety research. Non-binding.',
    source_url: 'https://www.gov.uk/government/publications/ai-safety-summit-2023-the-bletchley-declaration/the-bletchley-declaration-by-countries-attending-the-ai-safety-summit-1-2-november-2023',
    citations: [],
    scope: ['safety', 'national-security'],
  },
  {
    id: 'intl-seoul',
    title: 'Seoul AI Safety Summit Outcomes',
    jurisdiction: 'International',
    type: 'declaration',
    status: 'active',
    enacted_date: '2024-05-21',
    effective_date: '2024-05-21',
    summary:
      'Second AI Safety Summit (Seoul, May 2024) producing the Seoul Declaration plus a multilateral Frontier AI Safety Commitments document signed by 16 leading AI companies pledging risk thresholds and incident reporting.',
    source_url: 'https://www.gov.uk/government/publications/seoul-declaration-for-safe-innovative-and-inclusive-ai-ai-seoul-summit-2024',
    citations: [],
    scope: ['safety'],
  },
];

export const POLICY_REGISTRY_LAST_UPDATED = '2026-05-06';

// ── Read API ────────────────────────────────────────────────────────

export interface PolicyAttribution {
  source: string;
  policy: string;
  primary_sources: string[];
}

export const POLICY_ATTRIBUTION: PolicyAttribution = {
  source: 'TensorFeed editorial AI policy registry',
  policy:
    'Each entry summarizes a publicly-published government action. Source URLs link to the canonical government publication. Summaries are TensorFeed editorial; the underlying acts/orders/regulations themselves are government publications and free to use under their respective public-records terms (US federal works are public domain; EU and UK government works are reproduced under their open-government terms with citation).',
  primary_sources: [
    'federalregister.gov (US executive orders + regulations)',
    'leg.colorado.gov, leginfo.legislature.ca.gov, le.utah.gov (US state statutes)',
    'eur-lex.europa.eu (EU regulations)',
    'gov.uk (UK guidance and agency actions)',
    'cac.gov.cn (China CAC regulations)',
  ],
};

export interface PolicyRegistryResponse {
  ok: true;
  count: number;
  last_updated: string;
  filters: {
    jurisdiction?: Jurisdiction;
    type?: PolicyType;
    status?: PolicyStatus;
    scope?: PolicyScope;
  };
  policies: PolicyEntry[];
  attribution: PolicyAttribution;
}

export interface PolicyOptions {
  jurisdiction?: string;
  type?: string;
  status?: string;
  scope?: string;
}

export const VALID_JURISDICTIONS: Jurisdiction[] = [
  'US-Federal', 'US-State', 'EU', 'UK', 'China', 'International',
];
export const VALID_TYPES: PolicyType[] = [
  'executive-order', 'statute', 'regulation', 'guidance', 'declaration', 'agency-action',
];
export const VALID_STATUSES: PolicyStatus[] = [
  'active', 'phased', 'pending', 'rescinded', 'vetoed', 'proposed',
];
export const VALID_SCOPES: PolicyScope[] = [
  'general', 'transparency', 'safety', 'high-risk', 'discrimination', 'deepfakes',
  'consumer-protection', 'export-controls', 'national-security', 'public-sector', 'workplace',
];

function isJurisdiction(s: string): s is Jurisdiction {
  return (VALID_JURISDICTIONS as string[]).includes(s);
}
function isPolicyType(s: string): s is PolicyType {
  return (VALID_TYPES as string[]).includes(s);
}
function isPolicyStatus(s: string): s is PolicyStatus {
  return (VALID_STATUSES as string[]).includes(s);
}
function isPolicyScope(s: string): s is PolicyScope {
  return (VALID_SCOPES as string[]).includes(s);
}

export interface PolicyValidation {
  jurisdiction?: Jurisdiction;
  type?: PolicyType;
  status?: PolicyStatus;
  scope?: PolicyScope;
  invalid?: string[];
}

export function validateOptions(o: PolicyOptions): PolicyValidation {
  const out: PolicyValidation = {};
  const invalid: string[] = [];
  if (o.jurisdiction) {
    if (isJurisdiction(o.jurisdiction)) out.jurisdiction = o.jurisdiction;
    else invalid.push(`jurisdiction=${o.jurisdiction}`);
  }
  if (o.type) {
    if (isPolicyType(o.type)) out.type = o.type;
    else invalid.push(`type=${o.type}`);
  }
  if (o.status) {
    if (isPolicyStatus(o.status)) out.status = o.status;
    else invalid.push(`status=${o.status}`);
  }
  if (o.scope) {
    if (isPolicyScope(o.scope)) out.scope = o.scope;
    else invalid.push(`scope=${o.scope}`);
  }
  if (invalid.length > 0) out.invalid = invalid;
  return out;
}

export function readPolicyRegistry(options: PolicyOptions = {}): PolicyRegistryResponse {
  const v = validateOptions(options);
  let policies = POLICY_REGISTRY.slice();

  if (v.jurisdiction) policies = policies.filter(p => p.jurisdiction === v.jurisdiction);
  if (v.type) policies = policies.filter(p => p.type === v.type);
  if (v.status) policies = policies.filter(p => p.status === v.status);
  if (v.scope) policies = policies.filter(p => p.scope.includes(v.scope!));

  // Sort: active first, then by enacted_date desc.
  const statusRank: Record<PolicyStatus, number> = {
    active: 0,
    phased: 1,
    pending: 2,
    proposed: 3,
    vetoed: 4,
    rescinded: 5,
  };
  policies.sort((a, b) => {
    const r = statusRank[a.status] - statusRank[b.status];
    if (r !== 0) return r;
    return b.enacted_date.localeCompare(a.enacted_date);
  });

  return {
    ok: true,
    count: policies.length,
    last_updated: POLICY_REGISTRY_LAST_UPDATED,
    filters: {
      ...(v.jurisdiction ? { jurisdiction: v.jurisdiction } : {}),
      ...(v.type ? { type: v.type } : {}),
      ...(v.status ? { status: v.status } : {}),
      ...(v.scope ? { scope: v.scope } : {}),
    },
    policies,
    attribution: POLICY_ATTRIBUTION,
  };
}
