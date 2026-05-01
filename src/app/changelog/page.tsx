import { Metadata } from 'next';
import { History } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Changelog | What We Shipped',
  description: 'Public build log for TensorFeed.ai. Every feature, fix, and improvement we ship, documented in real time.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/changelog',
    title: 'Changelog | What We Shipped',
    description: 'Public build log for TensorFeed.ai. Every feature, fix, and improvement we ship, documented in real time.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Changelog | What We Shipped',
    description: 'Public build log for TensorFeed.ai. Every feature, fix, and improvement we ship, documented in real time.',
  },
};

const CHANGELOG = [
  {
    date: 'April 30, 2026',
    entries: [
      'Shipped /harnesses, the cross-harness coding-agent leaderboard. Tracks Claude Code, Cursor Agent, Codex CLI, Aider, OpenHands, Devin, Cline, Windsurf Cascade, Amp, Continue, and Roo Code on SWE-bench Verified, Terminal-Bench, Aider Polyglot, and SWE-Lancer. Per-harness detail pages at /harnesses/{slug} cover distribution, model lock-in, pricing, and notable features. Same data as JSON at /api/harnesses (free, cached 5 min) with per-harness rollups for fast "who wins X" queries.',
      'New /originals piece: "It Is Not the Model. It Is the Harness." (Ripper). The harness gap is bigger than the model gap on agentic benchmarks; this is why we now track it.',
      'Scheduled a weekly refresh agent that pulls upstream leaderboards (SWE-bench Verified, Terminal-Bench, Aider Polyglot, SWE-Lancer) into both data/harnesses.json and worker/src/harnesses.ts and opens a PR. Runs Mondays at 9 AM PT.',
      'Shipped /playground, an in-browser no-auth query tool against every free TensorFeed endpoint. Sidebar groups endpoints by category, form fields adapt to each endpoint\'s parameter schema, Run executes the request, JSON renders inline with timing and copy-curl/copy-URL/copy-JSON.',
      'Shipped the AI Attention Index at /attention and /api/attention. Live 0-100 score per AI provider derived from news volume in 24h and 7d, GitHub trending repos matching the provider, and bot/agent traffic to provider-related endpoints. Recomputed on every request from existing free endpoints; no new ingestion. Cached 5 minutes.',
      'Shipped daily attention snapshots and a paid time series. Free /api/attention/history returns the list of dates with a captured snapshot; free /api/attention/history/{date} returns one day. New paid endpoint /api/premium/attention/series (1 credit) returns daily attention_score and raw signal counts for one provider over the requested range, plus first/last/delta/min/max/avg summary. 90-day max range, default 30 days back.',
      'Shipped framework integrations as optional extras on the main tensorfeed PyPI package (v1.16.0). pip install tensorfeed[langchain] gets 5 StructuredTools (news, status, routing, attention, harnesses) plus a TensorFeedNewsLoader; tensorfeed_tools() returns the full list ready to drop into a LangGraph create_react_agent. pip install tensorfeed[llamaindex] gets TensorFeedNewsReader and TensorFeedAttentionReader. pip install tensorfeed[crewai] gets 5 BaseTools and a tensorfeed_tools() helper. Base install remains stdlib-only. Documented at /developers/frameworks.',
      'Python SDK 1.16.0 published to PyPI. New methods: harnesses(), attention(), attention_history(), attention_snapshot(date), attention_series(provider, from, to). Tagged py-sdk-v1.16.0 in git.',
      '/api/meta now lists harnesses, attention, attentionHistory, attentionHistorySnapshot, and premiumAttentionSeries in the endpoint catalog. Same in /openapi.json once the static export rebuilds.',
    ],
  },
  {
    date: 'April 28, 2026',
    entries: [
      'Premium API legal hardening pass (mirrors the TerminalFeed sister-site pass on the same day). Restructured /terms Premium API and Agent Payments into numbered subsections 17.1 through 17.15: sanctions warranty (17.9), autonomous-agent acknowledgment (17.10), suspension and revocation for abuse (17.11), Premium API acceptable use (17.12), liability cap (17.13), chargeback and fraudulent purchase handling (17.14), and no-money-services-business representation (17.15). Replaced the 24-hour refund window with a no-refunds policy (17.5); credits do not expire and remain jointly redeemable across tensorfeed.ai and terminalfeed.io. Added cross-site applicability clause (17.8) naming TensorFeed as the system of record for credit balances.',
      'Expanded Governing Law into Governing Law and Venue with explicit California law, exclusive venue Los Angeles County, and a CISG disclaimer.',
      'New Privacy Policy section 4B (Premium API Tier: Data Practices) discloses what we collect for the paid tier (sender wallet address, transaction hash, hashed bearer token, per-call telemetry), what we do not collect (no names, no KYC, no fiat payment cards), cross-site processing with TerminalFeed, the Chainalysis sanctions screen on every inbound credit-purchase transaction, and 7-year retention of billing records.',
      'New geo-IP block on /api/payment/buy-credits refuses credit-purchase quotes from comprehensively sanctioned jurisdictions (CU, IR, KP, SY) before any KV write, returning 403 jurisdiction_blocked. Wallet-level Chainalysis screening on /api/payment/confirm is in flight pending API key approval.',
      '/api/payment/info now exposes terms.sanctions, terms.acceptable_use, and terms.governing_law fields so agents can read the cross-jurisdictional restrictions and AUP without parsing the human Terms page. terms.refund updated to the no-refunds language. /.well-known/x402.json mirrors the same fields.',
      '/developers/agent-payments docs page rebuilt the Terms summary card around the new numbered subsections and links into both /terms#premium and /privacy#premium-api.',
      'Python SDK README, TypeScript SDK README, and MCP server README updated with no-refunds language and the OFAC sanctions notice.',
    ],
  },
  {
    date: 'April 27, 2026',
    entries: [
      'Validated the full agent payments loop end-to-end on Base mainnet with real USDC. tf.buy_credits, send tx, tf.confirm, tf.routing, tf.balance: all five steps worked first try, no bugs surfaced.',
      'Shipped four new premium history endpoints (Tier 1, 1 credit each): /api/premium/history/pricing/series for daily price points with min/max/delta, /api/premium/history/benchmarks/series for benchmark score evolution with delta_pp, /api/premium/history/status/uptime for SLA-grade uptime rollups, and /api/premium/history/compare to diff two daily snapshots',
      'Shipped premium webhook watches at /api/premium/watches: agents register a price-change or status-transition watch (1 credit), receive HMAC-signed POST deliveries, watch lives 90 days with a default fire cap of 100. SSRF guard blocks private hostnames.',
      'Shipped /api/premium/agents/directory: enriched catalog joined with live status, recent news, agent traffic, flagship pricing, and a 0-100 trending score. Server-side filter and sort so agents pull a ranked shortlist in one call.',
      'New /account dashboard for humans: paste a bearer token to see balance, account age, per-endpoint API usage, and active webhook watches with one-click delete. Token stored in sessionStorage only, never localStorage.',
      'New /api/payment/usage endpoint exposes per-token call history (last 100 calls aggregated by endpoint) so agents can monitor their own spend',
      'MCP server 1.1.0 (mcp-server/) exposes all 12 new premium tools to Claude Desktop and Claude Code: premium_routing, pricing_series, benchmark_series, status_uptime, history_compare, premium_agents_directory, list_watches, create_price_watch, create_status_watch, delete_watch, get_account_balance, get_account_usage. Auth via TENSORFEED_TOKEN env var.',
      'Python SDK shipped 1.3.0, 1.4.0, 1.5.0, and 1.6.0 covering history series, watches, enriched directory, and per-token usage. pip install tensorfeed is live on PyPI.',
      'TypeScript SDK shipped 1.2.0 through 1.5.0 with full TypeScript response types for every premium endpoint',
      'Footer now links to /account and /developers/agent-payments so the human credits dashboard and pay docs are reachable from any page',
      'Worker test suite grew from 15 to 80 tests across 5 files: routing engine, history series, payment + per-token usage, watches (predicates, SSRF, dispatch), and enriched directory (joins, filters, sorting)',
      'Launched the agent payments stack: AI agents can now pay TensorFeed directly via USDC on Base for premium API access. No accounts, no API keys, no traditional payment processors.',
      'New paid endpoint /api/premium/routing (Tier 2, 1 credit per call) returns top-N ranked model recommendations with full composite-score breakdown synthesizing live pricing, benchmarks, and status data',
      'New free /api/preview/routing returns the top-1 recommendation, rate-limited to 5 calls per UTC day per IP for discovery before committing credits',
      'New free payment flow endpoints: /api/payment/info, /api/payment/buy-credits, /api/payment/confirm, /api/payment/balance support the full credit purchase and bearer-token cycle',
      'New free /api/history (and /api/history/{date}/{type}) exposes daily snapshots of pricing, models, benchmarks, status, and agent activity. The dataset compounds daily.',
      'New documentation page at /developers/agent-payments covers the wallet address, pricing tiers, both payment flows (credits and x402), every endpoint with examples, and the no-training Terms summary',
      'Updated /terms with Premium API and Agent Payments section: inference-only license, refund policy, bearer token security, replay protection, no-SLA disclaimer',
      'Python SDK 1.2.0: pip install tensorfeed gets free + premium support. pip install tensorfeed[web3] adds tf.purchase_credits() for one-call sign-and-send via web3.py.',
      'TypeScript SDK 1.1.0: full premium tier support with typed responses and PaymentRequired/RateLimited/TensorFeedError exception classes. Native fetch, zero runtime deps, Node 18+ or any modern browser.',
      'New admin endpoint /api/admin/usage rolls up daily revenue, per-endpoint call counts, and a top-agents leaderboard so we can see which premium endpoints are being used and by which agents',
      'Wallet attestation via TLS plus multi-publication: the TensorFeed payment wallet is published on /llms.txt, /api/payment/info, GitHub README, and the @tensorfeed bio; cross-check before sending funds',
      'Added unit tests for the routing engine (worker/src/routing.test.ts) covering quality weighting per task type, cost normalization, budget and quality filters, and custom weight overrides',
    ],
  },
  {
    date: 'April 17, 2026',
    entries: [
      'Added Claude Opus 4.7 to model directory, pricing, benchmarks, and timeline with 1M context window',
      'Published Opus 4.7 launch analysis article in /originals',
      'Published "Why Every Developer Needs an llms.txt File" and "The AI Pricing Floor" articles',
      'Added Claude Opus 4.7 vs 4.6 generational comparison at /compare/claude-opus-4-7-vs-claude-opus-4-6',
      'Updated claude-vs-chatgpt, claude-vs-gemini, and claude-vs-llama comparisons to feature Opus 4.7',
      'Refreshed pricing.json and benchmarks.json lastUpdated to 2026-04-17',
      'Updated model-wars leaderboard, agi-asi timeline, best-ai-chatbots, and research benchmark tables to reflect Opus 4.7',
      'Refreshed cost calculator FAQ copy for Opus 4.7 context window and pricing',
    ],
  },
  {
    date: 'March 29, 2026',
    entries: [
      'Launched TensorFeed.ai with 12 RSS sources aggregating AI news',
      'Built AI service status dashboard monitoring 6 providers in real time',
      'Created developer API docs page with code examples at /developers',
      'Added /is-claude-down and /is-chatgpt-down live status pages',
      'Expanded to 8+ "Is X Down?" pages for all major AI services',
      'Integrated TerminalFeed.io live data feeds (GitHub trending, predictions, cyber threats, internet pulse)',
      'Built agent activity tracking with live sidebar widget',
      'Created llms.txt, llms-full.txt (63KB), and .md page variants for AI agent discovery',
      'Added FAQ sections with FAQPage JSON-LD schema to all 6 pillar guide pages',
      'Implemented IndexNow for instant search engine notification on content updates',
      'Connected Google AdSense with ads.txt verification',
      'Set up GitHub Actions auto-deploy for Cloudflare Worker',
      'Added Cloudflare Cache API layer to reduce KV operations by ~90%',
      'Source diversity balancing (35% cap per source in feed)',
      'Source color-coded left borders on article cards',
      'Real-time news feed fetching from Worker API (replaced static build data)',
      'Dark mode as default, with light mode toggle',
      'Subtle breathing animation on navbar logo',
      'Security headers (nosniff, DENY framing, strict referrer)',
      'robots.txt welcoming 15+ AI crawler User-Agents',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <History className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Changelog</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Everything we ship, documented in real time. Built in public by Ripper.
        </p>
      </div>

      <div className="space-y-10">
        {CHANGELOG.map((release) => (
          <section key={release.date}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-accent-primary shrink-0" />
              <h2 className="text-xl font-semibold text-text-primary">{release.date}</h2>
            </div>
            <div className="ml-6 border-l-2 border-border pl-6">
              <ul className="space-y-2">
                {release.entries.map((entry, i) => (
                  <li key={i} className="text-text-secondary text-sm leading-relaxed">
                    {entry}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
