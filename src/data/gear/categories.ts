import { Category } from './types';

/**
 * The 13 categories of the AI Gear catalog.
 *
 * Hues are integers 0..360, fed through oklch() at render time. Counts are
 * computed from products.ts via getCategoryCounts(); the literal `count: 0`
 * here is just a placeholder. The validator (scripts/validate-gear.ts)
 * asserts the live counts.
 */
export const GEAR_CATEGORIES: Category[] = [
  {
    id: 'laptops',
    name: 'Laptops',
    count: 0,
    hue: 214,
    icon: 'laptop',
    description:
      'High-VRAM gaming and developer laptops capable of running local language models, plus MacBooks for on-device unified-memory inference.',
  },
  {
    id: 'gpus',
    name: 'GPUs',
    count: 0,
    hue: 160,
    icon: 'chip',
    description:
      'Discrete graphics cards for self-built rigs. RTX 5090, RTX 5080, RTX 6000 Ada, and high-VRAM workstation cards.',
  },
  {
    id: 'xr',
    name: 'XR / AR Glasses',
    count: 0,
    hue: 320,
    icon: 'glasses',
    description:
      'Smart glasses and head-worn displays with on-device AI, voice assistants, or external compute pairing.',
  },
  {
    id: 'robotics',
    name: 'Robotics',
    count: 0,
    hue: 12,
    icon: 'robot',
    description:
      'Humanoid robots, mobile robots, and hobby kits with AI control loops.',
  },
  {
    id: 'smart',
    name: 'Smart Home AI',
    count: 0,
    hue: 260,
    icon: 'home',
    description:
      'Voice-first home hubs, AI-native cameras, and devices that bring large language models into the living room.',
  },
  {
    id: 'audio',
    name: 'Audio & Voice',
    count: 0,
    hue: 40,
    icon: 'mic',
    description:
      'AI noise-canceling earbuds, voice clone microphones, AI transcription recorders, and audio-first hardware.',
  },
  {
    id: 'cameras',
    name: 'Cameras & Vision',
    count: 0,
    hue: 195,
    icon: 'cam',
    description:
      'AI-powered action cameras and vision-LLM-enabled imaging hardware.',
  },
  {
    id: 'wearables',
    name: 'Wearables',
    count: 0,
    hue: 340,
    icon: 'wear',
    description:
      'AI pendants, rings, necklaces, and other always-on wearables that pair with language models.',
  },
  {
    id: 'edge',
    name: 'Edge AI Devices',
    count: 0,
    hue: 145,
    icon: 'edge',
    description:
      'Single-board computers, dev kits, and accelerators for running inference outside the datacenter. NVIDIA Jetson, Coral, M.2 TPUs.',
  },
  {
    id: 'peripherals',
    name: 'Peripherals',
    count: 0,
    hue: 220,
    icon: 'periph',
    description:
      'Stream Decks, programmable keyboards, AI-aware webcams, and accessories built for AI workflows.',
  },
  {
    id: 'storage',
    name: 'Storage & Memory',
    count: 0,
    hue: 180,
    icon: 'storage',
    description:
      'Fast NVMe drives for model weights, ECC RAM kits for stable long inference, and storage for AI workloads.',
  },
  {
    id: 'books',
    name: 'Books & Learning',
    count: 0,
    hue: 28,
    icon: 'book',
    description:
      'Books, courses, and learning materials worth reading for ML, AI engineering, and agent building.',
  },
  {
    id: 'experimental',
    name: 'Experimental',
    count: 0,
    hue: 280,
    icon: 'flask',
    description:
      'Cool one-off devices that do not fit elsewhere. Friend pendant, Tab, hobby hardware.',
  },
];

const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(
  GEAR_CATEGORIES.map(c => [c.id, c])
);

export function getCategory(id: string): Category | undefined {
  return CATEGORY_BY_ID[id];
}

export function getCategoryHue(id: string): number {
  return CATEGORY_BY_ID[id]?.hue ?? 220;
}
