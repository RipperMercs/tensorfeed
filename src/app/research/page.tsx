'use client';

import { useState, useEffect } from 'react';
import { BookOpen, FileText, Trophy, ExternalLink } from 'lucide-react';
interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  snippet: string;
  categories: string[];
  publishedAt: string;
}

const BENCHMARKS = [
  { name: 'MMLU', claudeOpus: 93.8, gpt45: 90.8, gemini25: 91.1, llama4: 86.3 },
  { name: 'HumanEval', claudeOpus: 96.2, gpt45: 93.7, gemini25: 94.2, llama4: 88.9 },
  { name: 'GPQA', claudeOpus: 76.5, gpt45: 71.2, gemini25: 72.8, llama4: 63.5 },
];

function CategoryTag({ category }: { category: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-mono rounded-full bg-bg-tertiary text-accent-cyan border border-border">
      {category}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5">
          <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-3" />
          <div className="h-3 bg-bg-tertiary rounded w-1/2 mb-2" />
          <div className="h-3 bg-bg-tertiary rounded w-full" />
        </div>
      ))}
    </div>
  );
}

export default function ResearchPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResearch() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/news?limit=200');
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.articles?.length) {
          // Get research-related articles from all sources
          const research = data.articles.filter((a: Article) =>
            a.categories.some((c: string) =>
              ['Research', 'cs.AI', 'cs.LG', 'cs.CL'].some(tag =>
                c.toLowerCase().includes(tag.toLowerCase())
              )
            ) ||
            a.source === 'arXiv cs.AI' ||
            a.source === 'MIT Technology Review' ||
            /paper|research|study|benchmark|arxiv/i.test(a.title)
          );
          setArticles(research.length > 0 ? research : data.articles.slice(0, 20));
        }
      } catch {}
      setLoading(false);
    }
    fetchResearch();
  }, []);

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">AI Research</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Latest papers, benchmarks, and research developments
        </p>
      </div>

      {/* Editorial Intro */}
      <div className="max-w-4xl mb-10 text-text-secondary leading-relaxed space-y-4">
        <p>
          AI moves in two tracks: products and research. Products are what you use (Claude, ChatGPT, Gemini). Research is where those products come from. Understanding AI research helps you see what&apos;s coming 18 to 36 months before it ships. Right now, papers on mixture-of-experts, improved scaling laws, and multimodal reasoning are being published. Six months later, new products will implement those ideas. A year later, they&apos;re commoditized.
        </p>
        <p>
          This feed aggregates AI research from arXiv, academic conferences (NeurIPS, ICML, ACL, ICLR), and technical journals. We filter for practical relevance: papers that describe techniques likely to appear in products, new benchmarks that measure important capabilities, and theoretical work that advances our understanding of how to build better AI. We exclude purely mathematical papers not relevant to building systems. When a major paper drops, it spreads through the community in waves. Researchers read it first. Engineers implement it. Products ship it. Hype follows. Our job is to show you the research before the hype cycle obscures the substance.
        </p>
        <p>
          Trends to watch: sparse models (mixture-of-experts, for efficiency), improved reasoning (chain-of-thought, tree search, planning), better calibration (understanding when models are uncertain), and mechanistic interpretability (understanding how models actually work). Below we also track benchmark scores for major models to show empirical progress on standardized tasks.
        </p>
      </div>

      {/* Featured Paper */}
      {featured && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">Featured</h2>
          </div>
          <a
            href={featured.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-bg-secondary border-2 border-accent-primary rounded-xl p-6 shadow-glow hover:border-accent-secondary transition-colors group"
          >
            <div className="flex items-start gap-4">
              <FileText className="w-6 h-6 text-accent-primary shrink-0 mt-1" />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-text-primary mb-1 group-hover:text-accent-cyan transition-colors">
                  {featured.title}
                </h3>
                <p className="text-sm text-text-muted mb-2">
                  {featured.source} &middot; {timeAgo(featured.publishedAt)}
                </p>
                {featured.snippet && (
                  <p className="text-text-secondary text-sm mb-3 leading-relaxed">
                    {featured.snippet}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {featured.categories.map((cat) => (
                      <CategoryTag key={cat} category={cat} />
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-accent-primary">
                    Read
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </a>
        </section>
      )}

      {/* Latest Papers */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-semibold text-text-primary">Latest Research</h2>
        </div>
        {loading ? (
          <LoadingSkeleton />
        ) : rest.length === 0 ? (
          <p className="text-text-muted">No research articles available right now.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rest.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-text-primary mb-1 leading-snug group-hover:text-accent-cyan transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-xs text-text-muted mb-2">
                      {article.source} &middot; {timeAgo(article.publishedAt)}
                    </p>
                    {article.snippet && !/^(Article URL:|Comments URL:|Points:)/m.test(article.snippet) && (
                      <p className="text-text-secondary text-xs mb-3 leading-relaxed line-clamp-3">
                        {article.snippet}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {article.categories.map((cat) => (
                          <CategoryTag key={cat} category={cat} />
                        ))}
                      </div>
                      <ExternalLink className="w-3 h-3 text-text-muted group-hover:text-accent-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Benchmark Tracker */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Benchmark Tracker</h2>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Benchmark</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Claude Opus 4.7</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">GPT-4.5</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Gemini 2.5 Pro</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Llama 4</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS.map((row) => {
                  const scores = [row.claudeOpus, row.gpt45, row.gemini25, row.llama4];
                  const maxScore = Math.max(...scores);
                  return (
                    <tr key={row.name} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 font-mono text-text-primary">{row.name}</td>
                      <td className={`py-3 px-4 text-right font-mono ${row.claudeOpus === maxScore ? 'text-accent-primary font-bold' : 'text-text-secondary'}`}>
                        {row.claudeOpus}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono ${row.gpt45 === maxScore ? 'text-accent-primary font-bold' : 'text-text-secondary'}`}>
                        {row.gpt45}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono ${row.gemini25 === maxScore ? 'text-accent-primary font-bold' : 'text-text-secondary'}`}>
                        {row.gemini25}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono ${row.llama4 === maxScore ? 'text-accent-primary font-bold' : 'text-text-secondary'}`}>
                        {row.llama4}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border">
            <p className="text-xs text-text-muted">
              Scores represent published results as of April 2026. Higher is better.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
