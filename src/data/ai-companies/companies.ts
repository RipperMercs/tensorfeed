import type { AICompany } from './types';

/**
 * Curated AI public-company cohort. The ticker list mirrors the Worker's
 * AI_BELLWETHERS in worker/src/sec-filings-fetcher.ts so /api/sec/filings/recent
 * returns hits for everything in this hub. To add a ticker here, also add the
 * matching CIK to AI_BELLWETHERS, otherwise the per-ticker filings panel
 * comes back empty.
 *
 * news_aliases are case-insensitive substrings used to filter /api/news. Keep
 * them tight: greedy aliases (a ticker matching "AI" or "Elon Musk" matches
 * everything) drown the panel in false positives.
 */
export const AI_COMPANIES: ReadonlyArray<AICompany> = [
  {
    ticker: 'NVDA',
    cik: '0001045810',
    name: 'NVIDIA Corporation',
    display_name: 'NVIDIA',
    exchange: 'NASDAQ',
    category: 'silicon',
    ai_angle:
      'The dominant supplier of AI training and inference GPUs (H100, H200, B200, Rubin). Every frontier lab buys from here.',
    news_aliases: ['NVIDIA', 'Nvidia'],
    website: 'https://www.nvidia.com',
  },
  {
    ticker: 'AMD',
    cik: '0000002488',
    name: 'Advanced Micro Devices, Inc.',
    display_name: 'AMD',
    exchange: 'NASDAQ',
    category: 'silicon',
    ai_angle:
      'MI300 / MI325 / MI350 series Instinct accelerators; the credible second-source story for hyperscaler AI compute.',
    news_aliases: ['AMD Instinct', 'AMD MI', 'AMD Ryzen', 'AMD ROCm', 'Lisa Su'],
    website: 'https://www.amd.com',
  },
  {
    ticker: 'AVGO',
    cik: '0001730168',
    name: 'Broadcom Inc.',
    display_name: 'Broadcom',
    exchange: 'NASDAQ',
    category: 'silicon',
    ai_angle:
      'Custom AI ASICs (Google TPU partner, Meta MTIA partner), networking silicon for hyperscale fabrics.',
    news_aliases: ['Broadcom'],
    website: 'https://www.broadcom.com',
  },
  {
    ticker: 'TSM',
    cik: '0001046179',
    name: 'Taiwan Semiconductor Manufacturing Company',
    display_name: 'Taiwan Semiconductor',
    exchange: 'NYSE',
    category: 'silicon',
    ai_angle:
      'The fab. N3 and N2 capacity backs every leading-edge AI accelerator (NVIDIA, AMD, Apple, AVGO, ARM customers).',
    news_aliases: ['TSMC', 'Taiwan Semiconductor'],
    website: 'https://www.tsmc.com',
  },
  {
    ticker: 'ARM',
    cik: '0001973239',
    name: 'Arm Holdings plc',
    display_name: 'Arm Holdings',
    exchange: 'NASDAQ',
    category: 'silicon',
    ai_angle:
      'CPU architecture underneath NVIDIA Grace, AWS Graviton, Apple silicon, and the on-device inference cohort.',
    news_aliases: ['Arm Holdings', 'Arm Ltd'],
    website: 'https://www.arm.com',
  },
  {
    ticker: 'MSFT',
    cik: '0000789019',
    name: 'Microsoft Corporation',
    display_name: 'Microsoft',
    exchange: 'NASDAQ',
    category: 'hyperscaler',
    ai_angle:
      'Azure OpenAI Service, Copilot product line, capex leader, sole exclusive OpenAI cloud partner (until the 2025 Microsoft-OpenAI reset).',
    news_aliases: ['Microsoft', 'Satya Nadella', 'Mustafa Suleyman'],
    website: 'https://www.microsoft.com',
  },
  {
    ticker: 'GOOGL',
    cik: '0001652044',
    name: 'Alphabet Inc.',
    display_name: 'Alphabet (Google)',
    exchange: 'NASDAQ',
    category: 'hyperscaler',
    ai_angle:
      'Gemini frontier model line, TPU silicon, Google Cloud + DeepMind, owner of the Android Gemini Intelligence distribution lever.',
    news_aliases: ['Google', 'Alphabet', 'DeepMind', 'Sundar Pichai', 'Demis Hassabis'],
    website: 'https://abc.xyz',
  },
  {
    ticker: 'AMZN',
    cik: '0001018724',
    name: 'Amazon.com, Inc.',
    display_name: 'Amazon',
    exchange: 'NASDAQ',
    category: 'hyperscaler',
    ai_angle:
      'AWS Bedrock + Trainium + Inferentia, $8B Anthropic investment, Project Rainier compute build for Anthropic training.',
    news_aliases: ['Amazon AWS', 'AWS Bedrock', 'AWS Trainium', 'Andy Jassy'],
    website: 'https://www.amazon.com',
  },
  {
    ticker: 'ORCL',
    cik: '0001341439',
    name: 'Oracle Corporation',
    display_name: 'Oracle',
    exchange: 'NYSE',
    category: 'hyperscaler',
    ai_angle:
      'OCI GPU capacity reseller to OpenAI, xAI, and Microsoft; Stargate datacenter program partner.',
    news_aliases: ['Oracle Cloud', 'Larry Ellison', 'Safra Catz'],
    website: 'https://www.oracle.com',
  },
  {
    ticker: 'PLTR',
    cik: '0001321655',
    name: 'Palantir Technologies Inc.',
    display_name: 'Palantir',
    exchange: 'NASDAQ',
    category: 'ai-native',
    ai_angle:
      'AIP enterprise + government deployments; the canonical pure-play public AI software vendor by revenue.',
    news_aliases: ['Palantir', 'Alex Karp'],
    website: 'https://www.palantir.com',
  },
  {
    ticker: 'SMCI',
    cik: '0001375365',
    name: 'Super Micro Computer, Inc.',
    display_name: 'Super Micro Computer',
    exchange: 'NASDAQ',
    category: 'infra',
    ai_angle:
      'High-volume integrator of NVIDIA + AMD AI servers for hyperscaler and enterprise build-outs.',
    news_aliases: ['Super Micro', 'Supermicro'],
    website: 'https://www.supermicro.com',
  },
  {
    ticker: 'AAPL',
    cik: '0000320193',
    name: 'Apple Inc.',
    display_name: 'Apple',
    exchange: 'NASDAQ',
    category: 'consumer',
    ai_angle:
      'Apple Intelligence on-device + Private Cloud Compute; iOS distribution; partner of OpenAI, Anthropic, and Google through the Extensions framework.',
    news_aliases: ['Apple Intelligence', 'Apple Inc', 'Tim Cook', 'iPhone Intelligence'],
    website: 'https://www.apple.com',
  },
  {
    ticker: 'META',
    cik: '0001326801',
    name: 'Meta Platforms, Inc.',
    display_name: 'Meta Platforms',
    exchange: 'NASDAQ',
    category: 'consumer',
    ai_angle:
      'Llama open-weights line, Reality Labs, MSL talent group, Meta AI consumer + enterprise rollout.',
    news_aliases: ['Meta Platforms', 'Mark Zuckerberg', 'Llama 3', 'Llama 4', 'Meta AI'],
    website: 'https://about.meta.com',
  },
  {
    ticker: 'TSLA',
    cik: '0001318605',
    name: 'Tesla, Inc.',
    display_name: 'Tesla',
    exchange: 'NASDAQ',
    category: 'consumer',
    ai_angle:
      'FSD + Optimus humanoid robotics + Dojo training compute; xAI Colossus orbital infrastructure ties.',
    news_aliases: ['Tesla FSD', 'Tesla Optimus', 'Tesla Dojo', 'Tesla Autopilot'],
    website: 'https://www.tesla.com',
  },
];

export function findCompanyByTicker(ticker: string): AICompany | undefined {
  const upper = ticker.toUpperCase();
  return AI_COMPANIES.find((c) => c.ticker === upper);
}

export function allTickers(): ReadonlyArray<string> {
  return AI_COMPANIES.map((c) => c.ticker);
}
