'use client';

import Link from 'next/link';
import { Category, CategoryId } from '@/data/gear/types';
import CategoryIcon from './CategoryIcon';

interface BaseProps {
  categories: Category[];
}

interface FilterProps extends BaseProps {
  mode?: 'filter';
  active: CategoryId | null;
  onSelect: (cat: CategoryId | null) => void;
}

interface LinkProps extends BaseProps {
  mode: 'link';
  active?: CategoryId | null;
}

type Props = FilterProps | LinkProps;

export default function CategoryGrid(props: Props) {
  const { categories } = props;

  return (
    <div className="cat-grid" aria-label="Gear categories">
      {categories.map(c => {
        const isActive =
          'active' in props && props.active != null
            ? props.active === c.id
            : false;
        const padded = String(c.count).padStart(2, '0');

        const inner = (
          <>
            <span className="cat-corner">{padded}</span>
            <span className="cat-icon">
              <CategoryIcon kind={c.icon} />
            </span>
            <div>
              <div className="cat-name">{c.name}</div>
              <div className="cat-count">
                {c.count} {c.count === 1 ? 'product' : 'products'}
              </div>
            </div>
          </>
        );

        const style = { ['--cat-h' as string]: String(c.hue) };

        if (props.mode === 'link') {
          return (
            <Link
              key={c.id}
              href={`/gear/${c.id}`}
              className={`cat-card ${isActive ? 'active' : ''}`}
              style={style}
              aria-label={`${c.name} category, ${c.count} ${c.count === 1 ? 'product' : 'products'}`}
            >
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={c.id}
            className={`cat-card ${isActive ? 'active' : ''}`}
            style={style}
            onClick={() =>
              props.onSelect(isActive ? null : (c.id as CategoryId))
            }
            aria-pressed={isActive}
            aria-label={`Filter by ${c.name}`}
            type="button"
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
