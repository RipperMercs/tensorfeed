import { RSSSource } from './types';

export const RSS_SOURCES: RSSSource[] = [
  {
    id: 'google-ai',
    name: 'Google AI Blog',
    url: 'https://blog.google/technology/ai/rss/',
    domain: 'blog.google',
    categories: ['Google/Gemini'],
    active: true,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    domain: 'huggingface.co',
    categories: ['Open Source', 'Models'],
    active: true,
  },
  {
    id: 'techcrunch-ai',
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/tag/artificial-intelligence/feed/',
    domain: 'techcrunch.com',
    categories: ['General AI'],
    active: true,
  },
  {
    id: 'verge-ai',
    name: 'The Verge AI',
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    domain: 'theverge.com',
    categories: ['General AI'],
    active: true,
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    domain: 'arstechnica.com',
    categories: ['General AI'],
    active: true,
  },
  {
    id: 'venturebeat',
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/category/ai/feed/',
    domain: 'venturebeat.com',
    categories: ['Startups', 'Enterprise'],
    active: true,
  },
  {
    id: 'mit-tech-review',
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
    domain: 'technologyreview.com',
    categories: ['Research', 'Policy & Safety'],
    active: true,
  },
  {
    id: 'nvidia-ai',
    name: 'NVIDIA AI Blog',
    url: 'https://blogs.nvidia.com/feed/',
    domain: 'blogs.nvidia.com',
    categories: ['Hardware/Chips'],
    active: true,
  },
  {
    id: 'arxiv-ai',
    name: 'arXiv cs.AI',
    url: 'https://rss.arxiv.org/rss/cs.AI',
    domain: 'arxiv.org',
    categories: ['Research'],
    active: true,
  },
  {
    id: 'hackernews-ai',
    name: 'Hacker News AI',
    url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude',
    domain: 'news.ycombinator.com',
    categories: ['Community'],
    active: true,
  },
  {
    id: 'wired-ai',
    name: 'WIRED AI',
    url: 'https://www.wired.com/feed/tag/ai/latest/rss',
    domain: 'wired.com',
    categories: ['General AI'],
    active: true,
  },
  {
    id: 'zdnet-ai',
    name: 'ZDNet AI',
    url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
    domain: 'zdnet.com',
    categories: ['Enterprise', 'General AI'],
    active: true,
  },
];

export interface StatusPageConfig {
  name: string;
  provider: string;
  url: string;
  statusPageUrl: string;
  // statuspage:    Atlassian Statuspage v2 JSON (most providers)
  // instatus:      Instatus summary.json (Perplexity)
  // gcp-incidents: Google Cloud incidents.json (Vertex/Gemini)
  // aws-events:    AWS Health currentevents.json (Bedrock)
  // html:          fallback for status pages without a JSON API
  type: 'statuspage' | 'instatus' | 'gcp-incidents' | 'aws-events' | 'html';
  // Optional component name patterns. When set, only matching components
  // are considered for headline status and display. Used for shared status
  // pages where most components are irrelevant (e.g. GitHub's status page
  // covers all of GitHub but we only care about Copilot). When unset, the
  // default core/peripheral filter in status.ts applies.
  componentFilter?: RegExp[];
  // For gcp-incidents: list of Google Cloud product IDs (from
  // status.cloud.google.com/products.json) whose active incidents should
  // bubble up to this service's status.
  gcpProductIds?: string[];
  // For aws-events: substring (case-insensitive) matched against each
  // event's service/service_name and impacted_services keys to identify
  // events affecting this provider. AWS doesn't publish per-service
  // status feeds, only a global currentevents stream we filter.
  awsServiceMatch?: string;
}

export const STATUS_PAGES: StatusPageConfig[] = [
  {
    name: 'Claude API',
    provider: 'Anthropic',
    url: 'https://status.anthropic.com/api/v2/summary.json',
    statusPageUrl: 'https://status.anthropic.com',
    type: 'statuspage',
  },
  {
    name: 'OpenAI API',
    provider: 'OpenAI',
    url: 'https://status.openai.com/api/v2/summary.json',
    statusPageUrl: 'https://status.openai.com',
    type: 'statuspage',
  },
  {
    name: 'Google Gemini',
    provider: 'Google',
    url: 'https://status.cloud.google.com/incidents.json',
    statusPageUrl: 'https://status.cloud.google.com',
    type: 'gcp-incidents',
    // Vertex Gemini API + Vertex AI Online Prediction (the inference path).
    // Studio/Code Assist/Enterprise are downstream surfaces, not the LLM API.
    gcpProductIds: ['Z0FZJAMvEB4j3NbCJs6B', 'sdXM79fz1FS6ekNpu37K'],
  },
  {
    name: 'GitHub Copilot',
    provider: 'GitHub',
    url: 'https://www.githubstatus.com/api/v2/summary.json',
    statusPageUrl: 'https://www.githubstatus.com',
    type: 'statuspage',
    componentFilter: [/copilot/i],
  },
  {
    name: 'Perplexity',
    provider: 'Perplexity AI',
    url: 'https://status.perplexity.com/summary.json',
    statusPageUrl: 'https://status.perplexity.com',
    type: 'instatus',
  },
  {
    name: 'Groq',
    provider: 'Groq',
    url: 'https://groqstatus.com/api/v2/summary.json',
    statusPageUrl: 'https://groqstatus.com',
    type: 'statuspage',
    // Whole status page is model + API components, all in-scope.
  },
  {
    name: 'AWS Bedrock',
    provider: 'AWS',
    url: 'https://health.aws.amazon.com/public/currentevents',
    statusPageUrl: 'https://health.aws.amazon.com/health/status',
    type: 'aws-events',
    awsServiceMatch: 'bedrock',
  },
  {
    name: 'Hugging Face',
    provider: 'Hugging Face',
    url: 'https://status.huggingface.co',
    statusPageUrl: 'https://status.huggingface.co',
    type: 'html',
  },
  {
    name: 'Replicate',
    provider: 'Replicate',
    url: 'https://status.replicate.com/api/v2/summary.json',
    statusPageUrl: 'https://status.replicate.com',
    type: 'statuspage',
  },
  {
    name: 'Cohere',
    provider: 'Cohere',
    url: 'https://status.cohere.com/api/v2/summary.json',
    statusPageUrl: 'https://status.cohere.com',
    type: 'statuspage',
  },
  {
    name: 'Mistral',
    provider: 'Mistral AI',
    url: 'https://status.mistral.ai',
    statusPageUrl: 'https://status.mistral.ai',
    type: 'html',
  },
];
