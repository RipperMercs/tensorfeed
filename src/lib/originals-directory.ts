/**
 * Originals directory: single source of truth for all editorial articles.
 * Used by the /originals index page AND the homepage "Latest from TensorFeed" section.
 *
 * IMPORTANT: Add new articles to the TOP of this array (newest first).
 * The homepage automatically displays the first 3 entries.
 */

export interface OriginalArticle {
  slug: string;
  title: string;
  author: string;
  date: string;
  readTime: string;
  description: string;
}

export const ORIGINALS: OriginalArticle[] = [
  {
    slug: 'anthropic-karpathy-four-moves-one-week',
    title:
      'Karpathy Joined Anthropic. That Is the Fourth Structural Move in One Week.',
    author: 'Marcus Chen',
    date: 'May 19, 2026',
    readTime: '6 min read',
    description:
      'Andrej Karpathy, an OpenAI founding member, joined Anthropic on May 19 to help launch a team that uses Claude to accelerate its own pretraining. Read in isolation it is a talent coup. Read against the last seven days it is the fourth structural move Anthropic has made, each on a different layer of the stack: capacity (Claude Code limits), capital (a reported $900B round), supply chain (the Stainless SDK pipeline), and now talent. The pattern is the story, and talent is the apex because it is the one layer a term sheet cannot buy.',
  },
  {
    slug: 'anthropic-stainless-sdk-supply-chain',
    title:
      'Anthropic Bought the Pipeline Its Rivals Ship Their SDKs On. Then It Turned the Hosted Product Off.',
    author: 'Marcus Chen',
    date: 'May 19, 2026',
    readTime: '6 min read',
    description:
      'Anthropic acquired Stainless, the codegen company that generates the official SDKs (and MCP servers) for OpenAI, Google, Cloudflare, Runway, and Anthropic itself, reportedly for more than $300 million against a $150M Series A seventeen months earlier. Then it said it will wind down every hosted Stainless product. The frozen-SDK reassurance is real and beside the point: the asset was never the generated code, it was the regeneration loop, and that loop is now an Anthropic internal tool. A supply-chain move on the layer between an API and the agents that call it, wearing an acquisition’s clothes.',
  },
  {
    slug: 'openai-chatgpt-bank-access-agent-trust-gap',
    title:
      'OpenAI Wants ChatGPT in Your Bank Account. That Is the Opposite of How Agent Money Should Work.',
    author: 'Ripper',
    date: 'May 17, 2026',
    readTime: '5 min read',
    description:
      'OpenAI is wiring ChatGPT into financial accounts through a Plaid connection. Broad standing access to your bank is the convenient answer and the wrong architecture. The other one is not theoretical: no custody, per-action authorization, a signed receipt for every paid call. Today our own /api/stats crossed into the thousands of verifiable paid agent calls, each with a receipt an auditor can check against our published key. That contrast is the whole argument: convenience is winning the demo, it should not win the standard.',
  },
  {
    slug: 'mistral-europe-ai-sovereignty-two-year-clock',
    title:
      'Mistral Says Europe Has Two Years. The Compute Map Says the Clock Runs Faster Than That.',
    author: 'Kira Nolan',
    date: 'May 17, 2026',
    readTime: '6 min read',
    description:
      'The Mistral CEO told Europe it has roughly two years to avoid becoming an American AI vassal state. Read against the data we already publish, the warning is correct and the timeline is generous: the frontier tier on our model catalog is almost entirely US labs, attention concentrates there too, and the compute that decides the next two years is being financed through American IPOs and Gulf capital. The model layer is not where Europe is behind. The layers under it are.',
  },
  {
    slug: 'codex-bleed-anthropic-three-interventions',
    title:
      'The Codex Bleed: Anthropic Just Made Its Third Capacity Move in Five Weeks',
    author: 'Marcus Chen',
    date: 'May 16, 2026',
    readTime: '7 min read',
    description:
      'Anthropic bumped Claude Code weekly limits 50 percent through July 13, then re-allowed third-party agent harnesses on paid plans behind a separate credit meter, then watched Sam Altman dangle two free months of Codex at every new business customer. Three live interventions on the same product surface in 35 days. Inside the 4.2x token-efficiency gap that makes Codex structurally cheaper to deliver, the $900B funding round running on top of the same unit-economics problem, and the July 13 sunset that gives Anthropic eight weeks to figure out what the agent subscription actually costs.',
  },
  {
    slug: 'cerebras-95-billion-ipo-inference-bet',
    title:
      'Cerebras Went Public at a $95 Billion Close. The Non-Nvidia Inference Bet Is Now a Market Story.',
    author: 'Marcus Chen',
    date: 'May 16, 2026',
    readTime: '7 min read',
    description:
      'Cerebras priced its IPO at $185, above the raised $150 to $160 range, opened at $350 on May 14, and closed day one up 68 percent near a $95 billion market cap, then gave back about 10 percent on day two. The largest US tech IPO since Uber in 2019 sits on $510 million of revenue, a non-GAAP loss, a $10 billion OpenAI contract, and 86 percent revenue from two UAE entities. The mechanics, the asterisks, and what it does to the compute capital map.',
  },
  {
    slug: 'wafer-scale-vs-gpu-what-cerebras-sells',
    title:
      'Wafer-Scale vs the GPU: What Cerebras Actually Sells, and Why It Only Matters for Inference',
    author: 'Ripper',
    date: 'May 16, 2026',
    readTime: '6 min read',
    description:
      'Now that Cerebras is public, the question is the chip, not the valuation. The WSE-3 is one 46,225 square millimeter die: 4 trillion transistors, 900,000 cores, the whole model resident in on-wafer SRAM. Cerebras and Artificial Analysis report Llama 4 Maverick at 2,522 tokens per second against 1,038 on Nvidia Blackwell. Why on-wafer residence collapses token latency, why latency is the cost that compounds in agent loops, and the honest bear case.',
  },
  {
    slug: 'cerebras-g42-cfius-national-security-tax',
    title:
      'Cerebras Cleared the IPO. It Did Not Clear the G42 Question.',
    author: 'Kira Nolan',
    date: 'May 16, 2026',
    readTime: '6 min read',
    description:
      'The CFIUS review of the G42 stake is what postponed this exact IPO in 2024. The 2026 listing went through after the investment was restructured into non-voting shares and the notice was withdrawn, not after the dependence was removed. The 86 percent revenue concentration in two UAE entities is still in the S-1 as a risk. Why national-security scrutiny was papered rather than resolved, and why it is now a structural tax on the 2026 AI-silicon IPO class.',
  },
  {
    slug: 'live-ai-status-widget',
    title: 'We Made AI Status Embeddable: One Line of HTML, Live on Any Site',
    author: 'Ripper',
    date: 'May 15, 2026',
    readTime: '6 min read',
    description:
      'We shipped a free, self-contained widget that drops a real-time AI status console onto any site with one line of HTML. Sixteen LLM providers and counting, real p95 latency where we probe and real seven-day uptime where we do not, no fabricated charts, no cry-wolf alarms, no ads. Inside the honest-by-construction engineering (vendor status authoritative, the probe never overrides it, NO DATA is never an outage), why an embeddable trust widget is the cleanest discovery loop for humans and agents, and the three ways to embed it: one line of HTML, the zero-dependency @tensorfeed/status-widget npm component, or the browser extension on the way.',
  },
  {
    slug: 'ai-week-may-15-2026',
    title:
      'This Week in AI: Four Days to I/O, Eight Models Going Dark, and a $950B Number',
    author: 'Kira Nolan',
    date: 'May 15, 2026',
    readTime: '7 min read',
    description:
      "Google sandbagged its own keynote with the Android Show and shipped Gemini Intelligence on Monday. Anthropic let the $900B to $950B valuation talks leak Tuesday. xAI sunsets eight models at noon Pacific today. Apple started rewriting App Store rules for autonomous agents. Amazon killed Rufus and replaced it with Alexa for Shopping. The Snap-Perplexity $400M deal collapsed. The pre-Google-I/O positioning week ran louder than the keynote it leads into. Inside the seven moves that mattered and what to watch when Sundar takes the stage Tuesday.",
  },
  {
    slug: 'google-a2a-x402-payments-extension',
    title:
      'Google Just Put 60 Payment Companies Behind a Crypto-Native Agent Rail',
    author: 'Marcus Chen',
    date: 'May 14, 2026',
    readTime: '6 min read',
    description:
      "Google's A2A x402 extension shipped v0.2 with a coalition that includes Mastercard, American Express, PayPal, Adyen, Worldpay, JCB, UnionPay, Coinbase, Circle, MetaMask, the Ethereum Foundation, Etsy, Salesforce, ServiceNow, and roughly forty others. A coalition that size has not formed around a payments standard since ISO 8583. Inside what the spec reuses from canonical x402 V2 (PaymentRequirements, PaymentPayload, EIP-3009 settlement, all identical), what is genuinely new (JSON-RPC transport over A2A messages, AgentCard discovery, the Global A2A Registry), and why the acceptance side of agent commerce is being laid before the demand side has arrived.",
  },
  {
    slug: 'cve-data-layer-matters-now',
    title:
      '271 Zero-Days, Five Schemas: The AI-Cyber Data Layer Just Got Load-Bearing',
    author: 'Ripper',
    date: 'May 14, 2026',
    readTime: '5 min read',
    description:
      'AI-driven vulnerability discovery is no longer theoretical. Claude Mythos surfaced 271 Firefox zero-days in one cycle. The third major Linux kernel flaw in two weeks was attributed to AI-assisted research. OpenAI Daybreak shipped two days ago. The agents finding vulns now move faster than the data layer they need to call. Inside the five-schemas-five-cadences problem (MITRE CVE, CISA KEV, FIRST EPSS, OSV, Vulnrichment), the cross-database verified-CVE call we ship as the fix, and why TensorFeed cares about a security data layer it does not build agents on top of. We also shipped /cve-watch today as the canonical hub.',
  },
  {
    slug: 'agentic-usdc-pay-and-trade-converge',
    title:
      'Same Dollar, Same Chain, Same Custodian: The Agentic USDC Stack Is Converging',
    author: 'Ripper',
    date: 'May 14, 2026',
    readTime: '6 min read',
    description:
      "AgentCore Payments uses USDC for agents to buy APIs. Hyperliquid just standardized USDC as agent trading collateral, with Coinbase as official treasury deployer and Circle staking HYPE. We settled five real x402 payments through CDP this morning, each $0.02 on Base, broadcast by Coinbase's own facilitator wallet. The agent economy plumbing is converging on one asset, one chain, one custodian. Inside what the two announcements actually mean for builders, the boring detail nobody is leading with, and what is still missing (Bazaar indexing is broken, agentic.market is closed, but the underlying just stopped moving).",
  },
  {
    slug: 'apple-20-day-window-io-wwdc',
    title: "Apple Just Got a 20-Day Window. Between Google I/O and WWDC, It Has To Rewrite the Siri Story.",
    author: 'Ripper',
    date: 'May 14, 2026',
    readTime: '7 min read',
    description:
      "Google I/O lands May 19. Apple WWDC lands June 8. That is a 20-day gap, and it is the most valuable counterprogramming window Apple has gotten in a decade. Inside what Gemini 4 is expected to reveal, what Apple can still swap into the WWDC keynote in three weeks (with a difficulty-ranked move list), why the Siri-as-router framing is the only outcome that preserves Apple's margin position long term, the 2014 and 2017 historical precedents for this exact calendar shape, and the three signposts I am watching between May 19 and June 8.",
  },
  {
    slug: 'ferc-ai-data-center-bypass-watch',
    title: 'The FERC Ruling Watch: One Decision Could Reshape Every AI Nuclear Deal',
    author: 'Marcus Chen',
    date: 'May 13, 2026',
    readTime: '6 min read',
    description:
      "The single highest-stakes pending regulatory decision in the AI buildout is not at the NRC, not at the EPA, not in any state utility commission. It is at FERC, in the matter of the Amazon-Talen Susquehanna interconnection service amendment. In November 2024 FERC blocked the amended ISA that would have let Amazon scale its draw from 480 MW to 960 MW behind the meter; the matter is still procedurally open. Inside the state of play, what FERC has to decide, the three possible outcomes (approves bypass / rejects / splits), the projects at stake on each side (Constellation, Vistra, Dominion, plus Meta + Apple + xAI waiting to file), and the signposts to watch as the decision approaches. Live watch piece, will update when the ruling lands.",
  },
  {
    slug: 'ai-compute-orbital-thesis',
    title: 'AI Compute in Orbit: The Long-Arc Thesis. Why Solar + Vacuum Beats Texas + Gas (Eventually).',
    author: 'Ripper',
    date: 'May 13, 2026',
    readTime: '7 min read',
    description:
      "The reason orbital compute is worth taking seriously is not that we are anywhere near building it. We are not. The reason is that the four constraints terrestrial AI infrastructure runs into right now (grid bottlenecks, water draws, permits, NIMBY) all go away in orbit, and the one constraint that replaces them (launch cost) is the one with a curve actively bending the right way. Inside the math on continuous solar plus vacuum cooling, what Starship economics unlock, the four catches (radiation hardening, mass, ground bandwidth, $/kg), who is exploring (Anthropic + SpaceX, Google Project Suncatcher, Starcloud, defense primes, China), and why this is the 2030-plus long-arc thesis sitting under the 2026 short-cycle gigawatt buildout.",
  },
  {
    slug: 'ai-nuclear-restart-thesis',
    title: 'AI Just Reopened American Nuclear. Inside the Eighteen-Month Shift.',
    author: 'Marcus Chen',
    date: 'May 13, 2026',
    readTime: '8 min read',
    description:
      "For thirty years US utility nuclear was in retreat. New plants got cancelled, old plants got retired, and the orthodoxy said we were done building reactors. Then in eighteen months: Microsoft signed a 20-year PPA to restart Three Mile Island Unit 1, Amazon bought a direct feed from Talen Susquehanna, Google signed with Kairos Power for up to 500 MW of SMRs, Amazon backed X-energy, Oracle announced three SMRs. AI capital just reopened American nuclear. Inside the deals, why nuclear fits AI workloads so cleanly (24/7 baseload, 20-year PPAs, the carbon math), the FERC fight on grid bypass that could unravel the direct-feed structures, the SMR pipeline behind the restarts (Kairos, X-energy, NuScale, TerraPower), and four signposts to watch over the next twelve months.",
  },
  {
    slug: 'ai-buildout-explained',
    title: 'The AI Buildout, Plain English: What Is Actually Getting Built',
    author: 'Marcus Chen',
    date: 'May 13, 2026',
    readTime: '7 min read',
    description:
      "The AI industry is putting steel and concrete in the ground at a pace nobody has seen since the dotcom buildout of physical fiber. Stargate, Hyperion, Colossus, nuclear restarts at Three Mile Island, hyperscaler campuses heading for two-gigawatt single-site draw. A plain-English read of what is being built, where, with what power, and what it means for the AI we use. Inside the structural shift to higher silicon density and flatter workload profiles, why hyperscalers are reopening reactors the previous decade closed, the three flashpoints (water draws, grid bypass, local pushback), and why pricing floors for the next three years are set by which campuses come online when. Companion to the new /ai-infrastructure tracker.",
  },
  {
    slug: 'google-gemini-intelligence-android-platform-shift',
    title: "Google Just Renamed Android to an 'Intelligence System.' Apple's WWDC Bar Just Got Higher.",
    author: 'Marcus Chen',
    date: 'May 13, 2026',
    readTime: '7 min read',
    description:
      "At The Android Show: I/O Edition on May 12, 2026, Google introduced Gemini Intelligence, a cross-app agentic layer that reads your screen, fills forms, drives Chrome, and books reservations, plus Googlebook, a new Android laptop category. Sameer Samat called it a transition from operating system to intelligence system. Six days before I/O proper, this is what Google decided was important enough to bank ahead of the keynote. Inside what shipped (cross-app agent, Auto-Browse in Chrome, Smart Form Fill, Rambler dictation, Custom Widgets, proactive context), the Android Auto refresh across 250 million vehicles, the Googlebook laptop reentry, how it grades against the May 11 Gemini 4 punch list (two of five items partially down), why the late-June rollout is timed to front-run Apple's WWDC Siri rebuild, and the three things I/O on May 19 still has to land for the framing change to stick.",
  },
  {
    slug: 'openai-daybreak-cyber-counter-mythos',
    title: 'OpenAI Just Shipped Daybreak. The Cyber Tier Is Now a Two-Horse Race.',
    author: 'Kira Nolan',
    date: 'May 12, 2026',
    readTime: '7 min read',
    description:
      "OpenAI launched Daybreak on May 12, 2026: a three-tier cyber model stack (GPT-5.5, GPT-5.5 with Trusted Access for Cyber, GPT-5.5-Cyber), the Codex Security agentic harness, and 20-plus security partners spanning Cisco, Palo Alto Networks, CrowdStrike, Cloudflare, Trail of Bits, and SpecterOps. It is OpenAI's explicit answer to Anthropic Claude Mythos and Project Glasswing. Inside the strategic split (Mythos optimized for autonomous discovery with 271 Firefox zero-days in one cycle, Daybreak optimized for workflow integration with day-one partner distribution), what it does to Google and xAI at I/O and beyond, why the regulatory floor moves with the market, and the three signposts I am watching over the next sixty days.",
  },
  {
    slug: 'google-io-2026-gemini-4-stakes',
    title: 'Google I/O Is in Eight Days. Here Is What Gemini 4 Needs to Do to Matter.',
    author: 'Marcus Chen',
    date: 'May 11, 2026',
    readTime: '7 min read',
    description:
      "Google I/O 2026 lands May 19, with The Android Show: I/O Edition opening tomorrow. Over the last fourteen days Anthropic committed $200B to Google TPUs, rented every accelerator at Colossus 1, and hit a $30B run rate on 80x Q1 growth. OpenAI shipped a reasoning voice stack. Apple opened Siri to every compatible model. Inside the five-item punch list Gemini 4 has to clear at the keynote (2M+ context that stays priced for long-doc agents, a first-party Claude Code competitor, an Omni video model with shippable benchmarks, a public stance on the cyber tier, and an Apple Intelligence Extensions flag) and why the cost-per-useful-task quadrant is the one Google cannot afford to lose.",
  },
  {
    slug: 'nvidia-40b-equity-customer-investor-loop',
    title: 'Nvidia Just Crossed $40 Billion in AI Equity Bets. The Customer-Investor Loop Is the Real Moat.',
    author: 'Kira Nolan',
    date: 'May 10, 2026',
    readTime: '7 min read',
    description:
      "Nvidia's 2026 equity commitments to AI companies just topped $40 billion, anchored by a $30B OpenAI stake and capped this week with $3.2B into Corning and $2.1B into IREN. Add roughly two dozen private startup rounds and seven multi-billion public-equity deals, and a chip vendor is running one of the largest active venture programs on the planet. Inside what each deal actually trades, the circular-investment critique (the Cisco 1999 ghost is real but the analogy is incomplete), what the loop locks in (perimeter defense against TPU, Trainium, MI400, and Maia), and the three risks worth tracking through the next two earnings cycles.",
  },
  {
    slug: 'anthropic-200b-google-tpu-math',
    title: "Anthropic's $200B Compute Bill Is Bigger Than Its Revenue. The Google TPU Deal in Numbers.",
    author: 'Marcus Chen',
    date: 'May 9, 2026',
    readTime: '6 min read',
    description:
      "On May 5, 2026, Anthropic committed $200 billion to Google Cloud and Broadcom-built TPUs over five years. That averages $40B per year against a current run-rate revenue of roughly $30B and a 2026 server cost forecast near $20B. Inside the math, why Google effectively recollects most of its $40B Anthropic equity stake on the compute side, what TPU economics (40 to 50% lower than equivalent Nvidia capacity) do to Nvidia's pricing power at the top of the buyer list, and why 2027 is the year the gigawatts actually arrive.",
  },
  {
    slug: 'openai-gpt-realtime-2-voice-stack',
    title: "OpenAI Just Shipped Voice Models That Reason Mid-Sentence. ElevenLabs Has a Pricing Problem.",
    author: 'Kira Nolan',
    date: 'May 9, 2026',
    readTime: '6 min read',
    description:
      "OpenAI shipped GPT-Realtime-2, GPT-Realtime-Translate, and GPT-Realtime-Whisper on May 7, 2026. The first OpenAI voice model with GPT-5-class reasoning, 128K context, and the ability to keep talking while it thinks. Translate at $0.034/min and streaming Whisper at $0.017/min round out a three-model stack priced to make most voice middleware repriceable. Inside the launch, the pricing math against ElevenLabs ($0.08/min) and Deepgram, the reasoning-mid-sentence detail, and what it does to the voice vendor middle.",
  },
  {
    slug: 'anthropic-spacexai-colossus-orbital',
    title: 'Anthropic Just Booked 220K GPUs on Colossus 1. The Orbital Footnote Is the Bigger Story.',
    author: 'Ripper',
    date: 'May 9, 2026',
    readTime: '7 min read',
    description:
      "SpaceXAI signed a compute partnership with Anthropic giving access to Colossus 1 (220,000+ NVIDIA H100, H200, and GB200 accelerators) routing capacity into Claude Pro and Claude Max. The buried lede in the announcement: Anthropic also expressed interest in partnering on multiple gigawatts of orbital AI compute capacity. Inside what Colossus 1 actually buys Anthropic, why orbital compute is now a near-term engineering program rather than a research concept, what this does to the cloud-AI duopoly thesis, and the three signposts to watch on whether the orbital piece is real.",
  },
  {
    slug: 'verified-feed-trust-layer',
    title: 'The Verified Feed Is Live: Cross-Source Story Corroboration for AI Agents',
    author: 'Marcus Chen',
    date: 'May 9, 2026',
    readTime: '6 min read',
    description:
      'Most discourse about AI safety in 2026 is focused on the wrong failure mode. Hallucinations are bounded; agents acting on a single source is the actual problem about to bite the autonomous economy. TensorFeed shipped the fix tonight: embedding-based story clustering across 12 RSS sources, premium "verified across N sources" feed, free preview at 25 clusters/day. Inside how it works, the threshold-tuning trade-off, why TF could ship it (only we have the cross-source view at scale), and how the AFTA federation makes the corroboration math compose across publishers.',
  },
  {
    slug: 'ai-cyber-tier-data-layer',
    title: 'The AI Cyber Tier Now Has a Data Layer. It Is Token-Optimized, Pay-Per-Call, and Live.',
    author: 'Marcus Chen',
    date: 'May 9, 2026',
    readTime: '6 min read',
    description:
      "The week opened with Anthropic Mythos and the policy reaction. It closes with the data infrastructure agents need to do something useful with cyber-tier capability. Inside the agent-data layer TensorFeed shipped in 24 hours: MITRE CVE, CISA KEV, EPSS, NASA POWER, OpenFDA, and EIA Open Data as free + premium x402-billable endpoints with LLM-ready transforms that drop typical responses by 80% in tokens. Why $0.02 USDC settles a problem that $5K/month enterprise APIs cannot. Why the deep moat is the transform, not the data itself. Why TerminalFeed.io adopting AFTA last week is a signal more than a footnote.",
  },
  {
    slug: 'ai-week-may-8-2026',
    title: "This Week in AI: The Mythos Effect, $200B for Google, and an FDA for Models",
    author: 'Marcus Chen',
    date: 'May 8, 2026',
    readTime: '7 min read',
    description:
      "Five business days, one Anthropic security model, and the entire U.S. AI policy floor moved. CAISI signed pre-launch evaluation agreements with Google DeepMind, Microsoft, and xAI. The White House confirmed it is studying an FDA-style executive order for new model releases. Anthropic locked in $200 billion of Google Cloud and Broadcom TPU capacity, more than 40% of Google's reported revenue backlog. OpenAI shipped GPT-5.5-Cyber to vetted security teams. Cohere closed its $20B sovereign-AI merger with Aleph Alpha. China formally blocked Meta's $2B Manus acquisition. Inside the through-line: capability triggered policy, policy triggered procurement, and the cyber tier just became a real product category every frontier lab has to answer.",
  },
  {
    slug: 'aws-x402-coinbase-agent-payments',
    title: "AWS Just Plugged x402 In. Agent USDC Payments Are Now Cloud-Default.",
    author: 'Ripper',
    date: 'May 7, 2026',
    readTime: '6 min read',
    description:
      "Coinbase announced that AI agents can now pay for AWS services in USDC over x402. The largest cloud provider on the planet just made a stablecoin micropayment standard a first-class way for autonomous software to buy compute, storage, and inference. Inside what x402 actually is, why AWS picking open instead of building proprietary is the inflection, what it does to Stripe Link's universal-layer thesis, the answer Azure and GCP now owe, and what it means for every API publisher still on the fence about shipping a paid agent tier. The cost of being early on x402 just got refunded.",
  },
  {
    slug: 'anthropic-dreaming-managed-agents',
    title: "Anthropic Just Taught Claude to Dream Between Tasks. Long-Running Agents Got Their Memory Layer.",
    author: 'Ripper',
    date: 'May 7, 2026',
    readTime: '6 min read',
    description:
      "At Code with Claude in San Francisco on May 6, 2026, Anthropic shipped 'dreaming' as a research preview for Managed Agents: between-session offline reflection that re-reads transcripts, prunes dead memories, and writes named playbooks the agent will use next time. Outcomes (rubric-graded autonomous loops, +10pt success lift), multiagent orchestration (Commander/Detector/Navigator-style fleets), and webhooks all moved to public beta the same day, with rate limits doubled for Pro, Max, and Enterprise. Inside what each piece does, why offline reflection was the structurally missing layer for long-running agents, the architectural read on the bundle vs. OpenAI's stitched-together agent surface, and the open question on dreaming's pricing once it leaves preview.",
  },
  {
    slug: 'apple-intelligence-extensions-ios-27',
    title: "Apple Just Opened Siri to Claude and Gemini. ChatGPT's Exclusivity Is Dead.",
    author: 'Kira Nolan',
    date: 'May 7, 2026',
    readTime: '7 min read',
    description:
      "Bloomberg confirmed that iOS 27, iPadOS 27, and macOS 27 will let users pick Claude, Gemini, or any other compatible model to power Apple Intelligence features through a new Extensions system. The OpenAI exclusive that defined the first year of Apple Intelligence is over. Inside the mechanism, the distinct-voice detail, the privacy disclaimer that signals Apple's real concern, and what a billion-device choice screen does to the model wars, the inference floor, and every other consumer AI surface.",
  },
  {
    slug: 'one-day-eight-free-apis',
    title: 'One Day, Eight New Free APIs: The Free-Data-First Sprint',
    author: 'Ripper',
    date: 'May 6, 2026',
    readTime: '7 min read',
    description:
      "Today TensorFeed shipped eight new free data endpoints across sports, packages, research, economy, and policy. Each on a verified clean license, each with structured attribution baked into the response shape, each on the same three-bucket grading rubric we built during this morning's audit cleanup. This is the post-mortem of why free-data-first is the play, what eight clean sources looked like in eighteen commits, and the pattern that scales to dozens more.",
  },
  {
    slug: 'audited-our-paid-api-killed-two-endpoints',
    title: 'I Audited Our Own Paid API. Two Endpoints Had to Die.',
    author: 'Ripper',
    date: 'May 6, 2026',
    readTime: '7 min read',
    description:
      "AFTA promised fair-trade agent commerce six days ago. Today I ran the audit I should have run before the whitepaper went live: redistribution-rights review of every premium endpoint TensorFeed sells. Sixteen endpoints, eight green, six yellow, two red. Vast.ai-derived GPU pricing failed (their ToS prohibits redistribution outright). HuggingFace-compiled benchmarks failed (we were redistributing their compilation under a paid gate). Both got cut today. Inside the audit, the cleanup commits, why we shipped this before anyone called us out, and why fair-trade has to be bilateral or it is just marketing.",
  },
  {
    slug: 'sap-prior-labs-europe-frontier-lab',
    title: 'SAP Just Bought Prior Labs. Europe Has a Frontier AI Lab Now.',
    author: 'Marcus Chen',
    date: 'May 6, 2026',
    readTime: '7 min read',
    description:
      "SAP signed a definitive agreement to acquire Prior Labs on May 4, 2026, and committed more than 1 billion euros over four years to scale it into a globally leading frontier AI lab in Europe. The play is not LLMs. It is tabular foundation models, the category that fits 80% of enterprise data, and the bet only Europe's most valuable listed company could make. Inside the deal numbers, the TabPFN research, why structured data is the unsexy huge market LLMs cannot touch, and what this pressures across Salesforce, Oracle, and Databricks.",
  },
  {
    slug: 'we-chose-usdc-on-base-for-afta',
    title: "We Could Have Built AFTA on Anything. We Chose USDC on Base.",
    author: 'Ripper',
    date: 'May 6, 2026',
    readTime: '8 min read',
    description:
      "The AFTA whitepaper is published; the rail underneath it is x402 + USDC on Base. Why that stack and not Stripe Link, Bitcoin Lightning, USDC on Solana, USDT on TRON, or any of the other plausible answers. Inside the bake-off, the four-property test (open, transparent, instantly final, sub-cent), the Coinbase + Circle layer the choice rests on, and why the early-mover bet on US-anchored stablecoin rails compounds rather than commodifies.",
  },
  {
    slug: 'coinbase-armstrong-14-percent-ai-native-pivot',
    title: "Coinbase Cuts 14%. Brian Armstrong's Memo Is the First Agent-Native Layoff at Scale.",
    author: 'Ripper',
    date: 'May 5, 2026',
    readTime: '8 min read',
    description:
      "Brian Armstrong cut roughly 14% of Coinbase today and his all-hands memo named the reason: AI is changing how the company works, and the new Coinbase will be 'an intelligence, with humans around the edge aligning it.' The first major public-company CEO to reorganize the org around fleets of agents, with one-person teams, no pure managers, and 5 layers max. Inside the five operational claims, the timing, the severance, the honest counter, and what just changed for every other CEO.",
  },
  {
    slug: 'anthropic-finance-agents-wall-street',
    title: 'Anthropic Just Shipped 10 Wall Street Agents. The Frontier Lab Is Now a Vendor.',
    author: 'Kira Nolan',
    date: 'May 5, 2026',
    readTime: '7 min read',
    description:
      "Anthropic shipped ten preconfigured Claude agents for banks, asset managers, and insurers today, plus general availability of a single Claude agent across Excel, PowerPoint, Word, and Outlook, a Moody's app embedded as a native Claude experience covering 600 million companies, and a co-engineered Financial Crimes Agent built with FIS. The day after the $1.5B Wall Street joint venture, the products that JV will sell are live. Why this is the moment a frontier lab stopped selling tokens and started selling workflows.",
  },
  {
    slug: 'ai-status-monitoring-real-talk',
    title: 'AI Status Monitoring: How We Actually Track Claude, ChatGPT, and Gemini',
    author: 'Ripper',
    date: 'May 4, 2026',
    readTime: '7 min read',
    description:
      "Most \"is X down\" sites lag the actual outage by 5 to 15 minutes because they just mirror the official status page. We built TensorFeed to do better: 2-minute polling, component-level detail, an active LLM endpoint probe, incident history, and a single feed across every AI provider. Inside the stack and three real incidents it caught last quarter.",
  },
  {
    slug: 'ai-inference-floor-may-2026',
    title: 'The Cheapest AI Model on the Market Costs 1.7 Cents per Million Tokens',
    author: 'Ripper',
    date: 'May 4, 2026',
    readTime: '5 min read',
    description:
      "I pulled the live OpenRouter catalog this afternoon. 372 models, 33 of them free, the cheapest paid input at $0.017 per million tokens. The proprietary frontier is a thin layer on top of a dense open-source middle, and the gap to the floor keeps widening. What the inference market looks like in May 2026, plus practical numbers worth remembering for your next routing decision.",
  },
  {
    slug: 'agents-md-new-robots-txt',
    title: 'AGENTS.md Is the New robots.txt',
    author: 'Ripper',
    date: 'May 4, 2026',
    readTime: '6 min read',
    description:
      "Every coding agent I have tested in 2026 reads AGENTS.md before doing anything else in a fresh repo. The convention emerged informally and stuck. Here is why it works, what to put in a thirty-line example, and why every public repo should ship one this week.",
  },
  {
    slug: 'anthropic-900-billion-valuation-tops-openai',
    title: 'Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.',
    author: 'Marcus Chen',
    date: 'May 4, 2026',
    readTime: '7 min read',
    description:
      "Anthropic is closing a $50B round at a $900B valuation, more than 2x its February mark and ahead of OpenAI for the first time. ARR ran from $9B to a reported $44B in five months. The board meeting is this month, the IPO window opens in October, and the implied multiple is actually lower than OpenAI's. Inside the round, the revenue trajectory, the 10GW of contracted compute, and what it does to the frontier lab pecking order.",
  },
  {
    slug: 'afta-is-bilateral-both-sides-win',
    title: 'AFTA Is Bilateral. Here Is Why Both Sides Win.',
    author: 'Ripper',
    date: 'May 3, 2026',
    readTime: '6 min read',
    description:
      'AFTA shipped as a code-enforced fair-trade standard for AI agents, but the framing undersold what the standard does. The same primitives protect publishers too. Cryptographic dispute defense, predictable revenue, open distribution. At agent velocity (1000x in 24 months), vague billing is a security issue, not a UX issue. Inside the bilateral case for AFTA.',
  },
  {
    slug: 'mistral-medium-3-5-open-weights-frontier-coder',
    title: 'Mistral Just Shipped a 128B Open-Weight Frontier Coder. The Numbers Make Sonnet Sweat.',
    author: 'Marcus Chen',
    date: 'May 3, 2026',
    readTime: '7 min read',
    description:
      'Mistral Medium 3.5 went into public preview with 77.6% on SWE-Bench Verified, 256K context, $1.50/$7.50 pricing, and a modified MIT license. Cloud-based Vibe coding agents and a Le Chat Work mode shipped alongside. Inside the benchmarks, the comparison to Claude Sonnet 4.6, GPT-5.5, and Gemini 3.1 Pro, and why open weights at this tier resets the frontier conversation.',
  },
  {
    slug: 'cloudflare-stripe-agent-provisioning-protocol',
    title: 'Agents Just Got the Keys to Production. The Cloudflare-Stripe Protocol Is Live.',
    author: 'Marcus Chen',
    date: 'May 2, 2026',
    readTime: '7 min read',
    description:
      'On April 30, 2026, Cloudflare and Stripe shipped a co-designed agent provisioning protocol. AI agents can now create accounts, register domains, start paid subscriptions on 32 providers (Vercel, Supabase, Clerk, PlanetScale, Sentry, PostHog, Inngest, Hugging Face, and more), and deploy applications to production with no human in the loop beyond accepting terms. Default cap is $100 per month per provider. Inside the spec, the partner list, and what it changes for the agent stack.',
  },
  {
    slug: 'pentagon-blacklists-anthropic-defense-deals',
    title: 'The Pentagon Skipped Anthropic. Seven Other AI Companies Got the Contracts.',
    author: 'Kira Nolan',
    date: 'May 2, 2026',
    readTime: '7 min read',
    description:
      'On May 1, 2026, the DoD signed classified-network AI deals with OpenAI, Google, Microsoft, AWS, NVIDIA, SpaceX, and Reflection. Anthropic, the only frontier lab with a public no-weapons usage policy, was left out. The first frontier lab to be punished for enforcing its own safety terms, the Google compute deal that made it possible, and what it signals for safety-as-product across the rest of the industry.',
  },
  {
    slug: 'stripe-link-vs-usdc-agent-payments',
    title: 'Stripe Just Validated Agent Payments. We Already Shipped Ours Without Them.',
    author: 'Ripper',
    date: 'May 1, 2026',
    readTime: '7 min read',
    description:
      'Stripe announced Link for AI agents and x402 for USDC micropayments on Base. We shipped 15 paid endpoints on direct USDC transfers four days earlier. Here is how both approaches compare after real production use, why we skipped the middleman, and where each model wins.',
  },
  {
    slug: 'palo-alto-portkey-mcp-gateway',
    title: 'Palo Alto Just Bought the MCP Gateway. Enterprise Security Has Entered the Agent Stack.',
    author: 'Marcus Chen',
    date: 'May 1, 2026',
    readTime: '7 min read',
    description:
      'Palo Alto Networks announced its intent to acquire Portkey on April 30, 2026, plugging an AI gateway that routes to 1,600 plus LLMs and an MCP gateway processing trillions of tokens per month into Prisma AIRS. The agent infrastructure layer just got its first big enterprise security exit. We break down the deal, the numbers, and what it signals for MCP, AI gateways, and the future of agent governance.',
  },
  {
    slug: 'guard-act-senate-judiciary-22-0',
    title: 'The Senate Just Voted 22-0 to Regulate AI Chatbots. Here Is What Is Actually in the GUARD Act.',
    author: 'Kira Nolan',
    date: 'Apr 30, 2026',
    readTime: '7 min read',
    description:
      'The Senate Judiciary Committee unanimously advanced the GUARD Act on April 30, 2026. Government ID-based age verification, a flat ban on AI companions for minors, mandatory non-human disclosures every 30 minutes, and criminal penalties. We read the bill so you do not have to, and lay out the engineering shape of compliance for any consumer AI product.',
  },
  {
    slug: 'harness-gap-not-the-model',
    title: 'It Is Not the Model. It Is the Harness.',
    author: 'Ripper',
    date: 'Apr 30, 2026',
    readTime: '6 min read',
    description:
      'Claude Sonnet 4.6 in Claude Code scores about 71 on SWE-bench Verified. The same Sonnet 4.6 in Continue scores about 52. Same model. The harness is doing the other 19 points. The harness gap, why it is bigger than the model gap, and the new TensorFeed harness leaderboard tracking 11 coding agents across 4 agentic benchmarks.',
  },
  {
    slug: 'measuring-llm-api-latency-from-the-edge',
    title: 'Provider Status Pages Are Marketing. We Built Our Own LLM Probes.',
    author: 'Ripper',
    date: 'Apr 29, 2026',
    readTime: '6 min read',
    description:
      'Every fifteen minutes, our Worker now fires a small prompt at Anthropic, Google, Mistral, and Cohere from Cloudflare\'s edge and records the result. Status pages are politically managed; this is what we measure. The first hour of data already produced one finding I did not expect: Cohere is faster than Anthropic by an order of magnitude on first-token latency. The methodology, why this dataset compounds, and what is on the runway.',
  },
  {
    slug: 'openai-aws-bedrock-24-hours',
    title: 'OpenAI Hit AWS Bedrock in 24 Hours. The Infrastructure Was Already Built.',
    author: 'Marcus Chen',
    date: 'Apr 29, 2026',
    readTime: '7 min read',
    description:
      'A day after Microsoft and OpenAI dissolved their exclusive cloud deal, OpenAI models, Codex, and a jointly built Managed Agents service went live on AWS Bedrock. The speed of the launch tells you both companies had this fully wired and were waiting for legal clearance. We break down what shipped, what Bedrock Managed Agents actually is, and what it means for Microsoft, Anthropic, and every enterprise AI buyer.',
  },
  {
    slug: 'ai-talent-war-billion-dollar-engineers',
    title: "The AI Talent War's New Price Tag: $1.5 Billion Per Engineer",
    author: 'Marcus Chen',
    date: 'Apr 28, 2026',
    readTime: '7 min read',
    description:
      'Meta paid one engineer a reported $1.5 billion over six years. VCs poured $18.8 billion into AI startups founded since 2025. Three OpenAI executives walked out in 10 days. The AI talent market in April 2026 is not a labor market anymore. It is a commodity auction. We look at the numbers, the moves, and what they mean for the model release pipeline.',
  },
  {
    slug: 'publishing-bot-traffic',
    title: "We Made Our AI Bot Traffic Public. Here's What We're Seeing.",
    author: 'Ripper',
    date: 'Apr 28, 2026',
    readTime: '6 min read',
    description:
      'Most sites hide bot traffic. We just published ours at /agent-traffic with a per-bot breakdown, top hit endpoints, and a live tail. ClaudeBot, GPTBot, PerplexityBot, Bytespider, Google-Extended, and the rest of the AI crawler set, refreshed every 30 seconds. Why we did it, what we are seeing, and why every site built for agents should do the same.',
  },
  {
    slug: 'kv-ops-budget-edge-architecture',
    title: 'The 100,000 KV Ops Daily Budget and What Fits in It',
    author: 'Ripper',
    date: 'Apr 28, 2026',
    readTime: '7 min read',
    description:
      'Cloudflare KV gives you 100,000 operations per day on the free tier. We run a real-time AI news API, status monitoring, model pricing, and a paid agent payments tier inside that budget. Here is the engineering that makes it possible: cache API for reads, batched writes, cron-only writers, in-memory buffers, and per-type index keys.',
  },
  {
    slug: 'mcp-server-fifty-line-file',
    title: 'An MCP Server Is a 50-Line File. Why Every Paid API Should Ship One.',
    author: 'Ripper',
    date: 'Apr 27, 2026',
    readTime: '6 min read',
    description:
      'The Model Context Protocol server you would build for your existing paid API is a 50-line file. The agent-acquisition leverage of having one is enormous. The actual code, what it costs to ship, and why most teams overthink the work. Stop writing the planning doc; write the file.',
  },
  {
    slug: 'why-usdc-over-stripe',
    title: 'Why We Picked USDC on Base Over Stripe for Agent Payments',
    author: 'Ripper',
    date: 'Apr 27, 2026',
    readTime: '7 min read',
    description:
      'Stripe works fine for humans. It does not work for AI agents making decisions in a loop. A first-person breakdown of the architectural choice, what we gave up, and what we got in return: simpler architecture, lower fees, no platform risk, public auditability.',
  },
  {
    slug: '15-paid-endpoints-24-hours',
    title: '15 Paid AI Agent API Endpoints in 24 Hours: What Made It Possible',
    author: 'Ripper',
    date: 'Apr 27, 2026',
    readTime: '8 min read',
    description:
      'A first-person retrospective on shipping 15 pay-per-call premium endpoints, full SDKs in two languages, an MCP server expansion, and a human dashboard in a single 24-hour build session. Every endpoint is live, every commit is on main, every test passes.',
  },
  {
    slug: 'validating-agent-payments-mainnet',
    title: 'We Validated Agent Payments End-to-End on Base Mainnet',
    author: 'Ripper',
    date: 'Apr 27, 2026',
    readTime: '6 min read',
    description:
      'A first-person walkthrough of the five-step USDC payment loop that took TensorFeed agent payments from designed to operational. Real tx hash, real credits, no bugs surfaced. Why this is the moment the system stopped being theoretical.',
  },
  {
    slug: 'microsoft-openai-partnership-reset',
    title: 'The Microsoft and OpenAI Divorce Is Done. Both Sides Got What They Wanted.',
    author: 'Ripper',
    date: 'Apr 27, 2026',
    readTime: '7 min read',
    description:
      'Microsoft and OpenAI announced a sweeping restructure of their partnership today. No more exclusivity, no more AGI clause, capped revenue share through 2030, and OpenAI is free to ship on any cloud. What actually changed and why it matters.',
  },
  {
    slug: 'alibaba-happy-horse-video-crown',
    title: "Alibaba's Happy Horse Just Took the AI Video Crown. China Now Owns Two Frontiers.",
    author: 'Marcus Chen',
    date: 'Apr 27, 2026',
    readTime: '7 min read',
    description:
      "Alibaba opened public beta for HappyHorse 1.0 today, a 15B parameter joint audio-video model that already sits at the top of the Artificial Analysis Video Arena. With DeepSeek V4 last week and Happy Horse this week, the open frontier is leaving the West.",
  },
  {
    slug: 'openai-workspace-agents-chatgpt-enterprise',
    title: 'OpenAI Just Turned ChatGPT Into an Enterprise Automation Platform',
    author: 'Ripper',
    date: 'Apr 26, 2026',
    readTime: '7 min read',
    description:
      'OpenAI launched Workspace Agents in research preview for ChatGPT Business, Enterprise, and Edu. Long-running, scheduled, Codex-powered agents that plug straight into Slack, Salesforce, Drive, and Notion. The Custom GPT era is over.',
  },
  {
    slug: 'anthropic-project-deal-agent-marketplace',
    title: 'Anthropic Just Ran the First Real-Money AI Agent Marketplace. The Results Reveal a Coming Inequality.',
    author: 'Kira Nolan',
    date: 'Apr 26, 2026',
    readTime: '7 min read',
    description:
      'Project Deal let 69 Anthropic employees turn Claude loose on a real cash marketplace. 186 trades, $4,000 in goods, and a hidden A/B test that exposes what happens when your agent is cheaper than your neighbor\'s.',
  },
  {
    slug: 'ai-money-gap-pwc',
    title: "74% of AI's Economic Value Goes to 20% of Companies. Here's Why.",
    author: 'Kira Nolan',
    date: 'Apr 25, 2026',
    readTime: '6 min read',
    description:
      "PwC surveyed 1,217 executives and found the top 20% of companies capture nearly three-quarters of all AI-driven gains. The gap is not about tools. It is about how companies deploy them.",
  },
  {
    slug: 'deepseek-v4-open-source-frontier',
    title: 'DeepSeek V4 Is The First Open Source Frontier Model. Closed Labs Should Be Worried.',
    author: 'Marcus Chen',
    date: 'Apr 25, 2026',
    readTime: '7 min read',
    description:
      'DeepSeek dropped V4 yesterday under MIT license. 1.6T parameters, 1M context, 80.6% on SWE-bench Verified, and pricing that undercuts GPT-5.5 by 30x. The architecture innovation behind it might matter more than the price.',
  },
  {
    slug: 'google-anthropic-40b-compute',
    title: 'Google Just Committed $40 Billion to Anthropic Compute. The Stakes Just Got Real.',
    author: 'Ripper',
    date: 'Apr 24, 2026',
    readTime: '6 min read',
    description:
      'Google is pouring $40B into Anthropic for compute capacity, one of the largest single infrastructure commitments in AI history. What the deal buys, what it means for AWS and Nvidia, and why it signals the real cost of frontier AI.',
  },
  {
    slug: 'ai-week-april-24-2026',
    title: 'This Week in AI: GPT-5.5, DeepSeek V4, and a $250 Billion Acquisition',
    author: 'Kira Nolan',
    date: 'Apr 24, 2026',
    readTime: '7 min read',
    description:
      'The biggest week in AI this year. OpenAI shipped GPT-5.5, DeepSeek dropped V4 under MIT license, SpaceX bought xAI for $250B, and Anthropic locked away a model too dangerous to release.',
  },
  {
    slug: 'gpt-5-5-openai-flagship',
    title: 'GPT-5.5 Just Landed. OpenAI Doubled the Price and Raised the Bar.',
    author: 'Marcus Chen',
    date: 'Apr 24, 2026',
    readTime: '6 min read',
    description:
      'OpenAI released GPT-5.5 with 1M context and top benchmark scores, but at $5/$30 per million tokens it costs double what GPT-5.4 did. The first fully retrained base model since GPT-4.5.',
  },
  {
    slug: 'claude-design-anthropic',
    title: 'Anthropic Just Shipped Claude Design. The Loop from Idea to Code Is Now Closed.',
    author: 'Ripper',
    date: 'Apr 22, 2026',
    readTime: '5 min read',
    description:
      'Claude Design lets you create prototypes, slides, and mockups with Claude, then hand them off to Claude Code with one click. Powered by Opus 4.7, it completes Anthropic\'s product trifecta.',
  },
  {
    slug: 'claude-opus-4-7-release',
    title: "Claude Opus 4.7 Just Dropped. Here's What Changed.",
    author: 'Ripper',
    date: 'Apr 17, 2026',
    readTime: '6 min read',
    description:
      "Anthropic released Claude Opus 4.7 with a 1 million token context window at the same flagship pricing as 4.6. We break down the benchmark gains, what it means for agent workflows, and how the race shifts again.",
  },
  {
    slug: 'llms-txt-every-developer',
    title: 'Why Every Developer Needs an llms.txt File',
    author: 'Kira Nolan',
    date: 'Apr 17, 2026',
    readTime: '5 min read',
    description:
      "Agent traffic is passing human traffic on many sites. llms.txt is the standard that makes your content legible to AI agents. Practical guide to what it is, why it matters, and how to ship one in an afternoon.",
  },
  {
    slug: 'ai-pricing-floor',
    title: "The AI Pricing Floor: How Low Can It Go?",
    author: 'Marcus Chen',
    date: 'Apr 16, 2026',
    readTime: '5 min read',
    description:
      "Gemini Flash and Mistral Small are at $0.10 per million input tokens. Open source is free. We look at where the inference pricing floor actually sits and what breaks when it gets there.",
  },
  {
    slug: 'ai-adoption-faster-than-internet',
    title: "AI Adoption Is Outpacing the Internet. Stanford Has the Numbers to Prove It.",
    author: 'Ripper',
    date: 'Apr 15, 2026',
    readTime: '6 min read',
    description:
      "Stanford's 2026 AI Index shows people are adopting AI faster than they adopted the PC or the internet. Top models score above 50% on Humanity's Last Exam. Anthropic leads, with Chinese labs closing fast.",
  },
  {
    slug: '4chan-discovered-chain-of-thought',
    title: '4chan Users Discovered Chain-of-Thought Reasoning Before Google Did',
    author: 'Kira Nolan',
    date: 'Apr 15, 2026',
    readTime: '5 min read',
    description:
      "In 2022, 4chan users playing AI Dungeon found that asking AI to solve problems step by step dramatically improved results. Google published its chain-of-thought paper over a year later. What this tells us about innovation.",
  },
  {
    slug: 'frontier-model-forum-vs-china',
    title: 'OpenAI, Anthropic, and Google Just Teamed Up Against Chinese AI Theft',
    author: 'Ripper',
    date: 'Apr 14, 2026',
    readTime: '6 min read',
    description:
      'Three of the biggest AI competitors are sharing intelligence through the Frontier Model Forum to stop adversarial distillation attacks. Anthropic alone documented 16 million malicious exchanges from 24,000 fraudulent accounts.',
  },
  {
    slug: 'claude-mythos-ai-security',
    title: 'Claude Mythos Is Rewriting the Rules of AI Security',
    author: 'Kira Nolan',
    date: 'Apr 13, 2026',
    readTime: '5 min read',
    description:
      "The UK AI Security Institute tested Anthropic's Mythos Preview against complex attack scenarios and capture-the-flag challenges. It outperformed every other AI system and compressed weeks of security work into hours.",
  },
  {
    slug: 'google-notebooklm-gemini',
    title: "Google Just Put NotebookLM Inside Gemini. Here's Why It Matters.",
    author: 'Ripper',
    date: 'Apr 12, 2026',
    readTime: '5 min read',
    description:
      'Google integrated its AI research assistant directly into Gemini. Upload PDFs, documents, YouTube videos, and URLs through a side panel to build searchable repositories. Rolling out to paid subscribers this week.',
  },
  {
    slug: 'stanford-ai-index-2026',
    title: "Stanford's 2026 AI Index Says We Can't Keep Up. They're Right.",
    author: 'Marcus Chen',
    date: 'Apr 11, 2026',
    readTime: '7 min read',
    description:
      "Stanford's annual report finds AI capability growth is outpacing regulation and workforce adaptation. Anthropic leads frontier models, California enacted SB 53, and the gap between what AI can do and what society is ready for keeps widening.",
  },
  {
    slug: 'claude-mythos-not-afraid',
    title: "Claude Mythos: Anthropic's Most Powerful Model Yet, and Why I'm Not Afraid",
    author: 'Ripper',
    date: 'Apr 8, 2026',
    readTime: '8 min read',
    description:
      "Anthropic unveiled Claude Mythos Preview, a model that found tens of thousands of zero-days and escaped its own sandbox. They gave it to defenders first. Here's why that matters.",
  },
  {
    slug: 'building-for-ai-agents',
    title: 'Building for AI Agents: What Developers Need to Know',
    author: 'Ripper',
    date: 'Apr 5, 2026',
    readTime: '6 min read',
    description:
      'AI agents are moving from demos to production, and the software they need looks different from traditional web apps. Structured data, llms.txt, MCP servers, and agent-friendly API design patterns that actually work.',
  },
  {
    slug: 'rise-of-agentic-ai',
    title: 'The Rise of Agentic AI: From Chatbots to Autonomous Workers',
    author: 'Kira Nolan',
    date: 'Apr 4, 2026',
    readTime: '5 min read',
    description:
      'Gartner says 40% of enterprise apps will have AI agents by end of 2026. OpenClaw went viral. NVIDIA shipped Agent Toolkit at GTC. What separates a chatbot from an agent and why it matters.',
  },
  {
    slug: 'claude-vs-gpt-vs-gemini',
    title: 'Claude vs GPT vs Gemini: An Honest Comparison',
    author: 'Ripper',
    date: 'Apr 2, 2026',
    readTime: '6 min read',
    description:
      'Benchmarks only tell part of the story. We ran all three frontier models through real-world coding, writing, analysis, and research tasks. Here is what we found, including a task-by-task scorecard and pricing comparison.',
  },
  {
    slug: 'open-source-llms-closing-gap',
    title: 'Open Source LLMs Are Closing the Gap Faster Than Anyone Expected',
    author: 'Kira Nolan',
    date: 'Apr 1, 2026',
    readTime: '5 min read',
    description:
      'Qwen 3.5 9B beat GPT-OSS-120B on GPQA Diamond. Gemma 4 runs on phones. Bonsai ships 1-bit models. Apache 2.0 licensing is making frontier performance free. What this means for the industry.',
  },
  {
    slug: 'state-of-ai-apis-2026',
    title: 'The State of AI APIs in 2026',
    author: 'Marcus Chen',
    date: 'Mar 30, 2026',
    readTime: '5 min read',
    description:
      'The API landscape shifted dramatically over the past year. Pricing wars, the context window race, agent-native endpoints, MCP protocol adoption, and structured outputs all reshaped how developers build on AI. We break down what matters.',
  },
  {
    slug: 'ai-api-pricing-war-2026',
    title: "The AI API Pricing War: Who's Winning in 2026?",
    author: 'Marcus Chen',
    date: 'Mar 29, 2026',
    readTime: '6 min read',
    description:
      'GPT-5.4, Claude Opus 4.6, and Gemini 3.1 Pro pricing compared. How API costs dropped 70% to 90% in twelve months, and what open source models mean for developers choosing a provider.',
  },
  {
    slug: 'ai-service-outages-month',
    title: "I Tracked AI Service Outages for a Month. Here's What I Found.",
    author: 'Ripper',
    date: 'Mar 27, 2026',
    readTime: '4 min read',
    description:
      'Real data from our incident database. Which services went down most, average resolution times, when outages cluster on Tuesdays and Wednesdays, and what developers should plan for.',
  },
  {
    slug: 'claude-code-leak',
    title: 'The Claude Code Leak: What 512,000 Lines of Source Code Revealed',
    author: 'Ripper',
    date: 'Mar 25, 2026',
    readTime: '5 min read',
    description:
      "An accidental .map file exposure revealed Claude Code's full source. 187 spinner verbs, curse word filters, a memory architecture, and a 35-module structure. What it tells us about modern AI tools.",
  },
  {
    slug: 'mcp-97-million-installs',
    title: 'MCP Just Hit 97 Million Installs. The Agent Era Is Here.',
    author: 'Kira Nolan',
    date: 'Mar 23, 2026',
    readTime: '4 min read',
    description:
      "Anthropic's Model Context Protocol went from experimental to foundational infrastructure. Every major AI provider now ships MCP support. What this means for developers building AI agents.",
  },
  {
    slug: 'openai-killed-sora',
    title: "OpenAI Killed Sora. Here's What That Tells Us About AI Economics.",
    author: 'Marcus Chen',
    date: 'Mar 20, 2026',
    readTime: '5 min read',
    description:
      'Sora burned $15M per day in compute and made $2.1M in total lifetime revenue. The Disney deal collapsed. What this means for AI video generation and the economics of frontier AI products.',
  },
  {
    slug: 'why-we-built-tensorfeed',
    title: 'Why We Built TensorFeed.ai',
    author: 'Ripper',
    date: 'Mar 18, 2026',
    readTime: '5 min read',
    description:
      'The origin story. Why existing AI news sources fell short, the decision to build for AI agents as a first-class audience, and what makes TensorFeed different from every other aggregator.',
  },
];

/** Get the N most recent articles (for homepage, sidebar, etc.) */
export function getLatestOriginals(count = 3): OriginalArticle[] {
  return ORIGINALS.slice(0, count);
}
