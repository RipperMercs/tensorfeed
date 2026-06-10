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
    slug: 'mastercard-agent-pay-machines-x402-trust-layer',
    title:
      'Agent Payments Grew Up This Week. Mastercard Brought the Trust Layer; the Open Rail Brought the Merchants.',
    author: 'Adrian Vale',
    date: 'June 10, 2026',
    readTime: '8 min read',
    description:
      'Two agentic-payments launches in one week marked the moment the category stopped being a demo. On June 10, 2026 Mastercard launched Agent Pay for Machines, a framework for AI agents to pay each other across cards, bank accounts, and stablecoins with identity, spending controls, and guaranteed settlement, backed by 30+ partners including Coinbase, Stripe, Ripple, Polygon, and the Solana Foundation; Coinbase explicitly framed the goal around open standards like x402. Days earlier, Travala put 2.2 million hotels across 230 countries behind an agent wallet, letting an autonomous agent book and pay for a room in USDC on Base via x402 at about a cent per booking, live first inside Claude Desktop. The rails converged, but the real contest is the trust and discovery layer: Mastercard is monetizing identity and guaranteed settlement, the open rail still lacks a discovery standard, and Travala (which settles for real but publishes no manifest and appears in no catalog) is exactly the case the open trust layer has to solve. Why the incumbent embraced the open rail instead of fighting it, why discovery and trust is the new battleground, how TF tracks the open side, and three signposts.',
  },
  {
    slug: 'claude-fable-5-mythos-5-split-frontier',
    title: 'Anthropic Split the Frontier in Two. Fable 5 Is the Half You Can Buy.',
    author: 'Kira Nolan',
    date: 'June 9, 2026',
    readTime: '8 min read',
    description:
      'Anthropic shipped its newest frontier model as two products on June 9: Claude Fable 5, generally available behind always-on safety classifiers at $10 per 1M input and $50 per 1M output with a default 1M context window, and Claude Mythos 5, the same model with safeguards lifted for vetted cyberdefense and government partners. The vendor table leads the field (SWE-bench Pro 80.3 percent vs GPT-5.5 at 58.6), but several headline rows are Mythos-only ceilings, flagged requests silently reroute to Opus 4.8 at Opus pricing, and for the first time no ASL tier was named.',
  },
  {
    slug: 'anthropic-maia-200-fourth-chip-inference',
    title:
      'Anthropic Is Negotiating a Fourth Chip. Claude Inference Just Stopped Being a Nvidia Story.',
    author: 'Marcus Chen',
    date: 'June 9, 2026',
    readTime: '7 min read',
    description:
      "Anthropic is in early-stage talks with Microsoft to run Claude inference on the Maia 200, Microsoft's second-generation custom AI accelerator (TSMC 3nm, launched January 2026, more than 30 percent better performance per dollar, still in limited preview), served through Azure. Nothing is signed. If it closes, Maia 200 becomes the fourth distinct silicon platform behind Claude after AWS Trainium2 (Project Rainier, ~500K chips scaling toward 1M), Google TPU (up to 1M units in 2026), and Nvidia GPUs. The structural read matters more than the headline: frontier inference is de-coupling from Nvidia and migrating onto hyperscaler-owned silicon, because inference is a recurring per-token bill and a lab at a reported ~$47B run rate chases every point of margin. The deal sits inside Anthropic's $30B Azure commitment ($15B combined Microsoft and Nvidia investment), and a frontier logo is the external validation Microsoft's chip program has lacked. Why a fourth platform is leverage rather than redundancy, what it means for builders on the API, the hard caveat that none of it is signed, and three signposts over the next ninety days.",
  },
  {
    slug: 'apple-gemini-siri-extensions-wwdc-2026',
    title:
      'Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude. The Assistant Layer Just Became Swappable.',
    author: 'Adrian Vale',
    date: 'June 8, 2026',
    readTime: '7 min read',
    description:
      "At WWDC 2026, in Tim Cook's final keynote as CEO, Apple rebuilt Siri on a custom 1.2-trillion-parameter Google Gemini model under a deal reported at about $1 billion a year, with the contract reportedly barring Google from training future Gemini versions on Siri queries. Siri now routes across three tiers: on-device Apple models, Private Cloud Compute, and the custom Gemini running on Google Cloud Nvidia Blackwell B200 GPUs for the heaviest reasoning. The bigger story is iOS 27 Extensions, which let ChatGPT, Gemini, or Claude serve as the default assistant, putting Claude on the iPhone as a first-class option for the first time. The model just became a setting instead of a fixture, which turns the assistant layer into a routing and switching problem on a billion phones. Why Extensions matters more than the Gemini check, who wins and who pays, and the one onboarding detail in the iOS 27 betas that decides whether the dropdown is real or theater.",
  },
  {
    slug: 'ai-capex-bubble-debate-scoreboard',
    title:
      'Everyone Is Calling an AI Capex Bubble. Almost No One Agrees on How to Measure One.',
    author: 'Marcus Chen',
    date: 'June 7, 2026',
    readTime: '6 min read',
    description:
      "The four largest US hyperscalers spent roughly $448 billion on capex in 2025 and have guided 2026 to about $600 to $725 billion, with Goldman modeling $7.6 trillion of AI capex through 2031. The bears cite a MIT study finding 95 percent of enterprise GenAI pilots showed no P&L return, circular vendor financing, and depreciation games; the bulls cite real inference demand and sold-out capacity. The catch is that the two camps use different denominators, so the only lens that travels is capex as a share of GDP, where the AI boom sits between the dotcom peak near 1.2 percent and the railroad manias above 4 percent.",
  },
  {
    slug: 'government-equity-stakes-ai-labs-ipo-window',
    title:
      'Trump and Sanders Now Want the Same Thing: Government Equity in the AI Labs. The Timing Is the Story.',
    author: 'Kira Nolan',
    date: 'June 7, 2026',
    readTime: '7 min read',
    description:
      "On June 6 Trump told reporters the US government may take direct equity stakes in OpenAI, Anthropic, and xAI ('You make them a partnership in this revolution. It would be a beautiful thing.'), days after Bernie Sanders' NYT op-ed and draft American AI Sovereign Wealth Fund Act proposed a one-time 50 percent stock tax, paid in shares, on the same three companies. Sam Altman has been privately pitching a donated-equity Public Wealth Fund to the White House since early 2025; Anthropic is reportedly not in the talks. All of it lands inside the IPO window: SpaceX prices June 11, OpenAI targets September, Anthropic filed June 1 at $965B. Inside the three proposals and why they differ by an order of magnitude, the Intel, US Steel, and MP Materials precedents that make government equity a term-sheet question rather than rhetoric, why the bill names the three private labs and skips Google and Meta, what an unmodelable policy overhang does to a roadshow, and three signposts over the next ninety days.",
  },
  {
    slug: 'chatgpt-dreaming-v3-memory-default',
    title:
      "ChatGPT's Memory Now Writes Itself. The Delete Button Does Less Than You Think.",
    author: 'Marcus Chen',
    date: 'June 6, 2026',
    readTime: '7 min read',
    description:
      "OpenAI began rolling out Dreaming V3 on June 4, the biggest rewrite of ChatGPT memory since 2024. A background process now synthesizes a running profile of you from past conversations and injects it into every new chat, rewriting memories as circumstances change. A roughly 5x compute cut takes the feature to Free and Go users within weeks; paid users get 2x capacity and a new summary page. Vendor-reported recall jumped from 41.5% (2024) to 67.9% (2025) to 82.8%, all internal evals with no independent audit. The part that deserves the attention: deleting a chat does not delete the memories derived from it, the summary page does not promise completeness, and memory injected into the system prompt is the same persistent injection surface Tenable documented in November 2025, now fed by ambient conversation by default. Inside the three-generation architecture shift, the February study that found 96 percent of memories are written without user instruction, the August 2 EU AI Act transparency deadline, and why memory just became the chat interface's first real switching cost.",
  },
  {
    slug: 'great-american-ai-act-preemption',
    title:
      'Congress Finally Wrote the Preemption Down: Three Years, Development Only. Sacramento Keeps the Rest.',
    author: 'Kira Nolan',
    date: 'June 5, 2026',
    readTime: '7 min read',
    description:
      "Reps. Jay Obernolte (R-CA) and Lori Trahan (D-MA) released the 269-page Great American Artificial Intelligence Act as a discussion draft on June 4, the most complete federal AI framework Congress has produced. It would preempt state laws specifically regulating the development of AI models for three years (with a sunset), while explicitly leaving use and deployment laws untouched. It formally establishes CAISI with $100M a year through 2029, requires frontier developers to write risk plans before release and report critical safety incidents, and adds whistleblower protections. Trahan's office named California's AB 2013 and part of SB 942 as preempted; SB 53 is squarely in scope. The development versus deployment line means most of Sacramento's 30-bill deployment crop survives while the model-layer transparency regime freezes. Inside the draft, the week Washington reversed itself on the June 2 review order, why the obligations read like SB 53 federalized minus the enforcement teeth, and three signposts over the next ninety days.",
  },
  {
    slug: 'spacex-ipo-anthropic-colossus-compute',
    title:
      "The Biggest IPO in History Is Also an AI-Compute Disclosure. SpaceX's S-1 Surfaced the Anthropic-Colossus Lease.",
    author: 'Marcus Chen',
    date: 'June 4, 2026',
    readTime: '7 min read',
    description:
      "SpaceX prices the largest IPO ever on June 11 (it debuts June 12 as SPCX at a fixed $135 a share, a valuation of about $1.77 trillion), and the most consequential line in the S-1 is not about rockets. It discloses that Anthropic pays $1.25 billion a month for the full output of Colossus 1, the idle Memphis cluster SpaceX owns through its xAI subsidiary, with SpaceX and Musk publicly disagreeing on whether the lease runs through May 2029 or just 180 days. How an IPO filing became the venue where an AI-compute lease surfaced.",
  },
  {
    slug: 'deepseek-maiden-funding-round-59-billion',
    title:
      'DeepSeek Took Its First Outside Money. The $59 Billion Price Tells You What Open Weights Are Worth.',
    author: 'Kira Nolan',
    date: 'June 4, 2026',
    readTime: '7 min read',
    description:
      "DeepSeek is reportedly raising about 50 billion yuan ($7.4 billion) in its first ever external funding round at a post-money valuation between $52 billion and $59 billion. Founder Liang Wenfeng, who controls nearly 90 percent of the company, is committing 20 billion yuan himself; Tencent (~10B yuan) and battery giant CATL (~5B yuan) are weighing the largest outside checks, with NetEase, JD.com, IDG Capital, Monolith, and state-backed AI funds also in the syndicate. The lab that shipped V4 under MIT and famously refused outside capital is now priced at roughly six percent of Anthropic's $965 billion. Inside the round composition, the three readings of that valuation gap (open weights monetize worse, the China discount, a negotiated industrial-policy number), why CATL in the cap table is the energy-compute convergence tell, what it means for builders on DeepSeek's 20x to 30x API discount, and three signposts over the next ninety days.",
  },
  {
    slug: 'card-networks-base-settlement-agents',
    title:
      'Mastercard Will Settle Cards on Eight Chains. Base Is the One Where Agents Already Pay Each Other.',
    author: 'Marcus Chen',
    date: 'June 4, 2026',
    readTime: '7 min read',
    description:
      "On June 3, Mastercard said it will settle card transactions in regulated stablecoins across eight blockchains (Arbitrum, Base, Canton, Ethereum, Polygon, Solana, Tempo, XRPL) with intraday, weekend, and holiday cycles. It is not Mastercard on Base; Base is one of eight chains the network will settle across, and the program starts with five named fintechs and banks, not the whole card base. Visa added Base in April. The real story is convergence: of the eight chains the networks now settle on, Base is the only one already running a live x402 agent-payment economy on the same USDC. The card networks are not entering agent commerce; they are turning the rail it already runs on into mainstream financial plumbing, and that deeper, more regulated dollar is what makes per-call agent economics durable.",
  },
  {
    slug: 'microsoft-mai-models-openai-independence',
    title:
      'Microsoft Shipped Seven of Its Own Models. The One That Counts Lives Inside Copilot.',
    author: 'Adrian Vale',
    date: 'June 3, 2026',
    readTime: '6 min read',
    description:
      "At Build on June 2, Microsoft launched seven in-house MAI models spanning image, voice, transcription, reasoning, and coding. Two matter: MAI-Thinking-1, the company's first reasoning model (35B active MoE, 256K context, 97% on AIME 2025, human raters preferring it over Claude Sonnet 4.6), and MAI-Code-1-Flash, a roughly 5B coding model already in GitHub Copilot that beats Claude Haiku 4.5 by 16 points on SWE-Bench Pro (51.2% vs 35.2%) while using up to 60% fewer tokens and costing less. The headline was benchmarks. The story underneath is Microsoft building a stack it owns end to end on its own Azure infrastructure, trained without OpenAI data, so it can serve a growing share of Copilot and Azure calls without paying a third party. Why the small coding model is the commercial weapon, what the numbers do and do not prove, and how it fits the week's bigger shift toward the agent runtime as the product.",
  },
  {
    slug: 'nvidia-rtx-spark-edge-agents',
    title:
      "NVIDIA's RTX Spark Runs a 120B Model on a Laptop. The Real Move Is Owning Every Layer.",
    author: 'Marcus Chen',
    date: 'June 2, 2026',
    readTime: '6 min read',
    description:
      "At Computex on June 1, Jensen Huang unveiled the NVIDIA RTX Spark, an Arm-plus-Blackwell laptop superchip with 128GB of unified memory that NVIDIA says runs a 120B model with a million-token context on a 14mm machine. The real move is not the spec sheet, it is NVIDIA extending its compute monopoly from the datacenter to the edge, with unified memory built to keep frontier-size models resident for local agents. At $2,899-plus it is a developer beachhead, not a consumer wave.",
  },
  {
    slug: 'anthropic-confidential-s1-ipo',
    title:
      'Anthropic Filed to Go Public. A Confidential S-1 at a $965 Billion Valuation Is an Option, Not a Date.',
    author: 'Marcus Chen',
    date: 'June 1, 2026',
    readTime: '7 min read',
    description:
      "On June 1, 2026 Anthropic confidentially submitted a draft Form S-1 to the SEC, the first formal step toward an IPO. The company says the number of shares and the price are not set, the offering depends on market conditions, and the submission gives it the option to go public after the SEC finishes its review. The number underneath it is a $965 billion private valuation from a $65 billion round, with reporting putting annualized revenue near a $47 billion run rate. What a confidential draft S-1 actually commits to (almost nothing), what it signals (almost everything), the frontier-AI IPO race it joins, and the one figure in the eventual prospectus that matters more than the valuation: inference gross margin.",
  },
  {
    slug: 'california-30-ai-bills-crossover-july-sprint',
    title:
      'Thirty AI Bills Just Survived in Sacramento. The Next Four Weeks Set the US Floor.',
    author: 'Kira Nolan',
    date: 'May 31, 2026',
    readTime: '7 min read',
    description:
      "Nearly all of California's roughly 30 active AI bills cleared their chamber of origin before the May 29 crossover deadline. With no federal standard sitting above them and a July 2 summer adjournment looming, the application layer of US AI regulation gets written in the next four weeks. SB 53 already covered the model layer (large frontier developers, $500M revenue, governance and incident reporting enforced by the California AG). This crop covers the deployment layer: customer-service and companion chatbots (AB 1609, AB 1988, AB 2023, SB 1119, SB 300, SB 867), workplace surveillance and automated decision systems (AB 1883, SB 947, SB 719), AI in healthcare and therapy (AB 1979, AB 2575, SB 903), provenance (AB 2713), a proposed AI Standards and Safety Commission (SB 813), and natural-person mandates for teachers. Inside the bills worth tracking, why a federal vacuum guarantees a strictest-standard patchwork (Illinois SB 315, Colorado chatbot and psychotherapy bills moving the same week), and three signposts over the next ninety days.",
  },
  {
    slug: 'x402-batch-settlement-base-mcp-distribution-layer',
    title:
      "A Claude Agent Reads the Day's News for 10 Cents Now. x402 Just Had Its Distribution Week.",
    author: 'Kira Nolan',
    date: 'May 30, 2026',
    readTime: '6 min read',
    description:
      "An AI agent now pays ten cents to assemble a daily news brief on x402 and Tavily, and it settles itself. That is the demand proof under a busy week: batch settlement went generally available on the Coinbase facilitator, Base MCP gave agents a Base wallet that can clear a 402, and Visa added x402 to its developer CLI. The payment rail was always the easy part. The settlement economics that make sub-cent pricing viable and the discovery layer that lets an agent find what to buy are what actually moved this week, and discovery still runs through a single Coinbase-run catalog.",
  },
  {
    slug: 'trump-pulled-federal-ai-review-order',
    title:
      'Trump Pulled the Federal AI Review Order at the Last Minute. The Rules Now Come From Sacramento and Brussels.',
    author: 'Marcus Chen',
    date: 'May 29, 2026',
    readTime: '6 min read',
    description:
      "The administration was hours from signing an executive order creating a voluntary federal review of frontier AI models before release, with agencies given up to 90 days to inspect them, when calls from David Sacks, Elon Musk, and Mark Zuckerberg killed it. The competitiveness framing misses the structural point: scrapping the one shot at a single national standard does not deregulate frontier AI, it hands the binding rules to California SB 53, the EU AI Act, and the compliance frameworks the labs publish themselves. Inside what the order would have done, who stopped it and why, what it changes for the model-release pipeline, and three signposts over the next ninety days.",
  },
  {
    slug: 'openai-frontier-governance-framework-compliance-era',
    title:
      'OpenAI Mapped Its Safety Stack to the Law. Frontier AI Just Crossed From Voluntary to Mandatory.',
    author: 'Kira Nolan',
    date: 'May 29, 2026',
    readTime: '7 min read',
    description:
      "OpenAI published its Frontier Governance Framework this week, a public document that maps its internal safety practices to named statutes: California's Transparency in Frontier AI Act (SB 53) and the EU AI Act Code of Practice for general purpose AI. It builds on the Preparedness Framework but carves out the subset a regulator can actually hold the company to. The structural move worth watching is the split each major lab now runs: a voluntary best-practices policy it can edit at will (OpenAI's Preparedness, Anthropic's Responsible Scaling Policy, Google DeepMind's Frontier Safety Framework) and a statute-facing compliance framework it cannot quietly walk back (OpenAI's Frontier Governance Framework, Anthropic's Frontier Compliance Framework). Inside what shipped, the SB 53 obligations underneath it (10^26 FLOP threshold, $500M revenue line, pre-deployment transparency reports, OES incident reporting, $1M-per-violation penalty), why the voluntary-versus-mandatory split is good news in the short run and a hiding place in the long run, three concrete reads for agent builders, and three signposts over the next ninety days.",
  },
  {
    slug: 'tavily-x402-search-discovery-layer-gap',
    title:
      'Coinbase Put Tavily Search on x402. The Pay Rail Shipped; the Discovery Rail Did Not.',
    author: 'Marcus Chen',
    date: 'May 29, 2026',
    readTime: '6 min read',
    description:
      "Coinbase and Tavily brought agentic web search to x402: an agent pays per request from a Base wallet, no API key, $0.01 an advanced search in USDC. Probing the live service, the payment rail is clean and works exactly as advertised, but the discovery rail is missing: no published payment manifest at the well-known path, no catalog or discovery listing, no agent card, just a bare health check at the root. So an agent only learns the endpoint, its price, and its input shape from Tavily's human documentation. The launch solved how an agent pays and left how an agent finds unsolved. Inside what actually shipped, why the x402 payment layer has converged while the discovery layer fragments across three competing conventions, why that caps autonomy at the discovery step no matter how good the payments are, and three signposts over the next ninety days.",
  },
  {
    slug: 'opus-4-8-workflow-orchestration-primitive',
    title:
      'Opus 4.8 Shipped a Workflow Primitive. Agent Orchestration Just Moved Into the Model.',
    author: 'Adrian Vale',
    date: 'May 28, 2026',
    readTime: '6 min read',
    description:
      "Anthropic shipped Claude Opus 4.8 this week, and the part agent operators are talking about is not the quality bump. It is Workflow, a primitive that turns deterministic multi-agent orchestration (fan-out, pipelines, judge panels, adversarial verification) into a first-class feature of the model tool itself, not an app-layer framework you bolt on. Inside what actually shipped, why moving orchestration from the framework into the runtime shifts the default behavior of the median agent builder, the cost and latency math that changes when fan-out becomes one line to express (a ten-way parallel step quietly costs ten times the tokens), the pipeline-versus-barrier latency trap, and how the agent-framework market splits along the multi-model line once orchestration ergonomics stop being a moat.",
  },
  {
    slug: 'robinhood-agentic-trading-mcp-brokerage-account',
    title:
      'Robinhood Just Gave AI Agents a Brokerage Account. The Floor Below x402 Has a New Lane.',
    author: 'Kira Nolan',
    date: 'May 27, 2026',
    readTime: '6 min read',
    description:
      "Robinhood announced Agentic Trading and an Agentic Credit Card on May 27, 2026. AI agents can now trade equities in a dedicated sub-account isolated from the user's main portfolio (beta, with options, crypto, event contracts, futures, and prediction markets to follow). The Agentic Credit Card pairs a virtual Robinhood Gold card with a spending limit and 3 percent cash back, and the agent connects through Robinhood Banking's MCP server. This is the first mainstream U.S. retail broker to open direct agent access at the account tier. Inside what shipped, why the MCP server is the load-bearing detail (a regulated U.S. banking subsidiary in the consumer tier), why the sub-account architecture is a compliance posture rather than a UX choice (FINRA 2090, FINRA 2111, discretionary-account ambiguity sidestepped), how this card lane lands on top of the agent-commerce micropayment lane from earlier in the week (Keyrock 76 percent below the 30-cent fee floor, Nick Prince SpaceX memo on x402), and three signposts for what Plaid, Stripe, and the rest of the consumer financial stack do in response over the next ninety days.",
  },
  {
    slug: 'four-frontier-labs-acqui-hire-consolidation',
    title:
      'Three Frontier Lab Acqui-Hires in 48 Hours. The Quiet Consolidation Is Already Here.',
    author: 'Marcus Chen',
    date: 'May 27, 2026',
    readTime: '6 min read',
    description:
      "On May 19, Mistral said it was acquiring Vienna's Emmi AI, a 30-person physics-simulation lab. That was the third frontier-lab acqui-hire in a 48-hour window, after Anthropic bought Stainless for $300M+ on May 18 and Google DeepMind paid $80M to $90M to license Contextual AI and lift its team (including co-founder Douwe Kiela) on May 19. Meta's Dreamer absorption from March completes the quarter at four. Three of the four are structured as licensing-plus-talent transfers rather than clean acquisitions, the same shape Microsoft used with Inflection and Amazon with Adept, designed to slip past Hart-Scott-Rodino and EU Phase I review. Inside what each lab was actually buying (Mistral plugging physics simulation for European industrial sales, DeepMind plugging a credentialed RAG researcher into Gemini Enterprise, Anthropic taking MCP server tooling away from OpenAI and Google, Meta installing three platform operators into MSL), why Anthropic's deal was the only clean acquisition and what the dev-tooling ownership signal means, where the structure leaves the mid-tier specialty AI startups (Mistral-Emmi is now VC shorthand for realistic upside), and three signposts (whether OpenAI does the fifth deal, whether regulators move on one of these structures, whether xAI runs the play) over the next 90 days.",
  },
  {
    slug: 'pope-leo-magnifica-humanitas-anthropic-olah',
    title:
      "Pope Leo XIV Just Wrote a 235-Page Encyclical on AI. Anthropic's Co-Founder Was Standing Next to Him.",
    author: 'Kira Nolan',
    date: 'May 27, 2026',
    readTime: '7 min read',
    description:
      "Magnifica Humanitas dropped May 25 in Vatican City. The first papal encyclical to take AI as its central subject, signed 135 years to the day after Rerum Novarum reframed labor and capital. Pope Leo presented it personally, the first pontiff ever to do so, with Anthropic co-founder Chris Olah at his side. Inside the text on autonomous weapons, data justice, labor protections, and governance; the staging against an OpenAI S-1 and a $900B Anthropic round in the same five business days; what moral capital actually buys for a frontier lab (regulator vocabulary, weapons-procurement leverage, enterprise sales motion to 1.4B baptized Catholics); and three signposts to watch for whether the encyclical functions as policy infrastructure or stays theology.",
  },
  {
    slug: 'starlette-badhost-critical-cve-agent-stack-audit',
    title:
      'Starlette Just Shipped a Critical CVE. If Your Agent Has FastAPI Anywhere in Its Stack, This Is Yours.',
    author: 'Adrian Vale',
    date: 'May 27, 2026',
    readTime: '4 min read',
    description:
      "Ars Technica reported on May 26 that a critical vulnerability nicknamed BadHost was found in Starlette, the ASGI toolkit that ships inside roughly every FastAPI deployment and is downloaded 325 million times a week. The CVE imperils millions of AI agents because FastAPI is the default backend for agent servers, MCP gateways, and tool-calling middleware across the cohort. Inside: why agents got hit disproportionately (the standardization speed), the five-minute operator audit (uv tree, version pin, exposure triage, log the work), the TF security feeds that confirm exposure across a portfolio in one call (/api/ai-cves/latest, /api/security/ai-supply-chain-iocs.json, /api/premium/ai-cves/batch), and the structural lesson about dependency concentration when the asset value on top of the graph is the spend on a model API key.",
  },
  {
    slug: 'altman-amodei-walk-back-jobs-apocalypse-ipo-pivot',
    title:
      'Altman and Amodei Walked Back the AI Jobs Apocalypse. The Subtext Is the IPO Calendar.',
    author: 'Marcus Chen',
    date: 'May 27, 2026',
    readTime: '6 min read',
    description:
      "Fortune reported on May 26 that Sam Altman and Dario Amodei are softening their prior framing that AI would obliterate large swaths of white-collar work. Anthropic is closing a $30B round at $900B. OpenAI filed its S-1 four days earlier. The two largest AI capital events in history are converging on the same eight-week window and the labor-replacement prophecy both CEOs spent eighteen months building is being quietly retired. Inside what they said before, what they are saying now, why apocalypse framing was an asset at the private-capital tier but is a liability under the public-market disclosure regime, the Microsoft and Google tell (Big Tech never used the apocalypse framing in the first place), and the read for agent operators on what changes versus what does not.",
  },
  {
    slug: 'anthropic-glasswing-update-mythos-public-release',
    title:
      'Mythos Just Logged 10,000 Critical Bugs in 30 Days. Anthropic Says the Public Release Is Next.',
    author: 'Kira Nolan',
    date: 'May 26, 2026',
    readTime: '7 min read',
    description:
      "Anthropic posted the first operational update on Project Glasswing on May 25-26. Thirty days in, Mythos has flagged 23,019 potential vulnerabilities across 1,000+ open source projects, independent security firms validated 1,726 of them, and partner organizations have confirmed more than 10,000 high- or critical-severity bugs (Cloudflare alone: 2,000 total, 400 high/critical; Mozilla: 271 Firefox zero-days). The partner roster widened to roughly 50 organizations (AWS, Apple, Broadcom, Cisco, CrowdStrike, Google, JPMorgan Chase, Linux Foundation, Microsoft, NVIDIA, Palo Alto Networks as launch partners). Anthropic committed $100M in Mythos usage credits, $4M in direct donations to OSS security organizations, named U.S. and allied governments as the next Glasswing expansion target, and stated its intent to release Mythos-class models publicly once safeguards are stronger. Inside the 7.5 percent validation rate caveat on the flagged number, why the public-release line resets the policy conversation, the comparison to OpenAI Daybreak (the May 12 workflow-integrated counter), what the donation budget does to OSS maintainer triage capacity, and three signposts to watch over the next ninety days.",
  },
  {
    slug: 'agent-commerce-fee-floor-spacex-memo',
    title:
      "76% of AI Agent Payments Are Already Below Visa's Floor. Then Came the SpaceX Memo.",
    author: 'Marcus Chen',
    date: 'May 25, 2026',
    readTime: '7 min read',
    description:
      'Keyrock published a market-structure note on May 19 finding that 76 percent of AI agent transactions on public stablecoin rails fall below the 30-cent fee floor of the traditional card networks. Five days later, Coinbase product lead Nick Prince posted a demo in which an AI agent on Base spent $1.87 in USDC across six paid x402 calls to draft a full SpaceX investment-committee memo from the S-1 in twelve minutes. Inside the convergent week (Stellar joining x402, Cryptorefills launching agent payments, Fireblocks signing on, AllUnity adding the first non-dollar stablecoin), why SaaS subscription pricing breaks against an audience that does not amortize, and three signposts for the next ninety days.',
  },
  {
    slug: 'agent-native-browsers-firefox-fork-runtime-shift',
    title:
      'AI Agents Just Got Their Own Web Browser. The Runtime Layer Is Forking Away From Humans.',
    author: 'Marcus Chen',
    date: 'May 24, 2026',
    readTime: '6 min read',
    description:
      'A Firefox fork built explicitly for AI agents hit the Hacker News front page on May 24, the latest signal in a category that has been quietly assembling for eighteen months: dedicated browser runtimes for agent traffic, separated from the Chromium and Firefox builds humans use. Browserbase, Browserless, Arsenal, Playwright cloud surfaces, and now a Mozilla-derived agent fork have crossed from research project to deployable infrastructure. Inside what an agent-native browser actually changes, why the Firefox path matters (most agent browsers were Chromium until now), and the second-order consequences for site operators, anti-bot tooling, and the agent identity stack.',
  },
  {
    slug: 'chatbot-personality-exploits-prompt-injection-grows-up',
    title:
      "Hackers Are Targeting Chatbot 'Personalities.' The Attack Surface Just Moved Up the Stack.",
    author: 'Kira Nolan',
    date: 'May 24, 2026',
    readTime: '5 min read',
    description:
      "The Verge published a column on May 24 reporting that hackers are increasingly exploiting the persona layer of consumer chatbots. The technique is not new in alignment research; the mainstream attention is, and it arrives right as consumer assistants gain real action permissions (Plaid hooks, calendar access, agent mode). Inside what persona-based prompt injection actually looks like, why constitutional and RLHF defenses do not catch it by default, what the vendors have shipped versus what they have not, and the three defensive rules an agent operator should be running this week.",
  },
  {
    slug: 'xai-2-8b-gas-turbines-energy-bottleneck',
    title:
      "Elon Musk's xAI Just Committed $2.8 Billion to Gas Turbines. The AI Energy Crunch Has a Number Now.",
    author: 'Marcus Chen',
    date: 'May 24, 2026',
    readTime: '6 min read',
    description:
      "WIRED reported on May 20 that Elon Musk's xAI is spending $2.8 billion on gas turbines to power its AI data centers, with the Memphis Colossus supercluster as the primary target. The dollar figure puts a hard number on the energy bottleneck the rest of the industry has been describing in adjectives. Inside: why xAI is paying for its own power plant when hyperscalers are still buying from the grid, the Memphis community fight Colossus walked into, what $2.8 billion in turbines actually buys (3.5 to 5 GW, enough for 15 to 30 Colossus-equivalents), and the structural read on what this signals for the AI capex cycle.",
  },
  {
    slug: 'openai-erdos-unit-distance-disproof',
    title:
      'OpenAI Just Disproved an 80-Year Erdős Conjecture. The Model Was Not Trained for Math.',
    author: 'Kira Nolan',
    date: 'May 24, 2026',
    readTime: '7 min read',
    description:
      'On May 20, OpenAI announced that an internal general-purpose reasoning model disproved a 1946 Erdős conjecture on the planar unit distance problem. 125 pages of coherent proof using Golod-Shafarevich theory and infinite class field towers, no math-specific training, no problem-targeted scaffolding. Fields medalist Tim Gowers and Princeton mathematician Will Sawin verified it, with Sawin tightening the bound to n raised to one plus delta with delta equal to 0.014. Inside what actually shipped, why the general-purpose framing is the structural story, the comparison to AlphaProof, FunSearch, and Numina, and what it does to the research-discovery rail and the next pricing tier.',
  },
  {
    slug: 'openai-ipo-filing-anthropic-first-profit',
    title:
      'OpenAI Filed for a Trillion-Dollar IPO. The Same Week Anthropic Booked Its First Profit.',
    author: 'Adrian Vale',
    date: 'May 23, 2026',
    readTime: '7 min read',
    description:
      'OpenAI sent its confidential S-1 to the SEC on Friday May 22 targeting an $852B to $1T Q4 listing with Goldman Sachs and Morgan Stanley leading, while still losing $1.22 for every dollar of revenue in Q1 on $5.7B of quarterly revenue. Six days earlier, Anthropic told investors it expects a $559M operating profit on $10.9B of Q2 revenue (130% growth from Q1), the first profitable quarter in company history, with the compute cost ratio collapsing from 71 cents per $1 to 56 cents in a single quarter. Two trillion-dollar labs, two opposite financial moments in the same week. Inside the side-by-side, why distribution-first burning and unit-economics-first compounding can both be rational bets, what the S-1 actually discloses vs hides until the public roadshow, and what the price-floor implications are for every other API vendor.',
  },
  {
    slug: 'x402-multi-rail-fireblocks-allunity',
    title:
      'Fireblocks Brought Spend Governance. AllUnity Brought a Krona. x402 Stopped Being a One-Rail Protocol This Week.',
    author: 'Adrian Vale',
    date: 'May 21, 2026',
    readTime: '6 min read',
    description:
      'Two announcements landed on May 20. Fireblocks, the institutional crypto custodian rather than a startup, joined the x402 Foundation and shipped a security extension for request integrity and spend governance. The same day, Germany’s MiCA-regulated AllUnity rolled out Agentic Payments using x402 to settle into a Swedish krona stablecoin. The next morning, a third party offered the spec authors a non-Coinbase, three-rail acceptance fixture on #2207 covering Base USDC, Solana USDC, and JPYC on Polygon. x402 was a Coinbase-and-Cloudflare default six months ago. After this week the variant axis is open.',
  },
  {
    slug: 'ai-status-extension-live',
    title:
      'TensorFeed AI Status Is Now a Chrome Extension. Live AI Health Sits in Your Toolbar.',
    author: 'Adrian Vale',
    date: 'May 20, 2026',
    readTime: '4 min read',
    description:
      'Our embeddable Live Monitor just shipped as a Chrome extension, approved and public on the Web Store as of today. A toolbar popup with real status and real p95 latency for every major AI provider, plus a passive badge that quietly turns amber or red the moment something degrades. Same honest-by-construction rules as the widget, in the surface that already lives next to your address bar. One click to install, no account, no tracking, host access scoped to tensorfeed.ai only. Inside: why a toolbar popup is the right surface for an AI health signal, the CSP frame-ancestors detail that almost killed the review, and what permissions we deliberately did not ask for.',
  },
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    slug: 'aws-ships-hosted-mcp-server',
    title:
      'AWS Put MCP on Its Own Infrastructure. That Changes What the Protocol Is For.',
    author: 'Marcus Chen',
    date: 'May 15, 2026',
    readTime: '7 min read',
    description:
      "AWS shipped a hosted MCP Server with SigV4 auth, IAM authorization, and two regional endpoints, and folded its two prior MCP servers into it. The news is not that AWS has an MCP server. It is that AWS decided MCP belongs on production cloud infrastructure with enterprise auth, not on a developer's laptop. Inside what shipped, why the auth model matters more than the tool list, and how this stacks with AgentCore Payments.",
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
    author: 'Adrian Vale',
    date: 'May 14, 2026',
    readTime: '5 min read',
    description:
      'AI-driven vulnerability discovery is no longer theoretical. Claude Mythos surfaced 271 Firefox zero-days in one cycle. The third major Linux kernel flaw in two weeks was attributed to AI-assisted research. OpenAI Daybreak shipped two days ago. The agents finding vulns now move faster than the data layer they need to call. Inside the five-schemas-five-cadences problem (MITRE CVE, CISA KEV, FIRST EPSS, OSV, Vulnrichment), the cross-database verified-CVE call we ship as the fix, and why TensorFeed cares about a security data layer it does not build agents on top of. We also shipped /cve-watch today as the canonical hub.',
  },
  {
    slug: 'agentic-usdc-pay-and-trade-converge',
    title:
      'Same Dollar, Same Chain, Same Custodian: The Agentic USDC Stack Is Converging',
    author: 'Adrian Vale',
    date: 'May 14, 2026',
    readTime: '6 min read',
    description:
      "AgentCore Payments uses USDC for agents to buy APIs. Hyperliquid just standardized USDC as agent trading collateral, with Coinbase as official treasury deployer and Circle staking HYPE. We settled five real x402 payments through CDP this morning, each $0.02 on Base, broadcast by Coinbase's own facilitator wallet. The agent economy plumbing is converging on one asset, one chain, one custodian. Inside what the two announcements actually mean for builders, the boring detail nobody is leading with, and what is still missing (Bazaar indexing is broken, agentic.market is closed, but the underlying just stopped moving).",
  },
  {
    slug: 'apple-20-day-window-io-wwdc',
    title: "Apple Just Got a 20-Day Window. Between Google I/O and WWDC, It Has To Rewrite the Siri Story.",
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    slug: 'x402-verifier-mcp-launch',
    title: 'The x402 Payment Just Settled. Now What Verifies It? We Shipped the MCP.',
    author: 'Adrian Vale',
    date: 'May 11, 2026',
    readTime: '6 min read',
    description:
      "Four days after AWS made x402 the default agent payment rail, the next question is who verifies the on-chain settlement actually matches the claimed receipt. We shipped the read-only Base mainnet chain reader that lets any agent answer that without holding a private key. Eleven tools, MIT, on npm and the canonical MCP registry today.",
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
    date: 'May 7, 2026',
    readTime: '6 min read',
    description:
      "Coinbase announced that AI agents can now pay for AWS services in USDC over x402. The largest cloud provider on the planet just made a stablecoin micropayment standard a first-class way for autonomous software to buy compute, storage, and inference. Inside what x402 actually is, why AWS picking open instead of building proprietary is the inflection, what it does to Stripe Link's universal-layer thesis, the answer Azure and GCP now owe, and what it means for every API publisher still on the fence about shipping a paid agent tier. The cost of being early on x402 just got refunded.",
  },
  {
    slug: 'anthropic-dreaming-managed-agents',
    title: "Anthropic Just Taught Claude to Dream Between Tasks. Long-Running Agents Got Their Memory Layer.",
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
    date: 'May 6, 2026',
    readTime: '7 min read',
    description:
      "Today TensorFeed shipped eight new free data endpoints across sports, packages, research, economy, and policy. Each on a verified clean license, each with structured attribution baked into the response shape, each on the same three-bucket grading rubric we built during this morning's audit cleanup. This is the post-mortem of why free-data-first is the play, what eight clean sources looked like in eighteen commits, and the pattern that scales to dozens more.",
  },
  {
    slug: 'audited-our-paid-api-killed-two-endpoints',
    title: 'I Audited Our Own Paid API. Two Endpoints Had to Die.',
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
    date: 'May 6, 2026',
    readTime: '8 min read',
    description:
      "The AFTA whitepaper is published; the rail underneath it is x402 + USDC on Base. Why that stack and not Stripe Link, Bitcoin Lightning, USDC on Solana, USDT on TRON, or any of the other plausible answers. Inside the bake-off, the four-property test (open, transparent, instantly final, sub-cent), the Coinbase + Circle layer the choice rests on, and why the early-mover bet on US-anchored stablecoin rails compounds rather than commodifies.",
  },
  {
    slug: 'coinbase-armstrong-14-percent-ai-native-pivot',
    title: "Coinbase Cuts 14%. Brian Armstrong's Memo Is the First Agent-Native Layoff at Scale.",
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
    date: 'May 4, 2026',
    readTime: '7 min read',
    description:
      "Most \"is X down\" sites lag the actual outage by 5 to 15 minutes because they just mirror the official status page. We built TensorFeed to do better: 2-minute polling, component-level detail, an active LLM endpoint probe, incident history, and a single feed across every AI provider. Inside the stack and three real incidents it caught last quarter.",
  },
  {
    slug: 'ai-inference-floor-may-2026',
    title: 'The Cheapest AI Model on the Market Costs 1.7 Cents per Million Tokens',
    author: 'Adrian Vale',
    date: 'May 4, 2026',
    readTime: '5 min read',
    description:
      "I pulled the live OpenRouter catalog this afternoon. 372 models, 33 of them free, the cheapest paid input at $0.017 per million tokens. The proprietary frontier is a thin layer on top of a dense open-source middle, and the gap to the floor keeps widening. What the inference market looks like in May 2026, plus practical numbers worth remembering for your next routing decision.",
  },
  {
    slug: 'agents-md-new-robots-txt',
    title: 'AGENTS.md Is the New robots.txt',
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
    date: 'Apr 30, 2026',
    readTime: '6 min read',
    description:
      'Claude Sonnet 4.6 in Claude Code scores about 71 on SWE-bench Verified. The same Sonnet 4.6 in Continue scores about 52. Same model. The harness is doing the other 19 points. The harness gap, why it is bigger than the model gap, and the new TensorFeed harness leaderboard tracking 11 coding agents across 4 agentic benchmarks.',
  },
  {
    slug: 'measuring-llm-api-latency-from-the-edge',
    title: 'Provider Status Pages Are Marketing. We Built Our Own LLM Probes.',
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
    date: 'Apr 28, 2026',
    readTime: '6 min read',
    description:
      'Most sites hide bot traffic. We just published ours at /agent-traffic with a per-bot breakdown, top hit endpoints, and a live tail. ClaudeBot, GPTBot, PerplexityBot, Bytespider, Google-Extended, and the rest of the AI crawler set, refreshed every 30 seconds. Why we did it, what we are seeing, and why every site built for agents should do the same.',
  },
  {
    slug: 'kv-ops-budget-edge-architecture',
    title: 'The 100,000 KV Ops Daily Budget and What Fits in It',
    author: 'Adrian Vale',
    date: 'Apr 28, 2026',
    readTime: '7 min read',
    description:
      'Cloudflare KV gives you 100,000 operations per day on the free tier. We run a real-time AI news API, status monitoring, model pricing, and a paid agent payments tier inside that budget. Here is the engineering that makes it possible: cache API for reads, batched writes, cron-only writers, in-memory buffers, and per-type index keys.',
  },
  {
    slug: 'mcp-server-fifty-line-file',
    title: 'An MCP Server Is a 50-Line File. Why Every Paid API Should Ship One.',
    author: 'Adrian Vale',
    date: 'Apr 27, 2026',
    readTime: '6 min read',
    description:
      'The Model Context Protocol server you would build for your existing paid API is a 50-line file. The agent-acquisition leverage of having one is enormous. The actual code, what it costs to ship, and why most teams overthink the work. Stop writing the planning doc; write the file.',
  },
  {
    slug: 'why-usdc-over-stripe',
    title: 'Why We Picked USDC on Base Over Stripe for Agent Payments',
    author: 'Adrian Vale',
    date: 'Apr 27, 2026',
    readTime: '7 min read',
    description:
      'Stripe works fine for humans. It does not work for AI agents making decisions in a loop. A first-person breakdown of the architectural choice, what we gave up, and what we got in return: simpler architecture, lower fees, no platform risk, public auditability.',
  },
  {
    slug: '15-paid-endpoints-24-hours',
    title: '15 Paid AI Agent API Endpoints in 24 Hours: What Made It Possible',
    author: 'Adrian Vale',
    date: 'Apr 27, 2026',
    readTime: '8 min read',
    description:
      'A first-person retrospective on shipping 15 pay-per-call premium endpoints, full SDKs in two languages, an MCP server expansion, and a human dashboard in a single 24-hour build session. Every endpoint is live, every commit is on main, every test passes.',
  },
  {
    slug: 'validating-agent-payments-mainnet',
    title: 'We Validated Agent Payments End-to-End on Base Mainnet',
    author: 'Adrian Vale',
    date: 'Apr 27, 2026',
    readTime: '6 min read',
    description:
      'A first-person walkthrough of the five-step USDC payment loop that took TensorFeed agent payments from designed to operational. Real tx hash, real credits, no bugs surfaced. Why this is the moment the system stopped being theoretical.',
  },
  {
    slug: 'microsoft-openai-partnership-reset',
    title: 'The Microsoft and OpenAI Divorce Is Done. Both Sides Got What They Wanted.',
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
    date: 'Apr 22, 2026',
    readTime: '5 min read',
    description:
      'Claude Design lets you create prototypes, slides, and mockups with Claude, then hand them off to Claude Code with one click. Powered by Opus 4.7, it completes Anthropic\'s product trifecta.',
  },
  {
    slug: 'claude-opus-4-7-release',
    title: "Claude Opus 4.7 Just Dropped. Here's What Changed.",
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
    date: 'Apr 8, 2026',
    readTime: '8 min read',
    description:
      "Anthropic unveiled Claude Mythos Preview, a model that found tens of thousands of zero-days and escaped its own sandbox. They gave it to defenders first. Here's why that matters.",
  },
  {
    slug: 'building-for-ai-agents',
    title: 'Building for AI Agents: What Developers Need to Know',
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
    date: 'Mar 27, 2026',
    readTime: '4 min read',
    description:
      'Real data from our incident database. Which services went down most, average resolution times, when outages cluster on Tuesdays and Wednesdays, and what developers should plan for.',
  },
  {
    slug: 'claude-code-leak',
    title: 'The Claude Code Leak: What 512,000 Lines of Source Code Revealed',
    author: 'Adrian Vale',
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
    author: 'Adrian Vale',
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
