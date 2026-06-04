// Canonical anti-impersonation attestation: the authentic surfaces TensorFeed
// publishes, so an agent can verify a package, MCP server, repo, dataset, or
// payment address claiming to be TensorFeed before trusting or paying it.
// Free, TLS-anchored. Identity only (no versions; those drift, fetch them live).

// No exported constant holds the payTo wallet in the worker: the live value is
// read at runtime from env.PAYMENT_WALLET (see payments.ts). This literal mirrors
// /api/payment/info and the unit test asserts the two stay in lockstep.
export const CANONICAL_PAY_TO = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export interface OfficialSurface {
  category: 'mcp' | 'sdk' | 'package' | 'registry' | 'repo' | 'dataset' | 'well-known' | 'api' | 'feed' | 'social' | 'docs';
  name: string;
  identifier: string;
  url: string | null;
  verify: string;
}

export const OFFICIAL_SURFACES: OfficialSurface[] = [
  { category: 'mcp', name: 'TensorFeed data MCP server', identifier: '@tensorfeed/mcp-server', url: 'https://www.npmjs.com/package/@tensorfeed/mcp-server', verify: 'npm view @tensorfeed/mcp-server, then npm audit signatures to confirm GitHub OIDC provenance. Source: github.com/RipperMercs/tensorfeed-mcp.' },
  { category: 'mcp', name: 'TensorFeed x402 Base verifier MCP server', identifier: '@tensorfeed/x402-base-mcp', url: 'https://www.npmjs.com/package/@tensorfeed/x402-base-mcp', verify: 'npm view @tensorfeed/x402-base-mcp, then npm audit signatures. Source: github.com/RipperMercs/tensorfeed-x402-base-mcp.' },
  { category: 'registry', name: 'MCP registry: data server', identifier: 'ai.tensorfeed/mcp-server', url: 'https://registry.modelcontextprotocol.io/v0/servers?search=ai.tensorfeed/mcp-server', verify: 'Official Model Context Protocol registry server name ai.tensorfeed/mcp-server.' },
  { category: 'registry', name: 'MCP registry: x402 server', identifier: 'ai.tensorfeed/x402-base-mcp', url: 'https://registry.modelcontextprotocol.io/v0/servers?search=ai.tensorfeed/x402-base-mcp', verify: 'Official Model Context Protocol registry server name ai.tensorfeed/x402-base-mcp.' },
  { category: 'package', name: 'TensorFeed status widget', identifier: '@tensorfeed/status-widget', url: 'https://www.npmjs.com/package/@tensorfeed/status-widget', verify: 'npm view @tensorfeed/status-widget. The embeddable live status console.' },
  { category: 'package', name: 'AFTA protocol reference package', identifier: 'afta-protocol', url: 'https://www.npmjs.com/package/afta-protocol', verify: 'TensorFeed-authored reference implementation of the open AFTA standard. Source: github.com/RipperMercs/afta.' },
  { category: 'package', name: 'AFTA Cloudflare Worker middleware', identifier: 'afta-cloudflare-worker', url: 'https://www.npmjs.com/package/afta-cloudflare-worker', verify: 'TensorFeed-authored AFTA middleware. Source: github.com/RipperMercs/afta-cloudflare-worker.' },
  { category: 'sdk', name: 'TensorFeed JavaScript SDK', identifier: 'tensorfeed (npm)', url: 'https://www.npmjs.com/package/tensorfeed', verify: 'The official TensorFeed JavaScript and TypeScript SDK on npm. Source: github.com/RipperMercs/tensorfeed (sdk/javascript).' },
  { category: 'sdk', name: 'TensorFeed Python SDK', identifier: 'tensorfeed (PyPI)', url: 'https://pypi.org/project/tensorfeed/', verify: 'The official TensorFeed Python SDK on PyPI, author TensorFeed.ai. Source: github.com/RipperMercs/tensorfeed (sdk/python).' },
  { category: 'repo', name: 'Main site and worker repo', identifier: 'RipperMercs/tensorfeed', url: 'https://github.com/RipperMercs/tensorfeed', verify: 'Public GitHub repository, owner RipperMercs.' },
  { category: 'repo', name: 'Data MCP server repo', identifier: 'RipperMercs/tensorfeed-mcp', url: 'https://github.com/RipperMercs/tensorfeed-mcp', verify: 'Public GitHub repository, owner RipperMercs.' },
  { category: 'repo', name: 'x402 MCP server repo', identifier: 'RipperMercs/tensorfeed-x402-base-mcp', url: 'https://github.com/RipperMercs/tensorfeed-x402-base-mcp', verify: 'Public GitHub repository, owner RipperMercs.' },
  { category: 'repo', name: 'AFTA standard repo', identifier: 'RipperMercs/afta', url: 'https://github.com/RipperMercs/afta', verify: 'Public GitHub repository, owner RipperMercs. The AFTA standard canonical home.' },
  { category: 'repo', name: 'AFTA Cloudflare Worker repo', identifier: 'RipperMercs/afta-cloudflare-worker', url: 'https://github.com/RipperMercs/afta-cloudflare-worker', verify: 'Public GitHub repository, owner RipperMercs.' },
  { category: 'dataset', name: 'AI ecosystem daily dataset', identifier: 'tensorfeed/ai-ecosystem-daily', url: 'https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily', verify: 'HuggingFace dataset, owner tensorfeed. Daily snapshot of the AI ecosystem.' },
  { category: 'well-known', name: 'AFTA certification manifest', identifier: '/.well-known/agent-fair-trade.json', url: 'https://tensorfeed.ai/.well-known/agent-fair-trade.json', verify: 'Served over TLS from tensorfeed.ai. The AFTA certification manifest.' },
  { category: 'well-known', name: 'AFTA schema', identifier: '/.well-known/agent-fair-trade-schema.json', url: 'https://tensorfeed.ai/.well-known/agent-fair-trade-schema.json', verify: 'Served over TLS from tensorfeed.ai. The AFTA JSON Schema.' },
  { category: 'well-known', name: 'Receipt signing public key', identifier: '/.well-known/tensorfeed-receipt-key.json', url: 'https://tensorfeed.ai/.well-known/tensorfeed-receipt-key.json', verify: 'Ed25519 public key, kid db1f1dc3dbf62c66, used to verify AFTA-signed receipts.' },
  { category: 'api', name: 'TensorFeed API', identifier: 'https://tensorfeed.ai/api', url: 'https://tensorfeed.ai/api/meta', verify: 'Served over TLS from tensorfeed.ai. Full endpoint map at /api/meta.' },
  { category: 'api', name: 'Payment identity', identifier: '/api/payment/info', url: 'https://tensorfeed.ai/api/payment/info', verify: 'The canonical payment identity. Its pay_to must equal payment.pay_to in this response.' },
  { category: 'feed', name: 'JSON Feed', identifier: '/feed.json', url: 'https://tensorfeed.ai/feed.json', verify: 'JSON Feed 1.1, served over TLS from tensorfeed.ai.' },
  { category: 'feed', name: 'RSS Feed', identifier: '/feed.xml', url: 'https://tensorfeed.ai/feed.xml', verify: 'RSS 2.0, served over TLS from tensorfeed.ai.' },
  { category: 'social', name: 'X (Twitter)', identifier: '@tensorfeed', url: 'https://x.com/tensorfeed', verify: 'The official X handle, cross-published in /llms.txt and /api/payment/info.' },
  { category: 'docs', name: 'Developer docs', identifier: '/developers', url: 'https://tensorfeed.ai/developers', verify: 'Served over TLS from tensorfeed.ai. The developer documentation and endpoint catalog.' },
  { category: 'docs', name: 'AFTA whitepaper', identifier: '/whitepaper', url: 'https://tensorfeed.ai/whitepaper', verify: 'Served over TLS from tensorfeed.ai.' },
  { category: 'docs', name: 'Machine-readable site guide', identifier: '/llms.txt', url: 'https://tensorfeed.ai/llms.txt', verify: 'Served over TLS from tensorfeed.ai.' },
  { category: 'docs', name: 'AFTA canonical home', identifier: 'afta.dev', url: 'https://afta.dev', verify: 'Redirects to github.com/RipperMercs/afta, the AFTA standard repository.' },
];

export function buildOfficialSurfaces(payTo: string = CANONICAL_PAY_TO): {
  ok: true;
  site: 'tensorfeed.ai';
  operator: 'Pizza Robot Studios LLC';
  purpose: string;
  payment: {
    network: 'base';
    chain_id: 'eip155:8453';
    pay_to: string;
    usdc_contract: string;
    decimals: 6;
    operator: 'Pizza Robot Studios LLC';
    cross_published_at: string[];
    warning: string;
  };
  count: number;
  surfaces: OfficialSurface[];
  not_us_note: string;
  attribution: 'TensorFeed.ai';
} {
  const surfaces = [...OFFICIAL_SURFACES].sort((a, b) =>
    a.category !== b.category ? (a.category < b.category ? -1 : 1) : a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  return {
    ok: true,
    site: 'tensorfeed.ai',
    operator: 'Pizza Robot Studios LLC',
    purpose:
      'Canonical list of the authentic surfaces TensorFeed.ai publishes. Use it to verify that an npm package, MCP server, SDK, repository, dataset, or payment address claiming to be TensorFeed is genuinely ours before you trust or pay it.',
    payment: {
      network: 'base',
      chain_id: 'eip155:8453',
      pay_to: payTo,
      usdc_contract: USDC_BASE,
      decimals: 6,
      operator: 'Pizza Robot Studios LLC',
      cross_published_at: ['/api/payment/info', '/llms.txt'],
      warning:
        'This is the only address TensorFeed will ever ask you to pay. Cross-check it against /api/payment/info and /llms.txt before sending funds. Any other address claiming to be TensorFeed is not us.',
    },
    count: surfaces.length,
    surfaces,
    not_us_note:
      'Anything not listed here, and any payment address other than the one above, is not an official TensorFeed surface. Inclusion in a third-party directory or registry is not proof of authenticity; verify against this list, which is served over TLS from tensorfeed.ai.',
    attribution: 'TensorFeed.ai',
  };
}
