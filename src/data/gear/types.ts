/**
 * Gear data shape. Source of truth for the /gear catalog.
 *
 * Editors maintain the catalog by adding entries to products.ts and, when a
 * spotlight rotates, spotlight.ts. Categories live in categories.ts. The
 * shape here is enforced by scripts/validate-gear.ts at build time.
 *
 * See docs in src/styles/gear.css for the per-category color tokens.
 */

export type CategoryId =
  | 'laptops'
  | 'gpus'
  | 'xr'
  | 'robotics'
  | 'smart'
  | 'audio'
  | 'cameras'
  | 'wearables'
  | 'edge'
  | 'peripherals'
  | 'storage'
  | 'books'
  | 'experimental';

export type IconKind =
  | 'laptop'
  | 'chip'
  | 'glasses'
  | 'robot'
  | 'home'
  | 'mic'
  | 'cam'
  | 'wear'
  | 'edge'
  | 'periph'
  | 'storage'
  | 'book'
  | 'flask';

export interface Category {
  id: CategoryId;
  name: string;
  count: number;
  hue: number;
  icon: IconKind;
  description: string;
}

export type BadgeKind = 'editor' | 'new' | 'experimental';
export type CtaKind = 'amazon' | 'direct';

export interface Cta {
  label: string;
  kind: CtaKind;
  /** Canonical product URL, no affiliate code. AffiliateLink applies the tag. */
  url: string;
  affiliate: boolean;
}

export interface Product {
  id: string;
  category: CategoryId;
  brand: string;
  name: string;
  blurb: string;
  specs: string[];
  /** One or two sentence "why this is on the AI gear hub". Required. */
  aiUse: string;
  badges: BadgeKind[];
  /** Optional mono pin for short editorial flags like BEST FOR LOCAL LLM. */
  pin?: string;
  price: string;
  /** Uppercase: STREET, APPLE.COM, MAY 2026, etc. */
  priceNote: string;
  cta: Cta;
  secondaryCta?: Cta;
  tags: string[];
  /** Denormalized category hue for fast per-card styling. */
  hue: number;
  /** Path under public/gear/ or empty if no image yet. */
  image?: string;
  /** Required when image is present. "Brand Product, product photograph". */
  imageAlt?: string;
  addedAt: string;
  reviewedAt: string;
  /** Optional homepage feature flag. */
  featured?: boolean;
}

export interface Spotlight extends Omit<Product, 'specs'> {
  flag: string;
  lede: string;
  /** Key/value tuples for the spotlight spec table. */
  specs: [string, string][];
}
