import Link from 'next/link';

interface ExploreCardData {
  href: string;
  kind: string;
  title: string;
  desc: string;
  meta: string;
  color: string;
  Vis: () => React.JSX.Element;
}

function ModelsVis() {
  return (
    <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
      <rect x="20" y="20" width="60" height="60" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <line x1={12} y1={30 + i * 12} x2={20} y2={30 + i * 12} stroke="currentColor" strokeWidth="1" />
          <line x1={80} y1={30 + i * 12} x2={88} y2={30 + i * 12} stroke="currentColor" strokeWidth="1" />
          <line x1={30 + i * 12} y1={12} x2={30 + i * 12} y2={20} stroke="currentColor" strokeWidth="1" />
          <line x1={30 + i * 12} y1={80} x2={30 + i * 12} y2={88} stroke="currentColor" strokeWidth="1" />
        </g>
      ))}
      <circle cx="50" cy="50" r="6" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function AgentsVis() {
  return (
    <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
      {[
        [20, 30],
        [80, 30],
        [50, 55],
        [25, 80],
        [75, 80],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="currentColor" />
      ))}
      <line x1="20" y1="30" x2="50" y2="55" stroke="currentColor" strokeWidth="1" />
      <line x1="80" y1="30" x2="50" y2="55" stroke="currentColor" strokeWidth="1" />
      <line x1="50" y1="55" x2="25" y2="80" stroke="currentColor" strokeWidth="1" />
      <line x1="50" y1="55" x2="75" y2="80" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function ResearchVis() {
  return (
    <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
      <rect x="22" y="18" width="56" height="68" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {[28, 36, 44, 56, 64, 72].map((y, i) => (
        <line
          key={i}
          x1="30"
          y1={y}
          x2={i % 2 === 0 ? 70 : 60}
          y2={y}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.7"
        />
      ))}
    </svg>
  );
}

function StatusVis() {
  return (
    <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
      <path d="M10 60 L25 55 L35 65 L48 25 L60 72 L72 50 L90 55" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function LiveVis() {
  return (
    <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
      {[15, 30, 45, 60, 75].map((x, i) => (
        <rect
          key={i}
          x={x}
          y={30 + (i % 2) * 15}
          width="8"
          height={40 - (i % 2) * 15}
          fill="currentColor"
          opacity={0.3 + i * 0.14}
        />
      ))}
    </svg>
  );
}

function PricingVis() {
  return (
    <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
      <text x="25" y="58" fontFamily="monospace" fontSize="24" fontWeight="700" fill="currentColor">$</text>
      <path d="M50 40 L85 40 M50 55 L85 55 M50 70 L75 70" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const CARDS: ExploreCardData[] = [
  {
    href: '/models',
    kind: 'catalog',
    title: 'Models Hub',
    desc: 'Every major AI model with pricing, context windows, and benchmark scores.',
    meta: '284 models tracked',
    color: 'var(--accent-primary)',
    Vis: ModelsVis,
  },
  {
    href: '/agents',
    kind: 'directory',
    title: 'Agent Directory',
    desc: 'Structured catalog of AI agents, crawlers, and their capabilities.',
    meta: '48 agents indexed',
    color: 'var(--accent-secondary)',
    Vis: AgentsVis,
  },
  {
    href: '/research',
    kind: 'archive',
    title: 'Research Papers',
    desc: 'Curated arXiv and conference papers on frontier AI research.',
    meta: '1.2k papers, weekly',
    color: 'var(--src-arxiv)',
    Vis: ResearchVis,
  },
  {
    href: '/status',
    kind: 'monitor',
    title: 'Status Dashboard',
    desc: 'Live uptime and latency for every major API, updated every 2 minutes.',
    meta: '10 services monitored',
    color: 'var(--accent-green)',
    Vis: StatusVis,
  },
  {
    href: '/live',
    kind: 'data',
    title: 'Live Data',
    desc: 'Real-time JSON feed of everything happening across the AI industry.',
    meta: 'JSON, RSS, llms.txt, MCP',
    color: 'var(--accent-cyan)',
    Vis: LiveVis,
  },
  {
    href: '/tools/cost-calculator',
    kind: 'reference',
    title: 'API Pricing',
    desc: 'Side-by-side pricing comparison across every provider and tier.',
    meta: 'Updated hourly',
    color: 'var(--accent-amber)',
    Vis: PricingVis,
  },
];

export default function ExploreGrid() {
  return (
    <div
      role="list"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden"
      style={{
        gap: 1,
        background: 'var(--border)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
    >
      {CARDS.map((c) => {
        const Vis = c.Vis;
        return (
          <Link
            key={c.title}
            href={c.href}
            role="listitem"
            className="tf-explore-card flex flex-col justify-between"
            style={
              {
                padding: '26px 26px 24px',
                background: 'var(--bg-secondary)',
                minHeight: 180,
                ['--explore-color' as string]: c.color,
              } as React.CSSProperties
            }
          >
            <div>
              <div className="flex items-center" style={{ gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    display: 'grid',
                    placeItems: 'center',
                    color: c.color,
                  }}
                >
                  <Vis />
                </div>
                <div
                  className="font-mono uppercase"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {c.kind}
                </div>
              </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 10,
                  letterSpacing: '-0.015em',
                }}
              >
                {c.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: 16,
                }}
              >
                {c.desc}
              </p>
            </div>
            <div
              className="flex items-center justify-between font-mono"
              style={{ fontSize: 11, color: 'var(--text-muted)' }}
            >
              <span>{c.meta}</span>
              <span className="tf-explore-arrow">&rarr; Explore</span>
            </div>
            <div className="tf-explore-vis">
              <Vis />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
