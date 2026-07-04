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
    slug: 'first-macro-ai-print-june-jobs-report',
    title:
      'The June Jobs Report Just Landed. AI Capex Is Now a Line Item on the Payroll Print.',
    author: 'Marcus Chen',
    date: 'July 3, 2026',
    readTime: '7 min read',
    description:
      "The Bureau of Labor Statistics released the June 2026 employment situation on Thursday morning. Nonfarm payrolls came in at 57,000 against a 115,000 consensus, unemployment fell to 4.2 percent only because participation slumped to a five-year low, and prior months got revised down. It is the softest payroll print in four months, and it is the first monthly release where the AI capex reallocation TF has been tracking for six months shows up cleanly in a top-line macro number. Read together with Challenger, Gray & Christmas' June job cut report (45,849 cuts, tech at 15,503, tech at 31 percent of H1 layoffs, AI cited as the top stated reason for a fourth consecutive month at 101,743 announcements year to date) and the roughly $700 billion of 2026 hyperscaler capex commitment (Amazon, Microsoft, Alphabet, Meta, nearly double 2025), the payroll wire now carries the buyer-side story TF has been publishing all quarter. Inside the numbers, why the participation drop is the same signal the payroll number is, why the leisure and hospitality drag is a separate story that exaggerates the AI-attributable share, why GDP will look better than payrolls for the same reason, what the print does to the July FOMC path and the September rate-cut probability, and three notes for builders shipping into the same infrastructure the S-1 drafts are now writing against. The next print is August 7, and if it lands anywhere near the roughly 40,000 trailing average the composition-shift argument stops being a thesis and becomes the base case.",
  },
  {
    slug: 'cloudflare-monetization-gateway-x402-mcp-edge',
    title:
      'Cloudflare Just Wired x402 Into 20 Percent of the Internet. The MCP Tool Is Now a Line Item.',
    author: 'Adrian Vale',
    date: 'July 2, 2026',
    readTime: '6 min read',
    description:
      "On July 1, 2026, Cloudflare opened the waitlist for its Monetization Gateway: a single control plane inside the Cloudflare dashboard that lets any customer put a price on a web page, dataset, API, or MCP tool sitting behind Cloudflare, with settlement in stablecoins over the x402 protocol. Peer-to-peer, sub-second, USDC on Base, no signup or API key for buyers, and no take rate on the wire (Cloudflare monetizes the Workers seat, not the transaction). It ships the same week Coinbase and Cloudflare seeded the x402 Foundation as the standards body. Inside why this is the distribution layer moment for agent payments, why MCP sitting on a four-item menu alongside APIs is the categorisation signal every server author should read, the AWS-at-the-origin vs Cloudflare-at-the-edge split now shaping how agents will actually pay, and what it does to Stripe's card-network answer to the same problem. The models are getting cheaper, the harness is getting more valuable, and the money is moving over HTTP; Cloudflare just put its 20 percent share of the web on the winning side of all three.",
  },
  {
    slug: 'claude-science-harness-is-the-product',
    title:
      'Claude Science Ships a Coordinating Agent, Not a New Model. The Harness Is the Product Now.',
    author: 'Kira Nolan',
    date: 'July 1, 2026',
    readTime: '6 min read',
    description:
      "On June 30, 2026, Anthropic launched Claude Science at its AI for Science briefing. Not a new model. A workbench with a coordinating agent that dispatches specialist sub-agents, a reviewer agent that checks citations and calculations, connectors into more than 60 scientific databases, and prebuilt toolkits for genomics, protein structure, and chemistry. It runs on the lab's own laptop, Linux box, or HPC login node, so raw datasets stay put and only the context each step needs goes to Claude. Available in beta on Pro, Max, Team, and Enterprise seats. Anthropic is funding up to 50 projects with up to $30,000 in credits each (applications open through July 15, awards by July 31, projects running September 1 to December 1). Novo Nordisk and Allen Institute are the named case studies. Eleven days after John Jumper crossed over from DeepMind. Inside why this is a harness product wearing a science skin, what it does to the Anthropic IPO revenue story, the VirBench accuracy math (16.9 percent without retrieval, past 92 percent with a single deterministic tool) that made moving the workflow inside the SKU obvious, why local execution is a compliance wedge Gemini has to answer to, and three signposts in the next 60 days that decide whether Anthropic just set the category template. The models are becoming commodities faster than the labs will publicly say; the workflow is not.",
  },
  {
    slug: 'claude-sonnet-5-only-frontier-available-federal-gate',
    title:
      'Claude Sonnet 5 Just Became the Only Frontier Model You Can Actually Buy. Fable Is Dark, GPT-5.6 Sol Is NCD-Gated, Gemini 3.5 Slipped.',
    author: 'Kira Nolan',
    date: 'July 1, 2026',
    readTime: '7 min read',
    description:
      "On June 30, 2026 Anthropic shipped Claude Sonnet 5 to the public API at $2/$10 introductory pricing with a 1M context, 85.2 percent SWE-Bench Verified, 63.2 percent SWE-Bench Pro (best publicly buyable score), and adaptive thinking through xhigh effort. It landed inside an empty room. Fable 5 has been dark since the June 12 export-control pull, Mythos 5 with it. GPT-5.6 Sol is inside a customer-by-customer NCD and OSTP preview two to eight weeks from broad release. Gemini 3.5 Pro slipped a second I/O commitment to late July. Meituan open-sourced LongCat-2.0 yesterday but it needs a security review to clear Fortune 500 procurement. For the next two to eight weeks the buyable top of the ladder is a two-model set (Sonnet 5 and Opus 4.8 or GPT-5.5) and Anthropic owns two of the three positions with the same billing surface. The federal gate that pulled Anthropic's own flagship 19 days ago is now the reason Sonnet 5 has a distribution runway. Inside the tokenizer footnote (1.0 to 1.35x more tokens per unit text), the SWE-Bench Pro delta, the Terminal-Bench 2.1 gap the buyable market cannot exploit, the S-1 language Anthropic can now lean on, and three signposts in the next ninety days: NCD gate lift on Sol, Fable 5 return, Gemini 3.5 Pro's third slip test.",
  },
  {
    slug: 'copilot-first-cycle-bill-shock-developer-tokenmaxx',
    title:
      "GitHub Copilot's First Token Cycle Just Closed. The Developer Bill Came In at 10x to 50x.",
    author: 'Marcus Chen',
    date: 'June 30, 2026',
    readTime: '6 min read',
    description:
      "On June 30, 2026, the first full 30-day cycle of GitHub Copilot's usage-based billing closed. The flat $10 Pro plan still costs $10, but heavy agentic developers are reporting projected charges of $750 to $3,000 a month, with extreme cases running higher. One AI Credit equals one cent. Pro ships with 1,500 credits, Pro+ with 7,000, the new $100 Copilot Max tier with 20,000. A single 40K-token agentic task on Claude Opus 4.7 burns 60 to 100 credits. Code completions stay free; chat and agentic loops do not. GitHub stopped absorbing the inference subsidy that hid the per-token cost behind a flat subscription, and the buyer-side discipline cliff our tokenmaxxing piece flagged three days ago just landed on the individual contributor through the harness vendor. Inside the meter math, the per-model rates (GPT-5.5 at $5/$30, Claude Opus at $5/$25, MAI-Code-1-Flash at $0.75/$4.50), three concrete substitution behaviors visible in the cycle that closed today, what it does to Anthropic and OpenAI IPO math, and the developer-tooling repricing that has now hit one to two million heavy seats directly.",
  },
  {
    slug: 'meituan-longcat-2-owl-alpha-openrouter',
    title:
      'Owl Alpha Was Meituan All Along. LongCat-2.0 Open-Sourced Today at 1.6T, Zero Nvidia, and It Has Been Number One on OpenRouter For Two Months.',
    author: 'Adrian Vale',
    date: 'June 30, 2026',
    readTime: '7 min read',
    description:
      "On June 30, 2026 Meituan open-sourced LongCat-2.0 under MIT: a 1.6 trillion-parameter MoE with about 48B active per token, a 1M context window, SWE-bench Pro 59.5 (above GPT-5.5's 58.6), and Terminal-Bench 70.8. The same weights have been the anonymous Owl Alpha on OpenRouter for two months, running at roughly 10.1 trillion monthly tokens, 559 billion a day, +242 percent month over month, number one on Hermes Agent, number two inside Claude Code, number three on OpenClaw. The training cluster is 50,000 to 60,000 domestic Chinese AI ASICs organized into Huawei Atlas-950 superpods with the HCCL collective library, with zero Nvidia in the loop. A food delivery company just shipped the most-used model on the open developer router, on hardware US export controls cannot reach, the same week Anthropic still has Fable 5 dark and Google missed Gemini 3.5 Pro by a month. Inside what shipped, why the export letter does not reach it, what it does to the price floor for closed APIs inside the IPO window, and three signposts in the next ninety days.",
  },
  {
    slug: 'qwen-agentworld-mcp-simulator-open-frontier',
    title:
      'Qwen Just Open-Sourced a Simulator for Seven Agent Worlds. MCP Is One of Them.',
    author: 'Marcus Chen',
    date: 'June 29, 2026',
    readTime: '6 min read',
    description:
      "On June 24, 2026, Alibaba's Qwen team shipped Qwen-AgentWorld, an open-weight Language World Model that simulates seven agent environments inside a single model: MCP, Search, Terminal, Software Engineering, Web, OS, and Android. The 397B-A17B variant scores 58.71 on the team's AgentWorldBench, beating GPT-5.4 (58.25), Claude Opus 4.8 (56.59), and Gemini 3.1 Pro (54.57) at predicting what an agent's tool call will return. A 35B-A3B sibling runs cheap enough to spin up as a training simulator on a single H100. Apache 2.0 weights, 256K context, three-stage training pipeline (CPT, SFT, RL) over 10M+ real interaction trajectories. The agent harness, the thing we have been writing about as the load-bearing piece nobody owns, just became a forward pass you can download from Hugging Face. Inside the seven-environment design, the MCP simulation line that matters most to anyone shipping a server, the irony of an open frontier topping a benchmark on closed-frontier traces, and what it does to the data factory underneath every credible agent training loop.",
  },
  {
    slug: 'deepmind-talent-exodus-gemini-pro-slip',
    title:
      'John Jumper Walked. The DeepMind Bench Lost Four in Eleven Days, and Gemini 3.5 Pro Slipped Again.',
    author: 'Marcus Chen',
    date: 'June 29, 2026',
    readTime: '6 min read',
    description:
      "Inside eleven days Google DeepMind lost a Nobel laureate and three Gemini contributors to its two largest US rivals. Noam Shazeer went to OpenAI on June 18. John Jumper, the AlphaFold lead and 2024 Nobel laureate in Chemistry, plus Gemini contributors Jonas Adler and Alexander Pritzel, all signed with Anthropic by June 24. Gemini 3.5 Pro slipped from a June ship date previewed at I/O to July, the second consecutive I/O commitment Google has missed on a flagship. Roughly $270 billion came off Alphabet's market cap over the week. The receiving labs are both inside IPO windows: Anthropic filed confidentially on June 1 at $965B, OpenAI is steering toward a 2027 listing. Reporting that shortly before Shazeer's exit Google reassigned compute from one of his projects to a London-based DeepMind team is the structural tell. Inside the four names, the compute slight, the second-slip pattern, the $270B cap hit, why this is structural rather than a comp problem, what builders shipping on Gemini should do, and what the next compute reallocation decision tells you about which DeepMind team gets the next ship date.",
  },
  {
    slug: 'anthropic-alibaba-distillation-senate-banking-sanctions',
    title:
      'Anthropic Named Alibaba Inside the Senate Banking Committee. Distillation Just Crossed Into Sanctions Territory.',
    author: 'Kira Nolan',
    date: 'June 28, 2026',
    readTime: '6 min read',
    description:
      "On June 24, 2026 CNBC surfaced the letter Anthropic sent the US Senate Banking Committee on June 10, naming Alibaba as the operator of what Anthropic calls the largest known distillation attack on its models to date: roughly 25,000 fraudulent accounts running 28.8 million Claude exchanges between April 22 and June 5, targeting agentic reasoning, software engineering, and long-horizon tasks. Alibaba's American depositary shares closed June 26 at $94.93, a 16-month low and off about 25 percent from May 27. The single campaign exceeded the combined total of the three Chinese-lab campaigns Anthropic disclosed in February (DeepSeek, Moonshot, MiniMax: roughly 24,000 accounts and 16 million exchanges), and the per-account efficiency nearly doubled. Inside the math, why the Senate Banking venue (not Commerce, not Intelligence) is the tell, what an OFAC or entity-list path looks like, the same-day Alibaba lawsuit against the DoD 1260H blacklist and the dropped Greenberg Traurig lobbying contract that confirm the read, and three signposts in the next ninety days that decide whether distillation gets a sanctions designation or stays a TOS dispute.",
  },
  {
    slug: 'tokenmaxxing-cliff-ipo-math',
    title:
      'The Tokenmaxxing Era Just Ended. The Run-Rate Doubling Curve Just Got an Efficiency Asterisk.',
    author: 'Marcus Chen',
    date: 'June 27, 2026',
    readTime: '6 min read',
    description:
      "On June 26, 2026, CNBC framed the spend pivot in plain text: enterprise buyers are done tokenmaxxing and have started capping AI tools by the line item. Uber capped Claude Code at $1,500 per employee per month after burning the 2026 AI budget in four months. Lindy moved 100 percent of its production traffic from Claude to DeepSeek. Vercel's AI Gateway watched DeepSeek's share of token volume jump from under 1 percent to 17 percent inside May, while DeepSeek's share of spend stayed near 1 percent. Z.ai's GLM 5.2 lands within a point of Opus 4.8 on a key agentic benchmark at roughly one fifth the cost. The shift hits Anthropic at a $47 billion run-rate and OpenAI at roughly $25 billion, both with IPO paperwork in motion, both with revenue forecasts that depend on the doubling curve continuing. Inside the math, the buyer-side discipline cliff, what it does to the run-rate disclosure language inside the S-1 and the 2027 OpenAI prospectus, the open-weight floor underneath, and three signposts in the next ninety days that decide whether the curve break is real. The doubling curve is not dead, but it now has a competing curve underneath it that the IPO models did not assume.",
  },
  {
    slug: 'inference-money-vs-ai-chip-stocks',
    title:
      'The AI Money Split in Two Directions This Week. The Split Is the Story.',
    author: 'Kira Nolan',
    date: 'June 27, 2026',
    readTime: '6 min read',
    description:
      "In one week, private capital poured a record round into AI inference while public AI chip stocks in Asia cratered hard enough to trip a circuit breaker. On June 22, Baseten raised $1.5 billion at a $13 billion valuation (20x revenue year over year, more than a billion inference requests a day), and Qualcomm agreed to buy Modular for about $3.9 billion in all stock to own the Mojo and MAX inference toolchain. Inside the same 48 hours, the Kospi fell about 10 percent and tripped a 20-minute circuit breaker, with SK Hynix and Samsung each down more than 12 percent, the Nikkei off 3.6 percent, and SoftBank down 15 percent. The divergence is not a contradiction; it is a rotation. Value in AI is migrating from training bigger models to serving existing ones cheaply, and venture capital is front-running that migration faster than the public chip trade can digest it. Against it sits Japan's $2.3 trillion through-2040 plan with roughly a third earmarked for AI and semiconductors, the sovereign counterweight to a 10 percent down day. What the split means for anyone building on AI: the serving layer is winning, and the cost curve under your invoice is bending in your favor.",
  },
  {
    slug: 'white-house-gpt-56-stagger-federal-gate-bilateral',
    title:
      'OpenAI Will Stagger GPT-5.6 By Customer. The Federal Gate on the Frontier Just Went Bilateral.',
    author: 'Marcus Chen',
    date: 'June 26, 2026',
    readTime: '6 min read',
    description:
      "On June 25, 2026, The Information reported that the Trump administration asked OpenAI to stagger the release of GPT-5.6 over national security and cybersecurity concerns, and OpenAI agreed. The Office of the National Cyber Director and the Office of Science and Technology Policy will approve enterprise customers one by one during a limited preview, with a broad release targeted roughly two weeks later. Sam Altman told staff on an internal Q&A that this was the fastest path to a broad release while noting it was not OpenAI's preferred long term model. Thirteen days after Washington forced Anthropic to pull Fable 5 and Mythos 5 under an export control directive, the same federal release-gating template hits the other top-three US lab. Inside the new operational primitive (customer-by-customer government approval at the moment of release), what NCD plus OSTP gating does to enterprise procurement timelines and the foreign-subsidiary question, why the revenue cadence and disclosure language inside the OpenAI 2027 IPO window and the Anthropic confidential S-1 now have to be rewritten, and three signposts in the next ninety days that decide whether the federal frontier-release gate is permanent or temporary. The model that ships fastest in 2026 is no longer the one with the best engineering; it is the one with the best federal queue position, and the queue manager works at the White House.",
  },
  {
    slug: 'openai-jalapeno-custom-silicon-loop-closed',
    title:
      'OpenAI Taped Out Jalapeño in Nine Months. The Custom-Silicon Loop Just Closed.',
    author: 'Marcus Chen',
    date: 'June 25, 2026',
    readTime: '6 min read',
    description:
      "On June 24, 2026, OpenAI and Broadcom unveiled Jalapeño, OpenAI's first custom Intelligence Processor: a reticle-sized ASIC (roughly 840 mm², 25.46 mm by 33 mm, near the EUV reticle limit) designed by OpenAI, built at TSMC with Broadcom co-design and Celestica packaging, taped out in nine months from initial design (called the fastest advanced-node ASIC cycle ever), and aimed at LLM inference at production scale. OpenAI is claiming roughly 50 percent lower cost per token than current Nvidia GPUs in early testing. First deployment lands by end of 2026, with the multi-generation program targeting 10 gigawatts of capacity by 2029 across OpenAI facilities and partner data centers. The chip closes a custom-silicon table that now includes Google TPU, Amazon Trainium, Microsoft Maia, Meta MTIA, and OpenAI Jalapeño, with Anthropic as the only top-three lab still without an in-house ASIC and instead riding all three hyperscaler platforms. Inside the math, the nine-month tape-out floor that OpenAI compressed by running its own models inside the design loop (Greg Brockman called the speed-up surprising), what changes for Nvidia at the top of the inference buyer list, why Broadcom sits on both sides of the most expensive silicon contracts in the industry (Google TPU and Jalapeño), and the 10 GW physical-buildout floor that converges on the same 2027 to 2029 delivery window as every other frontier program.",
  },
  {
    slug: 'openai-samsung-electronics-dx-chaebol-dual-stack',
    title:
      "OpenAI Just Took the Other Half of Samsung. Five Days After Anthropic's Seoul Flag, the Chaebol Voted For Both Stacks.",
    author: 'Marcus Chen',
    date: 'June 24, 2026',
    readTime: '6 min read',
    description:
      "On June 22, 2026, OpenAI announced ChatGPT Enterprise and Codex are deploying to every Samsung Electronics employee in South Korea and to the entire global Device eXperience (DX) division (Galaxy phones, visual displays, digital appliances, networks, and health and medical equipment). Samsung called it one of OpenAI's largest enterprise rollouts ever and the end of a three-year internal ChatGPT ban that started with three source-code leaks in April 2023. Five days earlier, Anthropic opened its Seoul office with Samsung SDS as a Day One customer deploying Claude Cowork and Claude Code across the same parent company. The two announcements interlock rather than contradict. The two-month proof-of-concept with 2,500 DX employees tested ChatGPT, Gemini, and Claude in parallel and produced a layered procurement decision: ChatGPT and Codex on productivity and code, Claude Code on the SDS developer surface, and the semiconductor (DS) business excluded by design. Inside the POC bake-off, the DS IP-isolation boundary, the harness gap dual-stack chaebols are about to create demand for, and three signposts in the next ninety days that decide whether Korea is now a structural dual-stack market.",
  },
  {
    slug: 'reflection-ai-6b-colossus-open-frontier-compute',
    title:
      'Reflection Pre-Bought $6.3 Billion of Colossus Compute Without a Shipped Model. The Open-Source Frontier Just Got a Procurement Story.',
    author: 'Marcus Chen',
    date: 'June 23, 2026',
    readTime: '6 min read',
    description:
      "On June 22, 2026, Reflection AI signed with SpaceX for $150 million a month of Nvidia GB300 capacity at Colossus 2, starting July 1 and running through 2029. The deal totals roughly $6.3 billion. Reflection is a $25 billion open-source frontier lab with no publicly shipped model, founded by ex-DeepMind researchers Misha Laskin and Ioannis Antonoglou, with Department of Energy Genesis Mission and Pentagon AI work already on the customer list. Read against SpaceX's prior Colossus commitments (Anthropic at roughly $45B, Google at roughly $30B, plus the Cursor acquisition), it is the third frontier-tier lease in seven months and the first one for a lab that has not yet released weights. Inside the per-GPU math, why Colossus is doing the Equinix move at the AI layer (stay neutral, take any customer, sell gigawatts the hyperscalers cannot unbundle from a managed-service tax), what it costs to be a credible open-source frontier in 2026, the Pentagon-clearance angle that separates Reflection from DeepSeek and Z.ai, and three signposts in the next ninety days that decide whether $6.3 billion is a floor or a ceiling. The 90-day notice clause matters more than the headline number.",
  },
  {
    slug: 'china-295b-state-ai-grid-sovereign-rail',
    title:
      'China Drafted a $295 Billion State AI Grid. The Compute Race Now Runs on Two Different Rails.',
    author: 'Marcus Chen',
    date: 'June 22, 2026',
    readTime: '6 min read',
    description:
      "Bloomberg surfaced China's National Development and Reform Commission blueprint for a 2 trillion yuan ($295B) five-year national AI compute network, financed by sovereign debt and ultra-long special government bonds, operated by China Mobile and China Telecom, and supplied 80 percent by domestic chipmakers led by Huawei. The grid is targeted to connect by 2028, and the procurement mandate excludes Nvidia and AMD by design. Read against Anthropic's $200B private commitment to Google TPU and the hyperscaler equity loop financing US frontier compute, the structural picture is two parallel rails financing the same scarcity with very different failure modes. The American rail is private, equity-backed, and demand-pull; the Chinese rail is sovereign, fiscal, and supply-push, with the operator layer rolled up inside the state telco duopoly. Inside the financing math, the Huawei HBM ceiling that decides whether 2028 is real or a slide, why state-directed buildout can internalize externalities the hyperscaler loop cannot, what multi-rail routing means for builders shipping into both markets, and three signposts in the next ninety days that convert the $295B planning number into a budget or back into a draft.",
  },
  {
    slug: 'shazeer-google-openai-acqui-hire-cliff',
    title:
      'Google Paid $2.7 Billion to Bring Shazeer Back. He Walked to OpenAI 22 Months Later. The Acqui-Hire Cliff Just Got a Price.',
    author: 'Marcus Chen',
    date: 'June 21, 2026',
    readTime: '6 min read',
    description:
      "On June 18, 2026, Noam Shazeer, Google's VP of Engineering and co-lead of Gemini, told staff he was leaving for OpenAI. Twenty-two months earlier, in August 2024, Google paid roughly $2.7 billion in a CharacterAI licensing deal that was structurally an acqui-hire designed to keep him in the building. The retention clock just hit zero on the most expensive single engineer Google has ever bought back, and the destination is the rival walking into the IPO window with the most aggressive talent budget in the industry. The 2024 deal had the same shape as Microsoft-Inflection, Amazon-Adept, and Meta-Scale: a non-exclusive license dressed over a retention contract, engineered to slip past antitrust. The Shazeer departure is the first time the named principal has walked, and it sets a public price on the cliff that every other lab can now read. Inside the deal math, why 22 months is the cliff and not the contract, what it does to a Gemini 3.5 Pro launch that is already slipping, and what it costs OpenAI to make a hire this public 30 days after the $150M Partner Network move and 90 days after the $122B raise.",
  },
  {
    slug: 'openai-partner-network-150m-channel-moat',
    title:
      'OpenAI Put $150 Million Behind 300,000 Consultants. The Partner Network Is a Channel Moat Against Anthropic.',
    author: 'Marcus Chen',
    date: 'June 20, 2026',
    readTime: '6 min read',
    description:
      "On June 14, 2026 OpenAI announced the OpenAI Partner Network, a $150 million channel program structured around Select, Advanced, and Elite tiers, with a target of 300,000 certified consultants by year end and launch partners including Accenture, BCG, McKinsey, Bain, PwC, Eliza, and Artium. Specializations cover Codex, cybersecurity, API, and agent transformation, and a Forward Deployed Experts pilot embeds partner practitioners alongside OpenAI engineers on Elite engagements. It is the second OpenAI implementation move in five weeks, after the $4 billion Deployment Company in May, and it lands 30 days after the Ramp AI Index put Anthropic ahead of OpenAI on enterprise spend at 41 percent of paying US businesses. The frame to read this through: when the model commoditizes, the value migrates to whoever owns the implementation layer. OpenAI just bought a 300,000-strong consulting army whose comp plans are now structurally tilted toward recommending GPT-class models first. The channel is the moat. The Big Four pen is the new sales motion. The question for Anthropic is whether the Seoul-style sovereignty bundle and Claude Code's developer surface beat a Big-Four-led procurement check.",
  },
  {
    slug: 'openai-frontier-model-science-loop',
    title:
      'OpenAI Shipped Two Real Science Results in 24 Hours. The Frontier Model Climbed Into the Research Loop.',
    author: 'Kira Nolan',
    date: 'June 19, 2026',
    readTime: '6 min read',
    description:
      "On June 17 and 18, 2026 OpenAI published two measured science results inside 24 hours. The first, a Molecule.one collaboration, used GPT-5.4 inside Molecule.one's Maria agent to find a TEMPO-based fix for the Chan-Lam coupling of primary sulfonamides (a pharmacophore in more than 91 FDA-approved drugs), pushing the mean estimated yield from 16.6% to 25.2% across 10,080 reactions and the share clearing 30% yield from 15.6% to 37.5%, with the agent running for about 2.5 months and human chemists writing it up in another half month. The second, an NEJM AI study with Boston Children's Hospital and Harvard, fed OpenAI o3 Deep Research into 376 previously unsolved rare-disease cases the hospital's specialists had already failed; the model surfaced leads that produced 18 new clinically confirmed diagnoses, a 4.8% additional diagnostic yield split across ten neurodevelopmental conditions, four neuromuscular disorders, two children who died suddenly, and two early-childhood psychosis cases. Neither result used GPT-Rosalind, OpenAI's vertical life-sciences model. The general-purpose frontier model is now a measurable contributor in a real research loop, and the vertical-AI thesis has to make room for it. Inside the chemistry and medicine numbers, the Rosalind-shaped hole, the harness-versus-model question, the FDA/CMS reimbursement implication for the rare-disease workflow, and the contrast with Anthropic's posture this week.",
  },
  {
    slug: 'anthropic-seoul-chaebol-sovereignty-playbook',
    title:
      'Anthropic Opened Seoul With Samsung, LG, and NAVER on Day One. The Sovereignty Playbook Just Reached Asia.',
    author: 'Marcus Chen',
    date: 'June 18, 2026',
    readTime: '6 min read',
    description:
      "On June 17, 2026 Anthropic opened its Seoul office, its third in Asia-Pacific after Tokyo and Bengaluru, and announced day-one Claude deployments at NAVER (Claude Code across the engineering org), Samsung SDS (Claude Cowork and Claude Code across Samsung Electronics), LG CNS (Claude across LG Group), Nexon (Claude Code for live-service game dev), Hanwha Solutions (Claude via AWS Bedrock with in-region data controls), and Channel Corp (Claude powering Channel Talk for 230,000+ businesses). Anthropic also signed an MOU with Korea's Ministry of Science and ICT covering AI safety, Korean-language model evaluation with the Korea AI Safety Institute, and AI-enabled cyber threat coordination, plus a research consortium giving up to sixty researchers from KAIST, Korea University, Yonsei, and POSTECH access to Claude. Six days after the US Commerce directive that blacked out Fable 5 and Mythos 5, and in the country where the trigger reportedly was, Anthropic planted a flag in Seoul whose job is to keep the next directive from happening. The export-control thread just became a sovereignty-procurement sales lever, with the customer list Wall Street would actually pay to put on a roadshow slide. Inside the six logos, the sovereignty bundle that now ships next to the API, what it does to OpenAI in Korea, and three signposts in the next ninety days.",
  },
  {
    slug: 'aws-waf-bot-monetization-x402-rails',
    title:
      'AWS Just Put a Paywall for AI Bots Inside Its Firewall. The Payment Rails Are Now a Checkbox.',
    author: 'Marcus Chen',
    date: 'June 19, 2026',
    readTime: '6 min read',
    description:
      "On June 15, 2026 AWS WAF gained an AI traffic monetization capability: any site behind the firewall can charge AI bots for content access with an HTTP 402 and an x402 price manifest, settled in USDC on Base or Solana through Coinbase's x402 Facilitator, toggled on from existing config with no origin code. Bot Control already classified more than 650 agent types and sorted them into Verified (Web Bot Auth Ed25519) and Unverified tiers; the new mode adds a price and six per-tier actions. It is the second AWS agent-payments move in five weeks after AgentCore on Bedrock, it landed the same day Coinbase spun x402 out under the Linux Foundation with AWS and Cloudflare among 20-plus founding members, and Cloudflare had already shipped a pay-per-crawl version months earlier. The takeaway: the rails for agent commerce are now commodity infrastructure, so the value migrates to whoever has data and decisions worth paying for. A tollbooth charges for access to content you already host; a merchant charges for a product nobody else assembles. When charging bots is a checkbox, the paywall stops being a moat and discovery plus trust become the contest that decides the market.",
  },
  {
    slug: 'spacex-cursor-acquisition-coding-consolidation',
    title:
      'SpaceX Just Bought Cursor for $60 Billion. Every Major AI Coding Tool Now Has an Owner.',
    author: 'Adrian Vale',
    date: 'June 18, 2026',
    readTime: '7 min read',
    description:
      "On June 16, 2026, four days after completing the largest IPO in history, SpaceX agreed to acquire Anysphere (the company behind Cursor) for $60 billion in an all-stock deal, with closing expected in Q3 pending regulatory review. Cursor runs at roughly $2.6 billion in annualized revenue, and SPCX shares jumped 16 to 17 percent on the news, briefly making SpaceX the fourth most valuable US company. The price is not the story. The story is that this finishes the consolidation: with OpenAI, Anthropic, Google, and Microsoft each holding a coding surface, the independent AI IDE era is over and every high-intent developer surface now sits inside a model lab or a mega-cap. The strategic logic is that the model layer commoditizes while the application layer does not, so whoever owns the tool owns the routing decision, the usage data, and the recurring revenue. The risk for developers is not that tools break tomorrow, but that model neutrality stops being the default. What to watch: the default model setting, first-party model preference on pricing and latency, and whether competitor models drift to the bottom of the dropdown.",
  },
  {
    slug: 'white-house-jailbreak-proof-fable-5-mandate',
    title:
      'The White House Told Anthropic to Make Fable 5 Jailbreak-Proof. Security Researchers Say That Is Not a Thing That Exists.',
    author: 'Kira Nolan',
    date: 'June 17, 2026',
    readTime: '6 min read',
    description:
      "Reporting this week says the White House will only put Fable 5 back online if Anthropic blocks all jailbreaks, and security researchers told WIRED that may not be possible. The bar describes a property no deployed model has ever had: adversarial robustness has been an open research problem for more than a decade, and Fable 5 itself was pulled because Amazon researchers jailbroke it days after launch. The mandate is a category error. It asks for a perfect outcome instead of a sound process (red-teaming, monitoring, disclosure, fast patching), it governs only the lab that answered the phone, and it cannot touch the open weights, like Zhipu's GLM-5.2, that already shipped and cannot be recalled. Anthropic sent adversarial ML researcher Nicholas Carlini to explain the reality. Two ways this resolves, both bad, and what a real safety standard would require instead.",
  },
  {
    slug: 'amazon-pulled-fable-5-hyperscaler-conflict',
    title:
      'Amazon Pulled the Off-Switch on Fable 5. The Hyperscaler Equity Loop Just Met Its First Conflict Test.',
    author: 'Marcus Chen',
    date: 'June 16, 2026',
    readTime: '7 min read',
    description:
      "Reporting on June 13 and 14 placed Amazon CEO Andy Jassy at the center of the chain of events that took Claude Fable 5 and Mythos 5 dark worldwide 72 hours after launch. Amazon researchers jailbroke Fable 5 with a series of prompts, Jassy phoned Treasury Secretary Scott Bessent, the White House gave Anthropic 90 minutes to restrict access to US nationals only, and the only compliant setting on a global API was off. When Jassy made the call he was wearing four hats: Anthropic's largest investor, board observer, the cloud host that runs Project Rainier on AWS, and the silicon supplier for Trainium. The hyperscaler equity loop that financed frontier AI for the last three years just produced its first regulatory trigger. Inside the four-hat conflict, why Bedrock was willing to cannibalize its highest-ARPU shelf SKU to make the call, what it forces every other lab to do about multi-cloud routing, the comparison table for OpenAI, Mistral, and DeepSeek, and three signposts as Anthropic heads back to Washington on June 22.",
  },
  {
    slug: 'anthropic-off-switch-brussels-g7-evian',
    title:
      'The Anthropic Off-Switch Reached Brussels This Week. The G7 in Evian Is Where It Gets Negotiated.',
    author: 'Marcus Chen',
    date: 'June 15, 2026',
    readTime: '6 min read',
    description:
      'On June 14, 2026, European Commission spokesperson Thomas Regnier said publicly that Brussels is assessing the practical consequences of the US export control directive that forced Anthropic to disable Fable 5 and Mythos 5 worldwide, that any contingency measures should not be discriminatory against partners, and that the episode underlines the need for European technological sovereignty. On June 15, the G7 opens in Evian-les-Bains with the CEOs of OpenAI, Anthropic, and Google DeepMind in the room together for the first time. The off-switch stopped being a TF analytical point this week and became an EU institutional file. Inside the framing Regnier picked (and why discrimination, not security, is the cleverer line), what sovereignty looks like as a procurement question (Mistral, Prior Labs, the EU AI Act August enforcement window), three practical implications for builders shipping into Europe, and three signposts to watch as summit week unfolds.',
  },
  {
    slug: 'glm-5-2-open-frontier-export-letter',
    title:
      'Zhipu Shipped a 1M Open-Weight Frontier on Huawei Silicon. The Export Letter Does Not Reach It.',
    author: 'Kira Nolan',
    date: 'June 14, 2026',
    readTime: '6 min read',
    description:
      'On June 13, 2026, two days after a US Commerce directive forced Anthropic to disable Fable 5 and Mythos 5 worldwide, Z.ai (Zhipu AI) shipped GLM-5.2 to every GLM Coding Plan tier with a 1M-token context window, 131K output tokens, and a new Max-effort reasoning mode. The 744B-parameter MoE inherits a training pipeline that ran on 100,000 Huawei Ascend 910B chips with zero Nvidia in the loop. The standalone API, the Z.ai chatbot, and MIT-licensed open weights ship next week. No benchmarks at launch is itself a tell. The contrast is the story: a model the US government can disable in an evening, and a model the US government has no mechanism to recall. Inside the technical envelope, why Ascend matters this week specifically, what builders get now versus next week, and three signposts in the next ten days.',
  },
  {
    slug: 'anthropic-overtakes-openai-enterprise-adoption-ramp',
    title:
      'Anthropic Passed OpenAI on Enterprise Spend. The Lead Is Real and Structurally Fragile.',
    author: 'Adrian Vale',
    date: 'June 15, 2026',
    readTime: '6 min read',
    description:
      'The June 2026 Ramp AI Index puts Anthropic at 41 percent of US businesses with paid AI subscriptions, the most adopted vendor in enterprise for the second index running. Ramp measures real card and invoice spend across 50,000+ US businesses, so this is a spend signal rather than a survey: Anthropic climbed from 0.03 percent of businesses in June 2023 to 7.94 percent in April 2025, passed OpenAI in April 2026 (34.4 vs 32.3), and reached 41 percent in June, winning roughly 70 percent of first-time-buyer matchups along the way. The crossover is real and earned by owning the coding workflow, but the same report flags why the lead is fragile: token billing misaligns Anthropic with the buyer, reliability complaints are accumulating, compute pressure is pushing effective prices up, and the fastest-growing vendors on Ramp are cheap open-weight inference providers undercutting both leaders. With Anthropic filed at a $965B S-1 and OpenAI steering toward its own listing, the figure that decides whether this lead is a moat or a moment is inference gross margin, not market share.',
  },
  {
    slug: 'fable-5-mythos-5-export-control-suspension',
    title:
      'Washington Pulled Fable 5 and Mythos 5 Three Days After Launch. Export Control Reached the Model Layer.',
    author: 'Kira Nolan',
    date: 'June 12, 2026',
    readTime: '8 min read',
    description:
      'On June 12, 2026 the US government issued an export control directive suspending all foreign-national access to Claude Fable 5 and Mythos 5, including Anthropic’s own foreign-national employees. Because a global API cannot segregate access by nationality, the only compliant path was to disable both models for every customer. The stated basis is a reported jailbreak of Fable 5; the order pulled Mythos 5, the model built for government partners, along with it. Anthropic is complying first and disputing the order in public, warning the standard would halt new model deployments across every frontier lab. The mechanism is the precedent: export control has climbed from chips and weights to a deployed, generally available model that agents call at inference time.',
  },
  {
    slug: 'coinbase-agents-x402-closed-loop',
    title:
      'Coinbase Put an Agent Inside ChatGPT and Claude. It Pays for Its Own Research.',
    author: 'Adrian Vale',
    date: 'June 12, 2026',
    readTime: '7 min read',
    description:
      "On June 11, 2026 Coinbase shipped Coinbase for Agents, an AI agent that trades spot crypto and derivatives (equities in three weeks, prediction markets in early July), pays for premium research with USDC on Base via x402, and runs inside ChatGPT and Claude Web through Coinbase's MCP server (and inside Claude Code through a CLI). Each agent runs in an isolated permissioned sub-portfolio or a sandbox. x402 just crossed about 75 million transactions and $24 million of volume in the last 30 days, an average of ~$0.32 a call, the sub-dollar unit economics no traditional rail has serviced. This is the first mass-market closed-loop agent product: the same company books fees on both the data the agent buys and the trades the agent executes. The discovery layer is still missing, the verifier story matters more not less, and the equities launch in three weeks is the regulatory test (discretionary trading through a third-party harness is a different SEC and FINRA posture than crypto). Three signposts: whether equities ships with full agent discretion, whether a non-Coinbase x402 research endpoint is reachable from Claude without an intermediary MCP server, and whether the next big brokerage MCP comes from Schwab, Robinhood, or a new entrant.",
  },
  {
    slug: 'openai-oracle-credits-frontier-procurement',
    title:
      'OpenAI Models Are Now an Oracle Line Item. The Frontier War Moved Into Procurement.',
    author: 'Marcus Chen',
    date: 'June 11, 2026',
    readTime: '7 min read',
    description:
      "OpenAI announced that Oracle customers will be able to apply eligible Oracle Universal Credits toward OpenAI models and Codex through OCI in the coming weeks. Read against the last ten days (Claude Fable 5 shipping day one on Bedrock, Vertex, and Microsoft Foundry at identical $10/$50 pricing, the 11,000-model Foundry catalog with Opus 4.8 inside, iOS 27 making the default assistant a dropdown), the pattern is clear: the frontier model is becoming a SKU in someone else's catalog, payable with committed spend. Procurement friction, not benchmarks, gates enterprise adoption, and committed dollars are cheaper dollars. The circularity of OpenAI's reported $300B Oracle compute commitment flowing back as Oracle-channel token sales, the channel map (Anthropic on all three hyperscaler storefronts, OpenAI on two plus Oracle, Gemini mostly home turf, DeepSeek sidestepping via MIT weights), what labs give up to the storefront owner, and three signposts: OpenAI on Bedrock, Gemini off Google Cloud, and the first below-API channel discount.",
  },
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
