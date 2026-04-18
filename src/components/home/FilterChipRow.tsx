'use client';

import { CHIPS, type ChipKey } from '@/lib/feed-chips';

type FeedTab = 'news' | 'podcasts';
export type FeedView = 'cards' | 'log' | 'hybrid';

interface FilterChipRowProps {
  tab: FeedTab;
  onTabChange: (t: FeedTab) => void;
  activeChip: ChipKey;
  onChipChange: (c: ChipKey) => void;
  counts: Record<ChipKey, number>;
  view: FeedView;
  onViewChange: (v: FeedView) => void;
  newsCount?: number;
  podcastsCount?: number;
}

const VIEWS: FeedView[] = ['cards', 'log', 'hybrid'];

export default function FilterChipRow({
  tab,
  onTabChange,
  activeChip,
  onChipChange,
  counts,
  view,
  onViewChange,
  newsCount,
  podcastsCount = 42,
}: FilterChipRowProps) {
  const totalNewsCount = newsCount ?? counts.all;
  const chipsDisabled = tab !== 'news';

  return (
    <>
      <div
        role="tablist"
        aria-label="Feed content type"
        className="flex"
        style={{ gap: 4, marginBottom: 12, borderBottom: '1px solid var(--border)' }}
      >
        <FeedTabButton
          icon={<NewsIcon />}
          label="News"
          count={totalNewsCount}
          active={tab === 'news'}
          onClick={() => onTabChange('news')}
        />
        <FeedTabButton
          icon={<PodcastIcon />}
          label="Podcasts"
          count={podcastsCount}
          active={tab === 'podcasts'}
          onClick={() => onTabChange('podcasts')}
        />
      </div>

      <div
        role="toolbar"
        aria-label="Filter feed"
        className="flex flex-wrap items-center"
        style={{
          gap: 8,
          marginBottom: 20,
          padding: '12px 14px',
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          opacity: chipsDisabled ? 0.5 : 1,
          pointerEvents: chipsDisabled ? 'none' : 'auto',
        }}
      >
        {CHIPS.map((c) => {
          const isActive = activeChip === c.key;
          const count = counts[c.key] ?? 0;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChipChange(c.key)}
              aria-pressed={isActive}
              className="inline-flex items-center transition-colors"
              style={{
                padding: '6px 12px',
                border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border)'}`,
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                borderRadius: 999,
                fontSize: 12,
                color: isActive ? 'white' : 'var(--text-secondary)',
                fontWeight: 500,
                gap: 6,
              }}
            >
              {c.color && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: c.color,
                  }}
                />
              )}
              {c.label}
              <span className="font-mono" style={{ fontSize: 10, opacity: 0.7 }}>
                {count}
              </span>
            </button>
          );
        })}

        <div className="ml-auto inline-flex items-center" style={{ gap: 4 }}>
          <div
            role="group"
            aria-label="Feed layout"
            className="inline-flex overflow-hidden"
            style={{ border: '1px solid var(--border)', borderRadius: 6 }}
          >
            {VIEWS.map((v, i) => (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className="font-mono uppercase"
                aria-pressed={view === v}
                style={{
                  padding: '5px 10px',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: view === v ? 'white' : 'var(--text-muted)',
                  background: view === v ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  borderRight: i < VIEWS.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function FeedTabButton({ icon, label, count, active, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="inline-flex items-center transition-colors"
      style={{
        gap: 8,
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 500,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        borderBottom: `2px solid ${active ? 'var(--accent-primary)' : 'transparent'}`,
        marginBottom: -1,
      }}
    >
      {icon}
      {label}
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
          padding: '2px 6px',
          background: active ? 'rgba(99,102,241,0.12)' : 'var(--bg-tertiary)',
          borderRadius: 3,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function NewsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6z" />
    </svg>
  );
}

function PodcastIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
    </svg>
  );
}
