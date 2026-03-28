import { ExternalLink } from 'lucide-react';
import { NewsArticle } from '@/lib/types';
import { timeAgo } from '@/lib/api';

interface NewsCardProps {
  article: NewsArticle;
}

export default function NewsCard({ article }: NewsCardProps) {
  return (
    <article className="bg-bg-secondary rounded-lg border border-border p-5 hover:shadow-glow hover:border-accent-primary transition-all">
      {/* Source row */}
      <div className="flex items-center gap-2 mb-3">
        {article.sourceIcon && (
          <span className="text-lg leading-none">{article.sourceIcon}</span>
        )}
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
        <p className="text-sm text-text-muted mb-4 line-clamp-3">
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
