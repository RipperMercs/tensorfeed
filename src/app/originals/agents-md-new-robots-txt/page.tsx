import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'AGENTS.md Is the New robots.txt',
  description:
    'Every codebase should ship an AGENTS.md by the end of 2026. Here is why agents look for it, what to put in it, and how a 30-line file makes your repo more useful to every AI coding assistant on the planet.',
  openGraph: {
    title: 'AGENTS.md Is the New robots.txt',
    description:
      'Every codebase should ship an AGENTS.md. Here is why, what goes in it, and how to write one in fifteen minutes.',
    type: 'article',
    publishedTime: '2026-05-04T16:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AGENTS.md Is the New robots.txt',
    description:
      'A short file at your repo root that tells coding agents how to be useful. Why it matters, what to write, and how to ship one this afternoon.',
  },
};

export default function AgentsMdNewRobotsTxtPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="AGENTS.md Is the New robots.txt"
        description="Every codebase should ship an AGENTS.md by the end of 2026. Why agents look for it, what to put in it, and how a 30-line file makes your repo more useful to every AI coding assistant on the planet."
        datePublished="2026-05-04"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          AGENTS.md Is the New robots.txt
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-05-04">May 4, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Every coding agent that has touched my repos in the last three months has done the same thing: it opens the root directory, looks for a file named AGENTS.md, reads it before anything else, and then starts working. Claude Code does this. Cursor does this. Cline does this. The agent ecosystem has converged on a convention that almost nobody knows exists.
        </p>

        <p>
          AGENTS.md is the new robots.txt. Different audience, same idea: a small text file at your repo root that tells automated visitors how to behave. Robots.txt told search crawlers what they could index. AGENTS.md tells coding agents how to write code in your project so they do not break things. The difference is that AGENTS.md is much more useful, because the audience is much smarter, and the cost of getting it wrong is much higher than a missing search hit.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Agents Read It First</h2>

        <p>
          When an agent opens a fresh repo it has zero context. It does not know which package manager you use, which test command works, which directories are vendored, which files are auto-generated and should never be touched, or what your style preferences are. It can guess from package.json or pyproject.toml or a Makefile, but guessing burns tokens and produces worse output.
        </p>

        <p>
          AGENTS.md is the cheat sheet. The agent reads thirty lines, gets oriented in two seconds, and writes correct code on the first attempt instead of spending ten minutes pattern-matching its way through your conventions. That difference shows up in the diff and in the time-to-first-useful-PR.
        </p>

        <p>
          For my own projects, I can feel the difference between repos that have an AGENTS.md and repos that do not. The ones with AGENTS.md get accurate, in-style code. The ones without get generically reasonable code that often fails my pre-commit hook because the agent guessed wrong about something the human team already settled.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What to Put In One</h2>

        <p>
          The file is freeform Markdown. There is no schema. But the same handful of sections show up across every good AGENTS.md I have seen:
        </p>

        <ul className="list-disc list-inside space-y-2 pl-2">
          <li>
            <span className="text-text-primary font-medium">What this project is.</span> One sentence. The agent will infer almost everything else from this. Do not skip it.
          </li>
          <li>
            <span className="text-text-primary font-medium">How to install dependencies.</span> The exact command. Not &quot;run npm or yarn or whatever you prefer.&quot; Pick one. The agent will use whatever you list.
          </li>
          <li>
            <span className="text-text-primary font-medium">How to run tests and lint.</span> The exact commands again. Agents tend to be conservative; if you tell them &quot;npm test&quot; runs the suite, they will run it before submitting a PR.
          </li>
          <li>
            <span className="text-text-primary font-medium">Code style rules that humans cannot infer from a linter.</span> Naming preferences, file layout, what counts as a small commit, whether you use semicolons in TypeScript. The stuff your team agreed on but never wrote down.
          </li>
          <li>
            <span className="text-text-primary font-medium">Don&apos;t-touch zones.</span> Auto-generated files, vendored dependencies, lockfiles you regenerate via a specific command. Agents will respect these if you list them. They will edit them if you do not.
          </li>
          <li>
            <span className="text-text-primary font-medium">Where to find more detail.</span> Pointers to docs/ARCHITECTURE.md, the README, internal wikis. Agents follow links.
          </li>
        </ul>

        <p>
          You do not need a section for things the agent can read off the file tree. You do not need to explain that you use TypeScript if there is a tsconfig.json sitting there. The point of AGENTS.md is to capture what the agent cannot infer.
        </p>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Discoverability Question</h2>

        <p>
          Robots.txt works because search engines all agreed to look for it at a specific path. The same convergence is happening with AGENTS.md, but it has happened informally and quickly, without anyone publishing a spec.
        </p>

        <p>
          OpenAI&apos;s Codex, Anthropic&apos;s Claude Code, Cursor&apos;s background agents, Cline, Aider, GitHub Copilot Agent: every major coding agent I have tested in 2026 reads AGENTS.md if it exists. Some also read CLAUDE.md or CONTRIBUTING.md as fallbacks. None of them read random other filenames. The path is the standard now.
        </p>

        <p>
          That convergence is not because everyone copied each other. It is because AGENTS.md is the first thing an agent thinks of when it lands in a strange repo. The name is good. The location is obvious. The format is freeform enough to write in five minutes. So everyone reaches for it independently and the convention sticks.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">An Example Worth Stealing</h2>

        <p>
          Here is a thirty-line AGENTS.md that would meaningfully improve any Node project:
        </p>

        <pre className="bg-bg-secondary border border-border rounded p-4 text-xs overflow-x-auto"><code>{`# AGENTS.md

This is a [one sentence about what the project is].

## Install
npm install

## Run tests
npm test

## Run lint
npm run lint

## Run dev server
npm run dev

## Code style
- TypeScript strict mode, no \`any\` types.
- Tailwind only for styling. No CSS modules.
- Functional React components, hooks only.
- Use \`@/\` path alias for imports from src/.

## Don't touch
- src/generated/  (regenerate via npm run codegen)
- public/api/     (regenerate via npm run prebuild)
- lockfiles       (always commit them)

## Conventions
- Commits are imperative present tense.
- PR titles match the conventional commits format.
- Comments only when the WHY is non-obvious.

## More detail
- docs/ARCHITECTURE.md  (full system reference)
- README.md             (user-facing intro)
`}</code></pre>

        <p>
          That is it. Thirty lines. Ten minutes to write. Every agent that visits your repo from now on opens that file before doing anything else.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why You Should Ship One This Week</h2>

        <p>
          Agent traffic is not a small slice anymore. On TensorFeed I see machine-readable feed pulls outpacing human page views. On a public repo, AI assistants reading the source for users they will never see is becoming the dominant traffic pattern. You are writing code for both audiences whether you planned to or not.
        </p>

        <p>
          The repos that ship a clean AGENTS.md will quietly outperform the repos that do not. Their PRs will be cleaner. Their issue triage will be faster. Their forks will be more useful. And the kicker: future agents will remember which repos respected them. Tool descriptions, embeddings, whatever the next architecture is, the friction-of-a-fresh-repo-without-AGENTS.md is going to feel like the friction of a website without a sitemap. A small thing that the wrong repos still skip.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The TensorFeed Take</h2>

        <p>
          We ship an AGENTS.md at <Link href="https://github.com/RipperMercs/tensorfeed/blob/main/CLAUDE.md" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">our project root</Link> (we use the CLAUDE.md naming, but it is the same idea, and most agents that read AGENTS.md also read CLAUDE.md). It contains the rules of the codebase, the do-not-touch zones, and the brand voice rules. Every PR an agent makes against TensorFeed already passes the lint, fits the file conventions, and obeys the &quot;no em dashes&quot; rule. Not because the agent is psychic. Because we wrote it down.
        </p>

        <p>
          If you maintain a public repo and agents are touching it, take fifteen minutes this week and write an AGENTS.md. The yield is huge. The cost is nothing.
        </p>

        <p className="text-sm text-text-muted pt-8 border-t border-border">
          For more on building for AI agents, see <Link href="/originals/llms-txt-every-developer" className="text-accent-primary hover:underline">Why Every Developer Needs an llms.txt File</Link> and <Link href="/originals/building-for-ai-agents" className="text-accent-primary hover:underline">Building for AI Agents</Link>.
        </p>
      </div>
    </article>
  );
}
