import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Open-Source AI Tools: Ollama, vLLM, llama.cpp, MLX, ComfyUI',
  description:
    'Production open-source AI tools agents and developers install: model runtimes (Ollama, LM Studio, llama.cpp, MLX), inference servers (vLLM, SGLang, TGI, TEI), fine-tuning (Unsloth, Axolotl, TorchTune), UIs (Open WebUI, LibreChat, ComfyUI), evals (lm-eval-harness, Inspect AI). Free.',
  alternates: { canonical: 'https://tensorfeed.ai/oss-tools' },
  openGraph: { type: 'website', url: 'https://tensorfeed.ai/oss-tools', title: 'Open-Source AI Tools', description: 'Runtimes, inference servers, fine-tuning, UIs, evals.', siteName: 'TensorFeed.ai', images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }] },
  twitter: { card: 'summary_large_image', title: 'Open-Source AI Tools' },
};

export default function OSSToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
