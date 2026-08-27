/**
 * Benchmark directory: drives /benchmarks/[name] leaderboard pages.
 *
 * Each entry maps a benchmark id (matching the score keys in
 * data/benchmarks.json) to editorial metadata that cannot be derived
 * from the raw scores: full prose description, scoring methodology,
 * why-it-matters, what-the-numbers-mean ranges, links to the
 * upstream paper or repository.
 *
 * The leaderboard itself is computed live from data/benchmarks.json
 * so it stays current as we ingest new model scores.
 */

import { MODEL_DIRECTORY } from './model-directory';

export interface BenchmarkPageMeta {
  /** URL slug used in /benchmarks/[name]. Matches the score key. */
  slug: string;
  /** Display name from data/benchmarks.json */
  displayName: string;
  /** SEO title (< 60 chars) */
  seoTitle: string;
  /** SEO meta description (150-160 chars) */
  seoDescription: string;
  /** Long-form description for the page hero */
  description: string;
  /** What the score range means in practice */
  scoringNotes: string;
  /** Why agents and developers care about this benchmark */
  whyItMatters: string;
  /** Upstream source URL */
  sourceUrl: string;
  /** Approximate score interpretation buckets for the FAQ */
  ranges: { range: string; meaning: string }[];
}

export const BENCHMARK_DIRECTORY: BenchmarkPageMeta[] = [
  {
    slug: 'swe_bench',
    displayName: 'SWE-bench',
    seoTitle: 'SWE-bench Leaderboard: AI Models on Real Code Tasks',
    seoDescription:
      'Live SWE-bench leaderboard for major AI models. Real-world software engineering tasks from GitHub issues. Pricing per model and rankings updated weekly on TensorFeed.',
    description:
      'SWE-bench evaluates language models on their ability to resolve real GitHub issues from popular Python repositories. The model is given an issue description and the repository state, and must produce a patch that resolves the issue and passes the project\'s existing test suite. SWE-bench is the benchmark that most closely tracks "useful for autonomous coding agents" because the tasks are not toy problems, the success criteria is the project\'s actual tests, and the input footprint forces the model to reason over real-world code at scale.',
    scoringNotes:
      'Scores are reported as resolution rate (% of issues correctly patched). The headline number on TensorFeed is the SWE-bench Verified subset, the human-validated tasks where the test suite has been confirmed to be a fair signal. Mind the gap between sources: the official swebench.com board tops out around 79% and has taken no new submission since early 2026, while vendor launch materials and independent evaluators now report figures in the low to mid nineties on their own harnesses. Both are real measurements of different setups, and the spread between them is wider than the spread between most models. Anything above 60% is a genuinely useful coding agent; above 90% on a vendor harness, check which harness before you compare.',
    whyItMatters:
      'If you are building a coding agent, this is the benchmark that matters most. Models with high SWE-bench scores produce patches that compile, pass tests, and respect existing patterns in the codebase. Models with low SWE-bench scores produce code that looks plausible but breaks the build.',
    sourceUrl: 'https://www.swebench.com',
    ranges: [
      { range: '70%+', meaning: 'Frontier-class. Genuinely useful coding agent territory.' },
      { range: '50-70%', meaning: 'Production-ready for assisted coding workflows.' },
      { range: '30-50%', meaning: 'Useful for narrow tasks but not autonomous agents.' },
      { range: '< 30%', meaning: 'Plausible-looking code that often does not work.' },
    ],
  },
  {
    slug: 'mmlu_pro',
    displayName: 'MMLU-Pro',
    seoTitle: 'MMLU-Pro Leaderboard: AI Model General Knowledge Rankings',
    seoDescription:
      'Live MMLU-Pro leaderboard for major AI models. General knowledge and reasoning across 57 subjects. Updated weekly with pricing per model on TensorFeed.',
    description:
      'MMLU-Pro is the harder successor to the original MMLU benchmark. It tests general knowledge and reasoning across 57 subjects (math, physics, law, medicine, philosophy, etc.) using multiple-choice questions designed to require multi-step reasoning rather than memorization. MMLU-Pro is the standard "is this model smart" benchmark for general-purpose use cases.',
    scoringNotes:
      'Scores are reported as % of questions answered correctly. The chance baseline is roughly 25% (4-choice). The 2026 frontier sits above 90%, with the strongest models in the mid-90s. A 5-point gap on MMLU-Pro is meaningful; a 1-point gap is within noise.',
    whyItMatters:
      'For general chat assistants, research synthesis, and any workload where the model needs broad knowledge plus reasoning, MMLU-Pro is the best single proxy for capability. Models that lead MMLU-Pro almost always lead other reasoning benchmarks too.',
    sourceUrl: 'https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro',
    ranges: [
      { range: '90%+', meaning: 'Frontier reasoning. Comparable to PhD-level human performance.' },
      { range: '80-90%', meaning: 'Strong general assistant. Production-ready for most knowledge tasks.' },
      { range: '60-80%', meaning: 'Useful for everyday queries, weak on harder reasoning.' },
      { range: '< 60%', meaning: 'Below the threshold for reliable knowledge work.' },
    ],
  },
  {
    slug: 'human_eval',
    displayName: 'HumanEval',
    seoTitle: 'HumanEval Leaderboard: AI Models on Python Code Generation',
    seoDescription:
      'Live HumanEval leaderboard for major AI models. Python code generation and problem solving. Updated weekly with pricing on TensorFeed.',
    description:
      'HumanEval is OpenAI\'s original code generation benchmark: 164 hand-written Python programming problems, each with a function signature, docstring, and unit tests. The model must produce a function body that passes all the tests. HumanEval is the simplest, most-cited code benchmark and remains a useful capability floor.',
    scoringNotes:
      'Scores are pass@1: percentage of problems where the model\'s first attempt passes all tests. The 2026 frontier is above 95%, which means the benchmark is approaching saturation. A 1-point gap at the top is within noise; the more meaningful signal is now SWE-bench.',
    whyItMatters:
      'HumanEval is a fast, cheap proxy for "can the model generate correct Python from a docstring." It is no longer a frontier-level differentiator (most strong models score above 90%) but it is still the easiest sanity check for whether a model is even in the conversation for code work.',
    sourceUrl: 'https://github.com/openai/human-eval',
    ranges: [
      { range: '95%+', meaning: 'Saturation. Essentially solves the benchmark.' },
      { range: '85-95%', meaning: 'Strong code generation across common patterns.' },
      { range: '70-85%', meaning: 'Useful for assisted coding, makes more mistakes.' },
      { range: '< 70%', meaning: 'Not recommended for production code work.' },
    ],
  },
  {
    slug: 'gpqa_diamond',
    displayName: 'GPQA Diamond',
    seoTitle: 'GPQA Diamond Leaderboard: AI Models on Graduate Science',
    seoDescription:
      'Live GPQA Diamond leaderboard for major AI models. Graduate-level physics, chemistry, and biology questions. Updated on TensorFeed with pricing per model.',
    description:
      'GPQA Diamond is the hardest subset of the Graduate-level Physics and Quantum questions benchmark. The 198 questions in the Diamond subset have been verified by domain experts to be difficult even for PhDs in the relevant field. Scoring well on GPQA Diamond requires multi-step scientific reasoning, not just memorization.',
    scoringNotes:
      'The chance baseline is 25% (4-choice). Random guessing scores ~25%, expert non-specialists score ~34%, expert specialists score ~65%. The 2026 frontier hits ~80% on the strongest reasoning models. The gap between this and MMLU-Pro is the gap between "knows facts" and "can reason from facts under pressure."',
    whyItMatters:
      'GPQA Diamond is the benchmark that separates models that have memorized scientific content from models that can reason scientifically. For research agents, technical writing, and any workload involving multi-step inference over unfamiliar domains, GPQA Diamond predicts capability better than MMLU-Pro.',
    sourceUrl: 'https://github.com/idavidrein/gpqa',
    ranges: [
      { range: '70%+', meaning: 'Above expert-specialist level. Frontier reasoning.' },
      { range: '50-70%', meaning: 'Strong scientific reasoning, comparable to expert non-specialists.' },
      { range: '30-50%', meaning: 'Better than chance, weak on multi-step inference.' },
      { range: '< 30%', meaning: 'At or near chance baseline for the benchmark.' },
    ],
  },
  {
    slug: 'math',
    displayName: 'MATH',
    seoTitle: 'MATH Benchmark Leaderboard: AI Models on Competition Math',
    seoDescription:
      'Live MATH benchmark leaderboard for major AI models. Competition-level mathematics problems. Updated weekly with pricing per model on TensorFeed.',
    description:
      'The MATH benchmark consists of 12,500 competition-level mathematics problems sourced from AMC, AIME, and Putnam-style competitions. Each problem requires multi-step algebraic, geometric, or combinatorial reasoning, and the answer must match exactly (no partial credit). MATH is one of the toughest standardized math benchmarks for LLMs.',
    scoringNotes:
      'Scores are exact-match accuracy on the test set. As of 2026 the frontier is in the mid-90s, but the variance between problem categories is high: most models do well on AMC-level algebra and worse on AIME-level combinatorics or proof-style problems.',
    whyItMatters:
      'MATH performance correlates strongly with multi-step reasoning capability in general. Models that can carry algebraic state through 5-10 steps on MATH problems tend to be the same models that can carry argumentative state through long agent workflows. If your agent does any quantitative work, MATH is a useful proxy.',
    sourceUrl: 'https://github.com/hendrycks/math',
    ranges: [
      { range: '90%+', meaning: 'Frontier. Solves most competition-level problems.' },
      { range: '70-90%', meaning: 'Strong on AMC-level, struggles on AIME/Putnam.' },
      { range: '40-70%', meaning: 'Useful for routine math but unreliable on multi-step problems.' },
      { range: '< 40%', meaning: 'Weak general math; unreliable for quantitative tasks.' },
    ],
  },
  {
    slug: 'osworld_2',
    displayName: 'OSWorld 2.0',
    seoTitle: 'OSWorld 2.0 Leaderboard: AI Computer Use Scores',
    seoDescription:
      'Live OSWorld 2.0 leaderboard ranking AI models on long-horizon computer use across real desktop applications. Binary and partial scoring explained, updated on TensorFeed.',
    description:
      'OSWorld 2.0 measures whether a model can actually operate a computer. It presents 108 workflows across seven professional domains inside a real desktop environment, tasks that take a skilled human a median of 1.6 hours and average 318 tool calls to complete. Rather than a single pass or fail, each workflow is graded against many weighted checkpoints, so the benchmark can distinguish an agent that got most of the way from one that never started. It was built by XLANG Lab at the University of Hong Kong and released in 2026 as the successor to the original OSWorld, which frontier models had largely outgrown.',
    scoringNotes:
      'Read the metric before you compare anything. Binary completion requires every scoring checkpoint to pass, while the partial score averages the fraction of checkpoints satisfied, and those two numbers can differ by more than thirty points on the same run. Vendors almost always publish the partial figure while the benchmark authors headline binary completion. Step budget matters too: all current frontier submissions run at 500 steps, and the same model scores lower with a smaller budget. TensorFeed reports the vendor-published figure, so treat this column as one scale and do not mix it with numbers quoted elsewhere without checking which one you are reading.',
    whyItMatters:
      'Every other benchmark on this site hands the model an API. This one hands it a mouse. If you are deploying an agent that clicks through software a human normally drives, spreadsheets, design tools, internal admin panels, this is the only column that tells you whether it will finish the job or stall halfway. The scores are low by design and the ceiling is nowhere close, which makes it the most honest measure of computer-use capability available right now.',
    sourceUrl: 'https://osworld-v2.xlang.ai',
    ranges: [
      { range: '20%+ binary', meaning: 'Current frontier. Completes a fifth of long professional workflows end to end.' },
      { range: '10-20% binary', meaning: 'Capable on shorter workflows, unreliable across a full multi-hour task.' },
      { range: '5-10% binary', meaning: 'Usually gets partway, rarely finishes. Needs a human watching.' },
      { range: '< 5% binary', meaning: 'Not usable for autonomous desktop work.' },
    ],
  },
  {
    slug: 'browsecomp',
    displayName: 'BrowseComp',
    seoTitle: 'BrowseComp Leaderboard: AI Web Research Scores',
    seoDescription:
      'Live BrowseComp leaderboard for AI agentic web search. 1,266 hard-to-find questions, why every score is self-reported, and how context strategy moves results. On TensorFeed.',
    description:
      'BrowseComp tests persistent web research. Its 1,266 questions have short, verifiable answers that are genuinely difficult to locate, requiring an agent to chase entangled information across many pages rather than retrieve a single fact. OpenAI built it and released it in 2025, and it has become the standard reference for deep-research and agentic-search products.',
    scoringNotes:
      'Two caveats that matter more here than on any other benchmark we track. First, there is no official leaderboard and no independent evaluator: every published BrowseComp figure is self-reported by the lab that produced it. Second, scores move sharply with context-management strategy, so a single-agent run, a multi-agent run, and a run using context compaction are not the same measurement even for the same model. What a BrowseComp number really ranks is a full system, the model plus its tools plus its context policy, not a bare model. Frontier systems now cluster within a couple of points of each other, which suggests the benchmark is approaching saturation at the top.',
    whyItMatters:
      'If you are building research agents, this is the closest published proxy for whether the thing will actually find an obscure answer instead of confidently inventing one. Just do not treat small gaps between top models as real. The measurement noise from differing harnesses and context strategies is larger than the differences between the leaders.',
    sourceUrl: 'https://arxiv.org/abs/2504.12516',
    ranges: [
      { range: '85%+', meaning: 'Frontier research agent. Finds answers most humans would give up on.' },
      { range: '70-85%', meaning: 'Strong. Reliable on hard lookups, occasional dead ends.' },
      { range: '40-70%', meaning: 'Useful for ordinary search, weak on genuinely buried facts.' },
      { range: '< 40%', meaning: 'Not a research agent. Expect confident wrong answers.' },
    ],
  },
  {
    slug: 'frontier_code',
    displayName: 'FrontierCode v1.1',
    seoTitle: 'FrontierCode Leaderboard: Mergeable AI Patch Scores',
    seoDescription:
      'Live FrontierCode v1.1 leaderboard. Scores whether an AI patch is mergeable, not just test-passing, graded by open-source maintainers against a rubric. On TensorFeed.',
    description:
      'FrontierCode asks a harder question than most coding benchmarks: not whether a patch passes tests, but whether a maintainer would merge it. Cognition built it with roughly 36 open-source maintainers from projects including Celery, Budibase, uppy, and Mattermost, who authored tasks against real issues in their own repositories. Grading combines held-out tests with a maintainer-written rubric covering behavioral correctness, regression safety, test quality, scope discipline, build and lint cleanliness, and adherence to project conventions. The Main split is the 100 hardest tasks; an Extended split covers all 150.',
    scoringNotes:
      'TensorFeed reports the Main split. Two things to watch. Scores vary substantially by reasoning effort, and the leaderboard publishes a separate figure per effort level, so a headline number is meaningless without knowing which one it came from. And the benchmark is deliberately unpublished, with no public repo, which means aggregator sites quoting FrontierCode figures for models that are not on Cognition\'s own board are reporting something other than a FrontierCode run. Check the maintainer board before trusting a number.',
    whyItMatters:
      'Test-passing and mergeable are different bars, and the gap between them is where most coding-agent disappointment lives. A patch that turns tests green while sprawling across unrelated files, ignoring project conventions, or quietly weakening a test is a patch a human has to redo. This is the only benchmark we track that puts a maintainer\'s judgment in the scoring loop, which makes it the best available signal for whether agent output will survive code review.',
    sourceUrl: 'https://cognition.com/frontiercode',
    ranges: [
      { range: '50%+', meaning: 'Frontier. Produces mergeable work on the hardest tasks about half the time.' },
      { range: '35-50%', meaning: 'Strong. Real contributions, but review is still mandatory.' },
      { range: '20-35%', meaning: 'Useful drafts. Expect substantial rework before merge.' },
      { range: '< 20%', meaning: 'Output is a starting point, not a contribution.' },
    ],
  },
  {
    slug: 'hle_tools',
    displayName: 'Humanity\'s Last Exam (tools)',
    seoTitle: 'HLE With Tools Leaderboard: AI Expert Reasoning',
    seoDescription:
      'Live Humanity\'s Last Exam with-tools leaderboard on TensorFeed. Why the tool-augmented mode is not the same benchmark as closed-book HLE, and how far apart the two run.',
    description:
      'Humanity\'s Last Exam is a multidisciplinary set of expert-level questions built to resist the saturation that overtook MMLU. This column reports the tool-augmented mode, where the model may search and run tools while answering. That distinction is the whole story: the official maintainer leaderboards are closed-book by construction, evaluated text-only at temperature zero with searchable questions deliberately removed from the set so retrieval cannot substitute for knowledge. There is no separate with-tools dataset, paper, repository, or maintainer. It is a reporting mode, not a distinct benchmark, and the figures come from the labs themselves.',
    scoringNotes:
      'Never compare a with-tools score against a closed-book one. The gap is roughly ten points at the frontier, and it measures the tools, not the model. Because the HLE dataset is public, granting a model search access also lets it retrieve discussion of the questions themselves, which is exactly why the maintainers keep the official board closed-book. Treat every number in this column as vendor-reported and contamination-exposed, and treat the closed-book board as the cleaner measurement of what a model actually knows.',
    whyItMatters:
      'Tool-augmented reasoning is how agents actually run in production, so this mode is closer to real deployment than the closed-book board. It is simply not a knowledge measurement. Read this column as an upper bound on what a model plus its retrieval stack can do on expert questions, and read closed-book HLE when you want to know what the weights themselves contain.',
    sourceUrl: 'https://lastexam.ai',
    ranges: [
      { range: '60%+', meaning: 'Frontier with tools. Expert-level answers across most disciplines.' },
      { range: '45-60%', meaning: 'Strong. Handles hard questions when retrieval cooperates.' },
      { range: '25-45%', meaning: 'Mixed. Reliable on mainstream topics, weak at the edges.' },
      { range: '< 25%', meaning: 'Below the useful bar for expert work, even with tools.' },
    ],
  },
];

export function getAllBenchmarkSlugs(): string[] {
  return BENCHMARK_DIRECTORY.map(b => b.slug);
}

export function getBenchmarkBySlug(slug: string): BenchmarkPageMeta | null {
  return BENCHMARK_DIRECTORY.find(b => b.slug === slug) ?? null;
}

/**
 * Map a benchmark display name from data/benchmarks.json back to the
 * MODEL_DIRECTORY slug so leaderboard rows can link to /models/[slug].
 */
export function getModelSlugByBenchmarkName(benchmarkName: string): string | null {
  const match = MODEL_DIRECTORY.find(m => m.benchmarkName.toLowerCase() === benchmarkName.toLowerCase());
  return match ? match.slug : null;
}
