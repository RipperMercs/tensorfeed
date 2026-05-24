'use client';

import { useMemo, useState } from 'react';
import { Category, CategoryId, Product } from '@/data/gear/types';
import CategoryGrid from './CategoryGrid';
import FilterBar from './FilterBar';
import ProductGrid from './ProductGrid';

interface Props {
  categories: Category[];
  products: Product[];
}

/**
 * Client-side wrapper that holds filter and density state for the hub view.
 * Composes CategoryGrid (in filter mode) + FilterBar + ProductGrid into one
 * interactive flow so the page itself can stay a server component.
 *
 * Selecting a category in either the grid or the bar updates both. Density
 * toggle persists in component state only (no URL or localStorage yet).
 */
export default function GearInteractive({ categories, products }: Props) {
  const [active, setActive] = useState<CategoryId | null>(null);
  const [density, setDensity] = useState<'comfortable' | 'dense'>('comfortable');

  const filtered = useMemo(
    () => (active ? products.filter(p => p.category === active) : products),
    [products, active]
  );

  const activeName =
    active != null
      ? categories.find(c => c.id === active)?.name ?? active
      : 'all categories';

  return (
    <>
      <section className="gear-section" id="categories">
        <div className="container">
          <div className="gear-section-head">
            <div>
              <div className="h-eyebrow">
                <span className="bar" aria-hidden="true" /> 02 / BROWSE
              </div>
              <h2>Browse by Category</h2>
            </div>
            <div className="h-sub">
              <strong>{categories.length}</strong> categories &middot; tap to
              filter
            </div>
          </div>
          <CategoryGrid
            categories={categories}
            active={active}
            onSelect={setActive}
          />
        </div>
      </section>

      <section className="gear-section" id="featured">
        <div className="container">
          <div className="gear-section-head">
            <div>
              <div className="h-eyebrow">
                <span className="bar" aria-hidden="true" /> 03 / FEATURED
              </div>
              <h2>Featured Picks</h2>
            </div>
            <div className="h-sub">
              Showing <strong>{filtered.length}</strong> of{' '}
              <strong>{products.length}</strong> in {activeName}
            </div>
          </div>
          <FilterBar
            categories={categories}
            active={active}
            onSelect={setActive}
            density={density}
            onDensity={setDensity}
          />
          <ProductGrid products={filtered} density={density} />
        </div>
      </section>
    </>
  );
}
