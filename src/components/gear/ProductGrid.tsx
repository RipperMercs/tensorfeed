import { Product } from '@/data/gear/types';
import ProductCard from './ProductCard';

interface Props {
  products: Product[];
  density?: 'comfortable' | 'dense';
  emptyHint?: string;
}

export default function ProductGrid({
  products,
  density = 'comfortable',
  emptyHint,
}: Props) {
  if (products.length === 0) {
    return (
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '24px 18px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}
      >
        {emptyHint ?? 'No products in this slice yet.'}{' '}
        <a
          href="mailto:gear@tensorfeed.ai"
          style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}
        >
          Suggest one
        </a>
        .
      </div>
    );
  }

  return (
    <div className={`products ${density === 'dense' ? 'dense' : ''}`}>
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
