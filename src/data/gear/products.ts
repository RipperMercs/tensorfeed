import { Product } from './types';

/**
 * The full /gear catalog. Editors add new products here. Each entry should
 * follow the schema in types.ts; the validator (scripts/validate-gear.ts)
 * fails the build on missing fields, bad category ids, or non-ISO dates.
 *
 * Hue is denormalized from the category for fast per-card styling; if the
 * category hue changes in categories.ts, this file gets a sweep too.
 */
export const PRODUCTS: Product[] = [
  // ── Laptops ────────────────────────────────────────────────────────
  {
    id: 'lenovo-legion-pro-7i-gen-10',
    category: 'laptops',
    brand: 'Lenovo',
    name: 'Legion Pro 7i Gen 10 (16-inch, RTX 5090)',
    blurb:
      'A 24GB VRAM RTX 5090 laptop that runs 30B parameter models locally in 4-bit without choking, and trains LoRA adapters on consumer datasets overnight.',
    specs: [
      'Intel Core Ultra 9 275HX, 24 cores',
      'NVIDIA RTX 5090 Laptop GPU, 24GB GDDR7, up to 175W TGP',
      '32GB or 64GB DDR5-5600 (configurable)',
      '1TB or 2TB PCIe Gen4 NVMe SSD',
      '16-inch WQXGA OLED, 240Hz, 500 nits, Wi-Fi 7',
    ],
    aiUse:
      'Local LLMs up to 30B 4-bit quantized, Claude Code at full speed, Stable Diffusion XL, LoRA fine-tuning on 7B-13B models.',
    badges: ['editor', 'new'],
    pin: 'BEST FOR LOCAL LLM',
    price: '$3,199 to $3,999',
    priceNote: 'STREET',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0FK453MMS',
      affiliate: true,
    },
    secondaryCta: {
      label: 'Lenovo.com',
      kind: 'direct',
      url: 'https://www.lenovo.com/us/en/p/laptops/legion-laptops/legion-pro-series/legion-pro-7i-gen-10-16-inch-intel/83f5cto1wwus1',
      affiliate: false,
    },
    tags: ['local-llm', 'claude-code', 'stable-diffusion', 'fine-tuning'],
    hue: 214,
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
    featured: true,
  },
  {
    id: 'asus-rog-strix-scar-18-2026',
    category: 'laptops',
    brand: 'ASUS',
    name: 'ROG Strix SCAR 18 (2026) G835',
    blurb:
      'An 18-inch mobile workstation with a 24GB RTX 5090 and up to 128GB of DDR5, which means you can hold a full 70B model in system RAM and stream layers to the GPU for hybrid inference.',
    specs: [
      'Intel Core Ultra 9 290HX Plus, 24 cores',
      'NVIDIA RTX 5090 Laptop GPU, 24GB GDDR7, 175W TGP',
      'Up to 128GB DDR5-6400 (64GB + 64GB SO-DIMM)',
      'Up to 8TB SSD (4TB + 4TB)',
      '18-inch 4K Mini LED, 240Hz, 1600 nits peak, 2000+ dimming zones',
    ],
    aiUse:
      'Local LLMs up to 30B fully on GPU, 70B with CPU offload, Stable Diffusion 3.5, multi-day fine-tuning runs with adequate thermals.',
    badges: ['new'],
    pin: 'BEST FOR LOCAL LLM',
    price: '$3,899 to $5,499',
    priceNote: 'ASUS.COM',
    cta: {
      label: 'Visit ROG site',
      kind: 'direct',
      url: 'https://rog.asus.com/laptops/rog-strix/rog-strix-scar-18-2026/',
      affiliate: false,
    },
    tags: ['local-llm', 'fine-tuning', 'workstation'],
    hue: 214,
    image: '/gear/asus-rog-strix-scar-18-2026.webp',
    imageAlt: 'ASUS ROG Strix SCAR 18 (2026) G835, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'razer-blade-18-2026',
    category: 'laptops',
    brand: 'Razer',
    name: 'Blade 18 (2026)',
    blurb:
      "Razer's flagship configures up to 128GB DDR5 alongside the 24GB RTX 5090, putting it in the same hybrid-inference tier as the SCAR 18 but in a sleeker CNC aluminum chassis.",
    specs: [
      'Intel Core Ultra 9 290HX Plus, 24 cores, 5.5 GHz boost',
      'NVIDIA RTX 5090 Laptop GPU, 24GB GDDR7, 200W thermal budget',
      'Up to 128GB DDR5-6400',
      '1TB to 2TB SSD',
      '18-inch dual-mode display (UHD+ 240Hz or FHD+ 440Hz), Thunderbolt 5',
    ],
    aiUse:
      'Local LLMs 30B on GPU, 70B with CPU offload, Stable Diffusion workflows, on-the-road agent development.',
    badges: ['new'],
    price: '$3,999 to $6,999',
    priceNote: 'RAZER.COM',
    cta: {
      label: 'Visit Razer site',
      kind: 'direct',
      url: 'https://www.razer.com/gaming-laptops/razer-blade-18',
      affiliate: false,
    },
    tags: ['local-llm', 'claude-code', 'workstation'],
    hue: 214,
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'apple-macbook-pro-m5-max',
    category: 'laptops',
    brand: 'Apple',
    name: 'MacBook Pro M5 Max (14-inch and 16-inch)',
    blurb:
      'Up to 128GB of unified memory at 614 GB/s makes the M5 Max the most capable consumer laptop for fitting larger LLMs entirely in memory, and the silent thermals run for hours on battery.',
    specs: [
      'Apple M5 Max, 18-core CPU (6 efficiency + 12 performance)',
      '32-core GPU with hardware ray tracing and Neural Engine',
      'Up to 128GB unified memory, 614 GB/s bandwidth',
      'Up to 8TB SSD, 14.5 GB/s read/write',
      '14.2-inch or 16.2-inch Liquid Retina XDR, Wi-Fi 7, Thunderbolt 5',
    ],
    aiUse:
      'Local LLMs up to 70B 4-bit via MLX or llama.cpp, on-device whisper transcription, MLX fine-tuning of 7B-13B models, Claude Code on battery for hours.',
    badges: ['editor', 'new'],
    price: '$3,599 to $7,199',
    priceNote: 'APPLE.COM',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0GR1G1FY7',
      affiliate: true,
    },
    secondaryCta: {
      label: 'Apple.com',
      kind: 'direct',
      url: 'https://www.apple.com/macbook-pro/specs/',
      affiliate: false,
    },
    tags: ['local-llm', 'claude-code', 'unified-memory', 'battery-life'],
    hue: 214,
    image: '/gear/apple-macbook-pro-m5-max.jpg',
    imageAlt: 'Apple MacBook Pro M5 Max, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
    featured: true,
  },
  {
    id: 'framework-laptop-16-rtx-5070',
    category: 'laptops',
    brand: 'Framework',
    name: 'Laptop 16 with RTX 5070 Graphics Module',
    blurb:
      'The only modular laptop where the GPU is a user-swappable cartridge, so when the RTX 6070 module ships you upgrade the laptop, not replace it.',
    specs: [
      'AMD Ryzen AI 7 350 or Ryzen AI 9 HX 370',
      'NVIDIA RTX 5070 Laptop GPU module, 8GB or 12GB GDDR7, 100W TGP on AC',
      '16GB to 64GB DDR5-5600 (user upgradeable)',
      '512GB to 2TB NVMe SSD, modular expansion cards',
      '16-inch 2.5K 165Hz IPS, swappable input deck',
    ],
    aiUse:
      'Local LLMs 7B-13B 4-bit, Stable Diffusion 1.5 and SDXL, light fine-tuning with LoRA, agent prototyping with a repairability-first hardware story.',
    badges: ['editor', 'new'],
    price: '$2,149 to $3,199',
    priceNote: 'FRAME.WORK',
    cta: {
      label: 'Visit Framework',
      kind: 'direct',
      url: 'https://frame.work/laptop16',
      affiliate: false,
    },
    tags: ['local-llm', 'modular', 'claude-code'],
    hue: 214,
    image: '/gear/framework-laptop-16-rtx-5070.jpg',
    imageAlt: 'Framework Laptop 16 with RTX 5070 graphics module, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── GPUs ───────────────────────────────────────────────────────────
  {
    id: 'nvidia-rtx-5090',
    category: 'gpus',
    brand: 'NVIDIA',
    name: 'GeForce RTX 5090',
    blurb:
      '32GB of GDDR7 at 1,792 GB/s makes the 5090 the highest VRAM consumer GPU shipping, fitting a full 30B model in fp8 or a quantized 70B with room for context.',
    specs: [
      '21,760 CUDA cores, 170 SMs, Blackwell architecture',
      '32GB GDDR7, 512-bit bus, 1,792 GB/s bandwidth',
      '5th gen Tensor cores, 4th gen RT cores, DLSS 4',
      '575W TDP, recommended 1000W PSU',
      'PCIe 5.0 x16, three DisplayPort 2.1, one HDMI 2.1b',
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
    featured: true,
  },
  {
    id: 'nvidia-rtx-5080',
    category: 'gpus',
    brand: 'NVIDIA',
    name: 'GeForce RTX 5080',
    blurb:
      '16GB of GDDR7 at 960 GB/s puts the 5080 right at the 13B-fp16 and 30B-4bit sweet spot for builders who want CUDA without the 5090 tax.',
    specs: [
      '10,752 CUDA cores, Blackwell architecture',
      '16GB GDDR7, 256-bit bus, 960 GB/s bandwidth',
      '5th gen Tensor cores, 4th gen RT cores',
      '360W TDP, recommended 850W PSU',
      'PCIe 5.0 x16, three DisplayPort 2.1, one HDMI 2.1b',
    ],
    aiUse:
      'Local LLMs 13B fp16 or 30B 4-bit quantized, Stable Diffusion XL and 3.5, LoRA fine-tuning on 7B models, Claude Code at desktop speeds.',
    badges: ['new'],
    price: '$1,099 to $1,799',
    priceNote: 'STREET, MAY 2026',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0DQSMMCSH',
      affiliate: true,
    },
    secondaryCta: {
      label: 'NVIDIA.com',
      kind: 'direct',
      url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/',
      affiliate: false,
    },
    tags: ['local-llm', 'claude-code', 'stable-diffusion'],
    hue: 160,
    image: '/gear/nvidia-rtx-5080.png',
    imageAlt: 'NVIDIA GeForce RTX 5080, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'nvidia-rtx-6000-ada',
    category: 'gpus',
    brand: 'NVIDIA',
    name: 'RTX 6000 Ada Generation',
    blurb:
      '48GB of ECC GDDR6 in a 300W blower card is the right answer for builders who need a quiet workstation that can hold a 70B 4-bit model entirely on one GPU.',
    specs: [
      '18,176 CUDA cores, 142 RT cores, 568 Tensor cores',
      '48GB GDDR6 with ECC, 960 GB/s bandwidth',
      '300W TDP, dual-slot blower active cooling',
      'PCIe 4.0 x16, four DisplayPort 1.4a, AV1 encode and decode',
      'Workstation drivers, multi-GPU friendly',
    ],
    aiUse:
      'Local LLMs up to 70B 4-bit on a single card, 13B fp16, multi-GPU fine-tuning at 96GB and beyond, professional rendering and simulation alongside AI.',
    badges: ['editor'],
    pin: 'BEST FOR LOCAL LLM',
    price: '$6,800 to $8,210',
    priceNote: 'NVIDIA.COM',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0CJR4HJDF',
      affiliate: true,
    },
    secondaryCta: {
      label: 'NVIDIA.com',
      kind: 'direct',
      url: 'https://www.nvidia.com/en-us/products/workstations/rtx-6000/',
      affiliate: false,
    },
    tags: ['local-llm', 'fine-tuning', 'workstation', 'multi-gpu'],
    hue: 160,
    image: '/gear/nvidia-rtx-6000-ada.jpg',
    imageAlt: 'NVIDIA RTX 6000 Ada Generation, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── XR / AR Glasses ────────────────────────────────────────────────
  {
    id: 'meta-ray-ban-display',
    category: 'xr',
    brand: 'Meta',
    name: 'Ray-Ban Display',
    blurb:
      'The first mass-market AI glasses with an actual in-lens display, paired with an EMG wristband that reads finger twitches as input, making it the closest thing to a wearable agent UI in 2026.',
    specs: [
      '600 x 600 monocular in-lens display, 90Hz refresh, 20-degree FOV',
      '30 to 5,000 nits brightness, less than 2 percent light leakage',
      'Qualcomm Snapdragon AR1 Gen 1, 12MP camera, 5 mics, dual off-ear speakers',
      'Up to 6 hours mixed use, 30 hours with the case',
      'Meta Neural Band EMG wristband included',
    ],
    aiUse:
      'Conversational Meta AI agent on the lens, real-time translation, message and notification glanceables, first-person camera for vision-LLM workflows.',
    badges: ['editor', 'new'],
    price: '$799',
    priceNote: 'META.COM',
    cta: {
      label: 'Visit Meta',
      kind: 'direct',
      url: 'https://www.meta.com/ai-glasses/meta-ray-ban-display/',
      affiliate: false,
    },
    tags: ['wearable-agent', 'vision-llm', 'ambient-ai'],
    hue: 320,
    image: '/gear/meta-ray-ban-display.png',
    imageAlt: 'Meta Ray-Ban Display AI glasses, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
    featured: true,
  },
  {
    id: 'xreal-one-pro',
    category: 'xr',
    brand: 'Xreal',
    name: 'One Pro',
    blurb:
      'A 171-inch virtual 1080p display strapped to your face at 3.1 ounces, ideal for running a Claude Code session on a Steam Deck or laptop while traveling.',
    specs: [
      'Sony 0.55-inch Micro OLED, 1080p per eye, 120Hz',
      '57-degree FOV, 171-inch virtual display',
      'X1 chip for 3DoF spatial tracking, Real 3D 2D-to-3D conversion',
      'Bose-tuned open-ear speakers, USB-C wired connection',
      '3.1 ounces, IPD 57 to 66mm',
    ],
    aiUse:
      'Portable second screen for Claude Code, agent development, or LLM chat workflows when paired with a Mac, Steam Deck, ROG Ally, or compatible phone.',
    badges: ['new'],
    price: '$599',
    priceNote: 'XREAL.COM',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0FDPGHVCB',
      affiliate: true,
    },
    secondaryCta: {
      label: 'Xreal.com',
      kind: 'direct',
      url: 'https://us.shop.xreal.com/products/xreal-one-pro',
      affiliate: false,
    },
    tags: ['wearable-display', 'claude-code', 'portable'],
    hue: 320,
    image: '/gear/xreal-one-pro.jpg',
    imageAlt: 'Xreal One Pro AR glasses, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'even-realities-g1',
    category: 'xr',
    brand: 'Even Realities',
    name: 'G1',
    blurb:
      'The lightest in-lens display glasses that pass for normal eyewear, designed around teleprompt, translate, navigate, and AI assistant flows rather than gaming or media.',
    specs: [
      'Dual in-lens micro-projectors, monochrome green text overlay',
      'Panto or rectangular frame, magnesium fused with sandstone',
      'Hypoallergenic titanium and silicone temple tips',
      'iOS and Android compatible, ambient brightness sensors',
      'Optional Pro translation subscription',
    ],
    aiUse:
      'Heads-up AI assistant prompts, live translation overlays, teleprompt for content creators, navigation, low-key wearable agent UI for daily wear.',
    badges: ['new'],
    price: '$599 to $849',
    priceNote: 'EVENREALITIES.COM',
    cta: {
      label: 'Visit Even Realities',
      kind: 'direct',
      url: 'https://www.evenrealities.com/g1',
      affiliate: false,
    },
    tags: ['wearable-agent', 'ambient-ai', 'translation'],
    hue: 320,
    image: '/gear/even-realities-g1.jpg',
    imageAlt: 'Even Realities G1 smart glasses, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'brilliant-labs-frame',
    category: 'xr',
    brand: 'Brilliant Labs',
    name: 'Frame',
    blurb:
      'Open source AI glasses with full design files on GitHub, a microOLED, a camera, and Noa, a hackable LLM assistant that turns the frame into a dev kit rather than a finished product.',
    specs: [
      '640 x 400 microOLED, 500 nits, 20-degree diagonal FOV',
      'Nordic nRF52840 ARM Cortex-M4F, Lattice CrosslinkNX FPGA',
      'Camera on the brim, microphone, IPD 58 to 72mm',
      'Under 40g, all-day battery with Mister Power charger',
      'Fully open source hardware and software (design files on GitHub)',
    ],
    aiUse:
      'Hackable wearable LLM dev kit, custom on-device vision models, Noa AI assistant out of the box, ideal for agent builders who want to own the stack.',
    badges: ['experimental', 'new'],
    price: '$349',
    priceNote: 'BRILLIANT.XYZ',
    cta: {
      label: 'Visit Brilliant Labs',
      kind: 'direct',
      url: 'https://brilliant.xyz/products/frame',
      affiliate: false,
    },
    tags: ['open-source', 'wearable-agent', 'dev-kit', 'vision-llm'],
    hue: 320,
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── Wearables ──────────────────────────────────────────────────────
  {
    id: 'plaud-note-pro',
    category: 'wearables',
    brand: 'Plaud',
    name: 'Note Pro',
    blurb:
      'A 0.12-inch thin AI voice recorder that lives on the back of your phone and turns every meeting into a searchable, summarized transcript.',
    specs: [
      '4 MEMS mics + 1 VPU, captures voices up to 16.4 ft',
      '30 hours continuous recording, 60 days standby',
      '64 GB onboard storage',
      'InstantView display for live status',
      '112-language transcription with speaker labels',
    ],
    aiUse:
      'Off-device meeting capture, then on-cloud LLM transcription, multidimensional summaries, mind maps, and template-driven action items.',
    badges: ['editor', 'new'],
    price: '$189 plus optional subscription',
    priceNote: 'PLAUD.AI',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0FYQ4Y2ZZ',
      affiliate: true,
    },
    secondaryCta: {
      label: 'Plaud.ai',
      kind: 'direct',
      url: 'https://www.plaud.ai/products/plaud-note-pro',
      affiliate: false,
    },
    tags: ['ai-wearable', 'transcription', 'voice-recorder', 'meetings'],
    hue: 340,
    image: '/gear/plaud-note-pro.webp',
    imageAlt: 'Plaud Note Pro AI voice recorder, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
    featured: true,
  },
  {
    id: 'bee-pioneer',
    category: 'wearables',
    brand: 'Bee',
    name: 'Pioneer',
    blurb:
      'A $49 always-on AI wristband that listens to your day, then writes the to-do list, recap, and reminders for you.',
    specs: [
      '7-day battery life, 160+ hours of always-on capture',
      'Wrist-worn fabric strap form factor',
      'Bluetooth pairing to iOS or Android',
      'AI summaries, action items, and conversational memory',
      'Cloud-side LLM processing',
    ],
    aiUse:
      'Ambient life-logging plus auto-generated to-do lists, reminders, and daily recaps. Lowest barrier to entry for trying always-on AI wearables.',
    badges: ['experimental', 'new'],
    price: '$49.99 plus $19 per month',
    priceNote: 'BEE.COMPUTER',
    cta: {
      label: 'Visit Bee',
      kind: 'direct',
      url: 'https://bee.computer/bee-pioneer',
      affiliate: false,
    },
    tags: ['ai-wearable', 'always-on', 'lifelog', 'ambient-ai'],
    hue: 340,
    image: '/gear/bee-pioneer.jpg',
    imageAlt: 'Bee Pioneer AI wristband, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── Robotics ───────────────────────────────────────────────────────
  {
    id: 'unitree-go2',
    category: 'robotics',
    brand: 'Unitree',
    name: 'Go2',
    blurb:
      'The most accessible quadruped robot money can buy, with onboard LiDAR and a real SDK path for serious robotics work.',
    specs: [
      'L2 4D LiDAR, 360 by 96 degree hemispherical FOV',
      '13 km/h top speed',
      '8,000 mAh battery, 15,000 mAh optional',
      '16 kg Pro variant weight',
      'EDU tiers unlock SDK, ROS 2, low-level motor control',
    ],
    aiUse:
      'Custom robotics research, autonomy experiments, LiDAR-based mapping, and the closest you can get to a hobbyist humanoid platform without spending Boston Dynamics money.',
    badges: ['new'],
    price: '$1,600 to $29,999',
    priceNote: 'UNITREE.COM',
    cta: {
      label: 'Visit Unitree',
      kind: 'direct',
      url: 'https://shop.unitree.com/products/unitree-go2',
      affiliate: false,
    },
    tags: ['quadruped', 'robotics', 'lidar', 'embodied-ai'],
    hue: 12,
    image: '/gear/unitree-go2.png',
    imageAlt: 'Unitree Go2 quadruped robot, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'unitree-g1',
    category: 'robotics',
    brand: 'Unitree',
    name: 'G1',
    blurb:
      'A 127 cm humanoid robot with 23 degrees of freedom, available off the shelf for $16K.',
    specs: [
      '23 to 43 degrees of freedom across configurations',
      '127 cm tall, 35 kg',
      '3D LiDAR, depth cameras, force-controlled hands',
      'Approximately 2 hours runtime under active use',
      '16 base configurations available',
    ],
    aiUse:
      'Hands-on humanoid robotics development, embodied AI research, motion-policy experimentation, and the most affordable platform for ML researchers who want to deploy on a real bipedal robot.',
    badges: ['editor', 'new'],
    pin: 'BEST FOR RESEARCH',
    price: '$16,000 to $73,900',
    priceNote: 'UNITREE.COM',
    cta: {
      label: 'Visit Unitree',
      kind: 'direct',
      url: 'https://shop.unitree.com/products/unitree-g1',
      affiliate: false,
    },
    tags: ['humanoid', 'robotics', 'embodied-ai', 'research'],
    hue: 12,
    image: '/gear/unitree-g1.jpg',
    imageAlt: 'Unitree G1 humanoid robot, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: '1x-neo',
    category: 'robotics',
    brand: '1X Technologies',
    name: 'NEO',
    blurb:
      'A 66-pound household humanoid robot built for the home, now taking preorders with first deliveries to US homes in 2026.',
    specs: [
      '66 lb weight, lifts 150 lb, carries 55 lb',
      '22 DoF hands with human-level dexterity',
      'Custom 3D lattice polymer soft body',
      '22 dB operating noise',
      'Cloud and on-device AI mix',
    ],
    aiUse:
      'Whole-home household automation: fetching items, opening doors, light operation. First commercial test of a household-class general-purpose humanoid.',
    badges: ['editor', 'experimental', 'new'],
    price: '$20,000 or $499 per month',
    priceNote: '1X.TECH',
    cta: {
      label: 'Visit 1X',
      kind: 'direct',
      url: 'https://www.1x.tech/order',
      affiliate: false,
    },
    tags: ['humanoid', 'robotics', 'household', 'preorder'],
    hue: 12,
    image: '/gear/1x-neo.webp',
    imageAlt: '1X NEO household humanoid robot, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
    featured: true,
  },

  // ── Edge AI Devices ────────────────────────────────────────────────
  {
    id: 'jetson-orin-nano-super',
    category: 'edge',
    brand: 'NVIDIA',
    name: 'Jetson Orin Nano Super Developer Kit',
    blurb:
      'NVIDIA cut the Orin Nano dev kit to $249 and bumped its AI throughput in the same move, making it the runaway leader in hobbyist edge AI.',
    specs: [
      'Up to roughly 67 TOPS sparse INT8 AI performance',
      '6-core Arm Cortex-A78AE CPU',
      '8 GB LPDDR5',
      'M.2 Key M and Key E slots',
      'USB-C, DisplayPort, gigabit Ethernet',
    ],
    aiUse:
      'Local LLM inference at the small-model tier, robotics dev kits, vision pipelines, and the standard reference platform for the entire LeRobot and Isaac ROS stack.',
    badges: ['editor', 'new'],
    pin: 'BEST FOR LOCAL LLM',
    price: '$249',
    priceNote: 'NVIDIA.COM',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0BZJTQ5YP',
      affiliate: true,
    },
    secondaryCta: {
      label: 'NVIDIA.com',
      kind: 'direct',
      url: 'https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/nano-super-developer-kit/',
      affiliate: false,
    },
    tags: ['edge-ai', 'nvidia', 'jetson', 'dev-kit'],
    hue: 145,
    image: '/gear/jetson-orin-nano-super.jpg',
    imageAlt: 'NVIDIA Jetson Orin Nano Super Developer Kit, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
    featured: true,
  },
  {
    id: 'hailo-8-m2',
    category: 'edge',
    brand: 'Hailo',
    name: 'Hailo-8 M.2 AI Accelerator',
    blurb:
      'A 26 TOPS M.2 card that drops into a Raspberry Pi 5 or mini PC and quietly outclasses every Edge TPU on the market.',
    specs: [
      '26 TOPS Hailo-8 processor',
      'Approximately 2.5 W typical power draw',
      'M.2 2230, 2242, 2260, 2280 form factors',
      'PCIe Gen 3 x2 or x4 depending on key',
      'TensorFlow, TensorFlow Lite, ONNX, Keras, PyTorch',
    ],
    aiUse:
      'Edge vision pipelines, real-time object detection, NVR-style smart cameras, and any embedded build that needs more headroom than a Coral TPU but less heat than a Jetson.',
    badges: ['new'],
    price: '$169 to $249',
    priceNote: 'HAILO.AI',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0D9298XL5',
      affiliate: true,
    },
    secondaryCta: {
      label: 'Hailo.ai',
      kind: 'direct',
      url: 'https://hailo.ai/products/ai-accelerators/hailo-8-m2-ai-acceleration-module/',
      affiliate: false,
    },
    tags: ['edge-ai', 'accelerator', 'hailo', 'm2'],
    hue: 145,
    image: '/gear/hailo-8-m2.jpg',
    imageAlt: 'Hailo-8 M.2 AI accelerator card, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── Audio & Voice ──────────────────────────────────────────────────
  {
    id: 'rabbit-r1',
    category: 'audio',
    brand: 'Rabbit',
    name: 'R1',
    blurb:
      'The original orange AI handheld, still shipping in 2026 with a roadmap that now includes a CLI-flavored cyberdeck successor.',
    specs: [
      '2.88-inch touchscreen',
      'Push-to-talk button, scroll wheel',
      '4G LTE, Wi-Fi, Bluetooth',
      'Camera with rotating module',
      'Rabbit OS with LAM agent layer',
    ],
    aiUse:
      'Standalone always-with-you agent device, useful for testing agentic UX patterns without pulling out a phone. Mostly interesting as a category landmark and live experiment.',
    badges: ['experimental', 'new'],
    price: '$199',
    priceNote: 'RABBIT.TECH',
    cta: {
      label: 'Visit Rabbit',
      kind: 'direct',
      url: 'https://www.rabbit.tech',
      affiliate: false,
    },
    tags: ['ai-handheld', 'agent', 'voice-ui'],
    hue: 40,
    image: '/gear/rabbit-r1.webp',
    imageAlt: 'Rabbit R1 AI handheld device, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── Cameras & Vision ───────────────────────────────────────────────
  {
    id: 'dji-osmo-pocket-3',
    category: 'cameras',
    brand: 'DJI',
    name: 'Osmo Pocket 3',
    blurb:
      'A 1-inch sensor gimbal camera whose ActiveTrack 6.0 subject tracking is one of the best on-device computer vision implementations shipping today.',
    specs: [
      '1-inch CMOS sensor, 4K at 120 fps',
      '3-axis mechanical gimbal',
      'ActiveTrack 6.0 with subject re-acquisition',
      'Face Auto-Detect and Dynamic Framing',
      'USB-C, rotating OLED touchscreen',
    ],
    aiUse:
      'Hands-free vlogging with on-device subject tracking, single-operator interview capture, AI-assisted reframing for short-form video pipelines.',
    badges: ['new'],
    price: '$419 to $629',
    priceNote: 'STREET',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0CG19QXWD',
      affiliate: true,
    },
    secondaryCta: {
      label: 'DJI.com',
      kind: 'direct',
      url: 'https://store.dji.com/product/osmo-pocket-3',
      affiliate: false,
    },
    tags: ['camera', 'computer-vision', 'subject-tracking', 'vlogging'],
    hue: 195,
    image: '/gear/dji-osmo-pocket-3.jpg',
    imageAlt: 'DJI Osmo Pocket 3 gimbal camera, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'insta360-x5',
    category: 'cameras',
    brand: 'Insta360',
    name: 'X5',
    blurb:
      'A 360-degree 8K action cam whose AI app auto-edits highlight reels and runs low-light denoising as a post-capture pipeline.',
    specs: [
      '8K 360-degree video capture',
      'Replaceable lens modules',
      'AI-powered low-light shooting',
      'App-side highlight detection and auto-edit',
      'USB-C, IPX-rated body',
    ],
    aiUse:
      'Capture-once-edit-later content workflows, automatic highlight reel generation, AI reframing from 360 source to flat output.',
    badges: ['new'],
    price: '$549.99',
    priceNote: 'INSTA360.COM',
    cta: {
      label: 'Visit Insta360',
      kind: 'direct',
      url: 'https://store.insta360.com/product/x5',
      affiliate: false,
    },
    tags: ['camera', '360', 'ai-editing', 'action-cam'],
    hue: 195,
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'nest-cam-gemini',
    category: 'cameras',
    brand: 'Google',
    name: 'Nest Cam with Gemini for Home',
    blurb:
      'Third-generation 2K HDR Nest Cams that hand video to Gemini so you can ask what happened to the vase in the living room and get a real answer.',
    specs: [
      '2K HDR video, 166-degree field of view',
      'IP65 rated outdoor variants',
      'Encrypted video, visible recording LED',
      'Gemini for Home integration',
      'Indoor, Outdoor, and Doorbell variants',
    ],
    aiUse:
      'Natural-language video search, AI-generated event summaries, detailed multimodal alerts. One of the first mainstream consumer products where you actually talk to your security footage.',
    badges: ['new'],
    price: '$99.99 to $179.99',
    priceNote: 'STORE.GOOGLE.COM',
    cta: {
      label: 'Visit Google Store',
      kind: 'direct',
      url: 'https://store.google.com/us/category/nest_cameras',
      affiliate: false,
    },
    tags: ['smart-home', 'gemini', 'security-camera', 'multimodal'],
    hue: 195,
    image: '/gear/nest-cam-gemini.jpg',
    imageAlt: 'Google Nest Cam with Gemini for Home, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── Smart Home AI ──────────────────────────────────────────────────
  {
    id: 'echo-show-11',
    category: 'smart',
    brand: 'Amazon',
    name: 'Echo Show 11',
    blurb:
      'The first Echo built around Alexa+, with a custom AZ3 Pro chip running on-device language models and vision transformers.',
    specs: [
      '11-inch Full HD touchscreen',
      'AZ3 Pro custom silicon',
      '13 MP camera plus Omnisense ambient sensors',
      'Built-in Zigbee, Matter, Thread hub',
      'Alexa+ included with device purchase',
    ],
    aiUse:
      'Voice-first home hub, ambient-AI presence detection, multi-step household agent commands, the canonical consumer test case for an agent that lives in the kitchen.',
    badges: ['new'],
    price: '$219.99',
    priceNote: 'AMAZON',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0DC91H3JK',
      affiliate: true,
    },
    tags: ['smart-home', 'ambient-ai', 'alexa-plus', 'voice-assistant'],
    hue: 260,
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── Peripherals ────────────────────────────────────────────────────
  {
    id: 'shure-mv7i',
    category: 'peripherals',
    brand: 'Shure',
    name: 'MV7i Smart Microphone',
    blurb:
      'A USB and XLR podcast mic with a built-in audio interface and on-board AI DSP that handles gain, denoise, and gating automatically.',
    specs: [
      'USB-C and XLR dual connection',
      'Built-in audio interface',
      'Auto Level Mode with SmartGate',
      'Real-time DSP denoiser',
      'Voice Isolation Technology',
    ],
    aiUse:
      'AI podcasting and live streaming setups where automatic gain riding, noise removal, and voice isolation replace a human operator. Strong fit for solo creators and remote-recording workflows.',
    badges: ['new'],
    price: '$349',
    priceNote: 'SHURE.COM',
    cta: {
      label: 'Visit Shure',
      kind: 'direct',
      url: 'https://www.shure.com/en-US/products/microphones/mv7i',
      affiliate: false,
    },
    tags: ['peripherals', 'microphone', 'voice-ai', 'podcasting'],
    hue: 220,
    image: '/gear/shure-mv7i.jpg',
    imageAlt: 'Shure MV7i smart microphone, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'elgato-stream-deck-plus',
    category: 'peripherals',
    brand: 'Elgato',
    name: 'Stream Deck Plus',
    blurb:
      'With Stream Deck 7.4, the LCD-key controller now speaks MCP, which means Claude or ChatGPT can fire any key as a tool call.',
    specs: [
      '8 LCD keys, 4 dials, touch strip',
      'Stream Deck 7.4 software with MCP support',
      'USB-C, integrated tilting stand',
      'Per-key customizable display',
      'MCP-callable actions via dedicated profile',
    ],
    aiUse:
      'Building a tactile agent control panel where Claude or other LLM agents can trigger OBS scenes, smart-home routines, AI workflows, or app shortcuts via MCP calls.',
    badges: ['editor', 'new'],
    pin: 'MCP READY',
    price: '$199.99',
    priceNote: 'ELGATO.COM',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0BCM2WWWH',
      affiliate: true,
    },
    secondaryCta: {
      label: 'Elgato.com',
      kind: 'direct',
      url: 'https://www.elgato.com/us/en/p/stream-deck-plus-black',
      affiliate: false,
    },
    tags: ['peripherals', 'mcp', 'agent-control', 'productivity'],
    hue: 220,
    image: '/gear/elgato-stream-deck-plus.jpg',
    imageAlt: 'Elgato Stream Deck Plus with LCD keys and dials, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
    featured: true,
  },

  // ── Storage & Memory ───────────────────────────────────────────────
  {
    id: 'crucial-pro-ddr5-64gb',
    category: 'storage',
    brand: 'Crucial',
    name: 'Pro 64GB DDR5-6400 Kit',
    blurb:
      'A 2x32GB DDR5-6400 kit sized exactly for running 70B-class local models with headroom for the rest of your machine.',
    specs: [
      '64 GB total (2 x 32 GB)',
      'DDR5-6400 PC5-51200',
      'CL40 timings',
      'Intel XMP 3.0 and AMD EXPO profiles',
      'Lifetime warranty',
    ],
    aiUse:
      'Running 70B-class quantized LLMs locally with llama.cpp, Ollama, or LM Studio, plus heavy multi-app workflows around an AI dev environment.',
    badges: ['new'],
    pin: 'BEST FOR LOCAL LLM',
    price: '$209.99 to $269.99',
    priceNote: 'CRUCIAL.COM',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0CJV2X7HF',
      affiliate: true,
    },
    secondaryCta: {
      label: 'Crucial.com',
      kind: 'direct',
      url: 'https://www.crucial.com/memory/ddr5/ct2k32g64c52cs5',
      affiliate: false,
    },
    tags: ['memory', 'local-llm', 'ddr5', 'prosumer'],
    hue: 180,
    image: '/gear/crucial-pro-ddr5-64gb.png',
    imageAlt: 'Crucial Pro 64GB DDR5-6400 memory kit, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'wd-black-sn850x-4tb',
    category: 'storage',
    brand: 'Western Digital',
    name: 'WD_BLACK SN850X 4TB',
    blurb:
      'A 4 TB PCIe Gen4 NVMe SSD with the speed budget to host a full quantized 70B model plus your working datasets.',
    specs: [
      '4 TB capacity',
      '7,300 MB/s sequential read',
      '6,300 MB/s sequential write',
      'PCIe Gen 4 x4, M.2 2280',
      'Optional heatsink variant',
    ],
    aiUse:
      'Local LLM weight storage, dataset caching, embedding stores, and the obvious upgrade for any workstation that runs llama.cpp, ComfyUI, or training jobs locally.',
    badges: ['new'],
    pin: 'BEST FOR LOCAL LLM',
    price: '$259 to $599',
    priceNote: 'STREET',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/B0B7CQ2CHH',
      affiliate: true,
    },
    tags: ['storage', 'nvme', 'local-llm', 'ssd'],
    hue: 180,
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── Books & Learning ───────────────────────────────────────────────
  {
    id: 'ai-engineering-huyen',
    category: 'books',
    brand: "O'Reilly",
    name: 'AI Engineering by Chip Huyen',
    blurb:
      "The most-read book on the O'Reilly platform in 2025, framing the entire LLM application stack from foundation model choice through deployment.",
    specs: [
      "O'Reilly Media, 2025",
      'ISBN 978-1098166304',
      'Paperback and Kindle editions',
      'Translated into 6+ languages',
      'Companion repo at github.com/chiphuyen/aie-book',
    ],
    aiUse:
      "The canonical text for AI engineers shipping production LLM applications. Pairs with Huyen's earlier Designing Machine Learning Systems for the full ML-systems curriculum.",
    badges: ['editor', 'new'],
    price: '$59.99',
    priceNote: "O'REILLY",
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/1098166302',
      affiliate: true,
    },
    secondaryCta: {
      label: "O'Reilly",
      kind: 'direct',
      url: 'https://www.oreilly.com/library/view/ai-engineering/9781098166298/',
      affiliate: false,
    },
    tags: ['book', 'ai-engineering', 'llm', 'learning'],
    hue: 28,
    image: '/gear/ai-engineering-huyen.jpg',
    imageAlt: 'AI Engineering by Chip Huyen, book cover',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'designing-ml-systems',
    category: 'books',
    brand: "O'Reilly",
    name: 'Designing Machine Learning Systems by Chip Huyen',
    blurb:
      'The book that taught a generation of ML engineers how to ship real systems before LLMs reset the conversation.',
    specs: [
      "O'Reilly Media, 2022",
      'ISBN 978-1098107963',
      "Paperback, Kindle, O'Reilly online",
      'Companion repo at github.com/chiphuyen/dmls-book',
      'Used in Stanford CS 329S',
    ],
    aiUse:
      'Foundational reading for anyone building classical ML systems alongside LLMs, especially data engineers, ML platform engineers, and engineering managers.',
    badges: ['editor'],
    price: '$49.99',
    priceNote: "O'REILLY",
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/1098107969',
      affiliate: true,
    },
    secondaryCta: {
      label: "O'Reilly",
      kind: 'direct',
      url: 'https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/',
      affiliate: false,
    },
    tags: ['book', 'ml-systems', 'mlops', 'learning'],
    hue: 28,
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
  {
    id: 'the-coming-wave',
    category: 'books',
    brand: 'Crown',
    name: 'The Coming Wave by Mustafa Suleyman',
    blurb:
      "The DeepMind cofounder's case for why containment, not capability, is the defining problem of the AI era.",
    specs: [
      'Hardcover, paperback, audiobook, Kindle',
      '352 pages',
      'ISBN 978-0593593950',
      'Crown imprint, Penguin Random House',
      'Co-authored with Michael Bhaskar',
    ],
    aiUse:
      'Required context for anyone working on AI policy, alignment, or governance, and a clean argument primer for talking to non-technical audiences about why this matters.',
    badges: ['new'],
    price: '$18 to $32',
    priceNote: 'PENGUIN RANDOM HOUSE',
    cta: {
      label: 'View on Amazon',
      kind: 'amazon',
      url: 'https://www.amazon.com/dp/0593593952',
      affiliate: true,
    },
    secondaryCta: {
      label: 'Publisher',
      kind: 'direct',
      url: 'https://www.penguinrandomhouse.com/books/722674/the-coming-wave-by-mustafa-suleyman-with-michael-bhaskar/',
      affiliate: false,
    },
    tags: ['book', 'ai-policy', 'governance', 'learning'],
    hue: 28,
    image: '/gear/the-coming-wave.jpg',
    imageAlt: 'The Coming Wave by Mustafa Suleyman, book cover',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },

  // ── Experimental ───────────────────────────────────────────────────
  {
    id: 'friend-pendant',
    category: 'experimental',
    brand: 'Friend.com',
    name: 'Friend',
    blurb:
      'A $129 AI companion necklace that listens around the clock and texts you commentary like a slightly judgmental roommate.',
    specs: [
      'Always-on microphone, water-resistant pendant',
      'Bluetooth pairing to a paired phone',
      'Approximately 30-hour battery between charges',
      'Text-message-style commentary, no transcript surface',
      'Cloud LLM backend',
    ],
    aiUse:
      'AI companionship and ambient social texting. A pure experiment in always-listening hardware, useful as a category marker more than a productivity tool.',
    badges: ['experimental', 'new'],
    price: '$129',
    priceNote: 'FRIEND.COM',
    cta: {
      label: 'Visit Friend',
      kind: 'direct',
      url: 'https://www.friend.com',
      affiliate: false,
    },
    tags: ['ai-companion', 'ambient-ai', 'experimental', 'always-listening'],
    hue: 280,
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
    featured: true,
  },
  {
    id: 'comma-3x',
    category: 'experimental',
    brand: 'Comma.ai',
    name: '3X',
    blurb:
      'A $1,249 windshield-mount box that runs openpilot and adds Tesla-grade lane-keeping plus longitudinal assist to 325+ stock vehicles.',
    specs: [
      'Triple-camera vision system',
      'Runs open-source openpilot',
      'Snapdragon-class SoC',
      'Supports 325+ vehicles as of 2026',
      '$300 vehicle harness sold separately',
    ],
    aiUse:
      'Aftermarket lane centering plus adaptive cruise on a stock car, driving an open-source ADAS stack you can audit and retrain. The most accessible self-driving R and D platform on the road.',
    badges: ['editor', 'experimental', 'new'],
    price: '$1,249 plus $300 harness',
    priceNote: 'COMMA.AI',
    cta: {
      label: 'Visit Comma',
      kind: 'direct',
      url: 'https://comma.ai',
      affiliate: false,
    },
    tags: ['self-driving', 'open-source', 'automotive', 'embedded-ai'],
    hue: 280,
    image: '/gear/comma-3x.jpg',
    imageAlt: 'Comma 3X self-driving box, product photograph',
    addedAt: '2026-05-23',
    reviewedAt: '2026-05-23',
  },
];

const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map(p => [p.id, p])
);

export function getProduct(id: string): Product | undefined {
  return PRODUCT_BY_ID[id];
}

export function getProductsByCategory(categoryId: string): Product[] {
  return PRODUCTS.filter(p => p.category === categoryId);
}

export function getFeaturedProducts(): Product[] {
  return PRODUCTS.filter(p => p.featured);
}

export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of PRODUCTS) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return counts;
}

export function getActiveCategoryIds(): string[] {
  const counts = getCategoryCounts();
  return Object.keys(counts).filter(k => counts[k] > 0);
}
