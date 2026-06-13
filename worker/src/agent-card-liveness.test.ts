/**
 * Agent-card liveness + twin-parity guard.
 *
 * TensorFeed publishes three discovery cards under public/.well-known/:
 *   - agent-card.json  (A2A AgentCard, protocolVersion 0.2.5)
 *   - agent.json       (intended byte-identical twin of agent-card.json so
 *                       crawlers that fetch either filename get the same card)
 *   - agentfacts.json  (NANDA-style agentfacts descriptor)
 *
 * Two failure modes this suite locks down:
 *   1. The twin drifts. agent.json and agent-card.json are meant to be the
 *      exact same bytes. If someone edits one and forgets the other, an agent
 *      hitting the wrong filename sees a stale card. We assert byte-identity.
 *   2. A card advertises a dead route. Past drift shipped endpoint URLs that
 *      404, which sends a paying agent to a wall. We assert none of the cards
 *      contains a known-dead path token. The most common one is the dash form
 *      "/api/gpu-pricing"; the real route is "/api/gpu/pricing" (slash form).
 *
 * Files are reached relative to this test via fileURLToPath(import.meta.url),
 * mirroring premium-catalog-bazaar-coverage.test.ts.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const WELL_KNOWN = join(HERE, '..', '..', 'public', '.well-known');

const AGENT_CARD_PATH = join(WELL_KNOWN, 'agent-card.json');
const AGENT_PATH = join(WELL_KNOWN, 'agent.json');
const AGENTFACTS_PATH = join(WELL_KNOWN, 'agentfacts.json');

/**
 * Path tokens that are known to be dead. Each is a substring that must not
 * appear anywhere in the raw card text.
 *   - "/api/gpu-pricing": dash form; the live route is "/api/gpu/pricing".
 *   - "/api/verified-feed": route does not exist.
 *   - "/api/premium/agents/reputation/series": route does not exist.
 */
const DEAD_PATH_TOKENS = [
  '/api/gpu-pricing',
  '/api/verified-feed',
  '/api/premium/agents/reputation/series',
];

const CARDS: Array<{ name: string; path: string }> = [
  { name: 'agent-card.json', path: AGENT_CARD_PATH },
  { name: 'agent.json', path: AGENT_PATH },
  { name: 'agentfacts.json', path: AGENTFACTS_PATH },
];

describe('agent discovery cards stay live and in sync', () => {
  it('agent.json is byte-identical to agent-card.json (intended twins)', () => {
    const cardBytes = readFileSync(AGENT_CARD_PATH);
    const agentBytes = readFileSync(AGENT_PATH);
    expect(
      agentBytes.equals(cardBytes),
      'public/.well-known/agent.json and public/.well-known/agent-card.json must be ' +
        'byte-identical. They drifted. Re-copy agent-card.json over agent.json so ' +
        'crawlers that fetch either filename get the same card.',
    ).toBe(true);
  });

  it('all three cards are valid JSON', () => {
    for (const card of CARDS) {
      const raw = readFileSync(card.path, 'utf8');
      expect(() => JSON.parse(raw), `${card.name} is not valid JSON`).not.toThrow();
    }
  });

  it('no card advertises a known-dead path token', () => {
    const offenders: string[] = [];
    for (const card of CARDS) {
      const raw = readFileSync(card.path, 'utf8');
      // Parse to confirm the card is well formed, then scan the raw text so a
      // token buried anywhere (description, skill URL, related block) is caught.
      JSON.parse(raw);
      for (const token of DEAD_PATH_TOKENS) {
        if (raw.includes(token)) {
          offenders.push(`${card.name} contains dead path token "${token}"`);
        }
      }
    }
    expect(
      offenders,
      'A discovery card advertises a route that 404s. Fix the offending token ' +
        '(for example replace the dash form /api/gpu-pricing with the live ' +
        'slash form /api/gpu/pricing):\n  ' + offenders.join('\n  '),
    ).toEqual([]);
  });
});
