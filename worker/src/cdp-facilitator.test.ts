/**
 * Tests for the CDP x402 facilitator client.
 *
 * Focus areas:
 *   - JWT structure correctness (header alg/kid/typ/nonce, payload sub/iss/uris/iat/nbf/exp)
 *   - URL hardcoding (every fetch URL starts with CDP_BASE_URL)
 *   - Path constraint (refuses to sign for non-x402 paths)
 *   - Error mapping (HTTP, network, JSON parse)
 *   - EXTENSION-RESPONSES header capture on settle
 *
 * Does NOT hit the actual CDP API. Network calls are mocked via vi.fn().
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { decodeJwt, decodeProtectedHeader } from 'jose';
import {
  cdpVerify,
  cdpSettle,
  cdpGetSupported,
  cdpListDiscoveryResources,
  decodeBazaarStatus,
  CDP_FACILITATOR_CONSTANTS,
} from './cdp-facilitator';
import type { Env } from './types';
import type {
  PaymentPayload,
  PaymentRequirements,
} from './x402-facilitator';

// RFC 8032 Ed25519 test vector (a well-known test key, NOT a real CDP secret).
// Combined as CDP's 64-byte format: seed (32 bytes) || public key (32 bytes).
const TEST_SEED_HEX =
  '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';
const TEST_PUB_HEX =
  'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';
const TEST_SECRET_B64 = Buffer.from(TEST_SEED_HEX + TEST_PUB_HEX, 'hex').toString(
  'base64',
);

const TEST_API_KEY_ID =
  'organizations/00000000-0000-0000-0000-000000000000/apiKeys/11111111-1111-1111-1111-111111111111';

function mockEnv(
  overrides: Partial<Pick<Env, 'CDP_API_KEY_ID' | 'CDP_API_KEY_SECRET'>> = {},
): Env {
  return {
    CDP_API_KEY_ID: TEST_API_KEY_ID,
    CDP_API_KEY_SECRET: TEST_SECRET_B64,
    ...overrides,
  } as Env;
}

const DUMMY_PAYLOAD: PaymentPayload = {
  x402Version: 2,
  payload: {
    signature: ('0x' + '00'.repeat(65)) as `0x${string}`,
    authorization: {
      from: '0x0000000000000000000000000000000000000001',
      to: '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1',
      value: '20000',
      validAfter: '0',
      validBefore: String(Math.floor(Date.now() / 1000) + 600),
      nonce: ('0x' + 'a'.repeat(64)) as `0x${string}`,
    },
  },
};

const DUMMY_REQUIREMENTS: PaymentRequirements = {
  scheme: 'exact',
  network: 'eip155:8453',
  amount: '20000',
  asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  payTo: '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1',
  maxTimeoutSeconds: 60,
  extra: { name: 'USD Coin', version: '2' },
};

/**
 * Installs a fetch mock that captures every URL + init pair and returns a
 * canned 200 response. Returns the captures array for assertions.
 */
function installFetchMock(responseBody: unknown = { isValid: true, success: true }): {
  captures: Array<{ url: string; init?: RequestInit }>;
  setResponse: (body: unknown, opts?: ResponseInit) => void;
} {
  const captures: Array<{ url: string; init?: RequestInit }> = [];
  let currentBody: unknown = responseBody;
  let currentOpts: ResponseInit = { status: 200 };
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    captures.push({ url, init });
    return new Response(JSON.stringify(currentBody), currentOpts);
  }) as unknown as typeof fetch;
  return {
    captures,
    setResponse: (body, opts) => {
      currentBody = body;
      currentOpts = opts ?? { status: 200 };
    },
  };
}

function getAuthHeader(init: RequestInit | undefined): string {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  return headers.Authorization ?? '';
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CDP facilitator constants', () => {
  it('hardcodes the canonical CDP x402 base URL, host, and path', () => {
    expect(CDP_FACILITATOR_CONSTANTS.CDP_BASE_URL).toBe(
      'https://api.cdp.coinbase.com/platform/v2/x402',
    );
    expect(CDP_FACILITATOR_CONSTANTS.CDP_HOST).toBe('api.cdp.coinbase.com');
    expect(CDP_FACILITATOR_CONSTANTS.CDP_BASE_PATH).toBe('/platform/v2/x402');
  });

  it('uses CDP SDK default 120s JWT expiry', () => {
    expect(CDP_FACILITATOR_CONSTANTS.JWT_EXPIRY_SECONDS).toBe(120);
  });
});

describe('CDP facilitator URL constraint', () => {
  it('only ever fetches under the x402 base path', async () => {
    const { captures } = installFetchMock({ isValid: true });
    await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    await cdpSettle(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    await cdpGetSupported(mockEnv());
    await cdpListDiscoveryResources(mockEnv(), { type: 'http', limit: 10 });
    expect(captures.length).toBe(4);
    for (const { url } of captures) {
      expect(url.startsWith(CDP_FACILITATOR_CONSTANTS.CDP_BASE_URL)).toBe(true);
    }
  });

  it('uses correct subpaths for each operation', async () => {
    const { captures } = installFetchMock({ isValid: true, success: true });
    await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    await cdpSettle(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    await cdpGetSupported(mockEnv());
    await cdpListDiscoveryResources(mockEnv());
    expect(captures[0].url).toBe(
      'https://api.cdp.coinbase.com/platform/v2/x402/verify',
    );
    expect(captures[1].url).toBe(
      'https://api.cdp.coinbase.com/platform/v2/x402/settle',
    );
    expect(captures[2].url).toBe(
      'https://api.cdp.coinbase.com/platform/v2/x402/supported',
    );
    expect(captures[3].url).toBe(
      'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources',
    );
  });

  it('appends query string params to discovery list', async () => {
    const { captures } = installFetchMock({
      x402Version: 2,
      items: [],
      pagination: { limit: 50, offset: 0, total: 0 },
    });
    await cdpListDiscoveryResources(mockEnv(), {
      type: 'http',
      limit: 25,
      offset: 50,
    });
    expect(captures[0].url).toBe(
      'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?type=http&limit=25&offset=50',
    );
  });
});

describe('CDP facilitator JWT', () => {
  it('signs each request with EdDSA + correct kid + typ + nonce', async () => {
    const { captures } = installFetchMock({ isValid: true });
    await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    const auth = getAuthHeader(captures[0].init);
    expect(auth.startsWith('Bearer ')).toBe(true);
    const jwt = auth.slice('Bearer '.length);
    const header = decodeProtectedHeader(jwt);
    expect(header.alg).toBe('EdDSA');
    expect(header.kid).toBe(TEST_API_KEY_ID);
    expect(header.typ).toBe('JWT');
    expect(typeof header.nonce).toBe('string');
    expect((header.nonce as string).length).toBe(32); // 16 random bytes hex = 32 chars
  });

  it('sets payload sub=apiKeyId, iss=cdp, uris bound to method+host+path', async () => {
    const { captures } = installFetchMock({ isValid: true });
    await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    const jwt = getAuthHeader(captures[0].init).slice('Bearer '.length);
    const claims = decodeJwt(jwt);
    expect(claims.iss).toBe('cdp');
    expect(claims.sub).toBe(TEST_API_KEY_ID);
    expect(claims.uris).toEqual([
      'POST api.cdp.coinbase.com/platform/v2/x402/verify',
    ]);
    expect(typeof claims.iat).toBe('number');
    expect(typeof claims.nbf).toBe('number');
    expect(typeof claims.exp).toBe('number');
    expect((claims.exp as number) - (claims.iat as number)).toBe(120);
  });

  it('signs distinct JWTs with method-specific uris claim per endpoint', async () => {
    const { captures } = installFetchMock({
      isValid: true,
      success: true,
      kinds: [],
      extensions: [],
      signers: {},
      items: [],
      pagination: { limit: 50, offset: 0, total: 0 },
      x402Version: 2,
    });
    await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    await cdpSettle(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    await cdpGetSupported(mockEnv());
    await cdpListDiscoveryResources(mockEnv());

    const urisPerCall = captures.map(({ init }) => {
      const claims = decodeJwt(getAuthHeader(init).slice('Bearer '.length));
      return (claims.uris as string[])[0];
    });
    expect(urisPerCall).toEqual([
      'POST api.cdp.coinbase.com/platform/v2/x402/verify',
      'POST api.cdp.coinbase.com/platform/v2/x402/settle',
      'GET api.cdp.coinbase.com/platform/v2/x402/supported',
      'GET api.cdp.coinbase.com/platform/v2/x402/discovery/resources',
    ]);
  });

  it('signs a fresh nonce per request', async () => {
    const { captures } = installFetchMock({ isValid: true });
    await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    const nonces = captures.map(({ init }) => {
      const jwt = getAuthHeader(init).slice('Bearer '.length);
      return decodeProtectedHeader(jwt).nonce as string;
    });
    expect(nonces[0]).not.toBe(nonces[1]);
  });

  it('sends Correlation-Context and Content-Type headers', async () => {
    const { captures } = installFetchMock({ isValid: true });
    await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    const headers = captures[0].init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Correlation-Context']).toContain('source=tensorfeed-x402');
    expect(headers['Correlation-Context']).toContain('sdk_language=typescript-workers');
  });
});

describe('CDP facilitator credential errors', () => {
  it('rejects when CDP_API_KEY_ID is missing', async () => {
    installFetchMock();
    await expect(
      cdpVerify(mockEnv({ CDP_API_KEY_ID: undefined }), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS),
    ).rejects.toThrow(/CDP_API_KEY_ID/);
  });

  it('rejects when CDP_API_KEY_SECRET is missing', async () => {
    installFetchMock();
    await expect(
      cdpVerify(
        mockEnv({ CDP_API_KEY_SECRET: undefined }),
        DUMMY_PAYLOAD,
        DUMMY_REQUIREMENTS,
      ),
    ).rejects.toThrow(/CDP_API_KEY_SECRET/);
  });

  it('rejects when secret is not 64 bytes when decoded', async () => {
    installFetchMock();
    const badSecret = Buffer.from(TEST_SEED_HEX, 'hex').toString('base64'); // 32 bytes
    await expect(
      cdpVerify(
        mockEnv({ CDP_API_KEY_SECRET: badSecret }),
        DUMMY_PAYLOAD,
        DUMMY_REQUIREMENTS,
      ),
    ).rejects.toThrow(/Ed25519 secret must decode to 64 bytes/);
  });

  it('does not include the secret in error messages', async () => {
    installFetchMock();
    let caught: unknown = null;
    try {
      await cdpVerify(
        mockEnv({ CDP_API_KEY_SECRET: 'not-base64-at-all-!!!!' }),
        DUMMY_PAYLOAD,
        DUMMY_REQUIREMENTS,
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    const msg = (caught as Error).message;
    expect(msg).not.toContain('not-base64-at-all');
    expect(msg).not.toContain(TEST_SECRET_B64);
  });
});

describe('cdpVerify response mapping', () => {
  it('returns isValid=true on 200 OK with isValid=true body', async () => {
    installFetchMock({ isValid: true, payer: '0xabc' });
    const result = await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    expect(result.isValid).toBe(true);
    expect(result.payer).toBe('0xabc');
  });

  it('returns isValid=false with mapped invalidReason on 200 OK with isValid=false', async () => {
    installFetchMock({
      isValid: false,
      invalidReason: 'invalid_exact_evm_payload_signature',
      invalidMessage: 'Bad signature.',
    });
    const result = await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_signature');
    expect(result.message).toBe('Bad signature.');
  });

  it('maps 4xx HTTP errors to unexpected_verify_error with HTTP status in message', async () => {
    const mock = installFetchMock();
    mock.setResponse({ error: 'unauthorized' }, { status: 401 });
    const result = await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('unexpected_verify_error');
    expect(result.message).toContain('HTTP 401');
  });

  it('preserves the upstream invalidReason on a 4xx if CDP returned one', async () => {
    const mock = installFetchMock();
    mock.setResponse(
      { invalidReason: 'invalid_network', invalidMessage: 'wrong chain' },
      { status: 400 },
    );
    const result = await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_network');
  });

  it('returns unexpected_verify_error on network failure', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as unknown as typeof fetch;
    const result = await cdpVerify(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('unexpected_verify_error');
    expect(result.message).toContain('network error');
  });
});

describe('cdpSettle response mapping', () => {
  it('returns success=true and transaction on 200 OK', async () => {
    installFetchMock({
      success: true,
      payer: '0xabc',
      transaction: '0xdef',
      network: 'eip155:8453',
      amount: '20000',
    });
    const result = await cdpSettle(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    expect(result.success).toBe(true);
    expect(result.transaction).toBe('0xdef');
    expect(result.payer).toBe('0xabc');
  });

  function settleWithExtHeader(headerValue: string) {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ success: true, transaction: '0xdef', network: 'eip155:8453' }),
        {
          status: 200,
          headers: { 'EXTENSION-RESPONSES': headerValue },
        },
      );
    }) as unknown as typeof fetch;
    return cdpSettle(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
  }

  it('captures EXTENSION-RESPONSES bare-literal format (pre-fix wire format)', async () => {
    const result = await settleWithExtHeader('processing');
    expect(result.success).toBe(true);
    // Raw header preserved verbatim for debugging.
    expect(result.extensionResponses).toBe('processing');
    // Normalized status decoded from the bare literal.
    expect(result.bazaarStatus).toBe('processing');
  });

  it('captures EXTENSION-RESPONSES=rejected bare literal', async () => {
    const result = await settleWithExtHeader('rejected');
    expect(result.success).toBe(true);
    expect(result.extensionResponses).toBe('rejected');
    expect(result.bazaarStatus).toBe('rejected');
  });

  it('decodes EXTENSION-RESPONSES base64(JSON) format (post-fix wire format)', async () => {
    // The format 0xdespot verified on hyperD 2026-05-18: base64 of
    // { bazaar: { status: "processing" } }.
    const raw = Buffer.from(
      JSON.stringify({ bazaar: { status: 'processing', detail: 'queued' } }),
    ).toString('base64');
    const result = await settleWithExtHeader(raw);
    expect(result.success).toBe(true);
    // Raw header kept exactly as CDP sent it (base64 blob).
    expect(result.extensionResponses).toBe(raw);
    // Operator-facing signal is the decoded status, not the blob.
    expect(result.bazaarStatus).toBe('processing');
  });

  it('decodes base64(JSON) rejection so log/alert can branch on it', async () => {
    const raw = Buffer.from(
      JSON.stringify({ bazaar: { status: 'rejected' } }),
    ).toString('base64');
    const result = await settleWithExtHeader(raw);
    expect(result.bazaarStatus).toBe('rejected');
  });

  it('leaves bazaarStatus undefined when CDP sends no EXTENSION-RESPONSES header', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ success: true, transaction: '0xdef', network: 'eip155:8453' }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const result = await cdpSettle(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    expect(result.success).toBe(true);
    expect(result.extensionResponses).toBeUndefined();
    expect(result.bazaarStatus).toBeUndefined();
  });

  it('maps 5xx HTTP error to unexpected_settle_error', async () => {
    const mock = installFetchMock();
    mock.setResponse({ error: 'oops' }, { status: 500 });
    const result = await cdpSettle(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('unexpected_settle_error');
    expect(result.message).toContain('HTTP 500');
  });

  it('returns network error on fetch failure', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;
    const result = await cdpSettle(mockEnv(), DUMMY_PAYLOAD, DUMMY_REQUIREMENTS);
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('unexpected_settle_error');
    expect(result.message).toContain('network error');
  });
});

describe('decodeBazaarStatus (tolerant EXTENSION-RESPONSES decoder)', () => {
  const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64');

  it('returns undefined for missing / empty / whitespace input', () => {
    expect(decodeBazaarStatus(undefined)).toBeUndefined();
    expect(decodeBazaarStatus('')).toBeUndefined();
    expect(decodeBazaarStatus('   ')).toBeUndefined();
  });

  it('passes bare-literal tokens through unchanged (pre-fix wire format)', () => {
    expect(decodeBazaarStatus('processing')).toBe('processing');
    expect(decodeBazaarStatus('indexed')).toBe('indexed');
    expect(decodeBazaarStatus('rejected')).toBe('rejected');
  });

  it('trims surrounding whitespace on bare literals', () => {
    expect(decodeBazaarStatus('  processing\n')).toBe('processing');
  });

  it('decodes base64(JSON) { bazaar: { status } } (post-fix wire format)', () => {
    expect(decodeBazaarStatus(b64({ bazaar: { status: 'processing' } }))).toBe(
      'processing',
    );
    expect(
      decodeBazaarStatus(b64({ bazaar: { status: 'rejected', detail: 'bad schema' } })),
    ).toBe('rejected');
  });

  it('handles base64(JSON) where bazaar is itself the status string', () => {
    expect(decodeBazaarStatus(b64({ bazaar: 'indexed' }))).toBe('indexed');
  });

  it('falls back to a top-level status field', () => {
    expect(decodeBazaarStatus(b64({ status: 'processing' }))).toBe('processing');
  });

  it('decodes un-encoded JSON too (defensive against a third format)', () => {
    expect(decodeBazaarStatus(JSON.stringify({ bazaar: { status: 'rejected' } }))).toBe(
      'rejected',
    );
  });

  it('falls back to the raw trimmed token when nothing decodes', () => {
    // Not base64-of-JSON and not JSON: treat as an opaque literal rather
    // than throwing or dropping the signal.
    expect(decodeBazaarStatus('some-unknown-token')).toBe('some-unknown-token');
  });

  it('never throws on adversarial input', () => {
    expect(() => decodeBazaarStatus('!!!not base64!!!')).not.toThrow();
    expect(() => decodeBazaarStatus(b64({ bazaar: { status: 42 } }))).not.toThrow();
    // Numeric status is not a string -> no status extracted -> raw fallback.
    expect(decodeBazaarStatus(b64({ bazaar: { status: 42 } }))).toBeTypeOf('string');
  });
});

describe('cdpGetSupported', () => {
  it('returns the parsed body on 200', async () => {
    installFetchMock({
      kinds: [
        {
          x402Version: 2,
          scheme: 'exact',
          network: 'eip155:8453',
          extra: { name: 'USD Coin', version: '2' },
        },
      ],
      extensions: ['bazaar'],
      signers: {},
    });
    const result = await cdpGetSupported(mockEnv());
    expect(result.kinds.length).toBe(1);
    expect(result.kinds[0].network).toBe('eip155:8453');
    expect(result.extensions).toContain('bazaar');
  });

  it('throws on non-2xx response', async () => {
    const mock = installFetchMock();
    mock.setResponse({ error: 'forbidden' }, { status: 403 });
    await expect(cdpGetSupported(mockEnv())).rejects.toThrow(/HTTP 403/);
  });
});

describe('cdpListDiscoveryResources', () => {
  it('returns the parsed body on 200', async () => {
    installFetchMock({
      x402Version: 2,
      items: [
        {
          resource: 'https://tensorfeed.ai/api/premium/whats-new',
          type: 'http',
          x402Version: 2,
          accepts: [],
          lastUpdated: '2026-05-14T00:00:00Z',
        },
      ],
      pagination: { limit: 50, offset: 0, total: 1 },
    });
    const result = await cdpListDiscoveryResources(mockEnv(), { type: 'http' });
    expect(result.items.length).toBe(1);
    expect(result.items[0].resource).toContain('tensorfeed.ai');
    expect(result.pagination.total).toBe(1);
  });

  it('throws on non-2xx response', async () => {
    const mock = installFetchMock();
    mock.setResponse({}, { status: 500 });
    await expect(cdpListDiscoveryResources(mockEnv())).rejects.toThrow(/HTTP 500/);
  });
});
