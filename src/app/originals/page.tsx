import { Metadata } from 'next';
import { PenTool, Clock, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Originals',
};

const ARTICLES = [
  {
    title: 'Why We Built TensorFeed.ai',
    date: 'Mar 28, 2026',
    description:
      'Every morning I found myself opening a dozen tabs to check AI news, model releases, and API status pages. TensorFeed started as a personal dashboard and grew into something we think the whole community can use.',
    isFuture: false,
  },
  {
    title: 'The State of AI APIs in 2026',
    date: 'Apr 1, 2026',
    description:
      'The API landscape has changed dramatically in the past year, with new pricing models, streaming protocols, and agent-native endpoints. We break down what matters for developers building production applications today.',
    isFuture: true,
  },
  {
    title: 'Claude vs GPT vs Gemini: An Honest Comparison',
    date: 'Apr 5, 2026',
    description:
      'Benchmarks only tell part of the story, so we ran all three models through real-world tasks spanning coding, writing, and analysis. Here is what we found when we stopped relying on leaderboards and started testing ourselves.',
    isFuture: true,
  },
  {
    title: 'Building for AI Agents: What Developers Need to Know',
    date: 'Apr 10, 2026',
    description:
      'AI agents are moving from demos to production, and the infrastructure they need looks very different from traditional web apps. We cover the patterns, pitfalls, and practical advice we have gathered from building agent-first tooling.',
    isFuture: true,
  },
];

export default function OriginalsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <PenTool className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">TensorFeed Originals</h1>
        </div>
        <p className="text-text-secondary text-lg">
          In-depth analysis and perspectives on the AI landscape
        </p>
      </div>

      {/* Articles */}
      <div className="grid gap-6">
        {ARTICLES.map((article, i) => (
          <a
            key={i}
            href="#"
            className="group block bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent-primary transition-colors"
          >
            <div className="flex items-start gap-4">
              <PenTool className="w-5 h-5 text-accent-primary shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                    {article.title}
                  </h2>
                  {article.isFuture && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30">
                      Coming Soon
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Evan Marcus</span>
                  <span>&middot;</span>
                  <span>{article.date}</span>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-3">
                  {article.description}
                </p>
                <span className="inline-flex items-center gap-1 text-sm text-accent-primary font-medium group-hover:gap-2 transition-all">
                  Read More
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
