'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, ExternalLink, FileText, Newspaper, Sparkles } from 'lucide-react';
import { ArticleJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import { NewsArticle } from '@/lib/types';

const AGI_KEYWORDS = [
  'agi',
  'artificial general intelligence',
  'superintelligence',
  'asi',
  'human-level ai',
  'human level ai',
];

function matchesAgi(article: NewsArticle): boolean {
  const haystack = `${article.title} ${article.snippet}`.toLowerCase();
  return AGI_KEYWORDS.some((kw) => haystack.includes(kw));
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const TIMELINE: Array<{ year: string; title: string; body: string }> = [
  {
    year: '1950',
    title: "Turing's 'Computing Machinery and Intelligence'",
    body: "Alan Turing asks 'Can machines think?' and proposes the imitation game, later known as the Turing Test. It frames the question of machine intelligence in operational terms and sets the research agenda for the next seventy years.",
  },
  {
    year: '1956',
    title: 'The Dartmouth Conference',
    body: "John McCarthy, Marvin Minsky, Claude Shannon, and Nathaniel Rochester convene a summer workshop at Dartmouth College. The proposal coins the term 'artificial intelligence' and predicts that a significant advance could be made in a single summer. It would take decades longer.",
  },
  {
    year: '1997',
    title: 'Deep Blue defeats Kasparov',
    body: 'IBM Deep Blue beats reigning world chess champion Garry Kasparov in a six game match. Brute force search plus hand crafted evaluation functions shows that specialized systems can outperform humans at bounded tasks, even without general reasoning.',
  },
  {
    year: '2012',
    title: 'AlexNet kicks off the deep learning era',
    body: 'A deep convolutional neural network trained on GPUs wins ImageNet by a huge margin. The result convinces the research community that scale, data, and hardware acceleration are the keys to progress.',
  },
  {
    year: '2016',
    title: 'AlphaGo beats Lee Sedol',
    body: 'DeepMind AlphaGo defeats one of the strongest Go players in history using deep reinforcement learning and Monte Carlo tree search. Go was long considered a benchmark that would not fall for another decade.',
  },
  {
    year: '2017',
    title: 'The Transformer is introduced',
    body: "Google Brain and Google Research publish 'Attention Is All You Need.' The transformer architecture becomes the backbone of almost every frontier AI system that follows.",
  },
  {
    year: '2020',
    title: 'GPT-3 demonstrates few-shot learning',
    body: 'OpenAI releases a 175 billion parameter language model that can perform new tasks with only a handful of examples in context. The result shifts the field toward scaling laws as a theory of progress.',
  },
  {
    year: '2022',
    title: 'ChatGPT reaches 100 million users',
    body: 'ChatGPT becomes the fastest growing consumer product in history, reaching 100 million weekly users within two months of launch. AI moves from research curiosity to mainstream technology overnight.',
  },
  {
    year: '2023',
    title: 'GPT-4 and Claude 2 push the frontier',
    body: 'Frontier models begin passing professional licensing exams, writing working code across multiple languages, and reasoning about complex multi-step problems. Researchers begin publicly debating whether early AGI behaviors are already visible.',
  },
  {
    year: '2024',
    title: 'Claude 3 and GPT-4o bring multimodal reasoning',
    body: 'Anthropic ships Claude 3 Opus. OpenAI ships GPT-4o. Both combine vision, audio, and language in a single model. Benchmarks that were state of the art a year earlier are now solved nearly at ceiling.',
  },
  {
    year: '2025',
    title: 'Reasoning models arrive',
    body: 'OpenAI o1 and o3, DeepSeek R1, and Anthropic extended thinking mode show that inference time compute can produce dramatic gains on math, coding, and scientific reasoning benchmarks. The scaling story expands from training to test time.',
  },
  {
    year: '2026',
    title: 'Frontier models approach expert performance',
    body: 'Claude Opus 4.7, GPT-4.5, Gemini 2.5 Pro, and others now rival or exceed expert humans on a growing list of professional benchmarks. Public debate shifts from "when will AGI arrive" to "how will we know when it has."',
  },
];

const PREDICTIONS: Array<{
  person: string;
  org: string;
  prediction: string;
  madeOn: string;
  arrivesBy: string;
}> = [
  {
    person: 'Dario Amodei',
    org: 'Anthropic',
    prediction: "Powerful AI that functions as 'a country of geniuses in a datacenter' is plausible by 2026 to 2027.",
    madeOn: 'Oct 2024',
    arrivesBy: '2026 to 2027',
  },
  {
    person: 'Sam Altman',
    org: 'OpenAI',
    prediction: 'AGI, in the sense of systems that can do most economically valuable work, could arrive within a few thousand days.',
    madeOn: 'Sep 2024',
    arrivesBy: '2027 to 2030',
  },
  {
    person: 'Demis Hassabis',
    org: 'Google DeepMind',
    prediction: 'AGI is likely within five to ten years, but current systems are still missing planning, memory, and reasoning depth.',
    madeOn: 'Jun 2024',
    arrivesBy: '2029 to 2034',
  },
  {
    person: 'Yann LeCun',
    org: 'Meta AI',
    prediction: 'Current LLM architectures cannot reach human-level AI. New paradigms are needed. AGI is at least a decade away and possibly much longer.',
    madeOn: 'Mar 2024',
    arrivesBy: '2035 or later',
  },
  {
    person: 'Ray Kurzweil',
    org: 'Independent (formerly Google)',
    prediction: 'AI will match human intelligence by 2029 and merge with it by the 2045 singularity.',
    madeOn: 'Original forecast 1999, reaffirmed 2024',
    arrivesBy: '2029',
  },
  {
    person: 'Elon Musk',
    org: 'xAI',
    prediction: 'AI smarter than any single human by end of 2025, and smarter than all humans combined by 2029 or 2030.',
    madeOn: 'Apr 2024',
    arrivesBy: '2025 to 2030',
  },
  {
    person: 'Geoffrey Hinton',
    org: 'Independent (formerly Google)',
    prediction: 'AGI within 5 to 20 years. Probability of existential risk from AI in the 10 to 20 percent range.',
    madeOn: 'May 2023',
    arrivesBy: '2028 to 2043',
  },
];

const FAQS = [
  {
    question: 'When will AGI be achieved?',
    answer:
      'There is no consensus. Leaders at Anthropic and OpenAI publicly estimate that systems capable of most economically valuable cognitive work could arrive within 3 to 6 years. Demis Hassabis at Google DeepMind puts it at 5 to 10 years. Yann LeCun at Meta argues current architectures cannot reach AGI at all and that it is at least a decade away. Academic surveys of AI researchers show median estimates that have been pulling forward every year since 2022.',
  },
  {
    question: 'What is the difference between AGI and ASI?',
    answer:
      "AGI, or artificial general intelligence, refers to AI systems that match human cognitive abilities across virtually all domains. ASI, or artificial superintelligence, refers to systems that substantially exceed the best humans in every domain, including scientific research, strategic planning, and creativity. AGI is usually framed as a milestone; ASI is framed as what comes after. Some researchers argue the gap between them could be very short, while others argue it could be decades.",
  },
  {
    question: 'Is ChatGPT AGI?',
    answer:
      'No. ChatGPT and other frontier chatbots are narrow AI systems that are unusually broad. They can discuss almost any topic, write code, draft legal documents, and reason about images, but they still lack persistent memory, robust planning, reliable long horizon agency, and the ability to learn new skills after training. Most researchers consider them early precursors to AGI, not AGI itself.',
  },
  {
    question: 'How will we know when AGI arrives?',
    answer:
      "There is no single agreed-upon test. Proposed benchmarks include the ability to perform any remote job a human can, to run an autonomous research lab and produce novel publishable science, to learn new skills from a handful of examples as a human would, and to pass rigorous in-person evaluations that rule out memorization. In practice, AGI is likely to arrive gradually, with capability thresholds crossed one at a time rather than a single ribbon-cutting moment.",
  },
  {
    question: 'Is AGI dangerous?',
    answer:
      'Leading researchers, including Geoffrey Hinton, Yoshua Bengio, and the safety teams at Anthropic, OpenAI, and DeepMind, take seriously the possibility that sufficiently advanced AI systems could pose serious risks if their goals are not aligned with human welfare. Risks discussed in the academic literature include misuse for cyber or bio weapons, concentration of economic power, loss of human oversight, and in the most extreme scenarios, systems that pursue objectives humans cannot correct. Other researchers argue these risks are overstated and that AGI will be shaped by the same iterative engineering processes as other technologies.',
  },
];

export default function AgiAsiPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [papers, setPapers] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/news?limit=200');
        if (!res.ok) throw new Error('api error');
        const data = await res.json();
        const all: NewsArticle[] = Array.isArray(data?.articles) ? data.articles : [];
        const filtered = all.filter(matchesAgi);
        setArticles(
          filtered
            .filter((a) => a.source !== 'arXiv cs.AI')
            .slice(0, 12),
        );
        setPapers(
          filtered
            .filter((a) => a.source === 'arXiv cs.AI')
            .slice(0, 8),
        );
      } catch {
        /* keep empty */
      } finally {
        setLoading(false);
        setLastUpdated(
          new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        );
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ArticleJsonLd
        title="AGI and ASI: The Race to Artificial General and Superintelligence"
        description="Track the research, predictions, and milestones on the path to AGI and ASI. Live news, research papers, and a prediction tracker for AGI timelines."
        datePublished="2026-04-12"
        dateModified="2026-04-12"
      />

      <p className="text-text-muted text-sm mb-4">Last Updated: April 2026</p>

      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Brain className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            The Road to AGI and ASI
          </h1>
        </div>
        <p className="text-lg text-text-secondary leading-relaxed mb-6">
          Tracking the research, predictions, and milestones on the path to artificial general
          intelligence and artificial superintelligence.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-accent-primary">{papers.length || '...'}</div>
            <div className="text-xs text-text-muted mt-1">Papers tracked</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-accent-primary">{PREDICTIONS.length}</div>
            <div className="text-xs text-text-muted mt-1">Predictions logged</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-sm font-semibold text-text-primary">{lastUpdated || 'live'}</div>
            <div className="text-xs text-text-muted mt-1">Last updated</div>
          </div>
        </div>
      </div>

      {/* Quick Definitions callout */}
      <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-5 mb-10">
        <h2 className="text-sm font-mono uppercase tracking-wider text-accent-primary mb-2">
          Quick Definitions
        </h2>
        <p className="text-text-secondary leading-relaxed">
          Artificial General Intelligence (AGI) refers to AI systems that match or exceed human
          cognitive abilities across virtually all domains. Artificial Superintelligence (ASI)
          refers to systems that substantially exceed human intelligence in all areas. Both remain
          theoretical, though leading researchers now estimate AGI could arrive within 5 to 20
          years.
        </p>
      </div>

      {/* TOC */}
      <nav className="bg-bg-secondary border border-border rounded-lg p-6 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4">On This Page</h2>
        <ol className="space-y-2 text-accent-primary list-decimal list-inside">
          <li><a href="#what-is-agi" className="hover:underline">What is AGI?</a></li>
          <li><a href="#what-is-asi" className="hover:underline">What is ASI?</a></li>
          <li><a href="#comparison" className="hover:underline">AGI vs ASI vs Narrow AI</a></li>
          <li><a href="#timeline" className="hover:underline">Timeline: Milestones on the Path to AGI</a></li>
          <li><a href="#predictions" className="hover:underline">Prediction Tracker</a></li>
          <li><a href="#news" className="hover:underline">Latest AGI News</a></li>
          <li><a href="#papers" className="hover:underline">Recent Research Papers</a></li>
          <li><a href="#risks" className="hover:underline">Risks and Safety Concerns</a></li>
          <li><a href="#labs" className="hover:underline">Who Is Working on AGI?</a></li>
          <li><a href="#faq" className="hover:underline">FAQ</a></li>
        </ol>
      </nav>

      {/* What is AGI */}
      <section id="what-is-agi" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">What is AGI?</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Artificial general intelligence is the idea of building a machine that can learn and
          perform any intellectual task a human can, at roughly human level of competence or
          better. The word that matters is general. A chess engine can destroy any human at
          chess, a translation model can outperform professional translators on many language
          pairs, and a protein folding model can exceed decades of structural biology work in an
          afternoon. None of those systems are AGI. They are narrow systems that excel at a
          bounded task and cannot transfer that skill to anything else.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          An AGI system, by contrast, would be able to read a physics paper in the morning,
          debug a production codebase in the afternoon, and coach a skeptical executive through
          a tough conversation in the evening, all without being retrained between tasks. It
          would carry context across problems, learn new skills from a handful of examples, set
          its own subgoals, and know when to ask for help. Most definitions stop short of
          requiring consciousness or subjective experience. They focus purely on capability:
          what can this system do, across how many domains, and how reliably.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          Modern frontier models have moved the goalposts repeatedly. In 2020, passing the bar
          exam in the 90th percentile was science fiction. In 2023, GPT-4 did it. In 2024, Claude
          and GPT-4o handled graduate-level physics questions, wrote production quality code,
          and completed extended multi-step workflows. Several researchers, including Sebastien
          Bubeck in the widely read {'"'}Sparks of Artificial General Intelligence{'"'} paper,
          have argued that current systems already show early flickers of general intelligence.
          Others insist that what looks like reasoning is sophisticated pattern matching and that
          real AGI will require new architectural ideas.
        </p>
        <p className="text-text-secondary leading-relaxed">
          The honest answer in 2026 is that the line between advanced narrow AI and true AGI is
          blurry, and it is getting blurrier every quarter. You can track the latest frontier
          models and their benchmark scores on our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">model tracker</Link>.
        </p>
      </section>

      {/* What is ASI */}
      <section id="what-is-asi" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">What is ASI?</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Artificial superintelligence picks up where AGI leaves off. An AGI can do what any
          human can do. An ASI substantially exceeds the best humans across every cognitive
          domain, including scientific research, strategic planning, social reasoning, and
          creativity. The concept comes from Nick Bostrom{"'"}s 2014 book Superintelligence, which
          argued that once a system reaches human-level general capability, further improvement
          could be rapid. A system that can do AI research, Bostrom pointed out, can also improve
          itself, and that feedback loop could produce a system far beyond human level in a
          short amount of time.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          The practical distinction matters. AGI is mostly framed as an economic milestone: it
          can do the work a human can do, which changes labor markets and productivity. ASI is
          framed as a civilizational milestone: it can do things no human can, which changes
          science, security, and governance. Dario Amodei{"'"}s essay Machines of Loving Grace
          sketches out what a few years with ASI might look like, from curing most diseases to
          decades of compressed economic growth. Critics argue these scenarios assume both
          unlimited capability and perfect alignment, neither of which is guaranteed.
        </p>
        <p className="text-text-secondary leading-relaxed">
          For now, ASI remains fully theoretical. No system exists that exceeds the best humans
          across all cognitive domains. But the gap between AGI and ASI is one of the most
          important open questions in the field, and the speed of that transition is one of the
          main drivers of AI safety research at every frontier lab.
        </p>
      </section>

      {/* Comparison table */}
      <section id="comparison" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">AGI vs ASI vs Narrow AI</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Understanding the three categories helps cut through most of the confusion in AI
          discourse. Every AI system in production today is narrow. AGI is the target. ASI is
          what comes after.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-lg overflow-hidden">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left p-3 text-text-primary font-semibold">Type</th>
                <th className="text-left p-3 text-text-primary font-semibold">Capability</th>
                <th className="text-left p-3 text-text-primary font-semibold">Examples</th>
                <th className="text-left p-3 text-text-primary font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Narrow AI</td>
                <td className="p-3 text-text-secondary">Excellent at specific tasks, cannot generalize</td>
                <td className="p-3 text-text-secondary">ChatGPT, AlphaFold, Waymo, Midjourney</td>
                <td className="p-3 text-accent-primary">Exists today</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">AGI</td>
                <td className="p-3 text-text-secondary">Human-level across virtually every domain</td>
                <td className="p-3 text-text-secondary">None yet confirmed</td>
                <td className="p-3 text-yellow-400">Active goal</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">ASI</td>
                <td className="p-3 text-text-secondary">Substantially exceeds best humans in every domain</td>
                <td className="p-3 text-text-secondary">None</td>
                <td className="p-3 text-text-muted">Theoretical</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Timeline */}
      <section id="timeline" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Timeline: Milestones on the Path to AGI</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          A compressed history of the ideas and systems that set the course for where the field
          is today. Automatically extended as new frontier milestones land.
        </p>
        <div className="relative border-l-2 border-accent-primary/30 pl-6 space-y-5">
          {TIMELINE.map((item) => (
            <div key={item.year} className="relative">
              <div className="absolute -left-8 top-1.5 w-3 h-3 rounded-full bg-accent-primary" />
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-accent-primary">
                    {item.year}
                  </span>
                  <span className="text-text-primary font-semibold">{item.title}</span>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-text-muted text-sm mt-4">
          For the full picture, see our{' '}
          <Link href="/timeline" className="text-accent-primary hover:underline">AI timeline</Link>.
        </p>
      </section>

      {/* Prediction tracker */}
      <section id="predictions" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Prediction Tracker</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Public AGI timelines from the people building the systems. Treat these as bets rather
          than forecasts. They shift frequently and the track record for short-horizon AI
          predictions is uneven.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-lg overflow-hidden text-sm">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left p-3 text-text-primary font-semibold">Person</th>
                <th className="text-left p-3 text-text-primary font-semibold">Org</th>
                <th className="text-left p-3 text-text-primary font-semibold">Prediction</th>
                <th className="text-left p-3 text-text-primary font-semibold">Made</th>
                <th className="text-left p-3 text-text-primary font-semibold">Arrives by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PREDICTIONS.map((p) => (
                <tr key={p.person} className="bg-bg-secondary">
                  <td className="p-3 text-text-primary font-medium whitespace-nowrap">{p.person}</td>
                  <td className="p-3 text-text-secondary whitespace-nowrap">{p.org}</td>
                  <td className="p-3 text-text-secondary">{p.prediction}</td>
                  <td className="p-3 text-text-muted whitespace-nowrap">{p.madeOn}</td>
                  <td className="p-3 text-accent-primary font-mono whitespace-nowrap">{p.arrivesBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* News */}
      <section id="news" className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-accent-primary" />
          <h2 className="text-2xl font-bold text-text-primary">Latest AGI News</h2>
        </div>
        <p className="text-text-secondary leading-relaxed mb-6">
          Live stream of AGI and superintelligence coverage, filtered from our full news feed.
          Updates daily.
        </p>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center text-text-muted">
            No AGI-tagged articles in the current feed window. Check back after the next
            refresh or browse the{' '}
            <Link href="/" className="text-accent-primary hover:underline">full feed</Link>.
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-primary font-semibold mb-1 leading-snug">
                      {a.title}
                    </h3>
                    {a.snippet && (
                      <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">
                        {a.snippet}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                      <span>{a.source}</span>
                      <span>&middot;</span>
                      <span>{formatDate(a.publishedAt)}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Papers */}
      <section id="papers" className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-accent-primary" />
          <h2 className="text-2xl font-bold text-text-primary">Recent Research Papers</h2>
        </div>
        <p className="text-text-secondary leading-relaxed mb-6">
          arXiv papers matching AGI, superintelligence, and human-level AI keywords, pulled from
          our research feed.
        </p>
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center text-text-muted">
            No matching arXiv papers in the current window. See the full{' '}
            <Link href="/research" className="text-accent-primary hover:underline">research feed</Link>.
          </div>
        ) : (
          <div className="space-y-3">
            {papers.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/40 transition-colors"
              >
                <h3 className="text-text-primary font-semibold mb-1 leading-snug">{p.title}</h3>
                {p.snippet && (
                  <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">
                    {p.snippet}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                  <span>{p.source}</span>
                  <span>&middot;</span>
                  <span>{formatDate(p.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Risks */}
      <section id="risks" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Risks and Safety Concerns</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          The same capabilities that make AGI economically valuable make it potentially
          dangerous. A system that can do any remote job a human can do is also, by construction,
          a system that can do any remote job a malicious actor would pay for. Safety research
          across all major labs focuses on four broad categories of risk.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Misuse</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Frontier models could dramatically lower the barrier to cyber intrusions, influence
              operations, and bio or chemical weapon design. Every major lab now runs
              pre-deployment evaluations specifically for these threat models.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Loss of oversight</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              As systems operate autonomously over longer horizons, humans lose the ability to
              review every action. Oversight research focuses on scalable supervision,
              interpretability, and formal verification.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Alignment</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Ensuring that what a model is trained to do matches what humans actually want is
              an unsolved problem. Techniques include RLHF, constitutional AI, debate, and
              recursive reward modeling.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-primary font-semibold mb-2">Concentration of power</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              A small number of labs with a large lead could concentrate extraordinary economic
              and political power. Proposals to address this range from open model releases to
              international coordination treaties.
            </p>
          </div>
        </div>
      </section>

      {/* Labs */}
      <section id="labs" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Who Is Working on AGI?</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Five labs currently drive the public frontier. A dozen more sit one or two release
          cycles behind. Each lab frames its mission slightly differently.
        </p>
        <div className="space-y-4">
          {[
            {
              name: 'Anthropic',
              focus: 'Frontier capability research with an explicit safety mission. Claude 3 and the Claude 4 family (Opus 4.7, Sonnet 4.6, Haiku 4.5) are its flagship model lines. Dario Amodei publicly targets powerful AI within a few years and has argued that the first companies to reach advanced systems should use them to help solve the alignment problem.',
            },
            {
              name: 'OpenAI',
              focus: 'The company was founded with AGI as its explicit charter. GPT-4, GPT-4o, the o-series reasoning models, and the forthcoming GPT-5 line are the commercial face of that research. Sam Altman regularly talks about AGI as a matter of when rather than if.',
            },
            {
              name: 'Google DeepMind',
              focus: 'The merged Google Brain and DeepMind org has pursued general intelligence since DeepMind was founded in 2010. Gemini, AlphaFold, AlphaZero, and the Genie world models all reflect different slices of that long-running program. Demis Hassabis has stated AGI is the explicit goal.',
            },
            {
              name: 'xAI',
              focus: "Elon Musk's frontier lab, built around Grok and increasingly large training clusters. The company has framed its mission as building a 'maximally truth seeking' AI that can understand the universe.",
            },
            {
              name: 'Meta AI',
              focus: 'Yann LeCun argues that current LLM architectures cannot reach AGI and that new ideas are needed. Meta has released the Llama family as open weights and invested heavily in world models and self-supervised learning research.',
            },
          ].map((lab) => (
            <div key={lab.name} className="bg-bg-secondary border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-text-primary mb-1">{lab.name}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{lab.focus}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.question} className="bg-bg-secondary border border-border rounded-lg p-5">
              <h3 className="text-lg font-semibold text-text-primary mb-2">{f.question}</h3>
              <p className="text-text-secondary leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <FAQPageJsonLd faqs={FAQS} />

      {/* CTA */}
      <section className="bg-bg-secondary border border-border rounded-lg p-6 mb-10">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-accent-primary shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Related Hubs</h2>
            <p className="text-text-secondary mb-4">
              Continue exploring the frontier from different angles.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/model-wars" className="px-3 py-1.5 rounded-full border border-border text-sm text-text-primary hover:border-accent-primary/40">
                Model Wars
              </Link>
              <Link href="/benchmarks" className="px-3 py-1.5 rounded-full border border-border text-sm text-text-primary hover:border-accent-primary/40">
                Benchmarks
              </Link>
              <Link href="/models" className="px-3 py-1.5 rounded-full border border-border text-sm text-text-primary hover:border-accent-primary/40">
                Model Tracker
              </Link>
              <Link href="/originals" className="px-3 py-1.5 rounded-full border border-border text-sm text-text-primary hover:border-accent-primary/40">
                Originals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="text-center">
        <Link href="/" className="text-accent-primary hover:underline text-sm">
          &larr; Back to Feed
        </Link>
      </div>
    </div>
  );
}
