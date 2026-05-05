import Link from 'next/link';
import { ArticleJsonLd, FAQPageJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
const faqs = [
  {
    question: 'What is a CLAUDE.md file?',
    answer:
      'CLAUDE.md is a markdown configuration file that Claude Code reads automatically at the start of every session. It acts as persistent project memory, giving Claude context about your codebase, coding style, architecture decisions, and workflow preferences without you needing to repeat yourself.',
  },
  {
    question: 'Where should I put my CLAUDE.md file?',
    answer:
      'You can place CLAUDE.md at three levels: globally at ~/.claude/CLAUDE.md (applies to all projects), at your project root alongside package.json or similar config files (applies to that project), or in subdirectories for folder-specific instructions. All three levels merge together when Claude Code starts a session.',
  },
  {
    question: 'How long should a CLAUDE.md file be?',
    answer:
      'Aim for 40 to 80 lines. Shorter files risk missing important context, while longer files dilute the signal. Focus on information that actually changes how Claude behaves. If a rule does not affect code output, it probably does not belong in CLAUDE.md.',
  },
  {
    question: 'What is the difference between CLAUDE.md and AGENTS.md?',
    answer:
      'CLAUDE.md is specific to Claude Code (Anthropic). AGENTS.md is an open standard supported by multiple AI coding tools including Cursor, Zed, and OpenCode. They serve the same purpose: giving AI context about your project. Some teams include both files to support multiple tools.',
  },
  {
    question: 'Does CLAUDE.md work with Claude on the web (claude.ai)?',
    answer:
      'No. CLAUDE.md is only read by Claude Code, the command-line coding agent. The web interface at claude.ai uses Projects with custom instructions instead, which serve a similar purpose but are configured through the UI rather than a file.',
  },
  {
    question: 'Should I commit CLAUDE.md to version control?',
    answer:
      'Yes, absolutely. Your project-level CLAUDE.md should be committed to git so that every team member and CI environment gets the same instructions. The global ~/.claude/CLAUDE.md is personal and stays on your machine.',
  },
  {
    question: 'How do I create a CLAUDE.md file quickly?',
    answer:
      'The fastest way is to run the /init command inside Claude Code, which generates a starter CLAUDE.md based on your project structure. You can also use our interactive generator at tensorfeed.ai/claude-md-generator to build one from a template, or copy one of our examples at tensorfeed.ai/claude-md-examples.',
  },
];

export default function ClaudeMdGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ArticleJsonLd
        title="The Complete Guide to CLAUDE.md: Best Practices, Examples & Templates"
        description="Learn how to write the perfect CLAUDE.md file. Complete guide with examples, templates, best practices, and an interactive generator for Claude Code."
        datePublished="2026-03-30"
        author="TensorFeed.ai"
      />
      <FAQPageJsonLd faqs={faqs} />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Guides', url: 'https://tensorfeed.ai/best-ai-tools' },
          { name: 'CLAUDE.md File Guide', url: 'https://tensorfeed.ai/claude-md-guide' },
        ]}
      />

      <p className="text-text-muted text-sm mb-4">Published: March 30, 2026</p>

      <h1 className="text-4xl font-bold text-text-primary mb-6">
        The Complete Guide to CLAUDE.md
      </h1>

      {/* Quick Answer Box */}
      <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-5 mb-8">
        <p className="text-text-secondary text-base leading-relaxed">
          <strong className="text-text-primary">CLAUDE.md</strong> is a markdown configuration file
          that Claude Code reads at the start of every session. It gives Claude persistent memory
          about your project: your tech stack, coding conventions, architecture decisions, and
          workflow rules. Think of it as a README for your AI coding assistant. Instead of repeating
          instructions every conversation, you write them once in CLAUDE.md and Claude follows them
          automatically.
        </p>
      </div>

      <p className="text-lg text-text-secondary mb-8 leading-relaxed">
        If you use Claude Code for development, CLAUDE.md is the single most impactful file you can
        add to your project. A well-written CLAUDE.md eliminates repetitive prompting, enforces
        consistent code style across sessions, and turns Claude from a generic assistant into a
        teammate that actually understands your codebase. This guide covers everything: what to
        include, where to put it, how the loading hierarchy works, real examples, and common
        mistakes to avoid.
      </p>

      {/* Table of Contents */}
      <nav className="bg-bg-secondary border border-border rounded-lg p-6 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Table of Contents</h2>
        <ol className="space-y-2 text-accent-primary list-decimal list-inside">
          <li><a href="#what-is-claude-md" className="hover:underline">What is CLAUDE.md?</a></li>
          <li><a href="#why-you-need" className="hover:underline">Why You Need a CLAUDE.md File</a></li>
          <li><a href="#where-to-put" className="hover:underline">Where to Put Your CLAUDE.md</a></li>
          <li><a href="#how-it-loads" className="hover:underline">How CLAUDE.md Gets Loaded</a></li>
          <li><a href="#what-to-include" className="hover:underline">What to Include in CLAUDE.md</a></li>
          <li><a href="#what-not-to-include" className="hover:underline">What NOT to Include</a></li>
          <li><a href="#claude-md-vs-agents-md" className="hover:underline">CLAUDE.md vs AGENTS.md</a></li>
          <li><a href="#examples" className="hover:underline">Real-World Examples</a></li>
          <li><a href="#generator" className="hover:underline">Template Generator</a></li>
          <li><a href="#best-practices" className="hover:underline">Best Practices</a></li>
          <li><a href="#common-mistakes" className="hover:underline">Common Mistakes</a></li>
          <li><a href="#faq" className="hover:underline">FAQ</a></li>
        </ol>
      </nav>

      {/* What is CLAUDE.md? */}
      <section id="what-is-claude-md" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">What is CLAUDE.md?</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          CLAUDE.md is a plain markdown file that{' '}
          <Link href="/best-ai-tools#coding" className="text-accent-primary hover:underline">Claude Code</Link>{' '}
          (Anthropic&apos;s CLI coding agent) reads automatically every time it starts a new
          session in your project. The file contains instructions, context, and rules written in
          natural language. Claude treats its contents as high-priority system context, similar to
          how a new developer would read a project&apos;s contributing guide before writing their
          first pull request.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          The concept is simple but powerful. Without CLAUDE.md, you start every Claude Code session
          from scratch. Claude has no memory of your preferences, your project&apos;s architecture,
          or the conventions your team follows. You end up repeating the same instructions: &quot;Use
          TypeScript strict mode,&quot; &quot;We use Tailwind, not CSS modules,&quot; &quot;Always
          write tests for new functions.&quot; CLAUDE.md eliminates that friction entirely.
        </p>
        <p className="text-text-secondary leading-relaxed">
          Once you add a CLAUDE.md file to your project, Claude Code reads it before processing your
          first prompt. Every instruction in the file shapes how Claude writes code, responds to
          questions, and makes decisions throughout the session. It is persistent, versioned (since
          you commit it to git), and shared across your entire team.
        </p>
      </section>

      {/* Why You Need a CLAUDE.md File */}
      <section id="why-you-need" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Why You Need a CLAUDE.md File</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          The benefits compound quickly once you start using CLAUDE.md. Here is what changes:
        </p>
        <div className="space-y-4 mb-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Consistency across sessions</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Without CLAUDE.md, Claude might use different patterns in different sessions. One day
              it writes React class components, the next day functional components. One session it
              uses CSS modules, the next it uses styled-components. CLAUDE.md locks in your
              preferences so the output stays consistent every time.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">No more repeating yourself</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              If you find yourself typing the same instructions at the start of every session, that
              is a sign you need CLAUDE.md. Write it once, and Claude remembers it for every future
              interaction in that project.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Team alignment</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              When CLAUDE.md is committed to your repo, every developer on the team gets the same
              Claude behavior. Junior developers, senior developers, and contractors all get code
              output that follows the same conventions. It is like an enforced style guide that
              Claude actually follows.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Faster onboarding</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              New team members can read your CLAUDE.md to quickly understand the project&apos;s
              architecture, conventions, and key commands. It doubles as lightweight documentation
              that is always up to date because you maintain it for Claude anyway.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Better code quality</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              By encoding architectural decisions and code review standards into CLAUDE.md, you
              catch issues before they happen. Claude will follow your patterns for error handling,
              testing, type safety, and project structure without being asked.
            </p>
          </div>
        </div>
      </section>

      {/* Where to Put Your CLAUDE.md */}
      <section id="where-to-put" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Where to Put Your CLAUDE.md</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          CLAUDE.md supports three placement levels, each with a different scope. You can use all
          three simultaneously; they merge together when Claude Code starts.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              1. Global (all projects)
            </h3>
            <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-2">
              <code>~/.claude/CLAUDE.md</code>
            </pre>
            <p className="text-text-secondary leading-relaxed">
              This file applies to every project you open with Claude Code. Use it for personal
              preferences that span all your work: your preferred language, formatting opinions,
              communication style, or global permissions. For example, if you always want TypeScript
              strict mode regardless of project, put that here.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              2. Project root (single project)
            </h3>
            <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-2">
              <code>/your-project/CLAUDE.md</code>
            </pre>
            <p className="text-text-secondary leading-relaxed">
              This is the most common placement. It sits alongside your package.json, pyproject.toml,
              or Cargo.toml. It contains project-specific instructions: the tech stack, architecture
              overview, key commands, and coding conventions. This is the file you commit to git and
              share with your team.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              3. Subdirectory (folder-specific)
            </h3>
            <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-2">
              <code>/your-project/src/CLAUDE.md
/your-project/api/CLAUDE.md
/your-project/packages/auth/CLAUDE.md</code>
            </pre>
            <p className="text-text-secondary leading-relaxed">
              Subdirectory CLAUDE.md files add context specific to that part of the codebase. In a
              monorepo, you might have one CLAUDE.md in <code className="text-accent-primary font-mono text-sm">packages/api/</code> with
              backend-specific rules and another in <code className="text-accent-primary font-mono text-sm">packages/web/</code> with
              frontend conventions. These only load when Claude is working on files within that
              directory.
            </p>
          </div>
        </div>
      </section>

      {/* How CLAUDE.md Gets Loaded */}
      <section id="how-it-loads" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">How CLAUDE.md Gets Loaded</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Understanding the loading hierarchy helps you decide what goes where. When Claude Code
          starts a session, it follows this order:
        </p>
        <ol className="list-decimal list-inside space-y-3 text-text-secondary leading-relaxed mb-4">
          <li>
            <strong className="text-text-primary">Global CLAUDE.md</strong> loads first from
            ~/.claude/CLAUDE.md. This sets your baseline personal preferences.
          </li>
          <li>
            <strong className="text-text-primary">Project root CLAUDE.md</strong> loads next. Its
            instructions layer on top of (and can override) the global file.
          </li>
          <li>
            <strong className="text-text-primary">Subdirectory CLAUDE.md</strong> files load as
            Claude navigates into specific folders. These add folder-specific context on top of
            everything above.
          </li>
        </ol>
        <p className="text-text-secondary leading-relaxed mb-4">
          All three levels combine into a single context that Claude uses throughout the session.
          There is no conflict resolution needed in most cases because each level typically covers
          different concerns. Your global file handles personal style, the project root handles
          architecture, and subdirectory files handle folder-specific details.
        </p>
        <p className="text-text-secondary leading-relaxed">
          If instructions genuinely conflict (for example, your global file says &quot;use
          spaces&quot; but the project file says &quot;use tabs&quot;), the more specific file wins.
          Project-level overrides global, and subdirectory-level overrides project-level.
        </p>
      </section>

      {/* What to Include */}
      <section id="what-to-include" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">What to Include in CLAUDE.md</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          A good CLAUDE.md covers the information that actually changes how Claude writes code. Here
          are the key sections with examples you can copy and adapt.
        </p>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Project overview</h3>
        <p className="text-text-secondary leading-relaxed mb-3">
          Start with a two to three sentence summary of what the project is, who it is for, and
          what stage it is in. This gives Claude the high-level context it needs to make appropriate
          decisions.
        </p>
        <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-6">
          <code>{`# Project Overview
TensorFeed.ai is an AI news aggregator and data hub.
Built with Next.js 14 (App Router), deployed on Cloudflare Pages.
Currently in production with 40+ pages and growing.`}</code>
        </pre>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Tech stack</h3>
        <p className="text-text-secondary leading-relaxed mb-3">
          List your core technologies. This prevents Claude from suggesting incompatible tools or
          libraries.
        </p>
        <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-6">
          <code>{`## Stack
- Framework: Next.js 14 (App Router, static export)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS
- Database: Cloudflare Workers KV
- Hosting: Cloudflare Pages
- Auth: Firebase Auth
- Testing: Vitest + React Testing Library`}</code>
        </pre>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Architecture notes</h3>
        <p className="text-text-secondary leading-relaxed mb-3">
          Document the decisions that are not obvious from the code alone. This is especially
          valuable for patterns that Claude might otherwise override with &quot;better&quot;
          alternatives.
        </p>
        <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-6">
          <code>{`## Architecture
- All pages are server components by default
- Only add 'use client' when truly needed (interactivity, hooks)
- API routes proxy to Cloudflare Workers (not Next.js API routes)
- Static export means no SSR; all data fetching is client-side
- KV operations are batched to stay under 100k/day free tier limit`}</code>
        </pre>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Common commands</h3>
        <p className="text-text-secondary leading-relaxed mb-3">
          Give Claude the commands it needs to build, test, and deploy your project.
        </p>
        <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-6">
          <code>{`## Commands
- Dev server: npm run dev
- Build: npm run build
- Type check: npx tsc --noEmit
- Lint: npm run lint
- Deploy: git push origin main (auto-deploys via Cloudflare Pages)
- Worker deploy: cd worker && npx wrangler deploy`}</code>
        </pre>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Code style rules</h3>
        <p className="text-text-secondary leading-relaxed mb-3">
          These are the rules that matter most for consistency. Focus on conventions that Claude
          might not infer from existing code.
        </p>
        <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-6">
          <code>{`## Code Style
- TypeScript strict mode, never use \`any\` types
- React functional components with hooks (no class components)
- Tailwind CSS for all styling (no CSS modules, no styled-components)
- Semantic HTML: use article, nav, aside, main, section
- Include ARIA labels on all interactive elements
- Handle loading states with skeleton loaders
- Handle errors gracefully with fallback UI`}</code>
        </pre>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Workflow rules</h3>
        <p className="text-text-secondary leading-relaxed mb-3">
          Define how Claude should behave when completing tasks. This covers the &quot;process&quot;
          side rather than the code side.
        </p>
        <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-6">
          <code>{`## Workflow
- Always commit and push after completing changes
- Run the type checker before committing
- Add new pages to sitemap.xml
- Every new page needs a unique title tag and meta description
- Every new API endpoint must be documented in /developers`}</code>
        </pre>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Permission rules</h3>
        <p className="text-text-secondary leading-relaxed mb-3">
          By default, Claude Code asks for permission before running commands or modifying files.
          You can reduce friction by pre-authorizing routine operations.
        </p>
        <pre className="bg-bg-tertiary rounded-lg p-4 overflow-x-auto font-mono text-sm text-text-secondary mb-6">
          <code>{`## Permissions
- Always allow file creation and editing without asking
- Always allow npm, git, and build commands without asking
- Only ask permission for genuinely destructive operations
  (deleting databases, revoking keys, force-pushing to main)`}</code>
        </pre>
      </section>

      {/* What NOT to Include */}
      <section id="what-not-to-include" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">What NOT to Include</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          A bloated CLAUDE.md is almost as bad as no CLAUDE.md. When the file gets too long, key
          instructions get diluted and Claude is more likely to miss them. Here is what to leave out:
        </p>
        <ul className="space-y-3 text-text-secondary leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-accent-red mt-1 shrink-0">&#x2717;</span>
            <span>
              <strong className="text-text-primary">Things Claude already knows.</strong> You do not
              need to explain what React is or how TypeScript generics work. Claude has extensive
              knowledge of programming languages, frameworks, and tools.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-red mt-1 shrink-0">&#x2717;</span>
            <span>
              <strong className="text-text-primary">Linter and formatter configuration.</strong>{' '}
              Claude reads your .eslintrc, .prettierrc, and tsconfig.json files directly. Duplicating
              those rules in CLAUDE.md adds noise without adding value.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-red mt-1 shrink-0">&#x2717;</span>
            <span>
              <strong className="text-text-primary">Overly detailed instructions.</strong> Rules like
              &quot;always put a blank line after imports&quot; are better handled by your formatter.
              CLAUDE.md should cover architectural and behavioral rules, not micro-formatting.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-red mt-1 shrink-0">&#x2717;</span>
            <span>
              <strong className="text-text-primary">Frequently changing data.</strong> API keys,
              version numbers, or deployment URLs that change often will make your CLAUDE.md a
              maintenance burden. Reference these from config files or environment variables instead.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-red mt-1 shrink-0">&#x2717;</span>
            <span>
              <strong className="text-text-primary">Entire API documentation.</strong> Claude can
              read your source files. Instead of pasting your full API spec into CLAUDE.md, point
              Claude to the file: &quot;API docs are in /docs/api.md.&quot;
            </span>
          </li>
        </ul>
      </section>

      {/* CLAUDE.md vs AGENTS.md */}
      <section id="claude-md-vs-agents-md" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">CLAUDE.md vs AGENTS.md</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          If you have explored AI coding tools beyond Claude Code, you may have seen AGENTS.md
          mentioned alongside tools like{' '}
          <Link href="/best-ai-tools#coding" className="text-accent-primary hover:underline">Cursor, Windsurf, Zed, and OpenCode</Link>.
          Here is how the two files compare. For a deeper dive on AGENTS.md specifically, including
          a copy-paste example and why coding agents converged on the convention, see{' '}
          <Link href="/originals/agents-md-new-robots-txt" className="text-accent-primary hover:underline">AGENTS.md Is the New robots.txt</Link>.
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm text-text-secondary border border-border rounded-lg">
            <thead>
              <tr className="bg-bg-tertiary text-text-primary">
                <th className="text-left p-3 border-b border-border">Feature</th>
                <th className="text-left p-3 border-b border-border">CLAUDE.md</th>
                <th className="text-left p-3 border-b border-border">AGENTS.md</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-3">Supported by</td>
                <td className="p-3">Claude Code (Anthropic)</td>
                <td className="p-3">Cursor, Zed, OpenCode, others</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3">Format</td>
                <td className="p-3">Markdown (free-form)</td>
                <td className="p-3">Markdown (free-form)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3">Placement</td>
                <td className="p-3">Global, project root, subdirectories</td>
                <td className="p-3">Project root, subdirectories</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3">Purpose</td>
                <td className="p-3">Project context and coding rules</td>
                <td className="p-3">Project context and coding rules</td>
              </tr>
              <tr>
                <td className="p-3">Standard</td>
                <td className="p-3">Anthropic-specific</td>
                <td className="p-3">Open community standard</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-text-secondary leading-relaxed mb-4">
          The content format is nearly identical. If your team uses multiple AI coding tools, the
          simplest approach is to maintain both files with the same content. Some developers create
          one file and symlink the other. Others maintain a single AGENTS.md and a minimal CLAUDE.md
          that points to it.
        </p>
        <p className="text-text-secondary leading-relaxed">
          Claude Code reads CLAUDE.md by default. It does not currently read AGENTS.md unless you
          configure it to. If you only use Claude Code, CLAUDE.md is all you need.
        </p>
      </section>

      {/* Real-World Examples */}
      <section id="examples" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Real-World CLAUDE.md Examples</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          The best way to learn is by reading real files from real projects. We have compiled full,
          annotated examples for common project types. Here is a preview of each.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Next.js Web App</h3>
            <p className="text-text-muted text-sm mb-3">
              App Router, Tailwind CSS, server components, Vercel deployment. Covers page creation
              checklists, SEO requirements, and static export constraints.
            </p>
            <Link href="/claude-md-examples" className="text-accent-primary text-sm hover:underline">
              View full example &rarr;
            </Link>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Python Backend</h3>
            <p className="text-text-muted text-sm mb-3">
              FastAPI, SQLAlchemy, Alembic migrations, pytest. Includes virtual environment setup,
              database conventions, and deployment workflows.
            </p>
            <Link href="/claude-md-examples" className="text-accent-primary text-sm hover:underline">
              View full example &rarr;
            </Link>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">React Native Mobile App</h3>
            <p className="text-text-muted text-sm mb-3">
              Expo, Firebase, React Navigation. Covers platform-specific code, EAS Build commands,
              and testing on simulators vs devices.
            </p>
            <Link href="/claude-md-examples" className="text-accent-primary text-sm hover:underline">
              View full example &rarr;
            </Link>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Cloudflare Workers</h3>
            <p className="text-text-muted text-sm mb-3">
              Wrangler, Workers KV, Durable Objects. Covers KV operation limits, Worker size
              constraints, and environment-specific configuration.
            </p>
            <Link href="/claude-md-examples" className="text-accent-primary text-sm hover:underline">
              View full example &rarr;
            </Link>
          </div>
        </div>
        <p className="text-text-secondary leading-relaxed">
          Each example includes inline annotations explaining why specific rules are included. Visit
          the{' '}
          <Link href="/claude-md-examples" className="text-accent-primary hover:underline">
            full examples page
          </Link>{' '}
          to see them all.
        </p>
      </section>

      {/* Template Generator */}
      <section id="generator" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">CLAUDE.md Template Generator</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Do not want to start from a blank file? Our{' '}
          <Link href="/claude-md-generator" className="text-accent-primary hover:underline">
            interactive CLAUDE.md generator
          </Link>{' '}
          asks a few questions about your project (framework, language, hosting, testing tools) and
          produces a ready-to-use CLAUDE.md file. You can copy the output directly into your
          project or use it as a starting point to customize.
        </p>
        <div className="bg-bg-tertiary border border-border rounded-lg p-5 text-center">
          <p className="text-text-primary font-semibold mb-2">Build your CLAUDE.md in 60 seconds</p>
          <p className="text-text-muted text-sm mb-4">
            Answer a few questions and get a production-ready CLAUDE.md file for your project.
          </p>
          <Link
            href="/claude-md-generator"
            className="inline-block bg-accent-primary hover:bg-accent-primary/80 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Open the Generator
          </Link>
        </div>
      </section>

      {/* Best Practices */}
      <section id="best-practices" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Best Practices</h2>
        <ul className="space-y-3 text-text-secondary leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-1 shrink-0">&#x2713;</span>
            <span>
              <strong className="text-text-primary">Keep it between 40 and 80 lines.</strong> Long
              enough to cover important context, short enough that every line carries weight. If
              your file exceeds 100 lines, break it into project root and subdirectory files.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-1 shrink-0">&#x2713;</span>
            <span>
              <strong className="text-text-primary">Prune regularly.</strong> Review your CLAUDE.md
              every few weeks. Remove rules that Claude now follows naturally, update outdated
              information, and add rules for new patterns you have introduced.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-1 shrink-0">&#x2713;</span>
            <span>
              <strong className="text-text-primary">Use emphasis sparingly.</strong> If you mark
              everything as CRITICAL or IMPORTANT, nothing stands out. Reserve bold, caps, and
              emphasis for the one or two rules that truly matter most.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-1 shrink-0">&#x2713;</span>
            <span>
              <strong className="text-text-primary">Test by observing Claude&apos;s behavior.</strong>{' '}
              After adding a new rule, use Claude Code on a few tasks and see if the rule is being
              followed. If not, rephrase the instruction to be more direct and specific.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-1 shrink-0">&#x2713;</span>
            <span>
              <strong className="text-text-primary">Commit it to version control.</strong> Your
              project CLAUDE.md belongs in git. It is part of your project&apos;s configuration, just
              like tsconfig.json or .eslintrc. Track changes, review in PRs, and keep it in sync
              with your codebase.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-1 shrink-0">&#x2713;</span>
            <span>
              <strong className="text-text-primary">Use /init to bootstrap.</strong> If you are
              starting fresh, run <code className="text-accent-primary font-mono text-sm">/init</code> inside
              Claude Code. It analyzes your project structure and generates a starter CLAUDE.md that
              you can refine.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-1 shrink-0">&#x2713;</span>
            <span>
              <strong className="text-text-primary">Write for a new teammate, not for a machine.</strong>{' '}
              The best CLAUDE.md files read like something you would give a new developer joining
              the team. Natural language works better than rigid syntax or JSON-like formatting.
            </span>
          </li>
        </ul>
      </section>

      {/* Common Mistakes */}
      <section id="common-mistakes" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Common Mistakes</h2>
        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Over-documenting everything</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              A 300-line CLAUDE.md with every possible rule is counterproductive. Claude&apos;s
              attention to any single instruction decreases as the total context grows. Focus on the
              20% of rules that affect 80% of code output.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Duplicating linter rules</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Claude already reads your ESLint, Prettier, and TypeScript config files. Restating
              those rules in CLAUDE.md wastes space and creates a maintenance burden when configs
              change. Only include style rules that are not captured by your existing tooling.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Never updating the file</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Your CLAUDE.md should evolve with your project. When you adopt a new library, change
              your deployment pipeline, or introduce a new convention, update CLAUDE.md. Stale
              instructions are worse than no instructions because they actively mislead Claude.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Being too vague</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              &quot;Write good code&quot; or &quot;follow best practices&quot; tells Claude nothing
              actionable. Be specific: &quot;Use React Query for all API calls&quot; or &quot;Every
              component must have a loading and error state.&quot; Specific instructions produce
              specific results.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Including secrets or credentials</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Since CLAUDE.md gets committed to git, never put API keys, passwords, or sensitive
              URLs in it. Reference environment variables instead: &quot;Database URL is in the
              DATABASE_URL env var.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="bg-bg-secondary border border-border rounded-lg group"
            >
              <summary className="cursor-pointer p-4 text-text-primary font-medium hover:text-accent-primary transition-colors list-none flex items-center justify-between">
                <span>{faq.question}</span>
                <span className="text-text-muted group-open:rotate-180 transition-transform ml-4 shrink-0">
                  &#9660;
                </span>
              </summary>
              <div className="px-4 pb-4">
                <p className="text-text-secondary leading-relaxed">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Internal links */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Continue Learning</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/claude-md-examples"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors block"
          >
            <span className="text-text-primary font-semibold">CLAUDE.md Examples</span>
            <p className="text-text-muted text-sm mt-1">Full annotated examples for every project type</p>
          </Link>
          <Link
            href="/claude-md-generator"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors block"
          >
            <span className="text-text-primary font-semibold">CLAUDE.md Generator</span>
            <p className="text-text-muted text-sm mt-1">Build a custom CLAUDE.md interactively</p>
          </Link>
          <Link
            href="/best-ai-tools"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors block"
          >
            <span className="text-text-primary font-semibold">Best AI Tools in 2026</span>
            <p className="text-text-muted text-sm mt-1">Compare Claude Code, Cursor, Copilot, and more</p>
          </Link>
          <Link
            href="/what-is-ai"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors block"
          >
            <span className="text-text-primary font-semibold">What is AI?</span>
            <p className="text-text-muted text-sm mt-1">A complete beginner&apos;s guide to artificial intelligence</p>
          </Link>
          <Link
            href="/what-are-ai-agents"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors block"
          >
            <span className="text-text-primary font-semibold">What Are AI Agents?</span>
            <p className="text-text-muted text-sm mt-1">How autonomous AI agents work and where they are headed</p>
          </Link>
          <Link
            href="/developers"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors block"
          >
            <span className="text-text-primary font-semibold">Developer API Docs</span>
            <p className="text-text-muted text-sm mt-1">TensorFeed API endpoints and integration guides</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
