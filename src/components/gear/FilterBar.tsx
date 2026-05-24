'use client';

import { Category, CategoryId } from '@/data/gear/types';

interface Props {
  categories: Category[];
  active: CategoryId | null;
  onSelect: (cat: CategoryId | null) => void;
  density: 'comfortable' | 'dense';
  onDensity: (d: 'comfortable' | 'dense') => void;
}

export default function FilterBar({
  categories,
  active,
  onSelect,
  density,
  onDensity,
}: Props) {
  const total = categories.reduce((a, c) => a + c.count, 0);
  const visible = categories.slice(0, 8);

  return (
    <div className="filter-bar" role="toolbar" aria-label="Filter gear">
      <span className="fb-label" aria-hidden="true">
        CATEGORY //
      </span>
      <div className="filter-chips" role="group" aria-label="Filter chips">
        <button
          type="button"
          className={`fchip ${active === null ? 'on' : ''}`}
          onClick={() => onSelect(null)}
          aria-pressed={active === null}
        >
          ALL <span className="n">{total}</span>
        </button>
        {visible.map(c => (
          <button
            type="button"
            key={c.id}
            className={`fchip ${active === c.id ? 'on' : ''}`}
            onClick={() => onSelect(active === c.id ? null : (c.id as CategoryId))}
            aria-pressed={active === c.id}
          >
            {c.name.toUpperCase()} <span className="n">{c.count}</span>
          </button>
        ))}
      </div>
      <div className="filter-spacer" />
      <div className="view-toggle" role="group" aria-label="Card density">
        <button
          type="button"
          className={density === 'comfortable' ? 'on' : ''}
          onClick={() => onDensity('comfortable')}
          aria-pressed={density === 'comfortable'}
        >
          FULL
        </button>
        <button
          type="button"
          className={density === 'dense' ? 'on' : ''}
          onClick={() => onDensity('dense')}
          aria-pressed={density === 'dense'}
        >
          DENSE
        </button>
      </div>
    </div>
  );
}
