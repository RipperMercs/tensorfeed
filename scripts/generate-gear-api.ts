/**
 * Generate the agent-readable gear feed at public/api/agents/gear.json.
 *
 * Reads the curated data/gear.json and strips affiliate plumbing so agents
 * see clean vendor URLs and no commissioned links. Runs in prebuild before
 * next build so the static export ships a fresh copy.
 */

import * as fs from 'fs';
import * as path from 'path';

interface GearProduct {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
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
  badges?: string[];
  added: string;
  updated: string;
  featured?: boolean;
}

interface GearData {
  lastReviewed: string;
  products: GearProduct[];
}

// Lives under /api/agents/ because the Cloudflare Worker captures /api/*
// routes it knows about and returns 404 for unknown /api/foo paths. Static
// files only fall through when the path is under /api/agents/. This matches
// the existing pattern (news.json, status.json, pricing.json all live here).
const SOURCE = path.join(process.cwd(), 'data', 'gear.json');
const OUT_DIR = path.join(process.cwd(), 'public', 'api', 'agents');
const OUT_FILE = path.join(OUT_DIR, 'gear.json');

function main(): void {
  const raw = fs.readFileSync(SOURCE, 'utf8');
  const data = JSON.parse(raw) as GearData;

  const agentProducts = data.products.map(p => {
    const vendorUrl =
      p.vendorUrl ??
      (p.amazonAsin ? `https://www.amazon.com/dp/${p.amazonAsin}` : '');
    return {
      id: p.id,
      name: p.name,
      manufacturer: p.manufacturer,
      category: p.category,
      blurb: p.blurb,
      description: p.description,
      specs: p.specs,
      aiUseCase: p.aiUseCase,
      priceRange: p.priceRange,
      vendorUrl,
      tags: p.tags,
      badges: p.badges ?? [],
      added: p.added,
      updated: p.updated,
    };
  });

  const counts: Record<string, number> = {};
  for (const p of data.products) {
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  }

  const output = {
    ok: true,
    name: 'TensorFeed AI Gear',
    description:
      'Curated, human-reviewed catalog of AI-relevant consumer hardware. Companion to https://tensorfeed.ai/gear with affiliate plumbing stripped.',
    canonical: 'https://tensorfeed.ai/gear',
    license: 'CC-BY-4.0',
    attribution: 'TensorFeed.ai',
    lastReviewed: data.lastReviewed,
    generatedAt: new Date().toISOString(),
    count: agentProducts.length,
    counts,
    products: agentProducts,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(
    `[gear-api] wrote ${agentProducts.length} products to public/api/agents/gear.json`
  );
}

main();
