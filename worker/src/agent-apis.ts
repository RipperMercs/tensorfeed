/**
 * Public AI agent APIs registry.
 *
 * The non-LLM APIs that AI agents commonly wire in: web search, web
 * scraping, weather, finance, maps, email, SMS, payments, code
 * execution, file conversion. Each entry has pricing, free tier, MCP
 * server availability flag, and the link to docs.
 *
 * Different from /api/models (LLM provider APIs) and /api/multimodal
 * (image / video / TTS / STT models). This is the "what other APIs do
 * agents call" layer.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/agent-apis (free, cached 600s).
 */

export type ApiCategory =
  | 'search'
  | 'web-scraping'
  | 'weather'
  | 'finance'
  | 'maps'
  | 'email'
  | 'sms'
  | 'payments'
  | 'code-execution'
  | 'file-conversion'
  | 'ocr'
  | 'analytics'
  | 'social';

export interface AgentApi {
  id: string;
  name: string;
  vendor: string;
  category: ApiCategory;
  /** Pricing summary (free tier or starting paid tier). */
  pricing: string;
  /** Free tier description. */
  freeTier: string | null;
  /** Whether an MCP server exists for this API (pointer to /mcp-servers if yes). */
  hasMCP: boolean;
  /** Capability tags. */
  capabilities: string[];
  url: string;
  notes: string;
}

export const AGENT_API_CATALOG: AgentApi[] = [
  // ── Web search ───────────────────────────────────────────
  { id: 'tavily', name: 'Tavily', vendor: 'Tavily', category: 'search', pricing: '1k searches/mo free; $30/mo Pro for 4k', freeTier: '1,000 searches/month', hasMCP: true, capabilities: ['web search', 'AI-optimized snippets', 'extraction'], url: 'https://tavily.com', notes: 'Default agent search API. AI-optimized result snippets and full-page extraction in one call.' },
  { id: 'brave-search-api', name: 'Brave Search API', vendor: 'Brave', category: 'search', pricing: '2k queries/mo free; $3 per 1k after', freeTier: '2,000 queries/month', hasMCP: true, capabilities: ['web search', 'images', 'news'], url: 'https://brave.com/search/api/', notes: 'Cheaper alternative to Google CSE. Independent index (not Bing/Google).' },
  { id: 'exa', name: 'Exa', vendor: 'Exa Labs', category: 'search', pricing: 'Pay-as-you-go from $10/mo; 1k free', freeTier: '1,000 searches', hasMCP: true, capabilities: ['neural search', 'similarity', 'content extraction'], url: 'https://exa.ai', notes: 'Embedding-based semantic search. Better for "find content like X" queries than keyword search.' },
  { id: 'serpapi', name: 'SerpAPI', vendor: 'SerpAPI', category: 'search', pricing: '$50/mo for 5k searches', freeTier: '100 searches free trial', hasMCP: false, capabilities: ['Google SERP', 'Bing', 'YouTube', 'images'], url: 'https://serpapi.com', notes: 'Scrapes real Google/Bing/etc result pages. Use when you need actual SERP HTML data not a curated index.' },
  { id: 'bing-search', name: 'Bing Search API', vendor: 'Microsoft', category: 'search', pricing: '$3 per 1k transactions', freeTier: '1k transactions/month', hasMCP: false, capabilities: ['web', 'images', 'news', 'videos'], url: 'https://www.microsoft.com/en-us/bing/apis/bing-web-search-api', notes: 'Microsoft\'s search API. Scheduled to be retired August 2025; check current status before integrating.' },

  // ── Web scraping ─────────────────────────────────────────
  { id: 'firecrawl', name: 'Firecrawl', vendor: 'Mendable', category: 'web-scraping', pricing: '500 pages/mo free; $19/mo for 5k', freeTier: '500 pages/month', hasMCP: true, capabilities: ['scrape', 'crawl', 'JS rendering', 'structured extraction'], url: 'https://firecrawl.dev', notes: 'Designed for AI agents. Returns clean markdown. Supports schema-based extraction (Pydantic / Zod).' },
  { id: 'jina-reader', name: 'Jina Reader', vendor: 'Jina AI', category: 'web-scraping', pricing: 'Free tier; usage-based after', freeTier: '20 RPM free', hasMCP: false, capabilities: ['URL to markdown', 'JS rendering', 'screenshot mode'], url: 'https://r.jina.ai', notes: 'Free URL-to-markdown. Prepend r.jina.ai/ to any URL for instant agent-ready content. The simplest scraper to wire.' },
  { id: 'apify', name: 'Apify', vendor: 'Apify', category: 'web-scraping', pricing: '$5/mo platform credit free; pay per actor', freeTier: '$5 credit/month', hasMCP: true, capabilities: ['headless browser', '4500+ pre-built actors', 'scheduled crawls'], url: 'https://apify.com', notes: 'Marketplace of pre-built scrapers ("actors"). Best for scraping specific named sites without writing code.' },
  { id: 'scrapingbee', name: 'ScrapingBee', vendor: 'ScrapingBee', category: 'web-scraping', pricing: '$49/mo for 100k API calls', freeTier: '1,000 free credits', hasMCP: false, capabilities: ['proxy rotation', 'JS rendering', 'CAPTCHA solving'], url: 'https://www.scrapingbee.com', notes: 'Proxy-rotating headless scraper. Good when target sites have anti-bot defenses.' },

  // ── Weather ──────────────────────────────────────────────
  { id: 'openweather', name: 'OpenWeather', vendor: 'OpenWeather', category: 'weather', pricing: 'Free tier; $40/mo for One Call', freeTier: '1k API calls/day, 60 calls/min', hasMCP: false, capabilities: ['current', 'forecast', 'historical', 'air quality'], url: 'https://openweathermap.org/api', notes: 'Most-used weather API. 7-day forecast on free tier. 30-year historical on paid.' },
  { id: 'noaa-nws', name: 'NWS API', vendor: 'NOAA / NWS', category: 'weather', pricing: 'Free', freeTier: 'Unlimited (with rate limits)', hasMCP: false, capabilities: ['US-only forecasts', 'alerts', 'observations'], url: 'https://www.weather.gov/documentation/services-web-api', notes: 'Free US government weather API. No API key required. US coverage only; for global use OpenWeather.' },
  { id: 'tomorrow-io', name: 'Tomorrow.io', vendor: 'Tomorrow.io', category: 'weather', pricing: 'Free tier; usage-based after', freeTier: '500 requests/day', hasMCP: false, capabilities: ['hyperlocal forecast', 'hourly', '60+ data fields'], url: 'https://www.tomorrow.io/weather-api/', notes: 'Highest-resolution weather API. Useful for agents doing logistics, agriculture, or event planning.' },

  // ── Finance ──────────────────────────────────────────────
  { id: 'alpha-vantage', name: 'Alpha Vantage', vendor: 'Alpha Vantage', category: 'finance', pricing: 'Free tier (25 reqs/day); $50/mo for 75 reqs/min', freeTier: '25 requests/day', hasMCP: false, capabilities: ['stocks', 'forex', 'crypto', 'technical indicators', 'fundamental data'], url: 'https://www.alphavantage.co', notes: 'Most-used free stock API. Generous free tier; rate limits tighten at scale.' },
  { id: 'polygon', name: 'Polygon.io', vendor: 'Polygon.io', category: 'finance', pricing: '$29/mo Starter; free tier limited', freeTier: '5 calls/min, EOD only', hasMCP: false, capabilities: ['real-time stocks', 'options', 'forex', 'crypto', 'WebSocket streams'], url: 'https://polygon.io', notes: 'Production-grade real-time market data. WebSocket support is the main differentiator from Alpha Vantage.' },
  { id: 'coingecko', name: 'CoinGecko', vendor: 'CoinGecko', category: 'finance', pricing: 'Free tier; $129/mo for Analyst', freeTier: '30 calls/min', hasMCP: false, capabilities: ['crypto prices', 'market cap', 'historical', 'NFTs', 'derivatives'], url: 'https://www.coingecko.com/en/api', notes: 'The default crypto data API. 13,000+ coins. Free tier sufficient for most agent workflows.' },

  // ── Maps & Location ──────────────────────────────────────
  { id: 'google-maps', name: 'Google Maps Platform', vendor: 'Google', category: 'maps', pricing: '$200/mo credit; pay per request', freeTier: '$200 monthly credit', hasMCP: false, capabilities: ['geocoding', 'directions', 'places', 'distance matrix', 'street view'], url: 'https://mapsplatform.google.com', notes: 'Most-used maps API. The credit covers most small-agent use cases. Places API is the killer feature.' },
  { id: 'mapbox', name: 'Mapbox', vendor: 'Mapbox', category: 'maps', pricing: 'Free tier; pay-as-you-go', freeTier: '50k geocoding + 100k tile loads/mo', hasMCP: false, capabilities: ['geocoding', 'directions', 'static maps', 'tiles', 'isochrones'], url: 'https://www.mapbox.com', notes: 'Generous free tier. Better visual customization than Google. The default for design-conscious mapping agents.' },
  { id: 'osrm', name: 'OSRM', vendor: 'OSRM (open-source)', category: 'maps', pricing: 'Free (self-host)', freeTier: 'Unlimited self-host', hasMCP: false, capabilities: ['routing', 'distance matrix', 'isochrones'], url: 'http://project-osrm.org', notes: 'Open-source routing engine. Self-host for unlimited usage. Public demo server for testing only.' },

  // ── Email & SMS ──────────────────────────────────────────
  { id: 'resend', name: 'Resend', vendor: 'Resend', category: 'email', pricing: 'Free tier; $20/mo for 50k emails', freeTier: '3k emails/month, 100/day', hasMCP: false, capabilities: ['transactional email', 'React email templates', 'webhooks', 'audiences'], url: 'https://resend.com', notes: 'Developer-first email API. React-based templates. The default for new SaaS agent stacks in 2025.' },
  { id: 'postmark', name: 'Postmark', vendor: 'ActiveCampaign', category: 'email', pricing: '$15/mo for 10k', freeTier: '100 emails/month', hasMCP: false, capabilities: ['transactional email', 'high deliverability', 'streams', 'webhooks'], url: 'https://postmarkapp.com', notes: 'Best-in-class deliverability. Specialized for transactional only (no marketing).' },
  { id: 'twilio-sms', name: 'Twilio SMS', vendor: 'Twilio', category: 'sms', pricing: 'Pay-per-message; ~$0.0079 US SMS', freeTier: 'Trial $15 credit', hasMCP: true, capabilities: ['SMS', 'MMS', 'WhatsApp', 'voice'], url: 'https://www.twilio.com/messaging', notes: 'The most-used programmable messaging API. WhatsApp Business included. MCP server available.' },

  // ── Payments ─────────────────────────────────────────────
  { id: 'stripe', name: 'Stripe', vendor: 'Stripe', category: 'payments', pricing: '2.9% + $0.30 per US card', freeTier: 'No platform fee', hasMCP: true, capabilities: ['payments', 'subscriptions', 'invoicing', 'connect (multi-party)'], url: 'https://stripe.com', notes: 'Default agent-to-human payments API. MCP server (Stripe Agent Toolkit) ships with restricted-key auth.' },
  { id: 'lemon-squeezy', name: 'Lemon Squeezy', vendor: 'Lemon Squeezy', category: 'payments', pricing: '5% + $0.50 per transaction', freeTier: 'No setup fee', hasMCP: false, capabilities: ['merchant of record', 'EU VAT', 'subscriptions', 'license keys'], url: 'https://www.lemonsqueezy.com', notes: 'Merchant of record (handles VAT/sales tax for you). Good fit for solo-dev agents selling internationally.' },

  // ── Code execution ───────────────────────────────────────
  { id: 'e2b', name: 'E2B', vendor: 'E2B', category: 'code-execution', pricing: 'Pay-as-you-go from $0.000014/sec', freeTier: '$100 hobby credit', hasMCP: false, capabilities: ['secure sandboxes', 'Jupyter', 'long-running', 'Linux'], url: 'https://e2b.dev', notes: 'Cloud sandboxes designed for AI code execution. Faster cold starts than Modal/Replicate for agentic workloads.' },
  { id: 'modal', name: 'Modal', vendor: 'Modal Labs', category: 'code-execution', pricing: 'Pay-as-you-go; $30/mo free credit', freeTier: '$30 monthly compute credit', hasMCP: false, capabilities: ['serverless GPU + CPU', 'secrets', 'volumes', 'web endpoints'], url: 'https://modal.com', notes: 'Serverless code execution including GPU. Good for agents that need to run heavy compute (training, inference) on demand.' },
  { id: 'replit-agent', name: 'Replit Agent', vendor: 'Replit', category: 'code-execution', pricing: 'Bundled with Replit subscription', freeTier: 'Free Replit account', hasMCP: false, capabilities: ['IDE-integrated execution', 'Linux containers', 'multi-language'], url: 'https://replit.com', notes: 'Ephemeral execution sandboxes. Less precise than E2B for agent control but generous free tier.' },

  // ── File conversion / OCR ────────────────────────────────
  { id: 'unstructured', name: 'Unstructured', vendor: 'Unstructured.io', category: 'ocr', pricing: 'Free open-source; Cloud from $0.01/page', freeTier: 'Open-source library free', hasMCP: false, capabilities: ['PDF parsing', 'OCR', 'tables', 'images', '60+ formats'], url: 'https://unstructured.io', notes: 'The default RAG ingest pipeline. Open-source library handles most formats; Cloud tier for higher accuracy + scale.' },
  { id: 'llamaparse', name: 'LlamaParse', vendor: 'LlamaIndex', category: 'ocr', pricing: '$0.003/page (Premium); free tier', freeTier: '1k pages/day free', hasMCP: false, capabilities: ['PDF parsing', 'tables', 'figures', 'multimodal'], url: 'https://www.llamaindex.ai/llamaparse', notes: 'GenAI-native PDF parser. Premium tier uses LLM for figure/chart understanding. Strong on financial docs.' },
  { id: 'reducto', name: 'Reducto', vendor: 'Reducto', category: 'ocr', pricing: 'Custom; usage-based', freeTier: 'Demo on website', hasMCP: false, capabilities: ['PDF parsing', 'forms', 'tables', 'high-accuracy OCR'], url: 'https://reducto.ai', notes: 'Premium document parser. Highest accuracy on complex tables; targets enterprise RAG and compliance use cases.' },
];

export const AGENT_APIS_LAST_UPDATED = '2026-04-30';
