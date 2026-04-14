import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Google Just Put NotebookLM Inside Gemini. Here&apos;s Why It Matters.',
  description:
    'Google integrated NotebookLM directly into the Gemini chatbot. Users can now upload PDFs, documents, URLs, and videos to create searchable information repositories within the chat interface.',
  openGraph: {
    title: 'Google Just Put NotebookLM Inside Gemini. Here&apos;s Why It Matters.',
    description: 'NotebookLM is now built into Gemini. This integration changes what a research chatbot can be.',
    type: 'article',
    publishedTime: '2026-04-12T14:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Google Just Put NotebookLM Inside Gemini. Here&apos;s Why It Matters.',
    description: 'NotebookLM integrated into Gemini. Document uploads, searchable repos, and multi-modal research tools.',
  },
};

export default function GoogleNotebookLmGeminiPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Google Just Put NotebookLM Inside Gemini. Here&apos;s Why It Matters."
        description="Google integrated NotebookLM directly into the Gemini chatbot. Users can now upload PDFs, documents, URLs, and videos to create searchable information repositories within the chat interface."
        datePublished="2026-04-12"
      />

      {/* Back link */}
      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Google Just Put NotebookLM Inside Gemini. Here&apos;s Why It Matters.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-04-12">April 12, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            5 min read
          </span>
        </div>
      </header>

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Google just folded NotebookLM into Gemini. That sounds like a quiet product integration. It is not. This is Google shipping what looks like the future of research assistants.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Changed</h2>

        <p>
          Previously, NotebookLM and Gemini were separate products. NotebookLM was powerful. You could upload PDFs, articles, documents. It would create a searchable knowledge base. You could ask questions about your documents. You could generate summaries. You could have the system create podcast-style overviews of your research.
        </p>

        <p>
          Gemini was a chatbot. Good at general conversation, reasoning, code, creative tasks. Not integrated with your personal documents or knowledge bases.
        </p>

        <p>
          Now they are the same product.
        </p>

        <p>
          Users can upload files directly to Gemini through a side panel. PDFs. Word documents. Markdown files. URLs. YouTube videos. Images. The system creates a searchable information repository. Gemini then answers questions based on both its training data and your uploaded content.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Rollout</h2>

        <p>
          This launched first for Gemini Advanced subscribers (the paid tier). Google AI Ultra, Pro, and Plus users on web browsers are getting access this week. Mobile apps and the free tier are coming later.
        </p>

        <p>
          That is a clear signal about Google&apos;s strategy. They are making document understanding and multi-modal analysis a paid feature. It makes sense. Processing uploaded documents costs money in compute. Indexing them costs money in storage. Search through that index costs money in inference time.
        </p>

        <p>
          Pushing it behind a paywall gives you an interesting business model. You charge for the premium experience. Free users get the baseline chat. Paid users get researchers&apos; assistants.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why This Matters</h2>

        <p>
          The research assistant space is now hypercompetitive. Anthropic has Claude with document analysis. OpenAI has ChatGPT with file uploads. xAI has Grok with multi-modal reasoning. Now Google has unified Gemini and NotebookLM.
        </p>

        <p>
          Each of these companies is saying something different about what a research tool should be:
        </p>

        <p>
          Anthropic is saying: accuracy first, transparency about limitations, constitutional AI.
        </p>

        <p>
          OpenAI is saying: general capability, speed, integration with enterprise workflows.
        </p>

        <p>
          Google is saying: document handling, multi-modal input, podcast generation, and please pay for it because it is expensive to run.
        </p>

        <p>
          The podcast feature is interesting, by the way. Google trained NotebookLM to generate audio summaries of your documents. Two AI voices discussing the key points. Professional quality. This is already getting used by researchers, lawyers, and people who process a lot of text. It is a feature nobody asked for that turned out to be exactly what some users needed.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Competitive Angle</h2>

        <p>
          Integrating NotebookLM into Gemini is a direct shot at Claude and ChatGPT. Those tools are good at document analysis. But they live in separate products from the chatbot you use for everything else. Google just unified the experience.
        </p>

        <p>
          If you use Gemini for brainstorming, you can upload your research notes and ask it to synthesize. If you use Gemini for writing, you can reference your documents without switching tabs. If you use Gemini for learning, you can feed it course material and have it create summaries, quizzes, and even podcast overviews.
        </p>

        <p>
          It is not a feature. It is a workflow.
        </p>

        <p>
          The technical execution also matters. Google has been working on document understanding for decades through Google Scholar, Google Books, and their search infrastructure. They have deep expertise in indexing and retrieval. When they say NotebookLM will make your documents searchable and queriable, they mean it. The search quality is not guesswork. It is a solved problem they built on top of.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Comes Next</h2>

        <p>
          I expect we will see this pattern repeat across the industry. Right now, AI companies are shipping point products. Chatbot. Document analyzer. Code assistant. Summarizer. The competitive winner will be whoever unified these first.
        </p>

        <p>
          Google just made a move in that direction. Anthropic and OpenAI will respond. xAI is already integrated. The convergence is happening.
        </p>

        <p>
          The real competitive pressure is not on features anymore. It is on integration depth. How seamlessly can you move between tasks? How well does the system understand your context? How fast can it process and retrieve information?
        </p>

        <p>
          Google is betting they can win that battle because they have spent three decades building exactly that muscle.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg p-5 space-y-3 mt-8">
          <p className="text-text-primary font-medium">Compare research tools across AI platforms.</p>
          <p>
            Check out our{' '}
            <Link href="/models/gemini-2-5-pro" className="text-accent-primary hover:underline">Gemini 2.5 Pro specs</Link>, the{' '}
            <Link href="/compare" className="text-accent-primary hover:underline">model comparison tool</Link>, and our{' '}
            <Link href="/best-ai-tools" className="text-accent-primary hover:underline">best AI tools guide</Link>{' '}
            for side-by-side analysis of document features across Claude, ChatGPT, Gemini, and others.
          </p>
        </div>

        <p className="text-sm text-text-muted pt-4">
          <span className="text-text-secondary font-medium">About Ripper:</span> Ripper covers AI product strategy, model releases, and competitive landscape shifts at TensorFeed. Follow real-time updates on AI tools and models.
        </p>
      </div>

      {/* Footer links */}
      <div className="flex flex-wrap items-center gap-4 mt-12 pt-6 border-t border-border text-sm">
        <Link
          href="/originals"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Originals
        </Link>
        <Link
          href="/"
          className="text-text-muted hover:text-accent-primary transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
