import Link from 'next/link';
import type { OriginalArticle } from '@/lib/originals-directory';

interface EditorialFeatureProps {
  articles: OriginalArticle[];
}

const ROLE_BY_AUTHOR: Record<string, string> = {
  Ripper: 'Editor in Chief',
  'Kira Nolan': 'Senior Editor',
  'Marcus Chen': 'Staff Writer',
  'Priya Ahuja': 'Senior Editor',
  'Miguel Torres': 'Staff Writer',
  'Jordan Lee': 'Contributor',
};

function eyebrowFor(_index: number): string {
  return _index === 0 ? 'EDITORIAL / ANALYSIS' : 'EDITORIAL';
}

export default function EditorialFeature({ articles }: EditorialFeatureProps) {
  if (articles.length === 0) return null;
  const [lead, ...rest] = articles;
  const sideArticles = rest.slice(0, 2);
  const leadHref = `/originals/${lead.slug}`;

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]"
      style={{ gap: 32, alignItems: 'stretch' }}
    >
      <article
        className="tf-mag-lead relative overflow-hidden flex flex-col"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '32px 32px 28px',
          background:
            'radial-gradient(circle at 0% 0%, rgba(99,102,241,0.08), transparent 50%), radial-gradient(circle at 100% 100%, rgba(6,182,212,0.06), transparent 50%), var(--bg-secondary)',
          minHeight: 380,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.035) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.6,
          }}
        />

        <div
          className="relative inline-flex items-center font-mono uppercase"
          style={{
            zIndex: 1,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.14em',
            color: 'var(--accent-cyan)',
            marginBottom: 12,
            gap: 8,
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 20, height: 1, background: 'var(--accent-cyan)' }}
          />
          {eyebrowFor(0)}
        </div>

        <h2
          className="relative"
          style={{
            zIndex: 1,
            fontSize: 'clamp(28px, 3.4vw, 44px)',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
            marginBottom: 16,
            maxWidth: 720,
            textWrap: 'balance' as const,
          }}
        >
          <Link href={leadHref}>{lead.title}</Link>
        </h2>

        <p
          className="relative"
          style={{
            zIndex: 1,
            fontSize: 16,
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            marginBottom: 20,
            maxWidth: 640,
          }}
        >
          {lead.description}
        </p>

        <div
          className="relative flex items-center font-mono mt-auto"
          style={{
            zIndex: 1,
            gap: 12,
            paddingTop: 20,
            borderTop: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              flex: '0 0 auto',
            }}
          />
          <span>
            <span
              style={{
                color: 'var(--text-primary)',
                fontWeight: 500,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 13,
              }}
            >
              {lead.author}
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
              , {ROLE_BY_AUTHOR[lead.author] ?? 'Contributor'}
            </span>
          </span>
          <span style={{ opacity: 0.4 }}>&middot;</span>
          <span>{lead.date}</span>
          <span style={{ opacity: 0.4 }}>&middot;</span>
          <span>{lead.readTime}</span>
        </div>
      </article>

      <div className="flex flex-col" style={{ gap: 16 }}>
        {sideArticles.map((a, i) => (
          <Link
            key={a.slug}
            href={`/originals/${a.slug}`}
            className="group flex flex-col flex-1 transition-all"
            style={{
              padding: '20px 22px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: 'var(--bg-secondary)',
            }}
          >
            <div
              className="font-mono uppercase"
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.14em',
                color: 'var(--accent-secondary)',
                marginBottom: 10,
              }}
            >
              {eyebrowFor(i + 1)}
            </div>
            <h3
              className="group-hover:text-[var(--accent-cyan)] transition-colors"
              style={{
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: '-0.015em',
                color: 'var(--text-primary)',
                marginBottom: 10,
                textWrap: 'balance' as const,
              }}
            >
              {a.title}
            </h3>
            <p
              className="line-clamp-2"
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              {a.description}
            </p>
            <div
              className="flex items-center font-mono mt-auto"
              style={{
                gap: 8,
                fontSize: 10.5,
                color: 'var(--text-muted)',
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 12,
                }}
              >
                {a.author}
              </span>
              <span style={{ opacity: 0.4 }}>&middot;</span>
              <span>{a.date}</span>
              <span style={{ opacity: 0.4 }}>&middot;</span>
              <span>{a.readTime}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
