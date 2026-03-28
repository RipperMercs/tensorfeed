import { ExternalLink } from 'lucide-react';
import { NewsArticle } from '@/lib/types';
import { timeAgo } from '@/lib/api';

const SOURCE_COLORS: Record<string, string> = {
  'Google AI Blog': 'bg-blue-500/20 text-blue-400',
  'Hugging Face Blog': 'bg-yellow-500/20 text-yellow-400',
  'TechCrunch AI': 'bg-green-500/20 text-green-400',
  'The Verge AI': 'bg-purple-500/20 text-purple-400',
  'Ars Technica': 'bg-orange-500/20 text-orange-400',
  'VentureBeat AI': 'bg-teal-500/20 text-teal-400',
  'MIT Technology Review': 'bg-red-500/20 text-red-400',
  'NVIDIA AI Blog': 'bg-lime-500/20 text-lime-400',
  'arXiv cs.AI': 'bg-rose-500/20 text-rose-400',
  'Hacker News AI': 'bg-orange-500/20 text-orange-400',
  'WIRED AI': 'bg-gray-400/20 text-gray-300',
  'ZDNet AI': 'bg-red-500/20 text-red-400',
};

function getSourceInitials(name: string): string {
  // Short abbreviations for known sources
  const abbrevs: Record<string, string> = {
    'Google AI Blog': 'G',
    'Hugging Face Blog': 'HF',
    'TechCrunch AI': 'TC',
    'The Verge AI': 'V',
    'Ars Technica': 'Ars',
    'VentureBeat AI': 'VB',
    'MIT Technology Review': 'MIT',
    'NVIDIA AI Blog': 'NV',
    'arXiv cs.AI': 'arXiv',
    'Hacker News AI': 'HN',
    'WIRED AI': 'W',
    'ZDNet AI': 'ZD',
  };
  return abbrevs[name] || name.charAt(0).toUpperCase();
}

interface NewsCardProps {
  article: NewsArticle;
}

export default function NewsCard({ article }: NewsCardProps) {
  const colorClass = SOURCE_COLORS[article.source] || 'bg-accent-primary/20 text-accent-primary';
  const initials = getSourceInitials(article.source);

  return (
    <article className="bg-bg-secondary rounded-lg border border-border p-5 hover:shadow-glow hover:border-accent-primary transition-all">
      {/* Source row */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold shrink-0 ${colorClass}`}>
          {initials}
        </span>
        <span className="text-sm font-medium text-text-secondary">
          {article.source}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-semibold text-accent-cyan hover:underline"
        >
          {article.title}
        </a>
      </h3>

      {/* Snippet */}
      {article.snippet && (
        <p className="text-sm text-text-muted mb-4 line-clamp-2">
          {article.snippet}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-text-muted">
        <div className="flex items-center gap-2 flex-wrap">
          {article.categories.map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-bg-tertiary px-2.5 py-0.5 text-text-secondary"
            >
              {cat}
            </span>
          ))}
          <span>{timeAgo(article.publishedAt)}</span>
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-text-muted hover:text-text-secondary transition-colors"
        >
          {article.sourceDomain}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </article>
  );
}
