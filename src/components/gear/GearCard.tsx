import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import {
  GearProduct,
  getCategoryMeta,
  getProductLink,
} from '@/lib/gear';

const BADGE_STYLES: Record<string, string> = {
  'editors-pick': 'bg-accent-primary/15 text-accent-primary border-accent-primary/30',
  'best-for-local-llm': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'new': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'experimental': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const BADGE_LABELS: Record<string, string> = {
  'editors-pick': "Editor's Pick",
  'best-for-local-llm': 'Best for Local LLM',
  'new': 'New',
  'experimental': 'Experimental',
};

interface GearCardProps {
  product: GearProduct;
}

export default function GearCard({ product }: GearCardProps) {
  const category = getCategoryMeta(product.category);
  const link = getProductLink(product);
  const hasRealImage =
    product.image &&
    !product.image.startsWith('/gear/') &&
    !product.image.includes('placeholder');
  const isAffiliate = product.affiliate && product.amazonAsin;
  const rel = isAffiliate
    ? 'sponsored nofollow noopener'
    : 'nofollow noopener';
  const ctaLabel = isAffiliate ? 'View on Amazon' : 'Visit product site';

  return (
    <article className="group relative flex flex-col bg-bg-secondary border border-border-primary rounded-lg overflow-hidden hover:border-accent-primary/60 hover:bg-bg-secondary/80 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-accent-primary/40 focus-within:ring-offset-2 focus-within:ring-offset-bg-primary">
      <div
        className="relative h-44 w-full flex items-end p-4"
        style={{
          background: hasRealImage
            ? undefined
            : `linear-gradient(135deg, ${category?.gradientFrom ?? '#1e3a8a'} 0%, ${category?.gradientTo ?? '#0c0a3e'} 100%)`,
        }}
      >
        {hasRealImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {!hasRealImage && (
          <div className="relative z-10 text-white/90">
            <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
              {product.manufacturer}
            </div>
            <div className="text-lg font-semibold leading-tight drop-shadow-sm">
              {product.name}
            </div>
          </div>
        )}
        {product.badges && product.badges.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end max-w-[60%]">
            {product.badges.map(badge => (
              <span
                key={badge}
                className={`text-[10px] uppercase tracking-wider font-medium px-2 py-1 rounded border ${BADGE_STYLES[badge] ?? ''}`}
              >
                {BADGE_LABELS[badge] ?? badge}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col p-5 gap-3">
        {hasRealImage && (
          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted mb-1">
              {product.manufacturer}
            </div>
            <h3 className="text-lg font-semibold text-text-primary leading-tight group-hover:text-accent-primary transition-colors">
              <a
                href={link}
                target="_blank"
                rel={rel}
                className="outline-none after:absolute after:inset-0 after:content-[''] after:z-10"
                aria-label={`${ctaLabel}: ${product.name}`}
              >
                {product.name}
              </a>
            </h3>
          </div>
        )}
        {!hasRealImage && (
          <a
            href={link}
            target="_blank"
            rel={rel}
            aria-label={`${ctaLabel}: ${product.name}`}
            className="absolute inset-0 z-10 outline-none focus-visible:ring-0"
          >
            <span className="sr-only">{ctaLabel}: {product.name}</span>
          </a>
        )}

        <p className="text-sm text-text-secondary leading-relaxed">
          {product.blurb}
        </p>

        {product.specs.length > 0 && (
          <ul className="text-sm text-text-secondary space-y-1 mt-1">
            {product.specs.slice(0, 5).map((spec, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent-primary mt-0.5">·</span>
                <span>{spec}</span>
              </li>
            ))}
          </ul>
        )}

        {product.aiUseCase && (
          <div className="text-xs text-text-muted bg-bg-primary/50 border border-border-primary/40 rounded px-3 py-2 mt-1">
            <span className="text-accent-primary font-medium">AI use:</span>{' '}
            {product.aiUseCase}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-auto pt-2">
          <div className="text-base font-mono font-semibold text-text-primary">
            {product.priceRange}
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-primary group-hover:text-accent-cyan transition-colors"
            aria-hidden="true"
          >
            {ctaLabel}
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </div>

        {product.tags.length > 0 && (
          <div className="relative z-20 flex flex-wrap gap-1.5 pt-2 border-t border-border-primary/40">
            {product.tags.map(tag => (
              <Link
                key={tag}
                href={`/gear/${product.category}#tag-${tag}`}
                className="text-[11px] text-text-muted hover:text-text-secondary bg-bg-primary/50 px-2 py-0.5 rounded transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
