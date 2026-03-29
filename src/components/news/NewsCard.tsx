import { ExternalLink } from 'lucide-react';
import { NewsArticle } from '@/lib/types';
import { timeAgo } from '@/lib/api';

const SOURCE_COLORS: Record<string, string> = {
  'Google AI Blog': 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  'Hugging Face Blog': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  'TechCrunch AI': 'bg-green-500/20 text-green-700 dark:text-green-400',
  'The Verge AI': 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  'Ars Technica': 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  'VentureBeat AI': 'bg-teal-500/20 text-teal-700 dark:text-teal-400',
  'MIT Technology Review': 'bg-red-500/20 text-red-700 dark:text-red-400',
  'NVIDIA AI Blog': 'bg-lime-500/20 text-lime-700 dark:text-lime-400',
  'arXiv cs.AI': 'bg-rose-500/20 text-rose-700 dark:text-rose-400',
  'Hacker News AI': 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  'WIRED AI': 'bg-gray-400/20 text-gray-600 dark:text-gray-300',
  'ZDNet AI': 'bg-red-500/20 text-red-700 dark:text-red-400',
};

const SOURCE_BORDER_HEX: Record<string, string> = {
  'Google AI Blog': '#3b82f6',
  'Hugging Face Blog': '#eab308',
  'TechCrunch AI': '#22c55e',
  'The Verge AI': '#a855f7',
  'Ars Technica': '#f97316',
  'VentureBeat AI': '#14b8a6',
  'MIT Technology Review': '#ef4444',
  'NVIDIA AI Blog': '#84cc16',
  'arXiv cs.AI': '#f43f5e',
  'Hacker News AI': '#fb923c',
  'WIRED AI': '#9ca3af',
  'ZDNet AI': '#f87171',
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

function cleanSnippet(snippet: string | undefined, source: string): string | null {
  if (!snippet) return null;
  // Strip raw HN metadata (Article URL, Comments URL, Points, etc.)
  if (/^(Article URL:|Comments URL:|Points:)/m.test(snippet)) return null;
  if (snippet.startsWith('Hacker News discussion:')) return null;
  const trimmed = snippet.trim();
  if (!trimmed || trimmed.length < 20) return null;
  return trimmed;
}

export default function NewsCard({ article, featured = false }: NewsCardProps & { featured?: boolean }) {
  const colorClass = SOURCE_COLORS[article.source] || 'bg-accent-primary/20 text-accent-primary';
  const borderHex = SOURCE_BORDER_HEX[article.source] || '#6366f1';
  const initials = getSourceInitials(article.source);
  const snippet = cleanSnippet(article.snippet, article.source);

  return (
    <article
      className="bg-bg-secondary rounded-lg border border-border p-5 hover:shadow-glow hover:border-accent-primary transition-all"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderHex }}
    >
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
          className={`font-semibold text-accent-cyan hover:underline ${featured ? 'text-xl leading-snug' : 'text-lg'}`}
        >
          {article.title}
        </a>
      </h3>

      {/* Snippet */}
      {snippet && (
        <p className={`text-sm text-text-muted mb-4 ${featured ? 'line-clamp-3' : 'line-clamp-2'}`}>
          {snippet}
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
