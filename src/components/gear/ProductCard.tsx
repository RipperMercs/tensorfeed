import Link from 'next/link';
import { Product } from '@/data/gear/types';
import { getCategory } from '@/data/gear/categories';
import AffiliateLink from './AffiliateLink';
import CtaButton from './CtaButton';
import Badge from './Badge';
import Placeholder from './Placeholder';

interface Props {
  product: Product;
}

/**
 * Product card. Strictly NO text overlaid on photographs: media area is
 * isolated, descriptive copy lives below the image, badges and reticle are
 * the only things that sit on the image (each with backdrop-blur for
 * legibility).
 *
 * Accessibility: the title is the primary link (wraps the product name h3
 * via AffiliateLink), the CTA is its own link, and tag chips are separate
 * links. The whole card is NOT a single stretched link, so keyboard users
 * can tab between title, CTA, and tags without skipping any.
 */
export default function ProductCard({ product }: Props) {
  const cat = getCategory(product.category);
  const categoryDisplay = cat?.name ?? product.category;
  const hasImage = Boolean(product.image && product.image.length > 0);
  const altText =
    product.imageAlt ??
    `${product.brand} ${product.name}, product photograph`;

  return (
    <article
      className="product-card"
      style={{ ['--cat-h' as string]: String(product.hue) }}
      aria-labelledby={`prod-${product.id}`}
    >
      <div
        className="pc-media pc-media-tinted"
        style={{ ['--cat-h' as string]: String(product.hue) }}
      >
        {hasImage ? (
          <div className="ph-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={altText}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <Placeholder hue={product.hue} kind={product.brand} />
        )}
        <div className="badge-tray" role="list" aria-label="Product flags">
          {product.pin && <Badge kind="pin" label={product.pin} />}
          {product.badges.map(b => (
            <Badge key={b} kind={b} />
          ))}
        </div>
        <div className="reticle" aria-hidden="true">
          <span className="corner" />
          {product.brand.toUpperCase()}
        </div>
      </div>

      <div className="pc-body">
        <div className="pc-brand">
          <span>{product.brand.toUpperCase()}</span>
          <span className="dash" />
          <span style={{ color: `oklch(0.7 0.15 ${product.hue})` }}>
            {categoryDisplay.toUpperCase()}
          </span>
        </div>

        <h3 id={`prod-${product.id}`} className="pc-title">
          <AffiliateLink
            cta={product.cta}
            ariaLabel={`${product.name} on ${product.cta.kind === 'amazon' ? 'Amazon' : product.brand}`}
          >
            {product.name}
          </AffiliateLink>
        </h3>

        <p className="pc-blurb">{product.blurb}</p>

        {product.specs.length > 0 && (
          <ul className="pc-specs">
            {product.specs.slice(0, 5).map((spec, i) => (
              <li key={i}>{spec}</li>
            ))}
          </ul>
        )}

        {product.aiUse && (
          <div className="ai-use">
            <span className="ai-tag">AI&nbsp;USE</span>
            <span>{product.aiUse}</span>
          </div>
        )}

        <div className="pc-foot">
          <div className="pc-price">
            <div className="pp">{product.price}</div>
            <div className="pp-note">{product.priceNote}</div>
          </div>
          <CtaButton cta={product.cta} />
        </div>

        {product.tags.length > 0 && (
          <div className="pc-tags">
            {product.tags.map(t => (
              <Link key={t} href={`/gear?tag=${t}`} className="pc-tag">
                #{t}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
