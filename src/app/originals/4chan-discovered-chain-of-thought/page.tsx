import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  title: '4chan Users Discovered Chain-of-Thought Reasoning Before Google Did',
  description:
    '4chan players in AI Dungeon discovered that asking AI to solve math step-by-step improves answers. This happened over a year before Google published their "breakthrough" paper. A reminder that innovation comes from everywhere.',
  openGraph: {
    title: '4chan Users Discovered Chain-of-Thought Reasoning Before Google Did',
    description: 'The history of chain-of-thought: 4chan found it first, Google published it, everyone uses it now.',
    type: 'article',
    publishedTime: '2026-04-15T14:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '4chan Users Discovered Chain-of-Thought Reasoning Before Google Did',
    description: 'Chain-of-thought prompting was discovered on 4chan in 2022, not in Google&apos;s lab.',
  },
};

export default function FourchanChainOfThoughtPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="4chan Users Discovered Chain-of-Thought Reasoning Before Google Did"
        description="4chan players in AI Dungeon discovered that asking AI to solve math step-by-step improves answers. This happened over a year before Google published their breakthrough paper. A reminder that innovation comes from everywhere."
        datePublished="2026-04-15"
        author="Kira Nolan"
      />

      {/* Back link */}
      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          4chan Users Discovered Chain-of-Thought Reasoning Before Google Did
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-04-15">April 15, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            5 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/4chan-discovered-chain-of-thought"
        title="4chan Users Discovered Chain-of-Thought Reasoning Before Google Did"
      />
      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          In 2022, 4chan users were playing AI Dungeon. They gave the AI a math problem. The result was wrong. So they tried something simple: they asked it to show its work, solve the problem step-by-step, explain the reasoning as it went. The answer was right.
        </p>

        <p>
          This was not a formal experiment. There was no lab coat. No peer review queue. Just people playing with an AI, discovering by accident that asking it to think out loud made it smarter. More than a year later, in January 2024, Google researchers published a paper called &quot;Chain-of-Thought Prompting Elicits Reasoning in Large Language Models.&quot; They presented the same idea as a breakthrough.
        </p>

        <p>
          Google did not mention 4chan. They did not mention the community discovery that preceded their publication by more than a year. They published it as if it was their insight. Today, chain-of-thought reasoning is foundational to models like Claude and ChatGPT-4o. It is the reason models like OpenAI&apos;s o1 and o3 are so capable. And the first person to discover it was someone on an anonymous image board, not a researcher at a major lab.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">How It Worked</h2>

        <p>
          The mechanics are straightforward. When you ask an AI to solve a problem, it generates an answer all at once. That answer is often wrong because the model has not had time to &quot;reason&quot; through the steps. It is pattern-matching at high speed, and patterns do not always lead to truth.
        </p>

        <p>
          But if you ask the AI to show its work, solve one step at a time, and explain the reasoning before giving the final answer, something changes. The model is forced to generate intermediate steps. Those steps act like anchors. They constrain the final answer. The result: a better answer.
        </p>

        <p>
          This is not magic. It is not even that surprising if you think about how humans solve math problems. We do not jump to the answer. We work through steps. We write things down. We check our work. We use intermediate steps to catch errors. Why would we expect AI to be different?
        </p>

        <p>
          But the AI research community did not make that connection. Not formally. Not until Google published a paper saying so. That paper changed how people talked about the problem. It gave the idea legitimacy. It became a technique. It got built into systems. It became standard.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Timeline Matters</h2>

        <p>
          Let me be clear about the dates because the order is important.
        </p>

        <p>
          In 2022, AI Dungeon was a popular text adventure game powered by GPT-3 and later GPT-3.5. Players asked the AI to continue narratives. Some of those players were curious about the model&apos;s limits. They played with prompting. They discovered that asking the AI to explain its reasoning improved the coherence of its output. They shared findings on forums and Reddit threads. The community knew about this technique.
        </p>

        <p>
          In January 2024, Google published their paper on chain-of-thought prompting. The paper was rigorous. It included experiments and benchmarks. It showed that this simple technique could significantly improve reasoning performance on mathematical and commonsense tasks.
        </p>

        <p>
          The gap: more than a year. The community had this insight. The labs caught up later.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why This Matters</h2>

        <p>
          This is not a gotcha. Google did important work formalizing and testing the idea. The paper generated citations and attention that expanded adoption. That matters. But it is a reminder about where innovation actually lives.
        </p>

        <p>
          AI breakthroughs are not all happening in Google labs. They are not all happening in OpenAI offices or Anthropic research teams. Some are happening because someone on 4chan asked a simple question and paid attention to the answer. Some are happening in Discord servers and hackathons. Some are happening in small teams that nobody has heard of.
        </p>

        <p>
          The labs have resources and rigor. But they do not have monopoly on insight. The labs are slow sometimes. They have bureaucracy. They have incentives that point away from the kind of experimentation that might lead to breakthroughs.
        </p>

        <p>
          A person playing a video game has different incentives. They want the game to work better. They experiment. They discover. They share.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Chain-of-Thought Today</h2>

        <p>
          Fast forward to 2026. Chain-of-thought is not a trick anymore. It is infrastructure. OpenAI built it into o1 and o3. These models spend time reasoning before answering. That is chain-of-thought at scale. Claude uses it. Gemini uses it. Every frontier model uses some version of this idea.
        </p>

        <p>
          The reason o1 and o3 are so capable is because they do what 4chan players discovered in 2022: they reason step-by-step. They show their work. That makes them better at math, code, and reasoning tasks. It is the same insight. It is just built into the model itself instead of being a prompting technique.
        </p>

        <p>
          Models that reason before answering are dramatically better than models that do not. The difference is visible in benchmarks and in practice. We know this because the community discovered it. The labs confirmed it. Everyone adopted it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Broader Lesson</h2>

        <p>
          Here is what this history tells us about AI innovation in 2026.
        </p>

        <p>
          Breakthroughs do not belong to any one organization. The person who discovers something first might be in a research lab. They might be a startup founder. They might be a hobbyist. They might be someone playing a game online.
        </p>

        <p>
          The labs will always have advantages: compute, talent, publication channels, credibility. But ideas come from everywhere. The best outcome is when the labs take ideas from the community, formalize them, test them, and build them into products that everyone can use.
        </p>

        <p>
          That is what happened with chain-of-thought. The community discovered it. The labs validated it. The world got better models. That cycle needs to keep happening.
        </p>

        <p>
          Pay attention to what people on the edges are discovering. They might be ahead of the labs more often than you think.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg p-5 space-y-3 mt-8">
          <p className="text-text-primary font-medium">See chain-of-thought in action on our benchmark pages.</p>
          <p>
            Compare reasoning performance across models on our{' '}
            <Link href="/benchmarks" className="text-accent-primary hover:underline">Benchmarks page</Link>,{' '}
            explore{' '}
            <Link href="/models" className="text-accent-primary hover:underline">current model capabilities</Link>,{' '}
            and dive deeper into AI research at our{' '}
            <Link href="/research" className="text-accent-primary hover:underline">research hub</Link>. Learn{' '}
            <Link href="/what-is-ai" className="text-accent-primary hover:underline">what AI is and how it works</Link>.
          </p>
        </div>

        <p className="text-sm text-text-muted pt-4">
          <span className="text-text-secondary font-medium">About Kira Nolan:</span> Kira writes about AI research, innovation, and the often surprising origins of breakthroughs at TensorFeed. Focus is on the communities and experiments that drive progress forward.
        </p>
      </div>

      {/* Footer links */}
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
