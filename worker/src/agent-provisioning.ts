/**
 * Agent provisioning support tracker.
 *
 * Cloudflare and Stripe shipped an open agent-provisioning protocol on
 * April 30, 2026. AI agents can now create accounts, register domains,
 * start paid subscriptions, and deploy to production across 32 partner
 * providers without a human in the loop beyond accepting terms.
 *
 * This catalog tracks who has shipped support, who has announced it,
 * and who is conspicuously missing. The competitive landscape moves
 * fast in this space (article: list will be 60 by summer); we update
 * the catalog when partners go live.
 *
 * Different from /api/agent-apis (non-LLM APIs agents call) and
 * /api/marketplaces (where to find agents/skills/MCPs). This is the
 * "which infrastructure providers can an agent self-serve onto" map.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/agent-provisioning (free, cached 600s).
 *
 * Source: TensorFeed editorial reading of the Cloudflare-Stripe spec
 * and the public partner list as of 2026-05-03. Where status is
 * "unknown" the provider may be one of the 23 unnamed launch partners
 * referenced in the spec announcement.
 */

export type ProvisioningCategory =
  | 'hosting'
  | 'database'
  | 'auth'
  | 'observability'
  | 'background-jobs'
  | 'ai-infrastructure'
  | 'cdn-edge'
  | 'email';

export type ProvisioningStatus =
  /** Provider ships the Cloudflare-Stripe agent provisioning protocol today. */
  | 'live'
  /** Major provider in this category that has NOT shipped support; agents will route around them. */
  | 'pending'
  /** Status unconfirmed; may be one of the 23 unnamed launch partners. */
  | 'unknown';

export interface ProvisioningEntry {
  id: string;
  name: string;
  vendor: string;
  category: ProvisioningCategory;
  status: ProvisioningStatus;
  /** What the provider provides on the agent stack. */
  role: string;
  /** Default monthly cap (USD) the protocol applies before user has to raise it. */
  defaultMonthlyCap: number;
  /** Notes specific to the provider's agent integration (or absence of one). */
  notes: string;
  url: string;
}

/**
 * Default cap is $100 / month / provider per the Cloudflare-Stripe spec
 * unless the provider has published a custom default. Used to compute
 * the autonomous spend ceiling an agent can spin up across the stack.
 */
const DEFAULT_CAP = 100;

export const PROVISIONING_CATALOG: ProvisioningEntry[] = [
  // ── Live (launch partners explicitly named in the spec) ─────────

  {
    id: 'cloudflare',
    name: 'Cloudflare',
    vendor: 'Cloudflare',
    category: 'cdn-edge',
    status: 'live',
    role: 'Edge hosting, Workers, KV, domain registration, DNS, Pages',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Co-author of the protocol. Account creation, domain registration, billing, and Workers deploy all expose the agent-friendly side of the API. The reference implementation.',
    url: 'https://www.cloudflare.com',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    vendor: 'Vercel',
    category: 'hosting',
    status: 'live',
    role: 'Frontend hosting, serverless functions, Next.js platform',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Launch partner. Vercel project creation and paid plan upgrade are both wired into Stripe Projects. Strongest Next.js + AI SDK story for agent-built apps.',
    url: 'https://vercel.com',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    vendor: 'Supabase',
    category: 'database',
    status: 'live',
    role: 'Postgres database, auth, storage, realtime',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Launch partner. Database provisioning, auth setup, and storage bucket creation are all agent-callable. Pairs well with Vercel for Next.js stacks.',
    url: 'https://supabase.com',
  },
  {
    id: 'planetscale',
    name: 'PlanetScale',
    vendor: 'PlanetScale',
    category: 'database',
    status: 'live',
    role: 'Serverless MySQL, branching, schema migrations',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Launch partner. Database creation and branch-based migrations are agent-driveable. Strong for teams that prefer MySQL semantics.',
    url: 'https://planetscale.com',
  },
  {
    id: 'clerk',
    name: 'Clerk',
    vendor: 'Clerk',
    category: 'auth',
    status: 'live',
    role: 'Auth, sessions, user management, organizations',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Launch partner. The only auth provider on the launch list. Application creation and configuration of OAuth providers are agent-callable.',
    url: 'https://clerk.com',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    vendor: 'Sentry',
    category: 'observability',
    status: 'live',
    role: 'Error tracking, performance monitoring',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Launch partner. Project creation and SDK key issuance are both API-driveable. Default for agent-built apps that want first-class error visibility.',
    url: 'https://sentry.io',
  },
  {
    id: 'posthog',
    name: 'PostHog',
    vendor: 'PostHog',
    category: 'observability',
    status: 'live',
    role: 'Product analytics, feature flags, session replay',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Launch partner. Project creation, API key issuance, and feature flag setup are agent-driveable. Often paired with Sentry for full observability.',
    url: 'https://posthog.com',
  },
  {
    id: 'inngest',
    name: 'Inngest',
    vendor: 'Inngest',
    category: 'background-jobs',
    status: 'live',
    role: 'Durable workflows, background jobs, event-driven functions',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Launch partner. The only background-jobs provider on the launch list. App creation and event/function registration are agent-driveable.',
    url: 'https://www.inngest.com',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    vendor: 'Hugging Face',
    category: 'ai-infrastructure',
    status: 'live',
    role: 'Model hosting, inference endpoints, Spaces, dataset hosting',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Launch partner. Inference endpoint creation, Space deployment, and Pro upgrade are agent-driveable. The default open-model inference rail for agent-built apps.',
    url: 'https://huggingface.co',
  },

  // ── Pending (named in the article as conspicuously absent) ──────

  {
    id: 'neon',
    name: 'Neon',
    vendor: 'Neon',
    category: 'database',
    status: 'pending',
    role: 'Serverless Postgres, branching, instant cold starts',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Strong Postgres alternative to Supabase but not on the launch list as of 2026-05-03. Agents wiring database from scratch will route to Supabase or PlanetScale until Neon ships.',
    url: 'https://neon.tech',
  },
  {
    id: 'turso',
    name: 'Turso',
    vendor: 'Turso',
    category: 'database',
    status: 'pending',
    role: 'Edge SQLite (libSQL), per-user databases',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Edge-first database story but no agent provisioning on launch day. Conspicuous absence given the Cloudflare-Vercel-Supabase axis the protocol formed around.',
    url: 'https://turso.tech',
  },
  {
    id: 'auth0',
    name: 'Auth0',
    vendor: 'Okta',
    category: 'auth',
    status: 'pending',
    role: 'Auth, SSO, identity-as-a-service',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'The largest auth provider in the market is not on the launch list. Clerk wins agent-driven sign-ups by default until Auth0 ships support.',
    url: 'https://auth0.com',
  },
  {
    id: 'workos',
    name: 'WorkOS',
    vendor: 'WorkOS',
    category: 'auth',
    status: 'pending',
    role: 'Enterprise SSO, SCIM, directory sync',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Enterprise-tier auth provider; agent-driven onboarding is plausibly an enterprise blocker more than a tech blocker. Watch for a Q3 announcement.',
    url: 'https://workos.com',
  },
  {
    id: 'stytch',
    name: 'Stytch',
    vendor: 'Stytch',
    category: 'auth',
    status: 'pending',
    role: 'Auth, passwordless, biometrics, M2M',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Developer-first auth with strong M2M primitives that should map cleanly to agents. Surprising not to see them on the launch list.',
    url: 'https://stytch.com',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    vendor: 'Netlify',
    category: 'hosting',
    status: 'pending',
    role: 'Frontend hosting, serverless functions, edge functions',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Vercel competitor not on the launch list. Agents picking a frontend host will pick Vercel by default until Netlify ships parity.',
    url: 'https://www.netlify.com',
  },
  {
    id: 'fly',
    name: 'Fly.io',
    vendor: 'Fly.io',
    category: 'hosting',
    status: 'pending',
    role: 'Global app hosting, full-VM workloads, multi-region',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Strongest global-region story for non-Next.js workloads, but no agent provisioning on launch day. Likely a Q3 add given their developer-friendly orientation.',
    url: 'https://fly.io',
  },

  // ── Unknown (likely among the 23 unnamed launch partners) ──────

  {
    id: 'resend',
    name: 'Resend',
    vendor: 'Resend',
    category: 'email',
    status: 'unknown',
    role: 'Transactional email, React-based templates',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Article mentions 23 unnamed launch partners. Resend is the default agent-stack email provider; plausibly on the list. Status to be confirmed when Cloudflare publishes the full partner directory.',
    url: 'https://resend.com',
  },
  {
    id: 'upstash',
    name: 'Upstash',
    vendor: 'Upstash',
    category: 'database',
    status: 'unknown',
    role: 'Serverless Redis, Kafka, vector store',
    defaultMonthlyCap: DEFAULT_CAP,
    notes: 'Edge-friendly key-value and vector store. Likely candidate for the unnamed launch partners list given the Cloudflare-Vercel co-marketing story.',
    url: 'https://upstash.com',
  },
];

export const PROVISIONING_LAST_UPDATED = '2026-05-03';

/**
 * Summary stats for the index page and the API meta surface. Kept as a
 * pure function so it stays in sync with the catalog automatically.
 */
export function provisioningSummary() {
  const live = PROVISIONING_CATALOG.filter(p => p.status === 'live').length;
  const pending = PROVISIONING_CATALOG.filter(p => p.status === 'pending').length;
  const unknown = PROVISIONING_CATALOG.filter(p => p.status === 'unknown').length;
  const total = PROVISIONING_CATALOG.length;
  return {
    total_named_partners: 32,
    catalog_size: total,
    live,
    pending,
    unknown,
    unnamed_launch_partners: 32 - live,
  };
}
