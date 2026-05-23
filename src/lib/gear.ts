/**
 * Gear: human-facing catalog of AI-relevant consumer hardware.
 *
 * Drives /gear and /gear/[category] pages. Data sourced from data/gear.json.
 *
 * The catalog is curated. Amazon affiliate links earn revenue when a product
 * has affiliate: true and an amazonAsin. Non-affiliate products (vendor URL
 * only) are listed when they are interesting but not on Amazon or when we
 * have not yet sourced an Amazon ASIN.
 *
 * Agent-readable JSON view at /api/gear.json strips affiliate plumbing.
 */

import gearData from '../../data/gear.json';

export type GearCategory =
  | 'laptops'
  | 'desktops-workstations'
  | 'gpus'
  | 'xr-ar-glasses'
  | 'robotics'
  | 'smart-home-ai'
  | 'audio-voice'
  | 'cameras-vision'
  | 'wearables'
  | 'edge-devices'
  | 'peripherals'
  | 'storage-memory'
  | 'books-learning'
  | 'experimental';

export type GearBadge =
  | 'editors-pick'
  | 'best-for-local-llm'
  | 'new'
  | 'experimental';

export interface GearProduct {
  id: string;
  name: string;
  manufacturer: string;
  category: GearCategory;
  image: string;
  blurb: string;
  description: string;
  specs: string[];
  aiUseCase: string;
  priceRange: string;
  affiliate: boolean;
  amazonAsin?: string;
  vendorUrl?: string;
  tags: string[];
  badges?: GearBadge[];
  added: string;
  updated: string;
  featured?: boolean;
}

export interface GearData {
  lastReviewed: string;
  products: GearProduct[];
}

export interface CategoryMeta {
  slug: GearCategory;
  display: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    slug: 'laptops',
    display: 'Laptops',
    description:
      'High-VRAM gaming and developer laptops capable of running local language models, plus MacBooks for on-device unified-memory inference.',
    gradientFrom: '#1e3a8a',
    gradientTo: '#0c0a3e',
    icon: 'Laptop',
  },
  {
    slug: 'desktops-workstations',
    display: 'Desktops & Workstations',
    description:
      'Prebuilt AI rigs, Threadripper and Xeon workstations, and dedicated dev boxes designed around local inference.',
    gradientFrom: '#0f172a',
    gradientTo: '#1e293b',
    icon: 'Monitor',
  },
  {
    slug: 'gpus',
    display: 'GPUs',
    description:
      'Discrete graphics cards for self-built rigs. RTX 5090, RTX 5080, RTX 6000 Ada, and high-VRAM workstation cards.',
    gradientFrom: '#065f46',
    gradientTo: '#022c22',
    icon: 'Cpu',
  },
  {
    slug: 'xr-ar-glasses',
    display: 'XR / AR Glasses',
    description:
      'Smart glasses and head-worn displays with on-device AI, voice assistants, or external compute pairing.',
    gradientFrom: '#831843',
    gradientTo: '#4a044e',
    icon: 'Glasses',
  },
  {
    slug: 'robotics',
    display: 'Robotics',
    description:
      'Humanoid robots, mobile robots, and hobby kits with AI control loops.',
    gradientFrom: '#7c2d12',
    gradientTo: '#431407',
    icon: 'Bot',
  },
  {
    slug: 'smart-home-ai',
    display: 'Smart Home AI',
    description:
      'Voice-first home hubs, AI-native cameras, and devices that bring large language models into the living room.',
    gradientFrom: '#1e40af',
    gradientTo: '#1e3a8a',
    icon: 'Home',
  },
  {
    slug: 'audio-voice',
    display: 'Audio & Voice',
    description:
      'AI noise-canceling earbuds, voice clone microphones, AI transcription recorders, and audio-first hardware.',
    gradientFrom: '#581c87',
    gradientTo: '#3b0764',
    icon: 'Mic',
  },
  {
    slug: 'cameras-vision',
    display: 'Cameras & Vision',
    description:
      'AI-powered action cameras and vision-LLM-enabled imaging hardware.',
    gradientFrom: '#92400e',
    gradientTo: '#451a03',
    icon: 'Camera',
  },
  {
    slug: 'wearables',
    display: 'Wearables',
    description:
      'AI pendants, rings, necklaces, and other always-on wearables that pair with language models.',
    gradientFrom: '#9d174d',
    gradientTo: '#500724',
    icon: 'Watch',
  },
  {
    slug: 'edge-devices',
    display: 'Edge AI Devices',
    description:
      'Single-board computers, dev kits, and accelerators for running inference outside the datacenter. NVIDIA Jetson, Coral, M.2 TPUs.',
    gradientFrom: '#14532d',
    gradientTo: '#052e16',
    icon: 'CircuitBoard',
  },
  {
    slug: 'peripherals',
    display: 'Peripherals',
    description:
      'Stream Decks, programmable keyboards, AI-aware webcams, and accessories built for AI workflows.',
    gradientFrom: '#3f3f46',
    gradientTo: '#18181b',
    icon: 'Keyboard',
  },
  {
    slug: 'storage-memory',
    display: 'Storage & Memory',
    description:
      'Fast NVMe drives for model weights, ECC RAM kits for stable long inference, and storage for AI workloads.',
    gradientFrom: '#0c4a6e',
    gradientTo: '#082f49',
    icon: 'HardDrive',
  },
  {
    slug: 'books-learning',
    display: 'Books & Learning',
    description:
      'Books, courses, and learning materials worth reading for ML, AI engineering, and agent building.',
    gradientFrom: '#713f12',
    gradientTo: '#422006',
    icon: 'Book',
  },
  {
    slug: 'experimental',
    display: 'Experimental',
    description:
      'Cool one-off devices that do not fit elsewhere. Friend pendant, Tab, hobby hardware.',
    gradientFrom: '#4c1d95',
    gradientTo: '#2e1065',
    icon: 'Sparkles',
  },
];

export function getCategoryMeta(slug: GearCategory): CategoryMeta | undefined {
  return CATEGORIES.find(c => c.slug === slug);
}

export function getProducts(): GearProduct[] {
  return (gearData as GearData).products;
}

export function getProductsByCategory(slug: GearCategory): GearProduct[] {
  return getProducts().filter(p => p.category === slug);
}

export function getFeaturedProducts(limit = 9): GearProduct[] {
  return getProducts()
    .filter(p => p.featured)
    .slice(0, limit);
}

export function getProductCounts(): Record<GearCategory, number> {
  const counts = Object.fromEntries(
    CATEGORIES.map(c => [c.slug, 0])
  ) as Record<GearCategory, number>;
  for (const p of getProducts()) {
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  }
  return counts;
}

export function getActiveCategories(): CategoryMeta[] {
  const counts = getProductCounts();
  return CATEGORIES.filter(c => counts[c.slug] > 0);
}

export function getLastReviewed(): string {
  return (gearData as GearData).lastReviewed;
}

export function getAllCategorySlugs(): GearCategory[] {
  return CATEGORIES.map(c => c.slug);
}

export function getActiveCategorySlugs(): GearCategory[] {
  return getActiveCategories().map(c => c.slug);
}

/**
 * Build the outbound link for a product.
 * Amazon affiliate when affiliate:true + ASIN, else vendor URL.
 *
 * Affiliate tag pulled from NEXT_PUBLIC_AMAZON_AFFILIATE_TAG env (set in
 * Cloudflare Pages). If unset, returns the Amazon URL with no tag (still
 * works, just unmonetized).
 */
export function getProductLink(product: GearProduct): string {
  if (product.affiliate && product.amazonAsin) {
    return amazonLink(product.amazonAsin);
  }
  return product.vendorUrl ?? '#';
}

export function amazonLink(asin: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? '';
  const base = `https://www.amazon.com/dp/${asin}`;
  return tag ? `${base}?tag=${tag}` : base;
}

/**
 * Strip affiliate plumbing for the agent-readable view.
 * Agents do not benefit from affiliate tags and we do not want them
 * routing humans through commissioned URLs.
 */
export interface AgentGearProduct {
  id: string;
  name: string;
  manufacturer: string;
  category: GearCategory;
  blurb: string;
  description: string;
  specs: string[];
  aiUseCase: string;
  priceRange: string;
  vendorUrl: string;
  tags: string[];
  badges?: GearBadge[];
  added: string;
  updated: string;
}

export function toAgentView(product: GearProduct): AgentGearProduct {
  const vendorUrl =
    product.vendorUrl ??
    (product.amazonAsin
      ? `https://www.amazon.com/dp/${product.amazonAsin}`
      : '');
  return {
    id: product.id,
    name: product.name,
    manufacturer: product.manufacturer,
    category: product.category,
    blurb: product.blurb,
    description: product.description,
    specs: product.specs,
    aiUseCase: product.aiUseCase,
    priceRange: product.priceRange,
    vendorUrl,
    tags: product.tags,
    badges: product.badges,
    added: product.added,
    updated: product.updated,
  };
}
