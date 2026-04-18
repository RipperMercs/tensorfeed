import Link from 'next/link';

interface SourceEntry {
  name: string;
  color: string;
}

const SOURCES: SourceEntry[] = [
  { name: 'Anthropic', color: 'var(--src-anthropic)' },
  { name: 'OpenAI', color: 'var(--src-openai)' },
  { name: 'Google', color: 'var(--src-google)' },
  { name: 'Meta', color: 'var(--src-meta)' },
  { name: 'HuggingFace', color: 'var(--src-huggingface)' },
  { name: 'NVIDIA', color: 'var(--src-nvidia)' },
  { name: 'TechCrunch', color: 'var(--src-techcrunch)' },
  { name: 'The Verge', color: 'var(--src-theverge)' },
  { name: 'Ars Technica', color: 'var(--src-arstechnica)' },
  { name: 'Hacker News', color: 'var(--src-hackernews)' },
  { name: 'arXiv', color: 'var(--src-arxiv)' },
  { name: 'VentureBeat', color: 'var(--accent-primary)' },
  { name: 'ZDNet', color: 'var(--accent-secondary)' },
  { name: 'MIT Tech Review', color: 'var(--accent-cyan)' },
  { name: 'Stratechery', color: 'var(--accent-amber)' },
];

interface AgentPill {
  label: string;
  href: string;
  external?: boolean;
}

const AGENT_PILLS: AgentPill[] = [
  { label: 'JSON Feed', href: '/feed.json', external: true },
  { label: 'RSS', href: '/feed.xml', external: true },
  { label: 'llms.txt', href: '/llms.txt', external: true },
  { label: 'MCP', href: '/developers' },
  { label: 'REST API', href: '/developers' },
];

const FOOTER_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Editorial', href: '/about' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Contact', href: '/contact' },
  { label: 'Sitemap', href: '/sitemap.xml', external: true },
];

export default function SourceLogosFooter() {
  return (
    <footer
      className="border-t border-border"
      style={{ background: 'var(--bg-secondary)', padding: '40px 0 24px', marginTop: 40 }}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex flex-wrap justify-between"
          style={{ gap: 32, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}
        >
          <div style={{ flex: 1, minWidth: 300 }}>
            <div
              className="font-mono uppercase"
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.14em',
                color: 'var(--text-muted)',
                marginBottom: 14,
              }}
            >
              Aggregating signal from 15+ sources
            </div>
            <div className="flex flex-wrap items-center" style={{ gap: '10px 20px' }}>
              {SOURCES.map((s) => (
                <span
                  key={s.name}
                  className="tf-source-chip inline-flex items-center font-mono"
                  style={
                    {
                      gap: 6,
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      filter: 'grayscale(1)',
                      opacity: 0.7,
                      transition: 'all 0.15s',
                      ['--src-color' as string]: s.color,
                    } as React.CSSProperties
                  }
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: s.color,
                    }}
                  />
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          <div style={{ flex: '0 0 auto', maxWidth: 360 }}>
            <div
              className="font-mono uppercase"
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.14em',
                color: 'var(--accent-cyan)',
                marginBottom: 10,
              }}
            >
              {'// Built for agents'}
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--text-primary)',
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              Structured endpoints for autonomous readers. No CAPTCHA, no bot blocking.
            </div>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {AGENT_PILLS.map((p) => {
                const cls = 'tf-agent-pill inline-flex items-center font-mono transition-colors';
                const style: React.CSSProperties = {
                  fontSize: 11,
                  padding: '4px 9px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 999,
                  color: 'var(--text-secondary)',
                  gap: 5,
                };
                if (p.external) {
                  return (
                    <a key={p.label} href={p.href} className={cls} style={style}>
                      {p.label}
                    </a>
                  );
                }
                return (
                  <Link key={p.label} href={p.href} className={cls} style={style}>
                    {p.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap justify-between font-mono"
          style={{ paddingTop: 24, gap: 16, fontSize: 11, color: 'var(--text-muted)' }}
        >
          <span>&copy; 2026 TensorFeed. Independent publication.</span>
          <div className="flex" style={{ gap: 20 }}>
            {FOOTER_LINKS.map((l) =>
              l.external ? (
                <a key={l.label} href={l.href} className="hover:text-[var(--accent-cyan)]">
                  {l.label}
                </a>
              ) : (
                <Link key={l.label} href={l.href} className="hover:text-[var(--accent-cyan)]">
                  {l.label}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
