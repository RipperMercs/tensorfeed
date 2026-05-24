import { Spotlight as SpotlightData } from '@/data/gear/types';
import { getCategory } from '@/data/gear/categories';
import CtaButton from './CtaButton';
import Placeholder from './Placeholder';

interface Props {
  spotlight: SpotlightData;
}

export default function Spotlight({ spotlight }: Props) {
  const cat = getCategory(spotlight.category);
  const categoryDisplay = cat?.name ?? spotlight.category;
  const hasImage = Boolean(spotlight.image && spotlight.image.length > 0);
  const altText =
    spotlight.imageAlt ??
    `${spotlight.brand} ${spotlight.name}, product photograph`;

  return (
    <article
      className="spotlight"
      style={{ ['--cat-h' as string]: String(spotlight.hue) }}
      aria-labelledby="spotlight-title"
    >
      <div className="spotlight-media pc-media-tinted">
        {hasImage ? (
          <div className="ph-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spotlight.image}
              alt={altText}
              decoding="async"
              fetchPriority="high"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <Placeholder hue={spotlight.hue} kind={spotlight.brand} />
        )}
        <div className="spotlight-flag" aria-hidden="true">
          <span className="star" />
          {spotlight.flag}
        </div>
        <div
          className="reticle"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 16,
            bottom: 14,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'rgba(226,232,240,0.5)',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 2,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderLeft: '1px solid var(--accent-cyan)',
              borderBottom: '1px solid var(--accent-cyan)',
              opacity: 0.7,
            }}
          />
          {spotlight.brand} &middot; SPOTLIGHT
        </div>
      </div>
      <div className="spotlight-body">
        <div className="brand-line">
          {spotlight.brand}
          <span className="dot" /> {categoryDisplay.toUpperCase()}
        </div>
        <h3 id="spotlight-title">{spotlight.name}</h3>
        <p className="lede">{spotlight.lede}</p>
        <div className="spec-table">
          {spotlight.specs.map(([k, v], i) => (
            <div key={i} className="spec-row-pair">
              <div className="sp-k">{k}</div>
              <div className="sp-v">{v}</div>
            </div>
          ))}
        </div>
        <div className="spotlight-foot">
          <div className="spotlight-price">
            <div className="price">{spotlight.price}</div>
            <div className="note">{spotlight.priceNote}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {spotlight.secondaryCta && (
              <CtaButton cta={spotlight.secondaryCta} variant="secondary" />
            )}
            <CtaButton cta={spotlight.cta} variant="primary" />
          </div>
        </div>
      </div>
    </article>
  );
}
