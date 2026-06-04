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
  | 'workplace'
  | 'frontier-models';

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

  // ── 2026 expansion: frontier-model laws + global frameworks ───
  {
    id: 'us-ny-raise-act',
    title: 'New York RAISE Act (Responsible AI Safety and Education Act, S6953B / A6453B)',
    jurisdiction: 'US-State',
    type: 'statute',
    status: 'pending',
    enacted_date: '2025-12-19',
    effective_date: '2027-01-01',
    summary:
      'Second US state frontier-model safety law after California. Requires large frontier AI developers to publish safety and security protocols, report critical-harm safety incidents to the state within 72 hours, and creates an oversight office within the Department of Financial Services. Signed by Governor Hochul on 2025-12-19 with agreed chapter amendments; takes effect 2027-01-01.',
    source_url: 'https://www.nysenate.gov/legislation/bills/2025/S6953',
    citations: ['https://www.governor.ny.gov/news/governor-hochul-signs-nation-leading-legislation-require-ai-frameworks-ai-frontier-models'],
    scope: ['frontier-models', 'safety', 'transparency'],
  },
  {
    id: 'us-ca-sb-53',
    title: 'California SB 53: Transparency in Frontier Artificial Intelligence Act (TFAIA)',
    jurisdiction: 'US-State',
    type: 'statute',
    status: 'pending',
    enacted_date: '2025-09-29',
    effective_date: '2026-01-01',
    summary:
      "California's frontier-model law, the successor to the vetoed SB 1047. Requires developers of frontier models (trained above 10^26 FLOPs) to publish safety frameworks, report critical safety incidents to the state, and protect whistleblowers; large frontier developers (over 500M dollars revenue) face additional duties. Also creates CalCompute. Signed by Governor Newsom 2025-09-29; most requirements effective 2026-01-01.",
    source_url: 'https://www.gov.ca.gov/2025/09/29/governor-newsom-signs-sb-53-advancing-californias-world-leading-artificial-intelligence-industry/',
    citations: ['https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB53'],
    scope: ['frontier-models', 'safety', 'transparency'],
  },
  {
    id: 'us-tx-traiga-hb-149',
    title: 'Texas Responsible Artificial Intelligence Governance Act (TRAIGA, HB 149)',
    jurisdiction: 'US-State',
    type: 'statute',
    status: 'pending',
    enacted_date: '2025-06-22',
    effective_date: '2026-01-01',
    summary:
      'Comprehensive Texas AI statute with an intent-based liability framework. Bars AI systems built to unlawfully discriminate, manipulate behavior, or produce certain unlawful content; requires state agencies to disclose when citizens interact with AI; restricts biometric capture. Attorney General has exclusive enforcement with a 60-day cure period, no private right of action. Signed 2025-06-22, effective 2026-01-01.',
    source_url: 'https://capitol.texas.gov/tlodocs/89R/billtext/pdf/HB00149I.pdf',
    citations: [],
    scope: ['general', 'discrimination', 'consumer-protection', 'public-sector'],
  },
  {
    id: 'us-il-hb-3773',
    title: 'Illinois HB 3773: AI in Employment (Human Rights Act amendment)',
    jurisdiction: 'US-State',
    type: 'statute',
    status: 'pending',
    enacted_date: '2024-08-09',
    effective_date: '2026-01-01',
    summary:
      'Amends the Illinois Human Rights Act to make it a civil-rights violation for an employer to use AI that discriminates based on protected characteristics in recruitment, hiring, promotion, discipline, or discharge, including via zip-code proxies, and to require employee notice when AI is used in such decisions. Effective 2026-01-01.',
    source_url: 'https://www.ilga.gov/Legislation/BillStatus?DocNum=3773&GAID=17&DocTypeID=HB&SessionID=112&GA=103',
    citations: [],
    scope: ['workplace', 'discrimination', 'transparency'],
  },
  {
    id: 'us-nist-ai-rmf',
    title: 'NIST AI Risk Management Framework (AI RMF 1.0, NIST AI 100-1)',
    jurisdiction: 'US-Federal',
    type: 'guidance',
    status: 'active',
    enacted_date: '2023-01-26',
    effective_date: null,
    summary:
      'Voluntary US framework from the National Institute of Standards and Technology for managing risks in the design, development, and use of AI. Organized around four functions (Govern, Map, Measure, Manage). Companion Generative AI Profile (NIST AI 600-1) was released 2024-07-26. Widely referenced as a de facto baseline in US and global AI governance.',
    source_url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    citations: ['https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf'],
    scope: ['general', 'safety', 'transparency'],
  },
  {
    id: 'eu-gpai-code-of-practice',
    title: 'EU AI Act General-Purpose AI Code of Practice',
    jurisdiction: 'EU',
    type: 'guidance',
    status: 'active',
    enacted_date: '2025-07-10',
    effective_date: '2025-08-02',
    summary:
      'Voluntary code prepared by independent experts to help providers of general-purpose AI models demonstrate compliance with the EU AI Act. Has three chapters (Transparency, Copyright, Safety and Security); the Safety and Security chapter applies only to GPAI models with systemic risk under Article 55. Published 2025-07-10; GPAI obligations applied from 2025-08-02.',
    source_url: 'https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai',
    citations: [],
    scope: ['transparency', 'safety', 'frontier-models'],
  },
  {
    id: 'eu-ai-act-prohibited-practices',
    title: 'EU AI Act Prohibited Practices (Article 5)',
    jurisdiction: 'EU',
    type: 'regulation',
    status: 'active',
    enacted_date: '2024-07-12',
    effective_date: '2025-02-02',
    summary:
      'The first binding phase of the EU AI Act to take effect: from 2025-02-02 the Article 5 bans on unacceptable-risk practices (manipulative AI, exploitation of vulnerabilities, social scoring, certain predictive policing, untargeted facial-image scraping, and emotion recognition in workplaces and schools) apply across the EU. Enforceable by member-state authorities from 2025-08-02.',
    source_url: 'https://artificialintelligenceact.eu/article/5/',
    citations: [],
    scope: ['high-risk', 'discrimination', 'deepfakes', 'general'],
  },
  {
    id: 'cn-ai-content-labeling',
    title: 'Measures for Labeling AI-Generated Synthetic Content',
    jurisdiction: 'China',
    type: 'regulation',
    status: 'active',
    enacted_date: '2025-03-14',
    effective_date: '2025-09-01',
    summary:
      'Cyberspace Administration of China rule requiring both explicit (visible) and implicit (metadata) labels on AI-generated text, images, audio, video, and virtual assets distributed on Chinese platforms, paired with the mandatory national standard GB 45438-2025. Issued 2025-03-14, effective 2025-09-01.',
    source_url: 'https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm',
    citations: ['https://www.chinalawtranslate.com/en/ai-labeling/'],
    scope: ['deepfakes', 'transparency'],
  },
  {
    id: 'kr-ai-basic-act',
    title: 'South Korea AI Basic Act (Framework Act on the Development of AI and Establishment of Trust)',
    jurisdiction: 'International',
    type: 'statute',
    status: 'active',
    enacted_date: '2025-01-21',
    effective_date: '2026-01-22',
    summary:
      "South Korea's comprehensive AI framework law, the second national comprehensive AI regime after the EU. Imposes transparency duties on generative and high-impact AI, safety obligations for high-impact systems, and establishes a national AI policy structure and an AI Safety Institute. Promulgated January 2025, effective 2026-01-22, with a roughly one-year enforcement grace period on fines.",
    source_url: 'https://www.loc.gov/item/global-legal-monitor/2026-02-20/south-korea-comprehensive-ai-legal-framework-takes-effect/',
    citations: [],
    scope: ['general', 'high-risk', 'transparency', 'safety'],
  },
  {
    id: 'jp-ai-promotion-act',
    title: 'Japan AI Promotion Act (Act on Promotion of Research and Development and Utilization of AI-Related Technologies)',
    jurisdiction: 'International',
    type: 'statute',
    status: 'active',
    enacted_date: '2025-05-28',
    effective_date: '2025-06-04',
    summary:
      "Japan's first AI-specific statute, taking an innovation-first, soft-law approach. Sets national AI policy principles and establishes an AI Strategy Headquarters within the Cabinet, but imposes no direct fines or prohibitions; the government may issue guidance, request information, or publicly name non-compliant actors. Passed 2025-05-28, mostly effective 2025-06-04, in full effect September 2025.",
    source_url: 'https://www.gov-online.go.jp/hlj/en/november_2025/november_2025-08.html',
    citations: [],
    scope: ['general', 'safety'],
  },
  {
    id: 'intl-un-ai-resolution',
    title: 'UN General Assembly Resolution A/RES/78/265 on Safe, Secure and Trustworthy AI',
    jurisdiction: 'International',
    type: 'declaration',
    status: 'active',
    enacted_date: '2024-03-21',
    effective_date: null,
    summary:
      'First UN General Assembly resolution on artificial intelligence (draft A/78/L.49), adopted by consensus and co-sponsored by 125 states with the US in the lead. Promotes safe, secure, and trustworthy AI for sustainable development and calls for bridging digital divides. Non-binding.',
    source_url: 'https://docs.un.org/en/A/RES/78/265',
    citations: ['https://press.un.org/en/2024/ga12588.doc.htm'],
    scope: ['general', 'safety'],
  },
  {
    id: 'au-mandatory-guardrails',
    title: 'Australia: Mandatory Guardrails for AI in High-Risk Settings (Proposals Paper)',
    jurisdiction: 'International',
    type: 'guidance',
    status: 'proposed',
    enacted_date: '2024-09-05',
    effective_date: null,
    summary:
      'Australian Government proposals paper (Department of Industry, Science and Resources) setting out 10 proposed mandatory guardrails for AI in high-risk settings, alongside a Voluntary AI Safety Standard. Defines high-risk AI and canvasses legislative options. Out for consultation; not yet enacted as binding law.',
    source_url: 'https://consult.industry.gov.au/ai-mandatory-guardrails',
    citations: [],
    scope: ['high-risk', 'safety', 'general'],
  },
  {
    id: 'sg-genai-governance-framework',
    title: 'Singapore Model AI Governance Framework for Generative AI',
    jurisdiction: 'International',
    type: 'guidance',
    status: 'active',
    enacted_date: '2024-05-30',
    effective_date: null,
    summary:
      "Voluntary framework from Singapore's Infocomm Media Development Authority and the AI Verify Foundation, extending the earlier Model AI Governance Framework to generative AI. Sets out nine dimensions (including accountability, content provenance, security, and testing) for a trusted GenAI ecosystem. Non-binding guidance.",
    source_url: 'https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/press-releases/2024/public-consult-model-ai-governance-framework-genai',
    citations: ['https://aiverifyfoundation.sg/wp-content/uploads/2024/06/Model-AI-Governance-Framework-for-Generative-AI-19-June-2024.pdf'],
    scope: ['general', 'transparency', 'safety'],
  },
];

export const POLICY_REGISTRY_LAST_UPDATED = '2026-06-04';

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
  'frontier-models',
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
