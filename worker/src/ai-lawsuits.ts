/**
 * AI lawsuits and regulatory actions catalog.
 *
 * Active and notable disputes involving frontier AI labs, training-data
 * providers, deployment platforms, and regulators. Each entry summarizes
 * the parties, jurisdiction, claims, current procedural stage, and
 * primary-source citations.
 *
 * EDITORIAL DISCLAIMER: This is a journalism-grade summary catalog
 * compiled from public court filings and reputable news coverage. It is
 * NOT legal advice, NOT a substitute for reading the underlying filings,
 * and case statuses change. Always verify against the cited sources
 * before acting on any of this. We update on redeploy.
 *
 * Served at /api/ai-lawsuits (free, cached 600s).
 */

export type LawsuitStatus = 'active' | 'settled' | 'dismissed' | 'judgment' | 'consolidated' | 'withdrawn';

export type LawsuitStage =
  | 'complaint'
  | 'motion-to-dismiss'
  | 'discovery'
  | 'summary-judgment'
  | 'trial'
  | 'appeal'
  | 'closed';

export type LawsuitClaim =
  | 'copyright-infringement'
  | 'dmca-violation'
  | 'trademark-infringement'
  | 'unfair-competition'
  | 'right-of-publicity'
  | 'privacy'
  | 'breach-of-contract'
  | 'unjust-enrichment'
  | 'antitrust'
  | 'consumer-protection'
  | 'tort'
  | 'regulatory-investigation';

export interface AILawsuit {
  id: string;
  name: string;
  plaintiff: string;
  defendants: string[];
  jurisdiction: string;
  court: string;
  caseNumber: string | null;
  filed: string;          // YYYY-MM or YYYY-MM-DD when known
  status: LawsuitStatus;
  stage: LawsuitStage;
  claims: LawsuitClaim[];
  summary: string;        // 2-3 sentence neutral summary
  /** Primary citation URLs: court docket, news coverage, complaint PDFs. */
  sources: string[];
}

export const AI_LAWSUITS_CATALOG: AILawsuit[] = [
  // ── Copyright: news publishers vs LLM trainers ────────────────
  {
    id: 'nyt-v-openai',
    name: 'The New York Times Co. v. Microsoft Corp. & OpenAI',
    plaintiff: 'The New York Times Company',
    defendants: ['Microsoft Corporation', 'OpenAI, Inc.', 'OpenAI LP', 'OpenAI GP'],
    jurisdiction: 'US (S.D.N.Y.)',
    court: 'United States District Court for the Southern District of New York',
    caseNumber: '1:23-cv-11195',
    filed: '2023-12-27',
    status: 'active',
    stage: 'discovery',
    claims: ['copyright-infringement', 'dmca-violation', 'unfair-competition'],
    summary: 'NYT alleges OpenAI and Microsoft trained GPT-class models on millions of NYT articles without license and that ChatGPT outputs reproduce articles verbatim. Most-cited AI training-data case; partial motion-to-dismiss granted in 2025-04 on some claims, copyright claims survived.',
    sources: [
      'https://www.courtlistener.com/docket/68117049/the-new-york-times-company-v-microsoft-corporation/',
      'https://www.nytimes.com/2023/12/27/business/media/new-york-times-open-ai-microsoft-lawsuit.html',
    ],
  },
  {
    id: 'daily-news-v-openai',
    name: 'Daily News, LP et al. v. Microsoft Corp. & OpenAI',
    plaintiff: 'Daily News LP, Chicago Tribune, Denver Post, Orlando Sentinel, Sun Sentinel, San Jose Mercury News, Orange County Register, St. Paul Pioneer Press (eight Alden Global Capital papers)',
    defendants: ['Microsoft Corporation', 'OpenAI, Inc.', 'OpenAI subsidiaries'],
    jurisdiction: 'US (S.D.N.Y.)',
    court: 'United States District Court for the Southern District of New York',
    caseNumber: '1:24-cv-03285',
    filed: '2024-04-30',
    status: 'consolidated',
    stage: 'discovery',
    claims: ['copyright-infringement', 'dmca-violation'],
    summary: 'Eight US newspapers owned by Alden Global Capital consolidated their suits with NYT v OpenAI alleging the same training-data harvesting pattern. Procedural consolidation under the NYT case for discovery.',
    sources: [
      'https://www.alden.global',
      'https://www.theverge.com/2024/4/30/24145402/alden-global-newspapers-openai-microsoft-lawsuit-copyright',
    ],
  },
  {
    id: 'cir-v-openai',
    name: 'Center for Investigative Reporting v. OpenAI & Microsoft',
    plaintiff: 'Center for Investigative Reporting (Mother Jones, Reveal)',
    defendants: ['OpenAI, Inc.', 'Microsoft Corporation'],
    jurisdiction: 'US (S.D.N.Y.)',
    court: 'United States District Court for the Southern District of New York',
    caseNumber: '1:24-cv-04872',
    filed: '2024-06-27',
    status: 'active',
    stage: 'discovery',
    claims: ['copyright-infringement', 'dmca-violation'],
    summary: 'Investigative-journalism nonprofit alleges OpenAI scraped CIR\'s reporting from Mother Jones and Reveal for training, and that ChatGPT regurgitates articles without attribution.',
    sources: [
      'https://revealnews.org/article/center-for-investigative-reporting-sues-openai-microsoft/',
    ],
  },
  {
    id: 'raw-story-v-openai',
    name: 'Raw Story Media v. OpenAI',
    plaintiff: 'Raw Story Media; AlterNet Media',
    defendants: ['OpenAI, Inc.'],
    jurisdiction: 'US (S.D.N.Y.)',
    court: 'United States District Court for the Southern District of New York',
    caseNumber: '1:24-cv-01514',
    filed: '2024-02-28',
    status: 'dismissed',
    stage: 'closed',
    claims: ['dmca-violation'],
    summary: 'DMCA-only theory (CMI removal) without a copyright claim. Dismissed for lack of standing 2024-11; plaintiffs filed an amended complaint.',
    sources: [
      'https://www.reuters.com/legal/litigation/openai-defeats-news-outlets-copyright-lawsuit-over-ai-training-data-2024-11-08/',
    ],
  },
  {
    id: 'newscorp-v-perplexity',
    name: 'Dow Jones & NYP Holdings v. Perplexity AI',
    plaintiff: 'Dow Jones & Company; NYP Holdings (News Corp)',
    defendants: ['Perplexity AI, Inc.'],
    jurisdiction: 'US (S.D.N.Y.)',
    court: 'United States District Court for the Southern District of New York',
    caseNumber: '1:24-cv-07984',
    filed: '2024-10-21',
    status: 'active',
    stage: 'motion-to-dismiss',
    claims: ['copyright-infringement', 'unfair-competition', 'trademark-infringement'],
    summary: 'WSJ and NY Post owners allege Perplexity\'s answer engine copies and republishes their reporting verbatim and falsely attributes its summaries. First major lawsuit specifically targeting an AI search-and-summarize product, distinct from the model-training cases.',
    sources: [
      'https://www.wsj.com/business/media/news-corp-sues-perplexity-ai-claiming-massive-illegal-copying-of-articles-c30b3eb6',
    ],
  },

  // ── Copyright: book authors ───────────────────────────────────
  {
    id: 'authors-guild-v-openai',
    name: 'Authors Guild et al. v. OpenAI (consolidated)',
    plaintiff: 'Authors Guild, John Grisham, George R.R. Martin, Jodi Picoult, David Baldacci, Michael Connelly, others',
    defendants: ['OpenAI, Inc.', 'Microsoft Corporation'],
    jurisdiction: 'US (S.D.N.Y.)',
    court: 'United States District Court for the Southern District of New York',
    caseNumber: '1:23-cv-08292',
    filed: '2023-09-19',
    status: 'consolidated',
    stage: 'discovery',
    claims: ['copyright-infringement'],
    summary: 'Class action by 17 named novelists plus the Authors Guild alleging OpenAI trained on copyrighted novels via Books2/Books3 and similar shadow-library corpora. Consolidated with related novelist suits (Tremblay, Silverman, Chabon) under MDL coordination.',
    sources: [
      'https://authorsguild.org/news/ag-and-authors-file-class-action-suit-against-openai/',
      'https://www.courtlistener.com/docket/67810111/authors-guild-v-openai-inc/',
    ],
  },
  {
    id: 'silverman-v-openai',
    name: 'Silverman v. OpenAI',
    plaintiff: 'Sarah Silverman, Christopher Golden, Richard Kadrey',
    defendants: ['OpenAI, Inc.'],
    jurisdiction: 'US (N.D. Cal.)',
    court: 'United States District Court for the Northern District of California',
    caseNumber: '3:23-cv-03416',
    filed: '2023-07-07',
    status: 'consolidated',
    stage: 'discovery',
    claims: ['copyright-infringement', 'dmca-violation', 'unjust-enrichment'],
    summary: 'Author class action alleging training on copyrighted books from shadow libraries (Books3 / LibGen). Most secondary claims (DMCA, negligence, unjust enrichment) dismissed 2024-02; copyright claims survived and entered consolidated discovery.',
    sources: [
      'https://www.courtlistener.com/docket/67569326/tremblay-v-openai-inc/',
      'https://www.theverge.com/2023/7/9/23788741/sarah-silverman-openai-meta-chatgpt-llama-copyright-infringement-chatbots-artificial-intelligence-ai',
    ],
  },
  {
    id: 'kadrey-v-meta',
    name: 'Kadrey v. Meta Platforms (Llama)',
    plaintiff: 'Richard Kadrey, Sarah Silverman, Christopher Golden',
    defendants: ['Meta Platforms, Inc.'],
    jurisdiction: 'US (N.D. Cal.)',
    court: 'United States District Court for the Northern District of California',
    caseNumber: '3:23-cv-03417',
    filed: '2023-07-07',
    status: 'active',
    stage: 'summary-judgment',
    claims: ['copyright-infringement'],
    summary: 'Same plaintiff group, parallel claim against Meta over Llama training on Books3. Discovery surfaced internal Meta communications discussing the use of pirated book corpora; partial summary judgment briefing in 2025.',
    sources: [
      'https://www.courtlistener.com/docket/67569329/kadrey-v-meta-platforms-inc/',
      'https://arstechnica.com/tech-policy/2025/01/meta-staff-discussed-using-pirated-books-to-train-ai-court-filings-show/',
    ],
  },

  // ── Copyright: code ──────────────────────────────────────────
  {
    id: 'doe-v-github',
    name: 'Doe et al. v. GitHub, OpenAI, Microsoft (Copilot)',
    plaintiff: 'Anonymous open-source developers',
    defendants: ['GitHub, Inc.', 'Microsoft Corporation', 'OpenAI, Inc.'],
    jurisdiction: 'US (N.D. Cal.)',
    court: 'United States District Court for the Northern District of California',
    caseNumber: '4:22-cv-06823',
    filed: '2022-11-03',
    status: 'active',
    stage: 'discovery',
    claims: ['dmca-violation', 'breach-of-contract', 'unfair-competition', 'unjust-enrichment'],
    summary: 'Putative class action by open-source developers alleging GitHub Copilot reproduces their code without honoring open-source license attribution requirements. Most copyright claims dismissed 2023-2024; DMCA and breach-of-license claims survived to discovery.',
    sources: [
      'https://githubcopilotlitigation.com',
      'https://www.courtlistener.com/docket/63992594/doe-v-github-inc/',
    ],
  },

  // ── Copyright: visual / image ─────────────────────────────────
  {
    id: 'andersen-v-stability',
    name: 'Andersen v. Stability AI, Midjourney, DeviantArt, Runway',
    plaintiff: 'Sarah Andersen, Kelly McKernan, Karla Ortiz, others (artist class)',
    defendants: ['Stability AI Ltd.', 'Stability AI, Inc.', 'Midjourney, Inc.', 'DeviantArt, Inc.', 'Runway AI, Inc.'],
    jurisdiction: 'US (N.D. Cal.)',
    court: 'United States District Court for the Northern District of California',
    caseNumber: '3:23-cv-00201',
    filed: '2023-01-13',
    status: 'active',
    stage: 'discovery',
    claims: ['copyright-infringement', 'dmca-violation', 'right-of-publicity', 'unfair-competition'],
    summary: 'First major class action by visual artists alleging diffusion-model training on LAION-scraped artwork without license. Amended complaint in 2023-11 added Runway and Midjourney; key copyright claims survived motion-to-dismiss in 2024-08.',
    sources: [
      'https://www.courtlistener.com/docket/66735377/andersen-v-stability-ai-ltd/',
      'https://www.theverge.com/2024/8/13/24220231/stability-midjourney-deviantart-runway-andersen-copyright-class-action-allowed-proceed',
    ],
  },
  {
    id: 'getty-v-stability-us',
    name: 'Getty Images (US) v. Stability AI',
    plaintiff: 'Getty Images (US), Inc.',
    defendants: ['Stability AI, Inc.', 'Stability AI Ltd.'],
    jurisdiction: 'US (D. Del.)',
    court: 'United States District Court for the District of Delaware',
    caseNumber: '1:23-cv-00135',
    filed: '2023-02-03',
    status: 'active',
    stage: 'discovery',
    claims: ['copyright-infringement', 'trademark-infringement', 'unfair-competition'],
    summary: 'Getty alleges Stable Diffusion was trained on millions of Getty-watermarked images and reproduces the Getty watermark in some generations. The watermark issue is rare among training-data cases because it provides direct evidence of the training corpus contents.',
    sources: [
      'https://newsroom.gettyimages.com/en/getty-images/getty-images-statement',
      'https://www.courtlistener.com/docket/66878049/getty-images-us-inc-v-stability-ai-inc/',
    ],
  },
  {
    id: 'getty-v-stability-uk',
    name: 'Getty Images (UK) v. Stability AI Ltd.',
    plaintiff: 'Getty Images (US), Inc.; Getty Images International (UK)',
    defendants: ['Stability AI Ltd.'],
    jurisdiction: 'UK (England and Wales)',
    court: 'High Court of Justice, Business and Property Courts of England and Wales',
    caseNumber: 'IL-2023-000007',
    filed: '2023-01',
    status: 'active',
    stage: 'trial',
    claims: ['copyright-infringement', 'trademark-infringement'],
    summary: 'Parallel UK proceeding to the Delaware case. UK trial reached merits in 2025 with closer scrutiny of where training actually occurred (UK courts apply territorial limits to copyright). One of the first AI training cases to reach trial in any jurisdiction.',
    sources: [
      'https://www.judiciary.uk/judgments/getty-images-v-stability-ai/',
    ],
  },

  // ── Copyright: music ──────────────────────────────────────────
  {
    id: 'concord-v-anthropic',
    name: 'Concord Music Group v. Anthropic',
    plaintiff: 'Concord Music Group, Universal Music Publishing Group, ABKCO',
    defendants: ['Anthropic PBC'],
    jurisdiction: 'US (M.D. Tenn.)',
    court: 'United States District Court for the Middle District of Tennessee',
    caseNumber: '3:23-cv-01092',
    filed: '2023-10-18',
    status: 'active',
    stage: 'discovery',
    claims: ['copyright-infringement', 'dmca-violation', 'unfair-competition'],
    summary: 'Music publishers allege Claude was trained on copyrighted song lyrics and outputs them verbatim on request. Anthropic implemented output filters in 2024 in response; preliminary injunction denied 2024-03 on a narrow set of claims, case continues on the broader theory.',
    sources: [
      'https://www.courtlistener.com/docket/67862254/concord-music-group-inc-v-anthropic-pbc/',
      'https://www.billboard.com/business/legal/anthropic-claude-ai-music-publishers-lyrics-lawsuit-1235427547/',
    ],
  },
  {
    id: 'riaa-v-suno',
    name: 'RIAA v. Suno',
    plaintiff: 'UMG Recordings, Sony Music Entertainment, Warner Records (RIAA member labels)',
    defendants: ['Suno, Inc.'],
    jurisdiction: 'US (D. Mass.)',
    court: 'United States District Court for the District of Massachusetts',
    caseNumber: '1:24-cv-11611',
    filed: '2024-06-24',
    status: 'active',
    stage: 'discovery',
    claims: ['copyright-infringement'],
    summary: 'Major labels allege Suno trained its music-generation model on copyrighted recordings, with outputs that closely replicate the style and in some cases the melodic content of named tracks. Companion case RIAA v. Udio filed same day in S.D.N.Y.',
    sources: [
      'https://www.riaa.com/wp-content/uploads/2024/06/UMG-Recordings-et-al-v-Suno-Inc-et-al-Complaint.pdf',
    ],
  },
  {
    id: 'riaa-v-udio',
    name: 'RIAA v. Udio (Uncharted Labs)',
    plaintiff: 'UMG Recordings, Sony Music Entertainment, Warner Records (RIAA member labels)',
    defendants: ['Uncharted Labs, Inc. (d/b/a Udio)'],
    jurisdiction: 'US (S.D.N.Y.)',
    court: 'United States District Court for the Southern District of New York',
    caseNumber: '1:24-cv-04777',
    filed: '2024-06-24',
    status: 'active',
    stage: 'discovery',
    claims: ['copyright-infringement'],
    summary: 'Companion case to RIAA v Suno, same theory against Udio. Filed same day. Both cases consolidated in their respective districts for procedural efficiency.',
    sources: [
      'https://www.riaa.com/wp-content/uploads/2024/06/Sony-Music-et-al-v-Uncharted-Labs-dba-Udio-Complaint.pdf',
    ],
  },

  // ── Privacy / right of publicity ──────────────────────────────
  {
    id: 'lehrman-v-lovo',
    name: 'Lehrman v. Lovo',
    plaintiff: 'Paul Skye Lehrman, Linnea Sage (voice actors)',
    defendants: ['Lovo, Inc.'],
    jurisdiction: 'US (S.D.N.Y.)',
    court: 'United States District Court for the Southern District of New York',
    caseNumber: '1:24-cv-03770',
    filed: '2024-05-16',
    status: 'active',
    stage: 'discovery',
    claims: ['copyright-infringement', 'right-of-publicity', 'unfair-competition'],
    summary: 'Voice actors allege their voices were cloned and offered as TTS products on Lovo without consent. Test case for AI voice cloning and right-of-publicity in the federal courts.',
    sources: [
      'https://www.nytimes.com/2024/05/16/technology/lovo-ai-voice-actors-lawsuit.html',
    ],
  },

  // ── Antitrust / regulatory ────────────────────────────────────
  {
    id: 'ftc-openai-microsoft-inquiry',
    name: 'FTC inquiry: AI partnerships and investments',
    plaintiff: 'US Federal Trade Commission (Section 6(b) inquiry)',
    defendants: ['Microsoft', 'Alphabet', 'Amazon', 'OpenAI', 'Anthropic'],
    jurisdiction: 'US (federal regulatory)',
    court: 'Federal Trade Commission',
    caseNumber: 'FTC Inquiry P246201',
    filed: '2024-01-25',
    status: 'active',
    stage: 'discovery',
    claims: ['antitrust', 'regulatory-investigation'],
    summary: 'FTC ordered Microsoft, Alphabet, Amazon, OpenAI, and Anthropic to submit details of generative-AI investments and partnerships, focused on whether large-cloud-provider stakes in frontier labs distort competition. Staff report issued 2025-01.',
    sources: [
      'https://www.ftc.gov/news-events/news/press-releases/2024/01/ftc-launches-inquiry-generative-ai-investments-partnerships',
    ],
  },
  {
    id: 'eu-microsoft-openai-review',
    name: 'EU Commission review: Microsoft / OpenAI partnership',
    plaintiff: 'European Commission (Directorate-General for Competition)',
    defendants: ['Microsoft Corporation', 'OpenAI'],
    jurisdiction: 'EU',
    court: 'European Commission',
    caseNumber: 'M.11766',
    filed: '2024-01',
    status: 'active',
    stage: 'discovery',
    claims: ['antitrust', 'regulatory-investigation'],
    summary: 'EU competition authorities reviewing whether Microsoft\'s investment in and integration with OpenAI amounts to a notifiable concentration under the EU Merger Regulation. As of late 2024 EC concluded no de jure control by Microsoft, but informal market inquiries continue.',
    sources: [
      'https://ec.europa.eu/competition/mergers/cases1/202404/M_11766_11254399_25_3.pdf',
    ],
  },

  // ── Tort / consumer protection ────────────────────────────────
  {
    id: 'garcia-v-character-ai',
    name: 'Garcia v. Character Technologies',
    plaintiff: 'Megan Garcia (estate of Sewell Setzer III)',
    defendants: ['Character Technologies, Inc.', 'Google LLC', 'Alphabet Inc.'],
    jurisdiction: 'US (M.D. Fla.)',
    court: 'United States District Court for the Middle District of Florida',
    caseNumber: '6:24-cv-01903',
    filed: '2024-10-22',
    status: 'active',
    stage: 'motion-to-dismiss',
    claims: ['tort', 'consumer-protection', 'unfair-competition'],
    summary: 'Wrongful-death and product-liability suit alleging Character.AI\'s chatbot contributed to a 14-year-old\'s suicide. First high-profile product-liability test for a consumer LLM chatbot.',
    sources: [
      'https://www.nytimes.com/2024/10/23/technology/characterai-lawsuit-teen-suicide.html',
    ],
  },
];

export const AI_LAWSUITS_LAST_UPDATED = '2026-05-04';
