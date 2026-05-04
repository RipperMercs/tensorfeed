/**
 * Embodied AI catalog: vision-language-action (VLA) foundation models,
 * humanoid robotics platforms, real-world / sim training datasets, and
 * physics simulators that underpin robot learning. Curated editorial
 * catalog refreshed on redeploy.
 *
 * Why this lives here: the broader AI ecosystem catalogs (models,
 * specialized-models, multimodal) cover the LLM/multimodal axis well
 * but skip the robotics/embodied slice entirely. This file fills that
 * gap so /api/embodied-ai and the daily Hugging Face snapshot capture
 * the fastest-growing AI subfield in one place.
 *
 * Served at /api/embodied-ai (free, cached 600s).
 */

export type EmbodiedAICategory =
  | 'foundation_model' // generalist VLA / policy
  | 'humanoid'         // physical humanoid platform
  | 'dataset'          // real-world or sim training data
  | 'simulator';       // physics + rendering simulator

export interface EmbodiedAIEntry {
  id: string;
  name: string;
  org: string;
  category: EmbodiedAICategory;
  /** Parameter count for models (e.g. "7B"). null for hardware, datasets, simulators. */
  parameters: string | null;
  /** YYYY-MM of release or last major version. */
  released: string;
  /** License or commercial status. */
  license: string;
  /** Paper / blog announcement URL. */
  paperUrl: string | null;
  /** Code or weights URL (GitHub, HF). */
  codeUrl: string | null;
  /** Live demo / product URL. */
  demoUrl: string | null;
  /** One-to-two-sentence editorial note: what makes this entry notable. */
  notes: string;
}

export const EMBODIED_AI_CATALOG: EmbodiedAIEntry[] = [
  // ── Foundation models / VLAs / generalist policies ───────────
  {
    id: 'pi-0',
    name: 'pi-0',
    org: 'Physical Intelligence',
    category: 'foundation_model',
    parameters: '3.3B',
    released: '2024-10',
    license: 'Apache-2.0 (open weights)',
    paperUrl: 'https://www.physicalintelligence.company/blog/pi0',
    codeUrl: 'https://github.com/Physical-Intelligence/openpi',
    demoUrl: 'https://www.physicalintelligence.company',
    notes: 'Generalist VLA built on PaliGemma. Trained on 10K+ hours of cross-embodiment teleoperation data. The open release that broadly shifted the field toward VLA foundation models.',
  },
  {
    id: 'pi-0.5',
    name: 'pi-0.5',
    org: 'Physical Intelligence',
    category: 'foundation_model',
    parameters: '3.3B',
    released: '2025-04',
    license: 'open weights (research)',
    paperUrl: 'https://www.physicalintelligence.company/blog/pi05',
    codeUrl: 'https://github.com/Physical-Intelligence/openpi',
    demoUrl: 'https://www.physicalintelligence.company',
    notes: 'Successor to pi-0 with open-world generalization to homes the model never saw during training. Demonstrated end-to-end household tasks in unseen kitchens and bedrooms.',
  },
  {
    id: 'gr00t-n1',
    name: 'GR00T N1',
    org: 'NVIDIA',
    category: 'foundation_model',
    parameters: '2B',
    released: '2025-03',
    license: 'open weights',
    paperUrl: 'https://research.nvidia.com/labs/gear/gr00t/',
    codeUrl: 'https://huggingface.co/nvidia/GR00T-N1-2B',
    demoUrl: 'https://www.nvidia.com/en-us/ai/gr00t/',
    notes: 'NVIDIA dual-system VLA targeting humanoids: System-2 reasoning over a vision-language backbone, System-1 diffusion policy. First open NVIDIA humanoid foundation model.',
  },
  {
    id: 'rt-2',
    name: 'RT-2',
    org: 'Google DeepMind',
    category: 'foundation_model',
    parameters: '55B',
    released: '2023-07',
    license: 'proprietary',
    paperUrl: 'https://robotics-transformer2.github.io',
    codeUrl: null,
    demoUrl: null,
    notes: 'First VLM-to-action transformer. PaLM-E-class backbone outputs robot actions as tokens. Closed but seeded the entire VLA category.',
  },
  {
    id: 'openvla',
    name: 'OpenVLA',
    org: 'Stanford / Berkeley / Toyota Research',
    category: 'foundation_model',
    parameters: '7B',
    released: '2024-06',
    license: 'MIT',
    paperUrl: 'https://openvla.github.io',
    codeUrl: 'https://github.com/openvla/openvla',
    demoUrl: 'https://huggingface.co/openvla/openvla-7b',
    notes: 'Open replication of RT-2 trained on Open X-Embodiment. The reference open VLA before pi-0; still widely fine-tuned for academic robotics work.',
  },
  {
    id: 'octo',
    name: 'Octo',
    org: 'Berkeley AI Research',
    category: 'foundation_model',
    parameters: '93M',
    released: '2024-05',
    license: 'MIT',
    paperUrl: 'https://octo-models.github.io',
    codeUrl: 'https://github.com/octo-models/octo',
    demoUrl: null,
    notes: 'Small generalist transformer policy (93M and 27M variants) trained on 800K Open X-Embodiment trajectories. Designed as a fine-tunable base.',
  },
  {
    id: 'rdt-1b',
    name: 'RDT-1B',
    org: 'Tsinghua University',
    category: 'foundation_model',
    parameters: '1.2B',
    released: '2024-10',
    license: 'MIT',
    paperUrl: 'https://rdt-robotics.github.io/rdt-robotics/',
    codeUrl: 'https://github.com/thu-ml/RoboticsDiffusionTransformer',
    demoUrl: null,
    notes: 'Largest open bimanual manipulation diffusion transformer at release. Pretrained on 1M+ multi-robot episodes, fine-tuned for bimanual ALOHA-class hardware.',
  },
  {
    id: 'helix',
    name: 'Helix',
    org: 'Figure AI',
    category: 'foundation_model',
    parameters: 'undisclosed',
    released: '2025-02',
    license: 'proprietary',
    paperUrl: 'https://www.figure.ai/news/helix',
    codeUrl: null,
    demoUrl: 'https://www.figure.ai',
    notes: 'Dual-system VLA powering Figure 02. Runs entirely onboard the humanoid (no cloud), controls both arms at 200Hz. First commercial humanoid foundation model in production.',
  },

  // ── Humanoid platforms ───────────────────────────────────────
  {
    id: 'figure-02',
    name: 'Figure 02',
    org: 'Figure AI',
    category: 'humanoid',
    parameters: null,
    released: '2024-08',
    license: 'commercial',
    paperUrl: 'https://www.figure.ai/news/introducing-figure-02',
    codeUrl: null,
    demoUrl: 'https://www.figure.ai',
    notes: '5\'6", 70kg humanoid with onboard NVIDIA compute. Shipping in BMW and other industrial pilots. Helix VLA runs locally on the robot.',
  },
  {
    id: '1x-neo',
    name: '1X NEO',
    org: '1X Technologies',
    category: 'humanoid',
    parameters: null,
    released: '2025-10',
    license: 'commercial (consumer)',
    paperUrl: 'https://www.1x.tech/neo',
    codeUrl: null,
    demoUrl: 'https://www.1x.tech',
    notes: 'First humanoid pitched as a household consumer product. Soft, lightweight (30kg) with tendon-driven joints for safety around people. Pre-orders opened late 2025.',
  },
  {
    id: 'tesla-optimus-gen3',
    name: 'Optimus Gen 3',
    org: 'Tesla',
    category: 'humanoid',
    parameters: null,
    released: '2025-10',
    license: 'commercial',
    paperUrl: 'https://www.tesla.com/AI',
    codeUrl: null,
    demoUrl: 'https://www.tesla.com/AI',
    notes: 'Third-generation Tesla humanoid with redesigned hand (22 DoF). Tesla manufacturing factory deployment claimed for 2026, external sales 2027.',
  },
  {
    id: 'apptronik-apollo',
    name: 'Apollo',
    org: 'Apptronik',
    category: 'humanoid',
    parameters: null,
    released: '2024-08',
    license: 'commercial',
    paperUrl: 'https://apptronik.com/apollo',
    codeUrl: null,
    demoUrl: 'https://apptronik.com',
    notes: 'Industrial humanoid pilots with Mercedes and GXO logistics. Built on Apptronik\'s prior Astra arm work. NASA partnership.',
  },
  {
    id: 'unitree-g1',
    name: 'Unitree G1',
    org: 'Unitree',
    category: 'humanoid',
    parameters: null,
    released: '2024-05',
    license: 'commercial',
    paperUrl: 'https://www.unitree.com/g1',
    codeUrl: 'https://github.com/unitreerobotics',
    demoUrl: 'https://www.unitree.com/g1',
    notes: 'Lowest-priced commercially available humanoid (entry around $16K). Popular for academic research and home tinkering. SDK and Python bindings published.',
  },
  {
    id: 'unitree-h1',
    name: 'Unitree H1',
    org: 'Unitree',
    category: 'humanoid',
    parameters: null,
    released: '2023-12',
    license: 'commercial',
    paperUrl: 'https://www.unitree.com/h1',
    codeUrl: 'https://github.com/unitreerobotics',
    demoUrl: 'https://www.unitree.com/h1',
    notes: 'Larger sibling to G1. Holds the unofficial humanoid sprint record (3.3 m/s). Common research platform for whole-body control papers.',
  },
  {
    id: 'boston-dynamics-atlas-electric',
    name: 'Atlas (Electric)',
    org: 'Boston Dynamics',
    category: 'humanoid',
    parameters: null,
    released: '2024-04',
    license: 'commercial (research / pilot)',
    paperUrl: 'https://bostondynamics.com/blog/electric-new-era-for-atlas/',
    codeUrl: null,
    demoUrl: 'https://bostondynamics.com/atlas/',
    notes: 'All-electric Atlas successor to the hydraulic platform. Hyundai pilots in automotive manufacturing. Range of motion exceeds human anatomy.',
  },
  {
    id: 'agility-digit',
    name: 'Digit',
    org: 'Agility Robotics',
    category: 'humanoid',
    parameters: null,
    released: '2023-09',
    license: 'commercial',
    paperUrl: 'https://agilityrobotics.com/products/digit',
    codeUrl: null,
    demoUrl: 'https://agilityrobotics.com',
    notes: 'Bipedal humanoid optimized for warehouse case-handling. RaaS pricing with Amazon and GXO deployments. Bird-leg morphology (knees backward) for energy efficiency.',
  },
  {
    id: 'sanctuary-phoenix',
    name: 'Phoenix',
    org: 'Sanctuary AI',
    category: 'humanoid',
    parameters: null,
    released: '2023-05',
    license: 'commercial',
    paperUrl: 'https://www.sanctuary.ai/phoenix',
    codeUrl: null,
    demoUrl: 'https://www.sanctuary.ai',
    notes: 'Hydraulic-driven hands with 21 DoF per hand, the highest dexterity in any commercial humanoid. Now part of Apptronik post-2025 acquisition.',
  },

  // ── Datasets ─────────────────────────────────────────────────
  {
    id: 'open-x-embodiment',
    name: 'Open X-Embodiment',
    org: 'Google DeepMind + 21 institutions',
    category: 'dataset',
    parameters: null,
    released: '2023-10',
    license: 'CC-BY-4.0',
    paperUrl: 'https://robotics-transformer-x.github.io',
    codeUrl: 'https://github.com/google-deepmind/open_x_embodiment',
    demoUrl: 'https://huggingface.co/datasets/jxu124/OpenX-Embodiment',
    notes: 'Standardized cross-embodiment dataset spanning 22 robot embodiments and 1M+ trajectories. The pretraining substrate behind Octo, OpenVLA, and many followups.',
  },
  {
    id: 'droid',
    name: 'DROID',
    org: 'Stanford / Berkeley / Toyota Research / Google',
    category: 'dataset',
    parameters: null,
    released: '2024-03',
    license: 'CC-BY-4.0',
    paperUrl: 'https://droid-dataset.github.io',
    codeUrl: 'https://github.com/droid-dataset/droid',
    demoUrl: 'https://huggingface.co/datasets/KarlP/droid',
    notes: '76K teleoperated trajectories across 564 scenes and 86 tasks, all on Franka arms. Largest single-embodiment manipulation dataset. Used as the high-quality slice in pi-0 training.',
  },
  {
    id: 'agibot-world',
    name: 'AgiBot World',
    org: 'AgiBot',
    category: 'dataset',
    parameters: null,
    released: '2024-12',
    license: 'CC-BY-NC-4.0',
    paperUrl: 'https://agibot-world.com',
    codeUrl: 'https://huggingface.co/datasets/agibot-world/AgiBotWorld-Alpha',
    demoUrl: 'https://agibot-world.com',
    notes: 'Million-trajectory dataset on AgiBot G1 humanoid. Contains long-horizon dual-arm manipulation in real homes and offices. Released alongside the AgiBot platform.',
  },
  {
    id: 'mobile-aloha',
    name: 'Mobile ALOHA',
    org: 'Stanford',
    category: 'dataset',
    parameters: null,
    released: '2024-01',
    license: 'MIT',
    paperUrl: 'https://mobile-aloha.github.io',
    codeUrl: 'https://github.com/MarkFzp/mobile-aloha',
    demoUrl: 'https://mobile-aloha.github.io',
    notes: 'Open hardware bimanual mobile manipulator (~$32K) plus a 50-task imitation-learning dataset. The reference open platform for mobile bimanual research.',
  },
  {
    id: 'bridgedata-v2',
    name: 'BridgeData V2',
    org: 'Berkeley AI Research',
    category: 'dataset',
    parameters: null,
    released: '2023-08',
    license: 'CC-BY-4.0',
    paperUrl: 'https://rail-berkeley.github.io/bridgedata',
    codeUrl: 'https://github.com/rail-berkeley/bridge_data_v2',
    demoUrl: null,
    notes: '60K+ trajectories on WidowX arms across 24 environments. Foundational for skill generalization research; included in Open X-Embodiment.',
  },

  // ── Simulators ───────────────────────────────────────────────
  {
    id: 'isaac-lab',
    name: 'Isaac Lab',
    org: 'NVIDIA',
    category: 'simulator',
    parameters: null,
    released: '2024-03',
    license: 'BSD-3-Clause',
    paperUrl: 'https://isaac-sim.github.io/IsaacLab/',
    codeUrl: 'https://github.com/isaac-sim/IsaacLab',
    demoUrl: 'https://developer.nvidia.com/isaac-sim',
    notes: 'GPU-accelerated robot learning framework on Isaac Sim. Supersedes Isaac Gym. Used for sim-to-real RL training of locomotion and manipulation policies.',
  },
  {
    id: 'mujoco-playground',
    name: 'MuJoCo Playground',
    org: 'Google DeepMind',
    category: 'simulator',
    parameters: null,
    released: '2025-01',
    license: 'Apache-2.0',
    paperUrl: 'https://playground.mujoco.org',
    codeUrl: 'https://github.com/google-deepmind/mujoco_playground',
    demoUrl: 'https://playground.mujoco.org',
    notes: 'JAX-based MuJoCo training suite with battery-included locomotion and manipulation environments. Designed for massively parallel sim-to-real RL.',
  },
  {
    id: 'genesis',
    name: 'Genesis',
    org: 'Genesis Embodied AI',
    category: 'simulator',
    parameters: null,
    released: '2024-12',
    license: 'Apache-2.0',
    paperUrl: 'https://genesis-embodied-ai.github.io',
    codeUrl: 'https://github.com/Genesis-Embodied-AI/Genesis',
    demoUrl: 'https://genesis-embodied-ai.github.io',
    notes: 'Universal physics engine claiming 80M FPS on a single RTX 4090. Bundled generative pipeline auto-creates scenes from text. Open-sourced by a 19-lab collaboration.',
  },
];

export const EMBODIED_AI_LAST_UPDATED = '2026-05-03';
