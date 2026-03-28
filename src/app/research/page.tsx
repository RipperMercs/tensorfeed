import { Metadata } from 'next';
import { BookOpen, FileText, Trophy, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Research',
};

const PAPERS = [
  {
    title: 'Scaling Sparse Mixture-of-Experts to 10 Trillion Parameters with Dynamic Routing',
    authors: ['Yichen Zhang', 'Priya Nair', 'Tomás Rivera'],
    abstract:
      'We present a novel dynamic routing mechanism for sparse mixture-of-experts architectures that enables efficient scaling to 10 trillion parameters. Our approach reduces inference cost by 40% compared to dense models of equivalent capability while maintaining competitive performance across standard benchmarks.',
    date: 'Mar 25, 2026',
    categories: ['cs.AI', 'cs.LG'],
  },
  {
    title: 'ReasonGraph: Chain-of-Thought Verification via Directed Acyclic Proof Structures',
    authors: ['Sarah Chen', 'Marcus Weber', 'Aisha Patel'],
    abstract:
      'We introduce ReasonGraph, a framework that structures chain-of-thought reasoning as directed acyclic graphs with verifiable proof nodes. This approach catches 87% of reasoning errors that sequential chain-of-thought methods miss, significantly improving mathematical problem solving.',
    date: 'Mar 23, 2026',
    categories: ['cs.AI', 'cs.CL'],
  },
  {
    title: 'Multi-Agent Constitutional AI: Emergent Cooperation in Self-Governing Language Models',
    authors: ['James Park', 'Li Wei', 'Elena Sokolova'],
    abstract:
      'We study emergent cooperative behavior in systems of multiple constitutional AI agents tasked with self-governance. Our experiments demonstrate that groups of 8 or more agents reliably converge on stable behavioral norms that align with human preferences without explicit reward shaping.',
    date: 'Mar 22, 2026',
    categories: ['cs.AI', 'cs.CL', 'cs.LG'],
  },
  {
    title: 'TokenFormer: Replacing Attention with Learned Token Interactions at Scale',
    authors: ['David Kim', 'Fatima Al-Rashid', 'Igor Petrov'],
    abstract:
      'We propose TokenFormer, an architecture that replaces standard self-attention with learned pairwise token interaction functions. On language modeling benchmarks, TokenFormer achieves comparable perplexity to transformers while reducing memory requirements by 60% for long contexts.',
    date: 'Mar 20, 2026',
    categories: ['cs.LG', 'cs.CL'],
  },
  {
    title: 'Grounding Language Models in Real-Time Sensor Data for Robotic Manipulation',
    authors: ['Anna Kowalski', 'Raj Mehta', 'Yuki Tanaka'],
    abstract:
      'We present a method for grounding large language models in continuous real-time sensor streams for robotic manipulation tasks. Our system processes tactile, visual, and proprioceptive data at 100Hz, enabling language-guided dexterous manipulation with a 94% task success rate.',
    date: 'Mar 18, 2026',
    categories: ['cs.AI', 'cs.LG'],
  },
  {
    title: 'Federated Reinforcement Learning from Human Feedback Across Distributed Deployments',
    authors: ['Michael Torres', 'Chloe Dubois', 'Kenji Nakamura'],
    abstract:
      'We introduce a federated approach to RLHF that enables distributed model improvement without centralizing sensitive preference data. Our protocol achieves 95% of the alignment quality of centralized RLHF while preserving user privacy across deployment boundaries.',
    date: 'Mar 16, 2026',
    categories: ['cs.AI', 'cs.LG'],
  },
  {
    title: 'Emergent Tool Use in Language Agents Without Explicit Tool Descriptions',
    authors: ['Sophie Martin', 'Ahmed Hassan', 'Laura Gomez'],
    abstract:
      'We demonstrate that language agents can discover and learn to use novel tools through environmental interaction alone, without explicit tool descriptions or documentation. Agents trained with our method successfully utilize 78% of previously unseen APIs within 10 interaction steps.',
    date: 'Mar 14, 2026',
    categories: ['cs.AI', 'cs.CL'],
  },
  {
    title: 'Compression-Aware Training: Producing Models That Quantize Without Quality Loss',
    authors: ['Robert Yang', 'Natasha Ivanova', 'Felix Braun'],
    abstract:
      'We propose compression-aware training, a method that produces models resilient to post-training quantization down to 2-bit precision. Models trained with our approach retain 99.2% of their full-precision performance after aggressive quantization, enabling efficient edge deployment.',
    date: 'Mar 12, 2026',
    categories: ['cs.LG', 'cs.AI'],
  },
];

const PAPER_OF_THE_DAY = {
  title: 'Autonomous Agent Architectures with Hierarchical Memory and Self-Reflective Planning',
  authors: ['Sarah Chen', 'James Park', 'Aisha Patel'],
  abstract:
    'We present a new agent architecture that combines hierarchical episodic memory with self-reflective planning loops. The system maintains a structured memory of past interactions, retrieves relevant episodes during planning, and critically evaluates its own reasoning before acting. On the AgentBench suite, our architecture achieves state-of-the-art results, outperforming the previous best by 12 points. We find that self-reflective planning is the single most impactful component, accounting for over half the improvement.',
  date: 'Mar 27, 2026',
  categories: ['cs.AI', 'cs.CL', 'cs.LG'],
};

const BENCHMARKS = [
  { name: 'MMLU', claudeOpus: 92.4, gpt45: 90.8, gemini25: 91.1, llama4: 86.3 },
  { name: 'HumanEval', claudeOpus: 95.1, gpt45: 93.7, gemini25: 94.2, llama4: 88.9 },
  { name: 'GPQA', claudeOpus: 74.6, gpt45: 71.2, gemini25: 72.8, llama4: 63.5 },
];

function CategoryTag({ category }: { category: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-mono rounded-full bg-bg-tertiary text-accent-cyan border border-border">
      {category}
    </span>
  );
}

export default function ResearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">AI Research</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Latest papers, benchmarks, and research developments
        </p>
      </div>

      {/* Paper of the Day */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Paper of the Day</h2>
        </div>
        <a
          href="#"
          className="block bg-bg-secondary border-2 border-accent-primary rounded-xl p-6 shadow-glow hover:border-accent-secondary transition-colors"
        >
          <div className="flex items-start gap-4">
            <FileText className="w-6 h-6 text-accent-primary shrink-0 mt-1" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                {PAPER_OF_THE_DAY.title}
              </h3>
              <p className="text-sm text-text-muted mb-2">
                {PAPER_OF_THE_DAY.authors.join(', ')} &middot; {PAPER_OF_THE_DAY.date}
              </p>
              <p className="text-text-secondary text-sm mb-3 leading-relaxed">
                {PAPER_OF_THE_DAY.abstract}
              </p>
              <div className="flex flex-wrap gap-2">
                {PAPER_OF_THE_DAY.categories.map((cat) => (
                  <CategoryTag key={cat} category={cat} />
                ))}
              </div>
            </div>
          </div>
        </a>
      </section>

      {/* Latest Papers */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-semibold text-text-primary">Latest Papers</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {PAPERS.map((paper, i) => (
            <a
              key={i}
              href="#"
              className="block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors"
            >
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary mb-1 leading-snug">
                    {paper.title}
                  </h3>
                  <p className="text-xs text-text-muted mb-2">
                    {paper.authors.join(', ')} &middot; {paper.date}
                  </p>
                  <p className="text-text-secondary text-xs mb-3 leading-relaxed line-clamp-3">
                    {paper.abstract}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {paper.categories.map((cat) => (
                      <CategoryTag key={cat} category={cat} />
                    ))}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Benchmark Tracker */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Benchmark Tracker</h2>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Benchmark</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">
                    Claude Opus 4.6
                  </th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">GPT-4.5</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">
                    Gemini 2.5 Pro
                  </th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Llama 4</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS.map((row) => {
                  const scores = [row.claudeOpus, row.gpt45, row.gemini25, row.llama4];
                  const maxScore = Math.max(...scores);
                  return (
                    <tr key={row.name} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 font-mono text-text-primary">{row.name}</td>
                      <td
                        className={`py-3 px-4 text-right font-mono ${row.claudeOpus === maxScore ? 'text-accent-primary font-bold' : 'text-text-secondary'}`}
                      >
                        {row.claudeOpus}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono ${row.gpt45 === maxScore ? 'text-accent-primary font-bold' : 'text-text-secondary'}`}
                      >
                        {row.gpt45}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono ${row.gemini25 === maxScore ? 'text-accent-primary font-bold' : 'text-text-secondary'}`}
                      >
                        {row.gemini25}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono ${row.llama4 === maxScore ? 'text-accent-primary font-bold' : 'text-text-secondary'}`}
                      >
                        {row.llama4}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border">
            <p className="text-xs text-text-muted">
              Scores represent published results as of March 2026. Higher is better.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
