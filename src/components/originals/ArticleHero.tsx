import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';

const TF_BRAND_MARK = '/tensorfeed-icon.png';

/**
 * Discriminated-union hero. Two modes:
 *
 *   1. `photo`: real image asset under public/originals/{slug}/. Use
 *      when a real photo is available (preferred per the article-images
 *      policy).
 *
 *   2. `graphic`: gradient + Lucide icon + eyebrow tag. Used when no
 *      photo is available. Forward-compatible with photo mode: when
 *      a photo lands later, swap mode to `photo` and the rest of the
 *      page is unchanged. The article's full title still renders in
 *      the header below; the hero is decoration, not content
 *      duplication.
 */
type ArticleHeroProps =
  | {
      mode?: 'photo';
      src: string;
      alt: string;
      caption?: string;
      credit?: string;
      width?: number;
      height?: number;
      priority?: boolean;
    }
  | {
      mode: 'graphic';
      icon: LucideIcon;
      gradientFrom: string;
      gradientTo: string;
      eyebrow?: string;
      caption?: string;
      credit?: string;
    };

export default function ArticleHero(props: ArticleHeroProps) {
  if (props.mode === 'graphic') {
    const { icon: Icon, gradientFrom, gradientTo, eyebrow, caption, credit } = props;
    return (
      <figure className="mb-10 -mx-4 sm:mx-0">
        <div
          className="relative aspect-[16/9] overflow-hidden rounded-none sm:rounded-lg border-y sm:border border-border"
          style={{
            background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
          }}
        >
          {/* Subtle radial highlight for depth */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 72% 28%, rgba(255,255,255,0.12), transparent 55%)',
            }}
            aria-hidden="true"
          />

          {/* Background icon, large, semi-transparent, off-center */}
          <div
            className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <Icon
              className="w-44 h-44 sm:w-64 sm:h-64"
              style={{ color: 'rgba(255,255,255,0.18)' }}
              strokeWidth={1.4}
            />
          </div>

          {/* Eyebrow tag, top-left, mono uppercase, very small */}
          {eyebrow && (
            <div
              className="absolute top-5 left-5 sm:top-8 sm:left-10 font-mono uppercase"
              style={{
                fontSize: 11,
                letterSpacing: '0.20em',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
              }}
            >
              {eyebrow}
            </div>
          )}

          {/* Brand mark, bottom-left, low opacity, official identity
              without being dominant. Uses the actual TensorFeed icon
              asset so the hero reads as a published-article cover
              rather than a generic placeholder. */}
          <div
            className="absolute bottom-5 left-5 sm:bottom-8 sm:left-10 flex items-center gap-2"
            style={{ opacity: 0.6 }}
            aria-hidden="true"
          >
            <Image
              src={TF_BRAND_MARK}
              alt=""
              width={28}
              height={28}
              className="block"
            />
            <span
              className="font-mono"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.16em',
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              tensorfeed.ai
            </span>
          </div>
        </div>
        {(caption || credit) && (
          <figcaption className="mt-2 px-4 sm:px-0 text-xs text-text-muted leading-relaxed">
            {caption && <span className="text-text-secondary">{caption}</span>}
            {caption && credit && <span className="mx-1.5 text-text-muted">/</span>}
            {credit && <span className="font-mono uppercase tracking-wider">{credit}</span>}
          </figcaption>
        )}
      </figure>
    );
  }

  // Photo mode (default)
  const { src, alt, caption, credit, width = 1200, height = 675, priority = true } = props;
  return (
    <figure className="mb-10 -mx-4 sm:mx-0">
      <div className="relative overflow-hidden rounded-none sm:rounded-lg border-y sm:border border-border bg-bg-secondary">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          className="w-full h-auto"
        />
      </div>
      {(caption || credit) && (
        <figcaption className="mt-2 px-4 sm:px-0 text-xs text-text-muted leading-relaxed">
          {caption && <span className="text-text-secondary">{caption}</span>}
          {caption && credit && <span className="mx-1.5 text-text-muted">/</span>}
          {credit && <span className="font-mono uppercase tracking-wider">{credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
