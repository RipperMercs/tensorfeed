import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vector Database Pricing & Comparison: RAG Infrastructure',
  description:
    'Live catalog of every vector database for RAG agents: Pinecone, Turbopuffer, Qdrant, Weaviate, Milvus, Chroma, pgvector, LanceDB, MongoDB Atlas, Vespa, Elasticsearch, OpenSearch. Pricing, free tiers, hybrid search, license. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/vector-dbs' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/vector-dbs',
    title: 'Vector Database Pricing & Comparison',
    description:
      'Pricing, free tiers, hybrid search, multi-tenancy, license for every production vector database. Free.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vector Database Pricing & Comparison',
    description: 'Pricing, free tiers, hybrid search for every production vector DB.',
  },
};

export default function VectorDBsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
