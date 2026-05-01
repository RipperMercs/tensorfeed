/**
 * AI policy / regulation tracker.
 *
 * Active and pending AI regulations, frameworks, and standards across
 * jurisdictions: EU, US (federal + state), UK, China, Korea, Japan,
 * Brazil. Each entry has status, key milestones, in-scope companies,
 * and the agencies/people pushing it.
 *
 * Editorial; refreshed when regulatory milestones land.
 *
 * Served at /api/ai-policy (free, cached 600s).
 */

export interface PolicyItem {
  id: string;
  name: string;
  jurisdiction: string;
  /** Active = in force; pending = passed but not yet active; proposed = under debate; stalled = inactive. */
  status: 'active' | 'pending' | 'proposed' | 'stalled' | 'repealed';
  /** Type. */
  type: 'law' | 'executive-order' | 'regulation' | 'voluntary-framework' | 'standard';
  /** When it was passed / signed / put into force. */
  enactedDate: string | null;
  /** Important upcoming or past dates. */
  milestones: { date: string; event: string }[];
  /** Who it applies to. */
  scope: string;
  /** What it requires / prohibits. */
  summary: string;
  /** Lead agency / enforcer. */
  lead: string;
  /** Penalties or enforcement mechanism. */
  penalties: string;
  /** Source URL. */
  url: string;
}

export const POLICY_ITEMS: PolicyItem[] = [
  // ── EU ────────────────────────────────────────────
  {
    id: 'eu-ai-act',
    name: 'EU AI Act',
    jurisdiction: 'European Union',
    status: 'active',
    type: 'regulation',
    enactedDate: '2024-08-01',
    milestones: [
      { date: '2024-08-01', event: 'Entered into force' },
      { date: '2025-02-02', event: 'Prohibited practices banned (social scoring, manipulation, untargeted scraping)' },
      { date: '2025-08-02', event: 'GPAI / foundation-model obligations active (transparency, copyright, model cards)' },
      { date: '2026-08-02', event: 'High-risk systems compliance deadline (most provisions in force)' },
      { date: '2027-08-02', event: 'High-risk systems integrated into existing product safety regulated' },
    ],
    scope: 'Any AI system placed on the EU market or affecting EU users. Tiered by risk level: prohibited, high-risk, limited, minimal.',
    summary: 'Tiered risk-based AI regulation. GPAI providers must publish summaries of training data, respect copyright opt-outs, evaluate systemic risk for very capable models. High-risk systems require conformity assessments + EU database registration.',
    lead: 'European Commission AI Office + national authorities',
    penalties: 'Up to €35M or 7% of global turnover for prohibited use; €15M or 3% for non-compliance with GPAI obligations',
    url: 'https://artificialintelligenceact.eu',
  },
  // ── US Federal ────────────────────────────────────
  {
    id: 'us-ai-eo-trump-2025',
    name: 'Removing Barriers to American Leadership in AI (EO 14179)',
    jurisdiction: 'United States (federal)',
    status: 'active',
    type: 'executive-order',
    enactedDate: '2025-01-23',
    milestones: [
      { date: '2025-01-23', event: 'Signed by President Trump; revokes Biden EO 14110' },
      { date: '2025-07-23', event: 'AI Action Plan released by White House OSTP' },
      { date: '2026-01-23', event: 'One-year review of agency implementation' },
    ],
    scope: 'All US federal agencies; sets priorities for AI competitiveness, safety, and procurement.',
    summary: 'Replaced Biden\'s 2023 EO 14110. Focuses on accelerating US AI competitiveness and reducing perceived regulatory barriers; preserves NIST AISI but reframes voluntary safety commitments. State-level laws (CA, CO, NY, IL) increasingly fill the federal gap.',
    lead: 'White House OSTP + NIST AISI',
    penalties: 'No direct penalties (executive order applies to agencies, not private actors)',
    url: 'https://www.whitehouse.gov/presidential-actions/2025/01/removing-barriers-to-american-leadership-in-artificial-intelligence/',
  },
  {
    id: 'guard-act-2026',
    name: 'GUARD Act',
    jurisdiction: 'United States (federal)',
    status: 'pending',
    type: 'law',
    enactedDate: null,
    milestones: [
      { date: '2026-02-12', event: 'Introduced by Sens. Hawley (R) and Blumenthal (D)' },
      { date: '2026-04-30', event: 'Senate Judiciary Committee advanced 22-0 (unanimous)' },
      { date: '2026-Q3', event: 'Expected Senate floor vote (TBD)' },
    ],
    scope: 'AI chatbots interacting with US users. Special focus on minors.',
    summary: 'Government-ID age verification for AI chatbots, flat ban on AI companions for minors, mandatory non-human disclosures every 30 minutes, criminal penalties for design choices that knowingly route minors into sexually explicit or self-harm content.',
    lead: 'Senate Judiciary Committee; FTC implementation expected',
    penalties: 'Civil + criminal penalties for design choices; product-recall authority',
    url: 'https://www.judiciary.senate.gov',
  },
  {
    id: 'ca-sb-1047',
    name: 'California SB 1047',
    jurisdiction: 'California',
    status: 'repealed',
    type: 'law',
    enactedDate: null,
    milestones: [
      { date: '2024-09-29', event: 'Vetoed by Governor Newsom' },
    ],
    scope: 'AI models trained with > $100M compute or 10^26 FLOPs. Frontier AI labs operating in California.',
    summary: 'Would have required pre-deployment safety testing, kill-switch capability, and whistleblower protections for frontier AI. Vetoed; replaced in spirit by California\'s narrower AI transparency laws (AB 2013) and the federal AI EO debate.',
    lead: 'California Office of Technology + AG (would have been)',
    penalties: 'N/A (vetoed)',
    url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB1047',
  },
  {
    id: 'ca-ab-2013',
    name: 'California AB 2013 (Generative AI Training Data Transparency)',
    jurisdiction: 'California',
    status: 'active',
    type: 'law',
    enactedDate: '2024-09-28',
    milestones: [
      { date: '2024-09-28', event: 'Signed' },
      { date: '2026-01-01', event: 'Compliance deadline' },
    ],
    scope: 'Developers of generative AI systems made available to California residents.',
    summary: 'Requires public disclosure of training-data summaries, data sources, copyright considerations, and PII content for any generative AI system available to Californians starting January 2026.',
    lead: 'California AG',
    penalties: 'Civil enforcement; specific penalties TBD',
    url: 'https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2013',
  },
  // ── UK ────────────────────────────────────────────
  {
    id: 'uk-aisi',
    name: 'UK AI Safety Institute',
    jurisdiction: 'United Kingdom',
    status: 'active',
    type: 'voluntary-framework',
    enactedDate: '2023-11',
    milestones: [
      { date: '2023-11-02', event: 'Founded at AI Safety Summit' },
      { date: '2024-05-21', event: 'Voluntary pre-deployment testing agreements with frontier labs' },
      { date: '2025-06', event: 'AI Bill expected (UK government)' },
    ],
    scope: 'Frontier AI labs operating in UK or releasing to UK users. Voluntary at present; may become mandatory.',
    summary: 'Pre-deployment red-team evaluations of frontier models across cyber, biosecurity, autonomous-system, political-influence dimensions. Operates under DSIT (Department for Science, Innovation and Technology).',
    lead: 'DSIT / UK AISI',
    penalties: 'No statutory penalties yet; pending AI Bill expected to add them',
    url: 'https://www.aisi.gov.uk',
  },
  // ── China ──────────────────────────────────────────
  {
    id: 'china-genai-measures',
    name: 'Interim Measures for the Management of Generative AI Services',
    jurisdiction: 'China',
    status: 'active',
    type: 'regulation',
    enactedDate: '2023-08-15',
    milestones: [
      { date: '2023-08-15', event: 'Entered into force' },
      { date: '2024-04-01', event: 'Mandatory generative AI service registration with CAC' },
      { date: '2025-09-01', event: 'AI-generated content labeling rules effective' },
    ],
    scope: 'Generative AI services offered to the Chinese public. Registration, licensing, and content controls.',
    summary: 'Pre-launch security assessment, content filtering aligned with Chinese law, watermarking + labeling of AI-generated content, training-data provenance documentation.',
    lead: 'Cyberspace Administration of China (CAC)',
    penalties: 'License revocation, fines, criminal referral for violations',
    url: 'https://www.cac.gov.cn',
  },
  // ── Korea ──────────────────────────────────────────
  {
    id: 'korea-basic-ai-act',
    name: 'Korea Basic Act on AI',
    jurisdiction: 'South Korea',
    status: 'pending',
    type: 'law',
    enactedDate: '2024-12-26',
    milestones: [
      { date: '2024-12-26', event: 'Passed National Assembly' },
      { date: '2026-01-22', event: 'Entered into force (delayed implementation)' },
    ],
    scope: 'AI providers operating in South Korea or providing services to Korean users.',
    summary: 'Comprehensive AI governance framework. Risk-based tiers (similar to EU AI Act lite). Korean Ministry of Science and ICT designated as enforcement authority. Lighter-touch than EU AI Act on GPAI obligations.',
    lead: 'Ministry of Science and ICT (MSIT)',
    penalties: 'Administrative fines up to KRW 30M ($22k) per violation',
    url: 'https://www.msit.go.kr',
  },
  // ── International standards ────────────────────────
  {
    id: 'nist-ai-rmf',
    name: 'NIST AI Risk Management Framework',
    jurisdiction: 'United States (voluntary, internationally referenced)',
    status: 'active',
    type: 'voluntary-framework',
    enactedDate: '2023-01-26',
    milestones: [
      { date: '2023-01-26', event: 'AI RMF 1.0 published' },
      { date: '2024-07-26', event: 'Generative AI Profile published' },
    ],
    scope: 'Voluntary; widely referenced in US federal procurement and state laws.',
    summary: 'Risk-management lifecycle for AI systems: Govern, Map, Measure, Manage. Generative AI profile addresses model-specific risks. Foundation for many state and sector-specific AI laws.',
    lead: 'NIST',
    penalties: 'Voluntary (no penalties)',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
  },
  {
    id: 'iso-42001',
    name: 'ISO/IEC 42001 (AI Management Systems)',
    jurisdiction: 'International (ISO standard)',
    status: 'active',
    type: 'standard',
    enactedDate: '2023-12-18',
    milestones: [
      { date: '2023-12-18', event: 'Published' },
      { date: '2024-Q4', event: 'First commercial certifications issued' },
    ],
    scope: 'Organizations developing or deploying AI systems. Voluntary certification.',
    summary: 'First international management-system standard for AI. Specifies requirements for establishing, implementing, maintaining, and improving an AI management system. Often required by enterprise buyers.',
    lead: 'ISO/IEC JTC 1/SC 42',
    penalties: 'Voluntary; loss of certification on non-compliance',
    url: 'https://www.iso.org/standard/81230.html',
  },
];

export const POLICY_LAST_UPDATED = '2026-04-30';
