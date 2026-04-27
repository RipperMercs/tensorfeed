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
