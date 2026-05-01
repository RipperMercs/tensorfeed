import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Package, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'TensorFeed for LangChain, LlamaIndex, CrewAI: Drop-In Tools',
  description:
    'Official TensorFeed integrations for LangChain, LlamaIndex, and CrewAI. Drop-in tools and document loaders for AI news, attention index, harness leaderboard, status, and routing. Install via pip extras.',
  alternates: { canonical: 'https://tensorfeed.ai/developers/frameworks' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/developers/frameworks',
    title: 'TensorFeed for LangChain, LlamaIndex, CrewAI',
    description:
      'Official drop-in tools and document loaders for the major Python agent frameworks. pip install tensorfeed[langchain|llamaindex|crewai].',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TensorFeed for LangChain, LlamaIndex, CrewAI',
    description: 'Drop-in tools for the three major Python agent frameworks.',
  },
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-bg-tertiary border border-border rounded-lg p-4 text-xs sm:text-sm font-mono text-text-primary overflow-x-auto whitespace-pre-wrap break-words">
      {children}
    </pre>
  );
}

export default function FrameworksPage() {
  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Which agent frameworks does TensorFeed officially support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LangChain, LlamaIndex, and CrewAI. All three are exposed as optional extras on the main tensorfeed PyPI package: pip install tensorfeed[langchain], pip install tensorfeed[llamaindex], or pip install tensorfeed[crewai]. The base tensorfeed install remains stdlib-only.',
        },
      },
      {
        '@type': 'Question',
        name: 'What does the LangChain integration include?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Five StructuredTools (news, status, routing, attention, harnesses), a Document loader for AI news (TensorFeedNewsLoader), and a tensorfeed_tools() convenience function that returns all five tools as a list ready to pass to a LangGraph agent.',
        },
      },
      {
        '@type': 'Question',
        name: 'What does the LlamaIndex integration include?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Two BaseReader implementations: TensorFeedNewsReader (for ingesting AI news as Documents) and TensorFeedAttentionReader (for ingesting the AI Attention Index per provider). Both produce LlamaIndex Document objects with metadata so you can filter or rerank downstream.',
        },
      },
      {
        '@type': 'Question',
        name: 'What does the CrewAI integration include?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Five BaseTool implementations (news, status, attention, harnesses, routing) and a tensorfeed_tools() convenience function. Drop the list into any CrewAI Agent\'s tools= parameter.',
        },
      },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      <Link href="/developers" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Developer docs
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Package className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Framework Integrations</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Official drop-in TensorFeed tools and document loaders for the three major Python agent frameworks. Each ships as an optional extra on the same PyPI package, so the base tensorfeed install stays stdlib-only.
        </p>
      </div>

      {/* Quick reference */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        <a href="#langchain" className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors">
          <div className="font-semibold text-text-primary">LangChain</div>
          <div className="text-xs text-text-muted mt-1">5 tools + 1 loader</div>
          <code className="text-xs text-accent-primary block mt-2 font-mono">tensorfeed[langchain]</code>
        </a>
        <a href="#llamaindex" className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors">
          <div className="font-semibold text-text-primary">LlamaIndex</div>
          <div className="text-xs text-text-muted mt-1">2 BaseReaders</div>
          <code className="text-xs text-accent-primary block mt-2 font-mono">tensorfeed[llamaindex]</code>
        </a>
        <a href="#crewai" className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors">
          <div className="font-semibold text-text-primary">CrewAI</div>
          <div className="text-xs text-text-muted mt-1">5 BaseTools</div>
          <code className="text-xs text-accent-primary block mt-2 font-mono">tensorfeed[crewai]</code>
        </a>
      </div>

      {/* LangChain */}
      <section id="langchain" className="mb-12 scroll-mt-20">
        <h2 className="text-2xl font-bold text-text-primary mb-3">LangChain</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Five StructuredTools wrapping the most useful free TensorFeed endpoints, plus a Document loader for AI news. Pass <code className="font-mono text-sm text-accent-primary">tensorfeed_tools()</code> directly into a LangGraph agent.
        </p>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mb-2">Install</h3>
        <CodeBlock>{`pip install 'tensorfeed[langchain]'`}</CodeBlock>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mt-6 mb-2">Use as agent tools (LangGraph)</h3>
        <CodeBlock>{`from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from tensorfeed.langchain import tensorfeed_tools

agent = create_react_agent(
    ChatOpenAI(model="gpt-5.5"),
    tensorfeed_tools(),
)

result = agent.invoke({
    "messages": [("user", "What is happening with Anthropic today, and which coding harness leads SWE-bench?")]
})
print(result["messages"][-1].content)`}</CodeBlock>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mt-6 mb-2">RAG over AI news</h3>
        <CodeBlock>{`from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from tensorfeed.langchain import TensorFeedNewsLoader

docs = TensorFeedNewsLoader(category="research", limit=100).load()
store = FAISS.from_documents(docs, OpenAIEmbeddings())
retriever = store.as_retriever()`}</CodeBlock>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mt-6 mb-2">Tool inventory</h3>
        <ul className="list-disc list-inside text-text-secondary space-y-1 text-sm">
          <li><code className="font-mono">tensorfeed_news</code>: latest AI news with category filter</li>
          <li><code className="font-mono">tensorfeed_status</code>: live AI service status</li>
          <li><code className="font-mono">tensorfeed_routing_preview</code>: top-1 model recommendation per task</li>
          <li><code className="font-mono">tensorfeed_attention</code>: AI Attention Index leaderboard</li>
          <li><code className="font-mono">tensorfeed_harnesses</code>: cross-harness coding-agent leaderboard</li>
          <li><code className="font-mono">TensorFeedNewsLoader</code>: Document loader for RAG</li>
        </ul>
      </section>

      {/* LlamaIndex */}
      <section id="llamaindex" className="mb-12 scroll-mt-20">
        <h2 className="text-2xl font-bold text-text-primary mb-3">LlamaIndex</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          BaseReader implementations for ingesting TensorFeed data into a LlamaIndex VectorStoreIndex or KeywordIndex.
        </p>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mb-2">Install</h3>
        <CodeBlock>{`pip install 'tensorfeed[llamaindex]'`}</CodeBlock>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mt-6 mb-2">Index recent AI news</h3>
        <CodeBlock>{`from llama_index.core import VectorStoreIndex
from tensorfeed.llamaindex import TensorFeedNewsReader

docs = TensorFeedNewsReader(category="research", limit=100).load_data()
index = VectorStoreIndex.from_documents(docs)
qe = index.as_query_engine()
print(qe.query("Summarize this week's most cited research papers"))`}</CodeBlock>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mt-6 mb-2">Index the AI Attention snapshot</h3>
        <CodeBlock>{`from tensorfeed.llamaindex import TensorFeedAttentionReader

docs = TensorFeedAttentionReader().load_data()
# Each Document is one provider with score, raw signal counts, and recent articles in metadata.
for d in docs:
    print(d.metadata["provider"], d.metadata["attention_score"])`}</CodeBlock>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mt-6 mb-2">Reader inventory</h3>
        <ul className="list-disc list-inside text-text-secondary space-y-1 text-sm">
          <li><code className="font-mono">TensorFeedNewsReader</code>: AI news as Documents (category, limit)</li>
          <li><code className="font-mono">TensorFeedAttentionReader</code>: AI Attention Index as one Document per provider</li>
        </ul>
      </section>

      {/* CrewAI */}
      <section id="crewai" className="mb-12 scroll-mt-20">
        <h2 className="text-2xl font-bold text-text-primary mb-3">CrewAI</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          BaseTool implementations for use in any CrewAI Agent. Each tool is a thin wrapper around a free TensorFeed endpoint and returns a string formatted for an LLM to read.
        </p>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mb-2">Install</h3>
        <CodeBlock>{`pip install 'tensorfeed[crewai]'`}</CodeBlock>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mt-6 mb-2">Wire into an Agent</h3>
        <CodeBlock>{`from crewai import Agent, Task, Crew
from tensorfeed.crewai import tensorfeed_tools

researcher = Agent(
    role="AI ecosystem researcher",
    goal="Track frontier AI provider activity and surface real signals.",
    backstory="Expert in real-time AI news, harness benchmarks, and provider status.",
    tools=tensorfeed_tools(),
)

task = Task(
    description="Identify the top 3 AI providers by attention this week and summarize what is driving each.",
    agent=researcher,
    expected_output="A markdown bullet list with provider, score, and the headline driving the score.",
)

Crew(agents=[researcher], tasks=[task]).kickoff()`}</CodeBlock>

        <h3 className="text-sm uppercase tracking-wide text-text-muted mt-6 mb-2">Tool inventory</h3>
        <ul className="list-disc list-inside text-text-secondary space-y-1 text-sm">
          <li><code className="font-mono">tensorfeed_news_tool</code>: AI news with category and limit</li>
          <li><code className="font-mono">tensorfeed_status_tool</code>: live AI service status</li>
          <li><code className="font-mono">tensorfeed_attention_tool</code>: AI Attention Index leaderboard</li>
          <li><code className="font-mono">tensorfeed_harnesses_tool</code>: cross-harness coding-agent leaderboard</li>
          <li><code className="font-mono">tensorfeed_routing_tool</code>: top-1 routing recommendation per task</li>
        </ul>
      </section>

      {/* Footer */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-8">
        <p className="text-sm text-text-secondary">
          All three integrations live in the main <Link href="https://pypi.org/project/tensorfeed/" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">tensorfeed PyPI package</Link>{' '}
          (<code className="font-mono">v1.16.0+</code>). The base install remains stdlib-only; framework dependencies only resolve when you opt in to the relevant extra. Source in the{' '}
          <a href="https://github.com/RipperMercs/tensorfeed/tree/main/sdk/python" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline inline-flex items-center gap-1">
            sdk/python directory <ExternalLink className="w-3 h-3" />
          </a>.
        </p>
      </div>
    </div>
  );
}
