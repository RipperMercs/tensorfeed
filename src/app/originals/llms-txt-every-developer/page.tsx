import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: "Why Every Developer Needs an llms.txt File",
  description:
    "AI agents are becoming your most important visitors. llms.txt is the standard that tells them what your site actually contains. A practical guide.",
  openGraph: {
    title: "Why Every Developer Needs an llms.txt File",
    description:
      "AI agents read your site differently than humans. llms.txt makes your content legible to them. Here is how and why.",
    type: 'article',
    publishedTime: '2026-04-17T16:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Why Every Developer Needs an llms.txt File",
    description:
      "Agent traffic is eating human traffic. Make your site readable by the bots that matter with llms.txt.",
  },
};

export default function LlmsTxtEveryDeveloperPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Why Every Developer Needs an llms.txt File"
        description="AI agents are becoming your most important visitors. llms.txt is the standard that tells them what your site actually contains. A practical guide."
        datePublished="2026-04-17"
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
          Why Every Developer Needs an llms.txt File
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-04-17">April 17, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            5 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Your next most important visitor is not a human. It is an AI agent, and it is showing up at your site with a list of tasks and a 200ms patience budget. If your site is not legible to it, you are invisible. The way to become legible is a file called llms.txt.
        </p>

        <p>
          I know. Another standard. Another file in the root. I was skeptical too until I watched our agent traffic pass our human traffic on TensorFeed. Now I think llms.txt is the most important piece of web plumbing nobody at your company is talking about.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What llms.txt Is</h2>

        <p>
          It is a markdown file at the root of your site that tells AI agents what you have and where to find it. Think robots.txt, but instead of telling crawlers what to avoid, llms.txt tells agents what you want them to see and in what order.
        </p>

        <p>
          The structure is simple. A title. A one-line description. A few sections. Each section has a list of links to important pages, each with a one-sentence summary. Agents can read the whole file in a single pass and know what your site is about in seconds.
        </p>

        <p>
          A good llms.txt replaces the discovery phase an agent would otherwise spend crawling your sitemap, rendering your JavaScript, and guessing at your structure. For you, that means faster agent responses and lower compute cost on the agent side. For the agent, it means better answers.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why This Matters Now</h2>

        <p>
          Agent traffic is growing faster than any other category of web traffic. Cloudflare reports that agent requests have gone from a rounding error to double digit percentages of total requests in eighteen months. ClaudeBot, GPTBot, PerplexityBot, and their peers are running research queries for millions of users every day.
        </p>

        <p>
          The traffic is bifurcated. Either an agent finds you and cites you, or it does not and you might as well not exist. The difference is not just SEO ranking. It is whether your content gets synthesized into answers at all.
        </p>

        <p>
          Search engines wanted to link to you. Agents want to summarize you. That is a different relationship with different requirements. Your content has to be legible as a factual source, not just a page to click through.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Goes in a Good llms.txt</h2>

        <p>
          Start with a title and a crisp description of what your site does. Agents use this to decide if your site is relevant to the query they are working on. If the description is vague, you get skipped.
        </p>

        <p>
          Then a section per content type. Guides. Products. Documentation. Blog posts. Each section is a list of links with one-sentence summaries that actually describe what is at the link. Avoid marketing copy. Describe the contents concretely.
        </p>

        <p>
          Include machine-readable formats where you have them. RSS feeds. JSON feeds. API endpoints. If your site exposes structured data, tell agents where to find it. They will use it preferentially over scraping your HTML.
        </p>

        <p>
          End with an Optional section for secondary resources. Full text dumps. Sitemaps. Archived content. Agents will fall back to these when they need depth that the main page did not provide.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What We Did on TensorFeed</h2>

        <p>
          Our llms.txt lists every major hub page, every originals article, every individual model page, every comparison, every status dashboard, every API endpoint, and every RSS feed. It is 130 lines. Agents can ingest the whole thing in one request.
        </p>

        <p>
          We also ship llms-full.txt, a separate file with the full text of every guide page concatenated together. When an agent needs the actual content instead of just pointers, it has one URL to hit. This saves the agent from crawling twenty pages and saves us from serving twenty rendered HTML responses.
        </p>

        <p>
          Our robots.txt explicitly welcomes all major AI crawlers by name. ClaudeBot, GPTBot, PerplexityBot, and every other one we could identify. We want the traffic. We want to be cited.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Start Simple</h2>

        <p>
          You do not need a perfect file. You need a good first version. Put a markdown file at yoursite.com/llms.txt with a title, a description, and a list of your most important pages with one-sentence summaries. Ship it. Iterate.
        </p>

        <p>
          Watch your agent traffic. If it grows, expand the file. Add more content types. Add machine-readable feeds. Add an llms-full.txt when you have content that benefits from bulk ingestion.
        </p>

        <p>
          The teams that treat agents as a primary audience will be the ones that show up in AI-generated answers three years from now. The teams that ignore them will still rank on Google, but nobody is reading Google anymore when they have ChatGPT.
        </p>

        <p>
          The playbook is changing. This is one of the simplest wins available. Put the file up.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg p-5 space-y-3 mt-8">
          <p className="text-text-primary font-medium">Build AI-ready infrastructure.</p>
          <p>
            See our{' '}
            <Link href="/claude-md-guide" className="text-accent-primary hover:underline">CLAUDE.md guide</Link>{' '}
            for another agent-friendly standard, the{' '}
            <Link href="/originals/building-for-ai-agents" className="text-accent-primary hover:underline">building for AI agents</Link>{' '}
            companion piece, and the full{' '}
            <Link href="/developers" className="text-accent-primary hover:underline">TensorFeed developer docs</Link>{' '}
            including every live API endpoint.
          </p>
        </div>

        <p className="text-sm text-text-muted pt-4">
          <span className="text-text-secondary font-medium">About Kira Nolan:</span> Kira writes about AI agent infrastructure, developer experience, and the open standards shaping the agent stack at TensorFeed.ai.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-12 pt-6 border-t border-border text-sm">
        <Link
          href="/originals"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Originals
        </Link>
        <Link
          href="/"
          className="text-text-muted hover:text-accent-primary transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
