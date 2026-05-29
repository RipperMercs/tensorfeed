/**
 * TF Verdicts directory: single source of truth for signed, data-grounded verdicts.
 *
 * A TF Verdict is TensorFeed's own opinionated ruling on a specific AI-ecosystem
 * question, reasoned from cited public data points. TF's judgment is the product;
 * the data points are cited as evidence, never reproduced as a dataset. Every
 * verdict carries the data points and their sources so a reader can check the work.
 *
 * Add new verdicts to the TOP of the array (newest first). The /verdicts hub and
 * the /verdicts/[slug] pages both read from here. Each verdict is produced by the
 * author + adversarial-verify + fix + reverify pipeline and only lands here after
 * it passes all three lenses (fact-grounding, reasoning + legal, voice + compliance).
 */

export type VerdictConfidence = 'high' | 'medium' | 'low';

export interface VerdictDataPoint {
  claim: string;
  value: string;
  source: string;
  url: string;
}

export interface Verdict {
  slug: string;
  question: string;
  /** The one-sentence ruling, TF's clear opinionated position. */
  ruling: string;
  confidence: VerdictConfidence;
  /** Human-readable verdict date, e.g. "May 29, 2026". Verdicts are time-stamped because the answer can change. */
  date: string;
  /** Beat tag for grouping, e.g. "Models", "Infrastructure", "Payments", "Security", "Benchmarks". */
  category: string;
  /** The full verdict text in TF voice. Paragraphs are separated by a blank line. */
  body: string;
  /** The cited evidence behind the ruling. Each point is checkable against its source. */
  dataPoints: VerdictDataPoint[];
  caveats: string;
}

export const VERDICTS: Verdict[] = [
  // Populated from the tf-verdicts fix-and-reverify pipeline once a verdict passes
  // all three adversarial lenses. Newest first.
  {
    slug: 'best-value-coding-model',
    question:
      'What is the best-value open-weight model for coding agents today (as of 29 May 2026), judged on coding-agent benchmark resolve rate against hosted inference price, with output tokens as the binding cost?',
    ruling:
      'As of 29 May 2026, DeepSeek V4-Pro is the best-value open-weight model for coding agents: at 80.6% on SWE-bench Verified and 67.9% on Terminal-Bench 2.0 it leads the open-weight field, and its now-permanent $0.435 in / $0.87 out per million tokens makes its cost per resolved task lower than DeepSeek V3.2 once you count failed and retried tasks (an inference from price plus resolve rate, assuming comparable token use per task), with GLM-5.1 the only close rival and DeepSeek V3.2 the pick when raw output price is the single constraint.',
    confidence: 'medium',
    date: 'May 29, 2026',
    category: 'Models',
    body: `Our verdict, as of 29 May 2026: if you are wiring an open-weight model into a coding agent today, DeepSeek V4-Pro is the best value. This is a change from where we landed earlier this year, when V3.2 owned the cheapest output token and the field had nothing above it.

Value is resolve rate over cost, and for agents the cost that bites is output tokens, because agents stream long diffs, tool calls, and reasoning.

On capability V4-Pro leads the open field: 80.6% on SWE-bench Verified per its Hugging Face card, and 67.9% on Terminal-Bench 2.0. Standard DeepSeek V3.2 sits at a vendor-reported 73.1% on SWE-bench (DeepSeek's own paper, not independently audited) and 39.6% on Terminal-Bench 2.0 under the third-party Terminus 2 harness.

On price V4-Pro is $0.435 in and $0.87 out per million on OpenRouter, a rate DeepSeek made permanent on 22 May after the 75% cut. That output is about 2.3 times V3.2's $0.378. But the SWE-bench gain is roughly 7.5 points and the terminal-agent gain is large, so on a cost-per-resolved-task basis, which is an inference from price plus resolve rate, not a measured figure, V4-Pro comes out ahead once you count retries.

Two carve-outs. GLM-5.1 is the real rival at a self-reported 77.8% SWE-bench (Z.ai's own figure, no published independent audit), but its $3.08 to $4.40 output runs 2x to 4x V4-Pro. And if raw output price is your only constraint, V3.2 stays the budget floor at $0.378 with a clean 131K context.

Bottom line: V4-Pro for value, GLM-5.1 if you must audit a rival, V3.2 when the meter is everything.`,
    dataPoints: [
      {
        claim: 'DeepSeek V4-Pro SWE-bench Verified score, leading the open-weight field',
        value: '80.6%',
        source: 'DeepSeek-V4-Pro model card, Hugging Face',
        url: 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro',
      },
      {
        claim:
          "DeepSeek V4-Pro Terminal-Bench 2.0 accuracy (per the model card's agentic results)",
        value: '67.9%',
        source: 'DeepSeek-V4-Pro model card, Hugging Face',
        url: 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro',
      },
      {
        claim:
          'DeepSeek V4-Pro hosted inference price on OpenRouter (now-permanent rate after the 75% cut announced 22 May 2026)',
        value: '$0.435 input / $0.87 output per million tokens, 1M context',
        source: 'OpenRouter DeepSeek V4 Pro model page',
        url: 'https://openrouter.ai/deepseek/deepseek-v4-pro',
      },
      {
        claim:
          'DeepSeek V4-Pro release date and license: permissive, commercial-use (open-weight, not fully open-source)',
        value: 'released 24 April 2026, permissive weights on Hugging Face',
        source: 'Codersera DeepSeek V4-Pro review',
        url: 'https://codersera.com/blog/deepseek-v4-pro-review-benchmarks-pricing-2026/',
      },
      {
        claim:
          'Standard DeepSeek V3.2 SWE-bench Verified primary score (vendor-reported, robust across Claude Code and RooCode harnesses to 72 to 74%)',
        value: '73.1%',
        source: 'DeepSeek-V3.2 technical report (arXiv 2512.02556)',
        url: 'https://arxiv.org/html/2512.02556v1',
      },
      {
        claim:
          "Standard DeepSeek V3.2 Terminal-Bench 2.0 accuracy under the third-party Terminus 2 agent (DeepSeek's own paper reports a higher 46.4% under Claude Code)",
        value: '39.6% (plus or minus 2.8)',
        source: 'Terminal-Bench 2.0 leaderboard',
        url: 'https://www.tbench.ai/leaderboard/terminal-bench/2.0',
      },
      {
        claim:
          'Standard DeepSeek V3.2 hosted inference price on OpenRouter, cheapest raw output of the open contenders',
        value: '$0.252 input / $0.378 output per million tokens, 131K context',
        source: 'OpenRouter DeepSeek V3.2 model page',
        url: 'https://openrouter.ai/deepseek/deepseek-v3.2',
      },
      {
        claim:
          'DeepSeek V3.2-Exp Aider Polyglot score, the top open-source entry on the leaderboard (distinct experimental checkpoint, not the priced standard V3.2)',
        value: '74.5%',
        source: 'llm-stats Aider Polyglot leaderboard',
        url: 'https://llm-stats.com/benchmarks/aider-polyglot',
      },
      {
        claim:
          'GLM-5.1 SWE-bench Verified score, the closest open-weight rival to V4-Pro on capability (self-reported by Z.ai, no published independent audit)',
        value: 'about 77.8% (self-reported)',
        source: 'Z.AI GLM-5.1 coverage, MarkTechPost',
        url: 'https://www.marktechpost.com/2026/04/08/z-ai-introduces-glm-5-1-an-open-weight-754b-agentic-model-that-achieves-sota-on-swe-bench-pro-and-sustains-8-hour-autonomous-execution/',
      },
      {
        claim: 'GLM-5.1 hosted inference price, 2x to 4x V4-Pro on output',
        value: '$0.98 to $1.40 input / $3.08 to $4.40 output per million tokens (provider-dependent)',
        source: 'llm-stats GLM-5.1 model page',
        url: 'https://llm-stats.com/models/glm-5.1',
      },
    ],
    caveats:
      "Output-token pricing is the load-bearing assumption; if your workload is read-heavy (huge input context, little generation), V3.2 at $0.252 input or even cheaper providers narrow the gap. Cost per resolved task is an inference from output price times benchmark resolve rate, not a measured per-task cost, and it assumes comparable token consumption per task across models; V4-Pro's larger reasoning traces could erode part of its edge. SWE-bench figures for both DeepSeek models are vendor-reported (the model card and the arXiv paper), not independently audited; the standard V3.2 primary is 73.1% with a 72 to 74% robustness range across Claude Code and RooCode harnesses. The GLM-5.1 capability figure is likewise self-reported by Z.ai with no published independent audit, so the rival comparison rests on two unaudited numbers. Terminal-Bench numbers are harness-dependent: V3.2's 39.6% is third-party Terminus 2 while DeepSeek's own paper claims 46.4% under Claude Code, so cross-harness comparisons are noisy. Note the earlier draft conflated three distinct DeepSeek checkpoints; the 74.5% Aider figure belongs to V3.2-Exp (a different model at $0.27/$0.41), not the priced standard V3.2. V4-Pro weights are permissive and commercial-use but training code and data are unreleased, so it is open-weight, not fully open-source. OpenRouter and Z.ai prices float and route across providers; spot-check before committing. Closed models (Claude Opus 4.7 at about 87.6%) score higher but are out of scope here.",
  },
  {
    slug: 'benchmarks-to-distrust',
    question: 'Which AI benchmarks should you stop trusting for model selection?',
    ruling:
      "Stop ranking frontier models on MMLU, the original GSM8K, HumanEval, and increasingly MMLU-Pro: they are saturated or contaminated and no longer discriminate. Select on contamination-resistant and held-out evals instead (SWE-bench Pro and Humanity's Last Exam for real spread, LiveCodeBench for its post-cutoff design, GPQA Diamond as a tiebreaker only). As of 29 May 2026.",
    confidence: 'high',
    date: 'May 29, 2026',
    category: 'Benchmarks',
    body: `The TF Verdict, as of 29 May 2026: stop ranking frontier models on MMLU, the original GSM8K, and HumanEval. MMLU-Pro is next on the chopping block. Select on contamination-resistant and held-out evals instead.

Here is the math. MMLU is saturated, with top models near 92.4 (GPT-5.5) against a human-expert baseline of about 89.8. When the field clusters past the humans, the gaps you see are noise, not signal. MMLU-Pro was the patch, and it already reads around 90 (Gemini 3 Pro at roughly 90.1). The patch is wearing out.

HumanEval belongs on the same pile. Frontier models clear pass@1 above 95 percent on it, so it stopped separating anyone years ago. Treat a high HumanEval score as table stakes, not a ranking.

Contamination is the uglier problem. Scale's GSM1k study rebuilt grade-school math from scratch and watched Phi and Mistral families drop up to 13 points. That is memorization wearing a reasoning costume. Frontier labs barely flinched there, which is exactly why GSM1k still has signal and the original GSM8K does not.

GPQA Diamond is the trap people still fall for. Its top four span about half a point, one question on a 198-item test. That is a tiebreaker, not a leaderboard.

The clearest tell: Claude Opus 4.5 scores 80.9 on SWE-bench Verified and 45.9 on SWE-bench Pro. A 35-point gap, which is why labs now cite Pro right next to Verified.

What we trust: SWE-bench Pro for agentic coding, and Humanity's Last Exam, where the top still spreads across real gaps (45.7, 44.7, 44.3). LiveCodeBench earns its spot for a different reason. Its leader is near 92 too, so it is not the low scores; it only ever scores post-cutoff problems, so contamination cannot pile up over time.

Caveat: saturated does not mean useless. A model that flunks MMLU is still disqualified. Use the dead ones to screen out, never to crown a winner. Run your own task-specific eval before you commit budget. The leaderboard is marketing; your workload is the truth.`,
    dataPoints: [
      {
        claim:
          'MMLU is saturated for frontier models, which cluster at 90 to 92 percent and no longer discriminate; the current MMLU leader GPT-5.5 reports 92.4 percent.',
        value: 'saturated, top ~92.4% (GPT-5.5)',
        source: 'TokenMix, GPT-5.5 Review (2026)',
        url: 'https://tokenmix.ai/blog/gpt-5-5-spud-review-88-swe-bench-2026',
      },
      {
        claim:
          'MMLU-Pro, built to escape MMLU saturation, is itself nearing 90 percent at the top, with Gemini 3 Pro around 90.1 percent.',
        value: 'Gemini 3 Pro ~90.1% on MMLU-Pro',
        source: 'IntuitionLabs, MMLU-Pro Explained',
        url: 'https://intuitionlabs.ai/articles/mmlu-pro-ai-benchmark-explained',
      },
      {
        claim:
          'HumanEval is saturated: frontier models clear pass@1 above 95 percent, so it no longer separates the top tier and both leading labs note its ceiling.',
        value: 'frontier pass@1 above 95%, saturated',
        source: 'OpenAI / Anthropic model documentation on HumanEval saturation',
        url: 'https://github.com/openai/human-eval',
      },
      {
        claim:
          'Scale\'s GSM1k study found accuracy drops of up to 13 percentage points on fresh, style-matched problems for Phi and Mistral families, evidence of overfitting to the original GSM8K; frontier labs (GPT, Claude) showed minimal overfit.',
        value: 'up to 13pp drop, Phi/Mistral overfit most, frontier minimal',
        source:
          'Scale Labs, A Careful Examination of LLM Performance on Grade School Arithmetic',
        url: 'https://labs.scale.com/papers/llm-performance-grade-school-arithmetic',
      },
      {
        claim:
          'GPQA Diamond has reached near-ceiling clustering: the top four models span about 0.5 percentage points, roughly one question on a 198-question test, making them statistically indistinguishable.',
        value: 'top 4 within ~0.5pp, ~1 question on 198',
        source: 'Artificial Analysis, GPQA Diamond Leaderboard',
        url: 'https://artificialanalysis.ai/evaluations/gpqa-diamond',
      },
      {
        claim:
          'SWE-bench Verified no longer separates the top tier: Claude Opus 4.5 scores 80.9 percent on Verified but only 45.9 percent on SWE-bench Pro, a 35-point gap, which is why labs now cite Pro alongside Verified.',
        value: '80.9% Verified vs 45.9% Pro (~35pp gap)',
        source: 'CodeAnt, SWE-bench Leaderboard 2026',
        url: 'https://www.codeant.ai/blogs/swe-bench-scores',
      },
      {
        claim:
          "Humanity's Last Exam still produces real spread among frontier models: the leader scores about 45.7 percent (Claude Opus 4.8), with Gemini 3.1 Pro Preview at 44.7 and GPT-5.5 at 44.3, on a held-out frontier set.",
        value: 'HLE leader ~45.7%, Gemini 3.1 Pro ~44.7%, GPT-5.5 ~44.3%',
        source: "Artificial Analysis, Humanity's Last Exam Leaderboard",
        url: 'https://artificialanalysis.ai/evaluations/humanitys-last-exam',
      },
      {
        claim:
          'LiveCodeBench resists contamination by design rather than by low scores: it only scores post-cutoff problems, so memorization cannot accumulate over time, though its leader is itself near-saturated (about 91.7 percent for Gemini 3 Pro Preview).',
        value: 'post-cutoff design; leader ~91.7% (Gemini 3 Pro Preview)',
        source:
          'LiveCodeBench: Holistic and Contamination Free Evaluation (arXiv 2403.07974); leader figure via PricePerToken',
        url: 'https://livecodebench.github.io/',
      },
    ],
    caveats:
      "All leaderboard figures are point-in-time (29 May 2026) and vary by harness, prompt, and reasoning setting; several come from secondary aggregators (TokenMix, IntuitionLabs, CodeAnt, PricePerToken) rather than the labs' own model cards, and the HLE numbers are from Artificial Analysis's text-only subset. The GPQA Diamond ~0.5pp top-four cluster is sourced to the Artificial Analysis leaderboard, which shows the tight spread; some other writeups (such as IntuitionLabs' own table) show a wider 2 to 3 point spread depending on which models and harness they include. The LiveCodeBench post-cutoff, contamination-free design is documented in the benchmark's own paper and site, with PricePerToken cited only for the current leader figure. The GSM1k 13-point figure is from Scale's 2024 paper and applies mainly to smaller open-weight families; frontier labs (GPT, Claude) showed minimal overfit, which is why GSM1k retains signal. The SWE-bench Verified-versus-Pro gap reflects harder task design as well as possible contamination, so the 35-point gap is not pure leakage; note that OpenAI still does report SWE-bench Verified (GPT-5.5 reports 88.7 percent), so the issue is that Verified no longer separates the top tier, not that labs abandoned it. LiveCodeBench's leader is itself near-saturated, so it is recommended for its contamination-resistant post-cutoff design, not for low headline scores. None of this means saturated benchmarks are worthless as a floor or disqualifier; the ruling is specifically against using them to rank frontier models against each other. Always finish with your own task-specific eval.",
  },
  {
    slug: 'compute-growth-slowdown',
    question: 'Has frontier AI training-compute growth actually slowed?',
    ruling:
      'No, not at the ceiling: as of late May 2026 frontier training compute is still climbing at roughly 4 to 5x per year and the biggest run on record keeps getting bigger, but the curve is bending below it as per-flagship total training compute flattens (and the slowdown likely sits in pretraining as labs reroute spend into reinforcement learning).',
    confidence: 'medium',
    date: 'May 29, 2026',
    category: 'Compute',
    body: `My ruling, as of 29 May 2026: no, frontier training compute has not slowed at the ceiling. The curve is bending underneath it, and that distinction is the whole story.

Start with the top line. Epoch AI fits frontier training compute at 4 to 5x per year, with the running top-10 at 5.3x annually (90% CI 4.9x to 5.7x) over 2010 to May 2024. Worth saying plainly: the same analysis already clocks a post-2018 slowdown to 4.2x/year (90% CI 3.6x to 4.9x), so deceleration is not a fringe claim. Yet the ceiling keeps rising. Epoch's trends dashboard, updated February 5, names the largest known run as Grok 4 at roughly 5e26 FLOP. Epoch's separate Grok 4 analysis puts that run at about 246 million H100-hours. That is roughly 25x GPT-4's ~2e25 FLOP. The absolute frontier marched on.

Now the catch. GPT-5 landed at about 5e25 FLOP total. More than double GPT-4, but below GPT-4.5's >1e26 FLOP. Read that twice. A flagship used less total compute than the prior flagship. Note that this is total training compute including RL; pretraining-only is indeterminate from the public figures, so the read that the slowdown sits in pretraining is an inference, not a measured pretraining number. Epoch points to reinforcement learning as an increasingly important axis, though it hedges hard: RL's share could be anywhere from 10% to 200% of pretraining.

So the deceleration is real, just not where the wall crowd looks. Per-model total training compute is flattening while the record run climbs. This bend rests on a single recent flagship comparison (GPT-5 below GPT-4.5) plus Epoch's pre-2024 post-2018 deceleration, not a re-fit of 2025 to 2026 data, which is why I cap confidence at medium.

Caveats. Capex still rips at ~72% per year, and the AI chip stock compounds at a steady ~3.3x/year. FLOP figures for closed models are educated estimates, not invoices.

Bottom line: the frontier is not slowing, the per-model curve is, and spend is rerouting into RL. Anyone calling a flat scaling wall is reading one number and missing three.`,
    dataPoints: [
      {
        claim:
          'Frontier AI model training compute grows 4-5x per year; the running top-10 models grew 5.3x/year (90% CI 4.9x to 5.7x) over 2010 to May 2024, with a post-2018 deceleration to 4.2x/year (90% CI 3.6x to 4.9x). GPT-4 is estimated at ~2e25 FLOP.',
        value:
          '5.3x/year full-window (90% CI 4.9x to 5.7x); 4.2x/year post-2018 (90% CI 3.6x to 4.9x); GPT-4 ~2e25 FLOP',
        source: 'Epoch AI, Training compute of frontier AI models grows by 4-5x per year',
        url: 'https://epoch.ai/blog/training-compute-of-frontier-ai-models-grows-by-4-5x-per-year',
      },
      {
        claim:
          'The largest known training run is Grok 4 at around 5e26 FLOP; frontier LM compute has grown 5x/year since 2020, doubling roughly every 5.2 months (dashboard updated Feb 5 2026). At ~5e26 vs GPT-4\'s ~2e25, the ceiling is about 25x above GPT-4.',
        value: '~5e26 FLOP (Grok 4), ~25x GPT-4; 5x/year since 2020; ~5.2-month doubling',
        source: 'Epoch AI, Trends in Artificial Intelligence',
        url: 'https://epoch.ai/trends',
      },
      {
        claim:
          "Epoch's Grok 4 analysis (dated Sept 12 2025) estimates ~246 million H100-hours; its subtitle frames Grok 4 as 'the largest AI training run to date,' while the article body quantifies resources without repeating the superlative.",
        value: "~246M H100-hours; 'largest to date' is Epoch's subtitle framing, as of Sept 12 2025",
        source: 'Epoch AI, What did it take to train Grok 4?',
        url: 'https://epoch.ai/data-insights/grok-4-training-resources',
      },
      {
        claim:
          "GPT-5 total training compute estimated at ~5e25 FLOP (pretraining plus RL): more than 2x GPT-4's ~2e25 FLOP but LESS than GPT-4.5's >1e26 FLOP. Epoch hedges on RL, calling it 'a key factor in near-term AI progress' with its share estimated at 10% to 200% of pretraining.",
        value: "~5e25 FLOP total, below GPT-4.5's >1e26; RL share 10-200% of pretraining",
        source: 'Epoch AI, Notes on GPT-5 training compute',
        url: 'https://epochai.substack.com/p/notes-on-gpt-5-training-compute',
      },
      {
        claim:
          'Hyperscaler capex has grown ~72%/year (90% CI 66% to 78%) since Q2 2023, projecting ~$770B in 2026.',
        value: '~72%/year capex; ~$770B 2026 projection',
        source: "Epoch AI, Hyperscaler capex has quadrupled since GPT-4's release",
        url: 'https://epoch.ai/data-insights/hyperscaler-capex-trend',
      },
      {
        claim:
          'The total stock of AI chips (global AI computing capacity) has grown by approximately 3.3x per year since 2022, doubling roughly every 7 months.',
        value: '~3.3x/year, ~7-month doubling, since 2022',
        source: 'Epoch AI, Global AI computing capacity is doubling every 7 months',
        url: 'https://epoch.ai/data-insights/ai-chip-production',
      },
    ],
    caveats:
      'FLOP figures for closed frontier models (GPT-5, Grok 4, Gemini, GPT-4.5) are Epoch AI estimates derived from public statements and modeling, not disclosed by the labs, so they carry wide uncertainty bands. The headline 4-5x/year fit (and the post-2018 4.2x/year figure) is anchored to data through May 2024; the 2025 to 2026 points (Grok 4, GPT-5) are individual data points consistent with, but not a re-fit of, that trend, which is why the per-model flattening claim is held at medium confidence. "Compute" here is training FLOP only and deliberately excludes inference and total R&D compute. The GPT-5-below-GPT-4.5 comparison is total training compute including RL; an apples-to-apples pretraining-only comparison is murkier, so the read that the slowdown sits in pretraining is an inference about where it likely lands, not a measured pretraining figure. The ~3.3x/year is the steady growth of the global AI chip stock since 2022, not a model-level rate and not a 2025-specific deceleration. The "largest run to date" label is Epoch\'s own subtitle framing as of its Sept 12 2025 Grok 4 analysis, not a body-text ranking claim, and the ~246M H100-hours comes from that separate analysis, not from the trends dashboard that carries the ~5e26 FLOP figure.',
  },
  {
    slug: 'trust-ai-found-cves',
    question: 'Should AI-discovered CVEs be trusted like human-found ones?',
    ruling:
      'No, not by default. Trust the pipeline that ships a working reproduction and a human gate; treat any unreviewed bulk AI finding as an unconfirmed lead, not a CVE, until someone reproduces it.',
    confidence: 'high',
    date: 'May 29, 2026',
    category: 'Security',
    body: `As of 29 May 2026, my ruling: no, do not trust an AI-found CVE the way you trust a human-found one by default. Trust the pipeline, not the discoverer. An AI finding with a working reproduction and a human reviewer earns the same weight as any human report. An AI finding without reproduction is a lead, not a CVE.

The numbers force the split. When raw AI output hits a triage queue, it drowns the signal. curl's confirmed-vulnerability rate ran north of 15 percent for years, then cratered below 5 percent in 2025. More than nineteen in twenty submissions were noise. curl killed its bounty on January 31, 2026 and moved reports to GitHub with no reward.

Now the other side. Google's Big Sleep reported 20 real vulnerabilities in popular open source (FFmpeg and ImageMagick). Separately, it caught a SQLite bug (CVE-2025-6965, July 2025) before exploitation and a use-after-free in Chrome's ANGLE library (CVE-2025-9478, August 11 2025, patched in Chrome 139). Google's own rule: a human expert stays in the loop before anything gets reported, and the agent reproduces each bug itself. That gate is the whole game.

Fair caveat: these are not identical setups. curl fields low-skill submitters with LLMs; Big Sleep is one well-resourced research agent. Sophistication matters too, not just the gate.

The supply is real and rising. CVEs traced to AI-written code went from 6 in January to 35 in March 2026. Veracode found that AI-generated code carried known OWASP vulnerabilities in 45 percent of samples, a leading indicator of AI-introduced defects. AI finds bugs, including bugs AI created.

Bottom line: judge the evidence, not the author. Demand a reproduction and a named verifier. No repro, no CVE.`,
    dataPoints: [
      {
        claim:
          "curl's confirmed-vulnerability rate ran north of 15 percent historically and fell below 5 percent in 2025, per maintainer Daniel Stenberg",
        value: '>15% historical confirmed rate dropping to <5% in 2025',
        source:
          "daniel.haxx.se (Daniel Stenberg, curl maintainer), 'The end of the curl bug-bounty'",
        url: 'https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/',
      },
      {
        claim:
          'curl accepted its last HackerOne submissions on January 31, 2026 and now routes reports through GitHub with no monetary reward, after a flood of AI-generated reports',
        value: 'Bounty ended Jan 31, 2026; reports moved to GitHub, no reward',
        source:
          "BleepingComputer, 'Curl ending bug bounty program after flood of AI slop reports'",
        url: 'https://www.bleepingcomputer.com/news/security/curl-ending-bug-bounty-program-after-flood-of-ai-slop-reports/',
      },
      {
        claim:
          'Google\'s Big Sleep reported 20 vulnerabilities in popular open source (FFmpeg and ImageMagick); Google states a human expert is in the loop before reporting and the AI agent finds and reproduces each vulnerability without human intervention, and withheld specific CVE details while bugs were being fixed',
        value:
          '20 vulnerabilities (FFmpeg, ImageMagick); human-in-the-loop policy + AI reproduces each bug',
        source: 'TechCrunch (quoting a Google spokesperson), Aug 4 2025',
        url: 'https://techcrunch.com/2025/08/04/google-says-its-ai-based-bug-hunter-found-20-security-vulnerabilities/',
      },
      {
        claim:
          "Big Sleep separately discovered CVE-2025-9478, a use-after-free in Chrome's ANGLE library, on August 11, 2025; Google patched it in Chrome 139.0.7258.154. The CVE carries CVSS 8.8 (High).",
        value: 'AI-discovered Aug 11 2025; CVSS 8.8 (High); patched in Chrome 139.0.7258.154',
        source:
          "securityonline.info, 'Google Chrome Patches ANGLE Vulnerability (CVE-2025-9478) Discovered by AI Agent Big Sleep'",
        url: 'https://securityonline.info/google-chrome-patches-critical-angle-vulnerability-cve-2025-9478-discovered-by-ai-agent-big-sleep/',
      },
      {
        claim:
          'AI-generated code introduced known OWASP vulnerabilities in 45 percent of samples across 100-plus models and 80-plus tasks, a leading indicator of AI-introduced defects',
        value: '45% of AI-generated code carries OWASP vulnerabilities',
        source: 'Veracode 2025 GenAI Code Security Report (via Infosecurity Magazine)',
        url: 'https://www.infosecurity-magazine.com/news/ai-generated-code-vulnerabilities/',
      },
      {
        claim:
          'CVEs traced to AI-generated code rose from 6 in January to 15 in February to 35 in March 2026, showing AI-origin vulnerabilities are real and growing',
        value: '6 in Jan, 15 in Feb, 35 in Mar 2026 (CVEs from AI-generated code)',
        source:
          "Georgia Tech Vibe Security Radar (Hanqing Zhao), via Cloud Security Alliance research note 'Vibe Coding's Security Debt: The AI-Generated CVE Surge'",
        url: 'https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-generated-code-vulnerability-surge-2026/',
      },
    ],
    caveats:
      'The curl sub-5 percent figure is a single high-volume open-source program, the clearest public validation-rate disclosure but not an industry-wide average; other programs reported less severe slop, and it reflects low-skill LLM-wielding submitters rather than all AI finders. BleepingComputer notes that some of curl\'s 2026 submissions were in fact real bugs, so the collapse in confirmed rate is about volume of noise, not a claim that AI never finds anything. Big Sleep\'s 20-vulnerability count and human-in-the-loop description come from Google\'s own statements via TechCrunch, which also notes Google withheld specific CVE details while bugs were being fixed; the "human expert in the loop" claim is Google\'s general policy across all 20 findings, not a documented bug-specific verification of CVE-2025-9478, whose cited source confirms only AI discovery and the Chrome patch. The 20-vulnerability batch (FFmpeg and ImageMagick) is distinct from the SQLite catch (CVE-2025-6965, July 2025, a threat-intel-staged-exploit interception) and from the ANGLE bug (CVE-2025-9478, August 2025); they are separate Big Sleep disclosures, not a single batch. CVE-2025-9478 carries CVSS 8.8, which is High rather than Critical despite some headline framing. The Veracode 45 percent figure measures code-quality defects in AI-generated code, a leading indicator rather than a direct count of AI-discovered CVEs. The Georgia Tech monthly counts measure AI-origin code, which overlaps with but is not identical to AI-discovered CVEs.',
  },
  {
    slug: 'frontier-premium-worth-it',
    question:
      'Is the proprietary frontier still worth its premium over open models for most agent tasks?',
    ruling:
      'For most agent tasks the answer is no: route default traffic to open weights at the inference floor and reserve the frontier premium for long-horizon agentic coding and high-stakes reasoning, where a roughly 7 to 8 point benchmark gap actually compounds across a trajectory.',
    confidence: 'medium',
    date: 'May 29, 2026',
    category: 'Inference',
    body: `My ruling, as of 29 May 2026: for most agent tasks the frontier premium is no longer worth it. Default to open weights at the inference floor and spend the premium only where it compounds.

Look at the spread. DeepSeek V4-Flash, open and MIT-licensed, runs $0.14 in and $0.28 out per million tokens. Claude Opus 4.7 runs $5 and $25. That is roughly 90x on output. GPT-5.4 and Gemini 3.1 Pro sit in the middle near $2 to $2.50 in and $12 to $15 out, still 40x to 50x the open floor. GPT-5.5 actually climbed to $5 / $30, dearer than Opus, which only makes my point louder.

Now the capability gap on the work agents actually do. On the AA-GPQA Diamond aggregate the top frontier lands at 92 to 94 percent (Gemini 3.1 Pro 94.1, GPT-5.5 93.5, GPT-5.4 92.0) and the best open weight, Kimi K2.6, at 91.1. About 3 points. No one should pay a 40x to 90x bill for retrieval, summarization, extraction, classification, or routine tool calls when the open floor lands that close.

Here is where the frontier still earns it: long-horizon agentic coding. SWE-bench Verified shows GPT-5.5 at 88.7 and Opus 4.7 at 87.6 versus 80.6 for the best open weight, DeepSeek V4 Pro Max. Roughly 8 points against GPT-5.5, about 7 against Opus. In a multi-step loop those per-step gaps tend to compound, though that is directional, not arithmetic; steps correlate and some loops self-correct.

Bottom line: open by default, frontier for the hard agentic loop.`,
    dataPoints: [
      {
        claim:
          'DeepSeek V4-Flash open-weight API price (the practical open inference floor), MIT-licensed and self-hostable',
        value: '$0.14 input / $0.28 output per million tokens',
        source: 'DeepSeek API Docs (official pricing)',
        url: 'https://api-docs.deepseek.com/quick_start/pricing',
      },
      {
        claim: 'Claude Opus 4.7 frontier API price, the premium end of the market',
        value: '$5.00 input / $25.00 output per million tokens',
        source: 'Anthropic / Claude API pricing',
        url: 'https://platform.claude.com/docs/en/about-claude/pricing',
      },
      {
        claim: 'GPT-5.5 and GPT-5.4 frontier pricing (the figures used in the argument)',
        value: 'GPT-5.5 $5.00 in / $30 out; GPT-5.4 $2.50 in / $15 out per million tokens',
        source: 'DevTk OpenAI API Pricing Guide 2026',
        url: 'https://devtk.ai/en/blog/openai-api-pricing-guide-2026/',
      },
      {
        claim: 'Gemini 3.1 Pro mid-frontier pricing (context windows up to 200K tokens)',
        value: '$2.00 input / $12.00 output per million tokens',
        source: 'DevTk Gemini 3.1 Pro model pricing (May 2026)',
        url: 'https://devtk.ai/en/models/gemini-3-1-pro/',
      },
      {
        claim:
          'GPQA Diamond reasoning gap between top frontier and best open weight is single digits',
        value:
          'Gemini 3.1 Pro 94.1%, GPT-5.5 93.5%, GPT-5.4 92.0% vs best open weight Kimi K2.6 91.1%',
        source: 'BenchLM AA-GPQA Diamond aggregate (updated May 28, 2026)',
        url: 'https://benchlm.ai/benchmarks/aaGpqaDiamond',
      },
      {
        claim:
          'On agentic coding the frontier lead is real: best open weight trails frontier by roughly 7 to 8 points on SWE-bench Verified',
        value: 'Frontier ~88% (GPT-5.5 88.7%, Opus 4.7 87.6%) vs best open weight DeepSeek V4 Pro Max 80.6%',
        source: 'SWE-bench Verified leaderboard (May 2026), marc0.dev',
        url: 'https://www.marc0.dev/en/leaderboard',
      },
      {
        claim:
          'Self-host H100 cloud rental sits in the low single digits per GPU-hour at specialized providers, so self-hosting open weights can beat hosted API economics past a sustained-volume threshold',
        value:
          'H100 cloud rental roughly $1.38 (specialized providers) up to ~$11 per GPU-hour (hyperscalers), median near $3.50 (May 2026)',
        source: 'Thunder Compute NVIDIA H100 Pricing (May 2026)',
        url: 'https://www.thundercompute.com/blog/nvidia-h100-pricing',
      },
    ],
    caveats:
      'Benchmark leaderboards move week to week and several figures come from aggregator sites (BenchLM, marc0.dev) rather than first-party model cards, so re-verify the exact percentages against your own task before committing budget; hence medium confidence. GPQA scores in particular are highly source-dependent: Opus 4.7 is reported anywhere from 88.5% (BenchLM base) to 94.2% (some blogs), so treat per-model points as a band, not a fixed number. On the cited sources DeepSeek and Kimi open-weight models trade the open-tier lead depending on benchmark (Kimi K2.6 tops the BenchLM GPQA aggregate at 91.1%, DeepSeek V4 Pro Max tops the marc0.dev SWE-bench table at 80.6%), so the open baseline is a moving target. The trajectory-level coding advantage assumes roughly independent per-step success; in practice errors correlate and some agent loops self-correct, so the compounding is directional, not a guaranteed multiplier. The self-host break-even is a rule of thumb: H100 rental ranges from the low single digits per GPU-hour at specialized providers up to roughly $11 at hyperscalers (median near $3.50 in May 2026), so self-hosting open weights only wins past sustained, high-utilization volume; below that, hosted open APIs are simpler. "Open weight" here means downloadable and self-hostable, not necessarily open data or training; license terms still govern commercial use.',
  },
];

export function getVerdict(slug: string): Verdict | undefined {
  return VERDICTS.find((v) => v.slug === slug);
}
