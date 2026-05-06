import Image from 'next/image';

interface ArticleImageProps {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  width?: number;
  height?: number;
  align?: 'wide' | 'center';
}

export default function ArticleImage({
  src,
  alt,
  caption,
  credit,
  width = 1200,
  height = 675,
  align = 'center',
}: ArticleImageProps) {
  const wrapClass =
    align === 'wide'
      ? 'my-8 -mx-4 sm:mx-0'
      : 'my-8';

  return (
    <figure className={wrapClass}>
      <div className="relative overflow-hidden rounded-none sm:rounded-lg border-y sm:border border-border bg-bg-secondary">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
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
