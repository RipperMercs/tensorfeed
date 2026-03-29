import { Metadata } from 'next';
import Link from 'next/link';
import { ArticleJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'What is Artificial Intelligence? A Complete Guide for 2026',
  description:
    'Learn what artificial intelligence is, how it works, the different types of AI, machine learning vs deep learning, current applications, and where the field is headed. A comprehensive, plain-English guide.',
  openGraph: {
    title: 'What is Artificial Intelligence? A Complete Guide for 2026',
    description:
      'Learn what artificial intelligence is, how it works, the different types of AI, and where the field is headed.',
    url: 'https://tensorfeed.ai/what-is-ai',
  },
};

export default function WhatIsAIPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ArticleJsonLd
        title="What is Artificial Intelligence? A Complete Guide for 2026"
        description="Learn what artificial intelligence is, how it works, the different types of AI, machine learning vs deep learning, current applications, and where the field is headed."
        datePublished="2025-06-15"
        dateModified="2026-03-28"
      />

      <p className="text-text-muted text-sm mb-4">Last Updated: March 2026</p>

      <h1 className="text-4xl font-bold text-text-primary mb-6">
        What is Artificial Intelligence? A Complete Guide
      </h1>

      <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-4 mb-8">
        <p className="text-text-secondary text-base leading-relaxed">
          Artificial intelligence (AI) refers to computer systems designed to perform tasks that
          normally require human intelligence, like understanding language, recognizing images, and
          learning from data. In 2026, AI powers everything from chatbots and code assistants to
          medical diagnostics and self-driving cars.
        </p>
      </div>

      <p className="text-lg text-text-secondary mb-8 leading-relaxed">
        Artificial intelligence has gone from a niche research topic to the most talked-about
        technology on the planet. But what does it actually mean? This guide cuts through the hype
        and explains AI in plain language, covering the fundamentals, the different flavors, how it
        is being used today, and where things are heading.
      </p>

      {/* Table of Contents */}
      <nav className="bg-bg-secondary border border-border rounded-lg p-6 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Table of Contents</h2>
        <ol className="space-y-2 text-accent-primary list-decimal list-inside">
          <li><a href="#definition" className="hover:underline">What is Artificial Intelligence?</a></li>
          <li><a href="#history" className="hover:underline">A Brief History of AI</a></li>
          <li><a href="#types" className="hover:underline">Types of AI: Narrow, General, and Super</a></li>
          <li><a href="#ml-vs-dl" className="hover:underline">Machine Learning vs Deep Learning</a></li>
          <li><a href="#llms" className="hover:underline">Large Language Models Explained</a></li>
          <li><a href="#applications" className="hover:underline">Current Applications of AI</a></li>
          <li><a href="#companies" className="hover:underline">Major AI Companies and Players</a></li>
          <li><a href="#future" className="hover:underline">The Future of AI</a></li>
          <li><a href="#glossary" className="hover:underline">Key Terms Glossary</a></li>
        </ol>
      </nav>

      {/* Definition */}
      <section id="definition" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">What is Artificial Intelligence?</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Artificial intelligence (AI) refers to computer systems designed to perform tasks that
          typically require human intelligence. This includes recognizing patterns, understanding
          language, making decisions, solving problems, and learning from experience. The key word
          is &quot;intelligence&quot; because these systems go beyond following rigid, pre-programmed
          instructions. Instead, they adapt and improve based on the data they process.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          In practical terms, AI is the technology behind your phone&apos;s voice assistant, the
          recommendation engine that suggests your next show on Netflix, the spam filter in your
          email, and the chatbots that can now hold remarkably human-like conversations. At its
          core, AI is about building systems that can perceive their environment, reason about it,
          and take actions to achieve goals.
        </p>
        <p className="text-text-secondary leading-relaxed">
          It is worth noting that &quot;AI&quot; is a broad umbrella term. When most people talk
          about AI in 2026, they are usually referring to machine learning systems and, more
          specifically, large language models (LLMs) like{' '}
          <Link href="/models" className="text-accent-primary hover:underline">the ones we track on TensorFeed</Link>.
          But AI encompasses much more than chatbots.
        </p>
      </section>

      {/* History */}
      <section id="history" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">A Brief History of AI</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          The idea of artificial intelligence has been around for decades, and its history is full
          of breakthroughs, disappointments, and comebacks.
        </p>

        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">1950s: The Birth of AI</h3>
            <p className="text-text-secondary leading-relaxed">
              Alan Turing published &quot;Computing Machinery and Intelligence&quot; in 1950,
              proposing the famous Turing Test. In 1956, John McCarthy coined the term
              &quot;artificial intelligence&quot; at the Dartmouth Conference. Early researchers
              were optimistic that human-level AI was just around the corner.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">1960s-1970s: Early Progress and First Winter</h3>
            <p className="text-text-secondary leading-relaxed">
              Early AI programs could prove mathematical theorems and play checkers. But progress
              was slower than expected. Funding dried up in what became known as the first
              &quot;AI winter.&quot; The technology simply was not powerful enough for the
              ambitions researchers had.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">1980s-1990s: Expert Systems and Second Winter</h3>
            <p className="text-text-secondary leading-relaxed">
              Expert systems, which used hand-coded rules to mimic human expertise, became popular
              in business. Companies invested billions. But these systems were brittle and expensive
              to maintain, leading to another period of disillusionment.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">1997-2011: Milestones</h3>
            <p className="text-text-secondary leading-relaxed">
              IBM&apos;s Deep Blue beat chess champion Garry Kasparov in 1997. Watson won Jeopardy!
              in 2011. Apple launched Siri. These milestones kept public interest alive, but AI
              was still far from general-purpose intelligence.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">2012-2022: The Deep Learning Revolution</h3>
            <p className="text-text-secondary leading-relaxed">
              Everything changed when deep neural networks, trained on massive datasets using
              powerful GPUs, started outperforming all previous approaches. AlexNet in 2012,
              AlphaGo in 2016, GPT-3 in 2020, and then ChatGPT in late 2022 brought AI into
              the mainstream in a way nothing had before.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">2023-2026: The Current Era</h3>
            <p className="text-text-secondary leading-relaxed">
              We are now in an era of rapid advancement. Models are getting more capable every few
              months. AI agents can browse the web, write and execute code, and complete complex
              multi-step tasks. Companies are integrating AI into nearly every product category.
              You can track all of this in real time on our{' '}
              <Link href="/" className="text-accent-primary hover:underline">live feed</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Types of AI */}
      <section id="types" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Types of AI: Narrow, General, and Super</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          AI researchers typically classify artificial intelligence into three categories based on
          capability level. Understanding these distinctions helps cut through a lot of the confusion
          in AI discussions.
        </p>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border border-border rounded-lg overflow-hidden">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left p-3 text-text-primary font-semibold">Type</th>
                <th className="text-left p-3 text-text-primary font-semibold">Also Called</th>
                <th className="text-left p-3 text-text-primary font-semibold">Description</th>
                <th className="text-left p-3 text-text-primary font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Narrow AI</td>
                <td className="p-3 text-text-secondary">Weak AI, ANI</td>
                <td className="p-3 text-text-secondary">Excels at specific tasks but cannot generalize</td>
                <td className="p-3 text-accent-primary">Exists today</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">General AI</td>
                <td className="p-3 text-text-secondary">Strong AI, AGI</td>
                <td className="p-3 text-text-secondary">Human-level intelligence across all domains</td>
                <td className="p-3 text-yellow-400">In development</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Super AI</td>
                <td className="p-3 text-text-secondary">ASI</td>
                <td className="p-3 text-text-secondary">Surpasses human intelligence in every way</td>
                <td className="p-3 text-text-muted">Theoretical</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Narrow AI (What We Have Now)</h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          Every AI system in production today is narrow AI. This includes ChatGPT, Google Search,
          Tesla&apos;s autopilot, and AlphaFold. These systems can be astonishingly good at their
          designated tasks, sometimes far surpassing human performance, but they cannot transfer
          that ability to unrelated domains. A chess AI cannot write poetry. An image generator
          cannot diagnose diseases (unless specifically trained to do so).
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          That said, modern LLMs blur this line. Models like Claude, GPT-4o, and Gemini can handle
          a remarkably wide range of tasks: coding, writing, analysis, math, translation, and more.
          Some researchers argue these models are approaching &quot;broad&quot; AI, even if they are
          not truly general.
        </p>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Artificial General Intelligence (AGI)</h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          AGI would be a system that can learn and perform any intellectual task a human can. It
          would understand context, transfer knowledge between domains, reason about novel situations,
          and set its own goals. No system has achieved AGI yet, though several companies, including
          OpenAI and DeepMind, have stated it is their explicit goal. Timelines vary wildly, with
          predictions ranging from 2027 to &quot;never.&quot;
        </p>

        <h3 className="text-xl font-semibold text-text-primary mb-3">Artificial Superintelligence (ASI)</h3>
        <p className="text-text-secondary leading-relaxed">
          ASI is a hypothetical future AI that surpasses the smartest humans in every domain,
          including creativity, social intelligence, and scientific reasoning. This concept is mostly
          discussed in the context of AI safety and long-term risk. It remains firmly in the realm
          of speculation.
        </p>
      </section>

      {/* ML vs DL */}
      <section id="ml-vs-dl" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Machine Learning vs Deep Learning</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          These terms are often used interchangeably, but they refer to different (and related)
          things. Think of it as a set of nested categories: AI contains machine learning, which
          contains deep learning.
        </p>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border border-border rounded-lg overflow-hidden">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left p-3 text-text-primary font-semibold">Aspect</th>
                <th className="text-left p-3 text-text-primary font-semibold">Machine Learning</th>
                <th className="text-left p-3 text-text-primary font-semibold">Deep Learning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Definition</td>
                <td className="p-3 text-text-secondary">Algorithms that learn patterns from data</td>
                <td className="p-3 text-text-secondary">ML using neural networks with many layers</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Data needs</td>
                <td className="p-3 text-text-secondary">Can work with smaller datasets</td>
                <td className="p-3 text-text-secondary">Requires very large datasets</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Feature engineering</td>
                <td className="p-3 text-text-secondary">Often requires manual feature selection</td>
                <td className="p-3 text-text-secondary">Learns features automatically</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Hardware</td>
                <td className="p-3 text-text-secondary">Can run on CPUs</td>
                <td className="p-3 text-text-secondary">Typically requires GPUs or TPUs</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Examples</td>
                <td className="p-3 text-text-secondary">Random forests, SVMs, linear regression</td>
                <td className="p-3 text-text-secondary">GPT, DALL-E, AlphaFold, Stable Diffusion</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-semibold text-text-primary mb-3">How Machine Learning Works</h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          Instead of being explicitly programmed with rules, a machine learning system is trained
          on data. You give it thousands (or millions) of examples, and it finds patterns. For
          instance, show an ML model millions of emails labeled &quot;spam&quot; or &quot;not
          spam,&quot; and it learns to classify new emails on its own. The three main types of ML
          are supervised learning (labeled data), unsupervised learning (finding hidden patterns),
          and reinforcement learning (learning through trial and reward).
        </p>

        <h3 className="text-xl font-semibold text-text-primary mb-3">How Deep Learning Works</h3>
        <p className="text-text-secondary leading-relaxed">
          Deep learning is a subset of machine learning that uses artificial neural networks with
          many layers (hence &quot;deep&quot;). Each layer processes the data at a higher level of
          abstraction. In image recognition, early layers might detect edges, middle layers detect
          shapes, and later layers recognize objects. The transformer architecture, introduced in
          2017, is the foundation of modern LLMs and has driven most of the recent progress in AI.
        </p>
      </section>

      {/* LLMs */}
      <section id="llms" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Large Language Models Explained</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Large language models are the technology behind ChatGPT, Claude, Gemini, and other AI
          chatbots. They are neural networks trained on enormous amounts of text data to predict
          what comes next in a sequence of words. Through this simple objective, they develop
          surprisingly sophisticated capabilities: they can write code, explain complex topics,
          translate languages, reason about problems, and much more.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          The &quot;large&quot; in LLM refers to the number of parameters (learnable values) in the
          model. Modern LLMs have anywhere from a few billion to over a trillion parameters. More
          parameters generally means more capability, though training data quality and techniques
          matter enormously too.
        </p>
        <p className="text-text-secondary leading-relaxed">
          You can explore and compare the latest LLMs on our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">model tracker</Link>,
          which covers pricing, capabilities, and context window sizes across all major providers.
        </p>
      </section>

      {/* Applications */}
      <section id="applications" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Current Applications of AI</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          AI is already embedded in products you use daily. Here are the major application areas
          as of 2026:
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'Conversational AI', desc: 'Chatbots like ChatGPT, Claude, and Gemini handle customer support, answer questions, write content, and assist with coding. This is the most visible AI application right now.' },
            { title: 'Code Generation', desc: 'Tools like GitHub Copilot, Cursor, and Claude Code help developers write, debug, and refactor code. Some studies show 30-50% productivity gains for developers using AI coding tools.' },
            { title: 'Image and Video Generation', desc: 'DALL-E, Midjourney, Stable Diffusion, and Sora can generate photorealistic images and videos from text descriptions. The creative industry is being transformed.' },
            { title: 'Healthcare', desc: 'AI assists in drug discovery, medical imaging diagnosis, protein structure prediction (AlphaFold), and personalized treatment recommendations.' },
            { title: 'Autonomous Vehicles', desc: 'Self-driving cars from Waymo, Tesla, and others use AI to perceive their environment, predict behavior of other road users, and navigate safely.' },
            { title: 'Scientific Research', desc: 'AI accelerates research by analyzing data, generating hypotheses, and even designing experiments. It is particularly impactful in materials science, climate modeling, and genomics.' },
            { title: 'Finance', desc: 'Algorithmic trading, fraud detection, credit scoring, and automated financial analysis are all powered by AI systems.' },
            { title: 'Search and Recommendations', desc: 'Google, YouTube, Spotify, and Amazon all rely heavily on AI to personalize search results and recommend content.' },
          ].map((item) => (
            <div key={item.title} className="bg-bg-secondary border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-text-primary mb-2">{item.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Companies */}
      <section id="companies" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Major AI Companies and Players</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          The AI landscape is dominated by a handful of well-funded companies, though new
          players continue to emerge. Here is a snapshot of the major organizations driving AI
          development in 2026:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-lg overflow-hidden">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left p-3 text-text-primary font-semibold">Company</th>
                <th className="text-left p-3 text-text-primary font-semibold">Key Models</th>
                <th className="text-left p-3 text-text-primary font-semibold">Focus Area</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { company: 'OpenAI', models: 'GPT-4o, o1, o3, DALL-E, Sora', focus: 'General-purpose AI, AGI research' },
                { company: 'Anthropic', models: 'Claude Opus, Sonnet, Haiku', focus: 'Safe and steerable AI' },
                { company: 'Google DeepMind', models: 'Gemini, AlphaFold, Veo', focus: 'Multimodal AI, scientific AI' },
                { company: 'Meta', models: 'Llama 4, NLLB, SAM', focus: 'Open source AI models' },
                { company: 'Mistral', models: 'Mistral Large, Mistral Small', focus: 'Efficient, European-based AI' },
                { company: 'xAI', models: 'Grok', focus: 'AI for X platform' },
                { company: 'Cohere', models: 'Command R+', focus: 'Enterprise AI and RAG' },
              ].map((row) => (
                <tr key={row.company} className="bg-bg-secondary">
                  <td className="p-3 text-text-primary font-medium">{row.company}</td>
                  <td className="p-3 text-text-secondary">{row.models}</td>
                  <td className="p-3 text-text-secondary">{row.focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-text-secondary leading-relaxed mt-4">
          Track model releases, API status, and more from all major providers on our{' '}
          <Link href="/status" className="text-accent-primary hover:underline">status page</Link>.
        </p>
      </section>

      {/* Future */}
      <section id="future" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">The Future of AI</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Making predictions about AI is notoriously difficult, but several trends are clear
          as of early 2026:
        </p>
        <ul className="list-disc list-inside space-y-3 text-text-secondary leading-relaxed mb-4">
          <li>
            <strong className="text-text-primary">AI agents are becoming mainstream.</strong> Models
            are increasingly able to take actions, not just generate text. They can browse the web,
            use tools, write and execute code, and complete multi-step workflows autonomously. Read
            more in our{' '}
            <Link href="/what-are-ai-agents" className="text-accent-primary hover:underline">
              guide to AI agents
            </Link>.
          </li>
          <li>
            <strong className="text-text-primary">Multimodal AI is the default.</strong> The best
            models now handle text, images, audio, and video natively. The lines between
            &quot;text AI&quot; and &quot;image AI&quot; are blurring.
          </li>
          <li>
            <strong className="text-text-primary">Open source is competitive.</strong> Models like
            Llama 4 and DeepSeek are matching or approaching proprietary model performance, which
            democratizes access. See our{' '}
            <Link href="/best-open-source-llms" className="text-accent-primary hover:underline">
              open source LLM guide
            </Link>.
          </li>
          <li>
            <strong className="text-text-primary">Costs are dropping fast.</strong> API prices have
            fallen dramatically. What cost $100 in API calls in 2023 might cost $5 today. Check
            our{' '}
            <Link href="/ai-api-pricing-guide" className="text-accent-primary hover:underline">
              pricing guide
            </Link>{' '}
            for the latest numbers.
          </li>
          <li>
            <strong className="text-text-primary">Regulation is taking shape.</strong> The EU AI Act
            is in effect, and other jurisdictions are following. Companies building with AI need to
            think carefully about compliance, transparency, and responsible use.
          </li>
        </ul>
      </section>

      {/* Glossary */}
      <section id="glossary" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Key Terms Glossary</h2>
        <div className="space-y-3">
          {[
            { term: 'Artificial Intelligence (AI)', def: 'Computer systems that perform tasks requiring human-like intelligence.' },
            { term: 'Machine Learning (ML)', def: 'A subset of AI where systems learn from data rather than being explicitly programmed.' },
            { term: 'Deep Learning', def: 'ML using multi-layered neural networks to learn complex patterns from large datasets.' },
            { term: 'Large Language Model (LLM)', def: 'A deep learning model trained on massive text data to understand and generate language.' },
            { term: 'Neural Network', def: 'A computing system inspired by biological neurons, composed of interconnected nodes organized in layers.' },
            { term: 'Transformer', def: 'The neural network architecture behind modern LLMs, introduced in the 2017 paper "Attention Is All You Need."' },
            { term: 'Parameter', def: 'A learnable value in a neural network. More parameters generally means more capability.' },
            { term: 'Token', def: 'A unit of text (roughly a word or word fragment) that LLMs process. Pricing is typically per token.' },
            { term: 'Context Window', def: 'The maximum amount of text (in tokens) an LLM can process in a single conversation.' },
            { term: 'Fine-tuning', def: 'Adapting a pre-trained model to a specific task or domain using additional training data.' },
            { term: 'RAG (Retrieval-Augmented Generation)', def: 'A technique that gives LLMs access to external knowledge by retrieving relevant documents before generating a response.' },
            { term: 'AI Agent', def: 'An AI system that can take actions autonomously, using tools and making decisions to accomplish goals.' },
            { term: 'Inference', def: 'The process of running a trained model to generate predictions or outputs.' },
            { term: 'Prompt', def: 'The input text or instructions you give to an LLM to get a desired output.' },
            { term: 'Hallucination', def: 'When an AI model generates plausible-sounding but factually incorrect information.' },
          ].map((item) => (
            <div key={item.term} className="bg-bg-secondary border border-border rounded-lg p-4">
              <dt className="text-text-primary font-semibold">{item.term}</dt>
              <dd className="text-text-secondary text-sm mt-1">{item.def}</dd>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">What is AI in simple terms?</h3>
            <p className="text-text-secondary leading-relaxed">
              AI refers to computer systems designed to perform tasks that normally require human
              intelligence, like understanding language, recognizing images, making decisions, and
              learning from data.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">What are the main types of AI?</h3>
            <p className="text-text-secondary leading-relaxed">
              There are three types: Narrow AI (what exists today, good at specific tasks), General
              AI (human-level intelligence, not yet achieved), and Super AI (surpasses humans, theoretical).
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">What is the difference between AI and machine learning?</h3>
            <p className="text-text-secondary leading-relaxed">
              AI is the broad field of making intelligent systems. Machine learning is a subset of AI
              where systems learn from data instead of being explicitly programmed. Deep learning is a
              subset of machine learning using neural networks.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">What is a large language model (LLM)?</h3>
            <p className="text-text-secondary leading-relaxed">
              An LLM is a type of AI model trained on massive amounts of text data that can understand
              and generate human language. Examples include GPT-4, Claude, Gemini, and Llama.
            </p>
          </div>
        </div>
      </section>

      <FAQPageJsonLd
        faqs={[
          { question: 'What is AI in simple terms?', answer: 'AI refers to computer systems designed to perform tasks that normally require human intelligence, like understanding language, recognizing images, making decisions, and learning from data.' },
          { question: 'What are the main types of AI?', answer: 'There are three types: Narrow AI (what exists today, good at specific tasks), General AI (human-level intelligence, not yet achieved), and Super AI (surpasses humans, theoretical).' },
          { question: 'What is the difference between AI and machine learning?', answer: 'AI is the broad field of making intelligent systems. Machine learning is a subset of AI where systems learn from data instead of being explicitly programmed. Deep learning is a subset of machine learning using neural networks.' },
          { question: 'What is a large language model (LLM)?', answer: 'An LLM is a type of AI model trained on massive amounts of text data that can understand and generate human language. Examples include GPT-4, Claude, Gemini, and Llama.' },
        ]}
      />

      {/* CTA */}
      <section className="bg-bg-secondary border border-border rounded-lg p-6 mb-10 text-center">
        <h2 className="text-xl font-bold text-text-primary mb-2">Stay Up to Date</h2>
        <p className="text-text-secondary mb-4">
          The AI landscape changes fast. TensorFeed tracks model releases, API pricing, research
          breakthroughs, and more in real time.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/" className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity">
            Browse the Feed
          </Link>
          <Link href="/models" className="px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors">
            Explore Models
          </Link>
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
