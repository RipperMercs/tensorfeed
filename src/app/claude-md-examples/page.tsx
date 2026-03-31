import Link from 'next/link';
import JsonLd from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

const NEXTJS_EXAMPLE = `# Project: Acme Dashboard

## Overview
Internal analytics dashboard for Acme Corp. Built with Next.js 14 App Router, deployed to Cloudflare Pages.

## Stack
- Framework: Next.js 14 (App Router, static export)
- Language: TypeScript (strict mode, no \`any\` types)
- Styling: Tailwind CSS with custom design tokens
- Hosting: Cloudflare Pages (auto-deploy from \`main\` branch)
- Auth: Clerk (middleware-based route protection)
- Data: Drizzle ORM + Turso (SQLite edge database)

## Commands
- \`npm run dev\`: Start dev server on port 3000
- \`npm run build\`: Production build (runs \`next build\`)
- \`npm run lint\`: ESLint + Prettier check
- \`npm run db:push\`: Push schema changes to Turso
- \`npm run db:studio\`: Open Drizzle Studio

## Code Style
- Functional components only, no class components
- Use React Server Components by default; add \`'use client'\` only when needed
- Colocate components: each route folder gets its own components/ subfolder
- Named exports for components, default export for pages
- Barrel exports (index.ts) in shared component folders

## File Structure
- \`src/app/\`: Route handlers and pages
- \`src/components/\`: Shared UI components
- \`src/lib/\`: Utilities, database client, auth helpers
- \`src/styles/\`: Global CSS and Tailwind config overrides

## Conventions
- All API routes go in \`src/app/api/\` and return NextResponse
- Form validation uses Zod schemas defined in \`src/lib/schemas/\`
- Error boundaries on every layout; loading.tsx on data-heavy routes
- Environment variables prefixed with \`NEXT_PUBLIC_\` for client access
- Images served from \`/public/assets/\` with next/image optimization
- Commit messages follow Conventional Commits (feat:, fix:, chore:)`;

const PYTHON_EXAMPLE = `# Project: Inventory Service

## Overview
REST API for warehouse inventory management. Handles product CRUD, stock tracking, and order fulfillment webhooks.

## Stack
- Framework: FastAPI 0.115+
- Database: PostgreSQL 16 via SQLAlchemy 2.0 (async)
- Migrations: Alembic (auto-generate from models)
- Task Queue: Celery + Redis
- Testing: pytest with httpx AsyncClient
- Deployment: Docker Compose (dev), Kubernetes (prod)

## Commands
- \`uvicorn app.main:app --reload\`: Start dev server
- \`pytest\`: Run all tests
- \`pytest -k test_products\`: Run specific test module
- \`alembic revision --autogenerate -m "description"\`: Create migration
- \`alembic upgrade head\`: Apply pending migrations
- \`docker compose up\`: Start full local stack (API + Postgres + Redis)

## Code Style
- Type hints on all function signatures and return types
- Pydantic v2 models for request/response schemas (in \`app/schemas/\`)
- Async route handlers by default; sync only for CPU-bound work
- Dependency injection via FastAPI \`Depends()\` for DB sessions and auth
- No business logic in route handlers; delegate to service layer

## Project Structure
- \`app/main.py\`: FastAPI app factory and router registration
- \`app/routes/\`: Endpoint definitions grouped by resource
- \`app/models/\`: SQLAlchemy ORM models
- \`app/schemas/\`: Pydantic request/response models
- \`app/services/\`: Business logic layer
- \`app/core/\`: Config, security, database session setup
- \`tests/\`: Mirror of app/ structure with test_ prefix

## Conventions
- All endpoints return consistent envelope: \`{"data": ..., "error": null}\`
- Pagination via \`?page=1&per_page=25\` query params
- Authentication: Bearer token in Authorization header (JWT, RS256)
- Background tasks use Celery; never block a request for slow work
- Database queries go through repository classes, not raw SQL in routes
- \`.env\` file for local config; never commit secrets to the repo`;

const REACT_NATIVE_EXAMPLE = `# Project: FitLog

## Overview
Mobile fitness tracker for iOS and Android. Users log workouts, track progress, and follow training programs.

## Stack
- Framework: React Native 0.76 via Expo SDK 52
- Language: TypeScript (strict mode)
- Navigation: Expo Router (file-based routing)
- Backend: Firebase (Auth, Firestore, Cloud Storage)
- State: Zustand for global state, React Query for server state
- UI: NativeWind (Tailwind CSS for React Native)

## Commands
- \`npx expo start\`: Start Expo dev server
- \`npx expo start --ios\`: Launch iOS simulator
- \`npx expo start --android\`: Launch Android emulator
- \`npx expo run:ios\`: Native iOS build (requires Xcode)
- \`eas build --profile preview\`: Create preview build via EAS
- \`eas submit\`: Submit to App Store / Google Play
- \`npm test\`: Run Jest test suite

## Code Style
- Functional components with hooks only
- Custom hooks in \`hooks/\` folder, prefixed with \`use\`
- Firebase calls wrapped in \`services/\` layer (never call Firebase directly from components)
- Firestore collections: \`users\`, \`workouts\`, \`programs\`, \`exercises\`
- All Firestore reads use React Query with stale time of 5 minutes

## File Structure
- \`app/\`: Expo Router screens and layouts
- \`components/\`: Reusable UI components (Button, Card, Input, etc.)
- \`hooks/\`: Custom React hooks
- \`services/\`: Firebase wrappers and API clients
- \`stores/\`: Zustand store definitions
- \`constants/\`: Colors, sizing, and config values
- \`assets/\`: Images, fonts, and animations (Lottie files)

## Conventions
- Assets under 100KB only; compress images before adding
- Animations use Reanimated 3 (not Animated API)
- Bottom tab navigator for main sections: Home, Log, Programs, Profile
- Stack navigator inside each tab for detail screens
- Error handling: try/catch in services, user-facing toast via \`react-native-toast-message\`
- Deep links configured in \`app.json\` under \`expo.scheme\`
- Test on both iOS and Android before marking any PR as ready`;

const WORKERS_EXAMPLE = `# Project: Link Shortener API

## Overview
URL shortening service with analytics. Handles redirect resolution at the edge, click tracking, and link management via REST API.

## Stack
- Runtime: Cloudflare Workers
- Framework: Hono v4
- Language: TypeScript
- Storage: Workers KV (short links), D1 (click analytics)
- Auth: API keys validated via middleware
- CLI: Wrangler v3

## Commands
- \`wrangler dev\`: Start local dev server with miniflare
- \`wrangler deploy\`: Deploy to production
- \`wrangler d1 execute linkdb --local --file=schema.sql\`: Seed local D1
- \`wrangler d1 execute linkdb --file=migrations/001.sql\`: Run production migration
- \`wrangler kv:key list --binding=LINKS\`: List keys in KV namespace
- \`npm test\`: Run Vitest test suite

## Code Style
- All route handlers return \`Response\` or use Hono's \`c.json()\` helper
- Middleware pattern for auth, rate limiting, and CORS
- Type the \`Bindings\` interface in \`src/types.ts\` for all KV, D1, and secret bindings
- Zod validation on all incoming request bodies
- No \`any\` types; strict TypeScript throughout

## Project Structure
- \`src/index.ts\`: Hono app setup, middleware registration, route mounting
- \`src/routes/\`: Route modules (links.ts, analytics.ts, admin.ts)
- \`src/middleware/\`: Auth, rate limiter, error handler
- \`src/services/\`: Business logic (link resolution, analytics aggregation)
- \`src/types.ts\`: Bindings interface and shared types
- \`migrations/\`: D1 SQL migration files
- \`wrangler.toml\`: Worker config, KV and D1 bindings, environment vars

## Conventions
- KV keys for short links: \`link:{slug}\` with JSON value containing URL and metadata
- D1 click records: one row per click with timestamp, country, referrer, user agent
- Rate limiting: 100 requests per minute per API key, tracked in KV with TTL
- CORS: allow all origins on GET (redirects), restrict POST/DELETE to dashboard domain
- Environment secrets (\`API_MASTER_KEY\`, \`ANALYTICS_TOKEN\`) set via \`wrangler secret put\`
- Redirect responses use 302 (temporary) by default; 301 available as a link option
- Error responses follow \`{"success": false, "error": "message"}\` format
- Deploy previews on feature branches via \`wrangler deploy --env preview\``;

export default function ClaudeMdExamplesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'CLAUDE.md Examples: Ready-to-Use Templates for Every Stack',
          description:
            'Copy-paste CLAUDE.md examples for Next.js, Python, React Native, Cloudflare Workers, and more. Real-world templates you can use today.',
          url: 'https://tensorfeed.ai/claude-md-examples',
          publisher: {
            '@type': 'Organization',
            name: 'TensorFeed.ai',
            url: 'https://tensorfeed.ai',
          },
        }}
      />

      <p className="text-text-muted text-sm mb-4">Last Updated: March 2026</p>

      <h1 className="text-4xl font-bold text-text-primary mb-6">
        CLAUDE.md Examples: Ready-to-Use Templates
      </h1>

      <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-4 mb-8">
        <p className="text-text-secondary text-base leading-relaxed">
          These are production-ready CLAUDE.md templates you can copy directly into your project.
          Each one is modeled after real codebases and covers the sections that matter most: stack
          details, commands, code style, file structure, and project conventions. Grab the one that
          fits your stack, customize the specifics, and you are good to go.
        </p>
      </div>

      <p className="text-lg text-text-secondary mb-8 leading-relaxed">
        New to CLAUDE.md? Read the{' '}
        <Link href="/claude-md-guide" className="text-accent-primary hover:underline">
          complete CLAUDE.md guide
        </Link>{' '}
        first. Want to build your own from scratch? Try the{' '}
        <Link href="/claude-md-generator" className="text-accent-primary hover:underline">
          CLAUDE.md generator
        </Link>
        .
      </p>

      {/* Example 1: Next.js */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-2">1. Next.js Web App</h2>
        <p className="text-text-secondary mb-4">
          A full CLAUDE.md for a Next.js 14 project using App Router, TypeScript, Tailwind CSS, and
          Cloudflare Pages. Covers route conventions, component patterns, and deployment workflow.
        </p>
        <div className="relative rounded-xl border border-border bg-bg-tertiary overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary">
            <span className="text-xs text-text-muted font-mono">CLAUDE.md</span>
          </div>
          <pre className="p-4 overflow-x-auto text-sm text-text-primary font-mono leading-relaxed whitespace-pre-wrap">
            {NEXTJS_EXAMPLE}
          </pre>
        </div>
      </section>

      <AdPlaceholder className="mb-12" />

      {/* Example 2: Python FastAPI */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-2">2. Python Backend (FastAPI)</h2>
        <p className="text-text-secondary mb-4">
          A CLAUDE.md for a FastAPI service with SQLAlchemy, Alembic migrations, PostgreSQL, and
          Docker. Includes testing patterns, project layout, and API conventions.
        </p>
        <div className="relative rounded-xl border border-border bg-bg-tertiary overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary">
            <span className="text-xs text-text-muted font-mono">CLAUDE.md</span>
          </div>
          <pre className="p-4 overflow-x-auto text-sm text-text-primary font-mono leading-relaxed whitespace-pre-wrap">
            {PYTHON_EXAMPLE}
          </pre>
        </div>
      </section>

      {/* Example 3: React Native */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-2">3. React Native Mobile App</h2>
        <p className="text-text-secondary mb-4">
          A CLAUDE.md for a React Native Expo project with Firebase, Zustand, and Expo Router.
          Covers navigation patterns, asset rules, and testing expectations.
        </p>
        <div className="relative rounded-xl border border-border bg-bg-tertiary overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary">
            <span className="text-xs text-text-muted font-mono">CLAUDE.md</span>
          </div>
          <pre className="p-4 overflow-x-auto text-sm text-text-primary font-mono leading-relaxed whitespace-pre-wrap">
            {REACT_NATIVE_EXAMPLE}
          </pre>
        </div>
      </section>

      <AdPlaceholder className="mb-12" />

      {/* Example 4: Cloudflare Workers */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-2">4. Cloudflare Workers API</h2>
        <p className="text-text-secondary mb-4">
          A CLAUDE.md for a Cloudflare Workers project using Hono, KV, and D1. Covers wrangler
          commands, rate limiting patterns, and deployment environments.
        </p>
        <div className="relative rounded-xl border border-border bg-bg-tertiary overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary">
            <span className="text-xs text-text-muted font-mono">CLAUDE.md</span>
          </div>
          <pre className="p-4 overflow-x-auto text-sm text-text-primary font-mono leading-relaxed whitespace-pre-wrap">
            {WORKERS_EXAMPLE}
          </pre>
        </div>
      </section>

      {/* Tips section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Tips for Customizing These Templates</h2>
        <ul className="space-y-3 text-text-secondary">
          <li className="flex gap-3">
            <span className="text-accent-primary font-bold">1.</span>
            <span>
              Start with the template closest to your stack, then delete any sections that do not
              apply. A shorter, accurate file beats a long, generic one.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent-primary font-bold">2.</span>
            <span>
              Add your actual project name, real folder paths, and real command names. The more
              specific you are, the better Claude can help.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent-primary font-bold">3.</span>
            <span>
              Include conventions that are unique to your team. Things like naming patterns, import
              ordering rules, and error handling strategies make a big difference.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent-primary font-bold">4.</span>
            <span>
              Update your CLAUDE.md as your project evolves. Outdated instructions can lead Claude
              in the wrong direction.
            </span>
          </li>
        </ul>
      </section>

      {/* CTA */}
      <div className="bg-bg-secondary border border-border rounded-xl p-6 text-center">
        <h3 className="text-xl font-bold text-text-primary mb-2">Build Your Own CLAUDE.md</h3>
        <p className="text-text-secondary mb-4">
          Use the interactive generator to create a custom CLAUDE.md tailored to your exact stack
          and workflow.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/claude-md-generator"
            className="inline-block bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Open the Generator
          </Link>
          <Link
            href="/claude-md-guide"
            className="inline-block border border-border hover:border-accent-primary text-text-primary font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Read the Full Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
