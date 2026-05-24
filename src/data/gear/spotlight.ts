import { Spotlight } from './types';

/**
 * Single editor's choice spotlight, refreshed monthly. The product also
 * lives in products.ts as a normal entry; this file extends it with the
 * spotlight-specific flag, lede, and tuple-formatted spec table.
 *
 * Only one spotlight at a time. Rotate by replacing this object and bumping
 * the flag month.
 */
export const SPOTLIGHT: Spotlight = {
  id: 'nvidia-rtx-5090',
  category: 'gpus',
  brand: 'NVIDIA',
  name: 'GeForce RTX 5090',
  flag: "EDITOR'S CHOICE · MAY 2026",
  lede: 'The single biggest jump in consumer VRAM in five years. 32 GB of GDDR7 at 1,792 GB/s puts a full 30B model in fp8, or a quantized 70B with context to spare, on one card. This is the GPU we benchmark everything else against.',
  blurb:
    '32GB of GDDR7 at 1,792 GB/s makes the 5090 the highest VRAM consumer GPU shipping, fitting a full 30B model in fp8 or a quantized 70B with room for context.',
  specs: [
    ['VRAM', '32 GB GDDR7 · 512-bit'],
    ['Bandwidth', '1,792 GB/s'],
    ['CUDA cores', '21,760 · 170 SMs'],
    ['Architecture', 'Blackwell'],
    ['Power', '575 W TDP · 1000 W PSU'],
    ['Ports', '3 × DisplayPort 2.1, 1 × HDMI 2.1b'],
  ],
  aiUse:
    'Local LLMs up to 70B 4-bit quantized, 30B fp8, Stable Diffusion 3.5 and Flux at full resolution, single-GPU fine-tuning of 13B models.',
  badges: ['editor', 'new'],
  pin: 'BEST FOR LOCAL LLM',
  price: '$2,899 to $3,999',
  priceNote: 'STREET, MAY 2026',
  cta: {
    label: 'View on Amazon',
    kind: 'amazon',
    url: 'https://www.amazon.com/dp/B0DTJF8YT4',
    affiliate: true,
  },
  secondaryCta: {
    label: 'NVIDIA.com',
    kind: 'direct',
    url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/',
    affiliate: false,
  },
  tags: ['local-llm', 'fine-tuning', 'stable-diffusion'],
  hue: 160,
  image: '/gear/nvidia-rtx-5090.png',
  imageAlt: 'NVIDIA GeForce RTX 5090, product photograph',
  addedAt: '2026-05-23',
  reviewedAt: '2026-05-23',
};
