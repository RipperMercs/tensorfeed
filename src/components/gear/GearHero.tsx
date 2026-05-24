interface Stats {
  products: number;
  categories: number;
  lastReview: string;
  refresh: string;
}

interface Props {
  stats: Stats;
  title?: string;
  lede?: string;
}

export default function GearHero({
  stats,
  title = 'AI Gear',
  lede = 'Hand-curated AI-relevant consumer hardware. Laptops capable of running local language models, discrete GPUs for self-built rigs, AR glasses with AI overlays, robotics, edge accelerators, and the occasional experimental device worth knowing about.',
}: Props) {
  return (
    <section className="gear-hero" aria-label="AI Gear overview">
      <div className="container">
        <div className="gear-hero-inner">
          <div>
            <div className="gear-eyebrow">
              <span className="bar" aria-hidden="true" />
              <span>TENSORFEED // PRODUCT HUB</span>
              <span className="tag">CURATED</span>
            </div>
            <h1 className="gear-title" aria-label={title}>
              {title}
            </h1>
            <p className="gear-lede">{lede}</p>
          </div>
          <div className="gear-stats" role="group" aria-label="Hub stats">
            <div className="gear-stat">
              <div className="k">Products</div>
              <div className="v">{stats.products}</div>
            </div>
            <div className="gear-stat">
              <div className="k">Categories</div>
              <div className="v">{stats.categories}</div>
            </div>
            <div className="gear-stat">
              <div className="k">Last Review</div>
              <div className="v" style={{ fontSize: 15 }}>
                {stats.lastReview}
              </div>
            </div>
            <div className="gear-stat">
              <div className="k">Refresh</div>
              <div className="v" style={{ fontSize: 15 }}>
                <span className="pulse" aria-hidden="true" />
                {stats.refresh.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
