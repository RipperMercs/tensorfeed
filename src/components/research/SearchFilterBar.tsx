'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Filter, Clock, Star, TrendingUp, Eye, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_KEYS, CategoryKey } from './categories';

/**
 * Reusable search + sort + category-filter bar per spec section 6.
 * Surfaces above the milestone grid on /research, and exported so other
 * listing pages (papers, citation velocity) can reuse the same pattern.
 *
 * Three columns at desktop (search / sort segmented control / filter
 * dropdown). Stacks vertically below 800px. Filter popover closes on
 * outside click, Escape, or row toggle.
 */

export type SortKey = 'latest' | 'cited' | 'velocity' | 'viewed';

interface SearchFilterBarProps {
  query: string;
  onQuery: (q: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  activeCats: CategoryKey[];
  onActiveCats: (cats: CategoryKey[]) => void;
  totalCount: number;
  visibleCount: number;
  categoryCounts?: Partial<Record<CategoryKey, number>>;
  placeholder?: string;
}

const SORT_DEFS: { key: SortKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'latest', label: 'Latest', icon: Clock },
  { key: 'cited', label: 'Most cited', icon: Star },
  { key: 'velocity', label: 'Hot', icon: TrendingUp },
  { key: 'viewed', label: 'Most viewed', icon: Eye },
];

const SORT_LABEL_BY_KEY: Record<SortKey, string> = {
  latest: 'latest',
  cited: 'most cited',
  velocity: 'hot',
  viewed: 'most viewed',
};

export default function SearchFilterBar({
  query,
  onQuery,
  sort,
  onSort,
  activeCats,
  onActiveCats,
  totalCount,
  visibleCount,
  categoryCounts,
  placeholder = 'Search milestone papers, authors, claims...',
}: SearchFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function onDocClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFilterOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [filterOpen]);

  function toggleCat(k: CategoryKey) {
    if (activeCats.includes(k)) {
      onActiveCats(activeCats.filter((c) => c !== k));
    } else {
      onActiveCats([...activeCats, k]);
    }
  }

  const activeFilterCount = activeCats.length;

  return (
    <div className="mb-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-stretch bg-bg-secondary border border-border rounded-lg p-3">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary rounded">
          <Search className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search papers"
            className="flex-1 bg-transparent border-0 outline-none text-sm text-text-primary placeholder:text-text-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery('')}
              aria-label="Clear search"
              className="text-text-muted hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort segmented control */}
        <div role="group" aria-label="Sort" className="flex items-center gap-0 bg-bg-tertiary rounded p-0.5">
          {SORT_DEFS.map(({ key, label, icon: Icon }) => {
            const active = sort === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSort(key)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.1em] rounded inline-flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Filter dropdown */}
        <div ref={filterRef} className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-haspopup="menu"
            className="h-full px-3 py-2 bg-bg-tertiary rounded text-[10px] font-mono uppercase tracking-[0.1em] inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors w-full sm:w-auto justify-center"
          >
            <Filter className="w-3 h-3" />
            Categories
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-accent-primary/20 text-accent-primary text-[9px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <div
              role="menu"
              aria-label="Filter by category"
              className="absolute right-0 top-full mt-2 z-30 min-w-[240px] bg-bg-secondary border border-border rounded-lg shadow-lg py-1.5"
            >
              {CATEGORY_KEYS.map((k) => {
                const cat = CATEGORIES[k];
                const checked = activeCats.includes(k);
                const count = categoryCounts?.[k];
                return (
                  <button
                    key={k}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    onClick={() => toggleCat(k)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: cat.color }}
                        aria-hidden="true"
                      />
                      <span
                        className={`inline-block w-3 h-3 border rounded-sm ${
                          checked ? 'border-accent-primary' : 'border-border'
                        }`}
                        aria-hidden="true"
                        style={{
                          background: checked ? 'var(--cat-color, currentColor)' : 'transparent',
                          ['--cat-color' as string]: cat.color,
                        }}
                      />
                      <span className={checked ? 'text-text-primary' : ''}>{cat.name}</span>
                    </span>
                    {count != null && (
                      <span className="text-[10px] font-mono text-text-muted tabular-nums">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Results meta + active filter chips */}
      <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-mono text-text-muted">
        <span>
          {visibleCount} of {totalCount} papers · sorted by {SORT_LABEL_BY_KEY[sort]}
        </span>
        {activeCats.length > 0 && (
          <>
            <span className="text-border">·</span>
            {activeCats.map((k) => {
              const cat = CATEGORIES[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleCat(k)}
                  aria-label={`Remove ${cat.name} filter`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-tertiary text-text-primary hover:border-accent-primary transition-colors"
                  style={{ borderLeftColor: cat.color, borderLeftWidth: 2 }}
                >
                  {cat.short}
                  <X className="w-3 h-3" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onActiveCats([])}
              className="text-text-muted hover:text-text-primary underline"
            >
              clear all
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable sort algorithm. Same shape as spec section 6: latest does
 * nothing (input already sorted), cited / velocity / viewed sort
 * descending by their respective fields.
 */
export function applySort<T extends { citations?: number; velocity?: number }>(
  items: T[],
  sort: SortKey,
): T[] {
  if (sort === 'latest') return items;
  const sorted = [...items];
  if (sort === 'cited') {
    sorted.sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0));
  } else if (sort === 'velocity') {
    sorted.sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0));
  } else if (sort === 'viewed') {
    sorted.sort((a, b) =>
      ((b.citations ?? 0) + (b.velocity ?? 0) * 4) -
      ((a.citations ?? 0) + (a.velocity ?? 0) * 4),
    );
  }
  return sorted;
}

/**
 * Substring filter helper used by the milestone page. Case-insensitive
 * across the given keys on each item.
 */
export function applyQuery<T>(items: T[], query: string, keys: (keyof T)[]): T[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter((item) =>
    keys.some((k) => {
      const v = item[k];
      if (typeof v === 'string') return v.toLowerCase().includes(q);
      if (Array.isArray(v)) return v.some((s) => typeof s === 'string' && s.toLowerCase().includes(q));
      return false;
    }),
  );
}

/**
 * Reusable hook to manage the filter state in a single block. Consumer
 * pages call this once and get the controlled props for SearchFilterBar.
 */
export function useFilterState(initialSort: SortKey = 'latest') {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [activeCats, setActiveCats] = useState<CategoryKey[]>([]);
  return useMemo(
    () => ({ query, setQuery, sort, setSort, activeCats, setActiveCats }),
    [query, sort, activeCats],
  );
}
