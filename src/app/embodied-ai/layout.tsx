import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Embodied AI Catalog: VLA Models, Humanoids, Robot Datasets',
  description:
    'Catalog of vision-language-action foundation models (pi-0, GR00T N1, OpenVLA, Octo, RDT-1B, Helix), humanoid platforms (Figure 02, 1X NEO, Tesla Optimus, Apptronik Apollo, Unitree G1/H1, Atlas Electric, Digit, Phoenix), real-world training datasets (Open X-Embodiment, DROID, AgiBot World, Mobile ALOHA, BridgeData V2), and physics simulators (Isaac Lab, MuJoCo Playground, Genesis). Free.',
  alternates: { canonical: 'https://tensorfeed.ai/embodied-ai' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/embodied-ai',
    title: 'Embodied AI Catalog',
    description:
      'VLA foundation models, humanoid platforms, robot training datasets, and physics simulators in one catalog. Free API at /api/embodied-ai.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Embodied AI Catalog',
    description: 'VLA models, humanoids, robot datasets, simulators.',
  },
  keywords: [
    'embodied AI',
    'vision-language-action',
    'VLA model',
    'humanoid robot',
    'robot foundation model',
    'pi-0',
    'GR00T',
    'OpenVLA',
    'Octo',
    'RDT-1B',
    'Helix',
    'Figure 02',
    '1X NEO',
    'Tesla Optimus',
    'Apptronik Apollo',
    'Unitree G1',
    'Atlas Electric',
    'Agility Digit',
    'Sanctuary Phoenix',
    'Open X-Embodiment',
    'DROID dataset',
    'AgiBot World',
    'Mobile ALOHA',
    'Isaac Lab',
    'MuJoCo Playground',
    'Genesis simulator',
    'robotics benchmark',
  ],
};

export default function EmbodiedAILayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
