/**
 * Vector database / RAG infrastructure catalog.
 *
 * Hosted vector databases and self-hostable vector engines with pricing,
 * tier limits, hybrid search support, and operational characteristics.
 * The catalog every RAG agent needs and nobody else publishes in
 * machine-readable form.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/vector-dbs (free, cached 600s).
 */

export interface VectorDB {
  id: string;
  name: string;
  /** managed = SaaS only, oss = open-source self-host only, hybrid = both. */
  type: 'managed' | 'oss' | 'hybrid';
  /** Where you can run it: cloud, self-host, embedded (in-process). */
  hostingOptions: ('cloud' | 'self-host' | 'embedded')[];
  /** Free tier description, or null if no free tier. */
  freeTier: string | null;
  /** Smallest paid tier USD/month, or null for usage-based-only or open-source-only. */
  startingPriceUSDMonth: number | null;
  pricingNote: string;
  /** Hybrid (BM25 + dense) search supported natively. */
  hybridSearch: boolean;
  /** Metadata filtering on the same query as the vector search. */
  metadataFiltering: boolean;
  /** Built-in multi-tenancy primitives. */
  multiTenancy: boolean;
  /** Serverless tier (no instance management) available. */
  serverless: boolean;
  /** Practical max vectors on the largest published tier (formatted). */
  maxVectorsPaid: string;
  openSource: boolean;
  /** License (Apache-2.0, MIT, BSL, proprietary). */
  license: string;
  /** First public release year. */
  released: string;
  url: string;
  /** Notable strengths or known constraints. */
  notes: string;
}

export const VECTOR_DB_CATALOG: VectorDB[] = [
  {
    id: 'pinecone',
    name: 'Pinecone',
    type: 'managed',
    hostingOptions: ['cloud'],
    freeTier: '2GB storage, 5 indexes, 1M vectors at 1536 dim',
    startingPriceUSDMonth: 25,
    pricingNote: 'Standard tier from $25/month. Serverless billed per read/write/storage. Enterprise dedicated tier from ~$2k/month.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: true,
    maxVectorsPaid: 'unlimited',
    openSource: false,
    license: 'Proprietary',
    released: '2021',
    url: 'https://www.pinecone.io',
    notes: 'Most-deployed managed vector DB. Serverless tier removed instance sizing as a concern. Strong on metadata filtering + namespace multi-tenancy.',
  },
  {
    id: 'turbopuffer',
    name: 'Turbopuffer',
    type: 'managed',
    hostingOptions: ['cloud'],
    freeTier: '1k namespaces, 10M vectors',
    startingPriceUSDMonth: 0,
    pricingNote: 'Pure usage-based: $0.30 per 1M reads, $0.10 per 1M writes, $0.20 per GB-month object storage. No fixed tier.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: true,
    maxVectorsPaid: 'unlimited',
    openSource: false,
    license: 'Proprietary',
    released: '2024',
    url: 'https://turbopuffer.com',
    notes: '10-100x cheaper than Pinecone at scale by storing vectors on object storage (S3/GCS) and caching hot data in memory. Cold reads slower; warm reads competitive with in-memory dbs.',
  },
  {
    id: 'qdrant-cloud',
    name: 'Qdrant Cloud',
    type: 'hybrid',
    hostingOptions: ['cloud', 'self-host'],
    freeTier: '1GB cluster, single node',
    startingPriceUSDMonth: 25,
    pricingNote: 'Cluster pricing from $25/month for the smallest paid tier. Self-hosted Qdrant is free under Apache-2.0.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: false,
    maxVectorsPaid: 'unlimited',
    openSource: true,
    license: 'Apache-2.0',
    released: '2021',
    url: 'https://qdrant.tech',
    notes: 'Strong open-source story; Apache-2.0 with feature-parity between cloud and self-host. Native sparse vector support (not just bm25 hybrid). Rust core.',
  },
  {
    id: 'weaviate-cloud',
    name: 'Weaviate Cloud',
    type: 'hybrid',
    hostingOptions: ['cloud', 'self-host'],
    freeTier: '14-day sandbox',
    startingPriceUSDMonth: 25,
    pricingNote: 'Standard tier from $25/month. Enterprise dedicated and serverless tiers available. Self-hosted Weaviate free under BSD-3.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: true,
    maxVectorsPaid: 'unlimited',
    openSource: true,
    license: 'BSD-3-Clause',
    released: '2019',
    url: 'https://weaviate.io',
    notes: 'Schema-first; first-class hybrid search and built-in modules for embedding generation, reranking, and generative answers. The closest thing to a "RAG framework as a database."',
  },
  {
    id: 'milvus-zilliz',
    name: 'Milvus / Zilliz Cloud',
    type: 'hybrid',
    hostingOptions: ['cloud', 'self-host', 'embedded'],
    freeTier: '5GB on Zilliz Cloud serverless',
    startingPriceUSDMonth: 0,
    pricingNote: 'Zilliz Cloud serverless pure usage-based; dedicated clusters from ~$100/month. Milvus self-host free under Apache-2.0.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: true,
    maxVectorsPaid: 'tens of billions',
    openSource: true,
    license: 'Apache-2.0',
    released: '2019',
    url: 'https://zilliz.com',
    notes: 'Most battle-tested at very-large scale (10B+ vectors). GPU index option (CAGRA) for ultra-low-latency ANN. Embedded mode (Milvus Lite) for single-node test harnesses.',
  },
  {
    id: 'chromadb',
    name: 'Chroma',
    type: 'hybrid',
    hostingOptions: ['cloud', 'self-host', 'embedded'],
    freeTier: 'Cloud: $5 free credit. Self-host: free under Apache-2.0',
    startingPriceUSDMonth: 0,
    pricingNote: 'Chroma Cloud usage-based: $2.50 per 1M writes, $0.075 per GB storage, $0.075 per 1M reads. Self-host or embedded is free.',
    hybridSearch: false,
    metadataFiltering: true,
    multiTenancy: false,
    serverless: true,
    maxVectorsPaid: 'unlimited',
    openSource: true,
    license: 'Apache-2.0',
    released: '2023',
    url: 'https://www.trychroma.com',
    notes: 'Developer-first ergonomics. Best embedded option for single-process Python/JS apps; the default in many LangChain/LlamaIndex tutorials. Hybrid search not native (rerank externally).',
  },
  {
    id: 'pgvector',
    name: 'pgvector (Postgres)',
    type: 'oss',
    hostingOptions: ['cloud', 'self-host', 'embedded'],
    freeTier: 'Same as your Postgres host (Supabase free tier, Neon free tier, etc)',
    startingPriceUSDMonth: 0,
    pricingNote: 'Pricing follows your Postgres host. Supabase Pro from $25/month, Neon from $19/month, AWS RDS varies.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: true,
    maxVectorsPaid: 'limited by Postgres scaling',
    openSource: true,
    license: 'PostgreSQL',
    released: '2021',
    url: 'https://github.com/pgvector/pgvector',
    notes: 'Postgres extension. Best fit when your app already has Postgres and your vector workload is small to medium. Hybrid via tsvector + vector. HNSW + IVFFlat indexes.',
  },
  {
    id: 'lancedb',
    name: 'LanceDB',
    type: 'hybrid',
    hostingOptions: ['cloud', 'self-host', 'embedded'],
    freeTier: 'Cloud: 1 GB free. Self-host or embedded: free under Apache-2.0',
    startingPriceUSDMonth: 0,
    pricingNote: 'LanceDB Cloud usage-based: $0.20 per GB-month storage, $0.30 per 1M reads. Embedded (in-process Rust + Python/JS bindings) free.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: false,
    serverless: true,
    maxVectorsPaid: 'unlimited',
    openSource: true,
    license: 'Apache-2.0',
    released: '2023',
    url: 'https://lancedb.com',
    notes: 'Columnar Lance file format on object storage. Embedded mode rivals SQLite for ergonomics: zero-config, single binary. Strong analytics queries on the same table as vector search.',
  },
  {
    id: 'mongodb-atlas',
    name: 'MongoDB Atlas Vector Search',
    type: 'managed',
    hostingOptions: ['cloud'],
    freeTier: 'M0 cluster (512MB)',
    startingPriceUSDMonth: 9,
    pricingNote: 'M10 cluster from $9/month with vector search included. Atlas Search billed by storage + queries on dedicated tiers.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: true,
    maxVectorsPaid: 'unlimited',
    openSource: false,
    license: 'Proprietary',
    released: '2023',
    url: 'https://www.mongodb.com/products/platform/atlas-vector-search',
    notes: 'Best fit when MongoDB is already your operational database. Hybrid via Atlas Search ($search) + vector ($vectorSearch) in one aggregation pipeline.',
  },
  {
    id: 'vespa',
    name: 'Vespa Cloud',
    type: 'hybrid',
    hostingOptions: ['cloud', 'self-host'],
    freeTier: '$300 trial credit',
    startingPriceUSDMonth: 0,
    pricingNote: 'Pure usage-based on Vespa Cloud (compute + storage). Self-hosted Vespa free under Apache-2.0.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: false,
    maxVectorsPaid: 'unlimited',
    openSource: true,
    license: 'Apache-2.0',
    released: '2017',
    url: 'https://vespa.ai',
    notes: 'Yahoo-built; powers very-large-scale search and recommendation systems (10B+ docs). Steepest learning curve in the catalog but the strongest hybrid retrieval and ranking story.',
  },
  {
    id: 'elasticsearch',
    name: 'Elasticsearch',
    type: 'hybrid',
    hostingOptions: ['cloud', 'self-host'],
    freeTier: 'Elastic Cloud 14-day trial',
    startingPriceUSDMonth: 95,
    pricingNote: 'Elastic Cloud Standard from ~$95/month. Self-hosted via Elastic License v2 (free for most uses).',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: true,
    maxVectorsPaid: 'unlimited',
    openSource: false,
    license: 'Elastic License v2 / SSPL',
    released: '2022 (vector)',
    url: 'https://www.elastic.co/elasticsearch',
    notes: 'Best fit when you already use Elastic for log/text search and want vector co-located. Native HNSW. Full BM25 + vector hybrid scoring with first-class RRF.',
  },
  {
    id: 'opensearch',
    name: 'OpenSearch',
    type: 'oss',
    hostingOptions: ['cloud', 'self-host'],
    freeTier: 'AWS OpenSearch Serverless: pay-as-you-go from ~$50/mo minimum',
    startingPriceUSDMonth: 0,
    pricingNote: 'AWS OpenSearch Service: ~$0.14/hour for the smallest instance. AWS OpenSearch Serverless minimum ~$50/month. Self-host free under Apache-2.0.',
    hybridSearch: true,
    metadataFiltering: true,
    multiTenancy: true,
    serverless: true,
    maxVectorsPaid: 'unlimited',
    openSource: true,
    license: 'Apache-2.0',
    released: '2022 (vector)',
    url: 'https://opensearch.org',
    notes: 'Apache-2.0 fork of Elasticsearch 7.10. AWS-native with serverless option. Best fit for AWS-heavy stacks that want hybrid search without licensing entanglements.',
  },
];

export const VECTOR_DBS_LAST_UPDATED = '2026-04-30';
