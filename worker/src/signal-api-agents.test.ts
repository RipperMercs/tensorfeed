import { describe, it, expect } from 'vitest';
import { deriveApiAgentsView, clampApiAgentsDays } from './signal-api-agents';
import type { FunnelByUaRow } from './usage-meter';

// Fixtures span two real agents (gptbot, claude-user) and one known x402
// discovery crawler (carbonmonitor, in CRAWLER_UA_FAMILIES). gptbot appears on
// two endpoints so the leaderboard must collapse it into one row, and the
// crawler generates a large 402 flood that must NOT inflate the endpoint demand
// map (deriveRealAgentFunnel drops it).
const ROWS: FunnelByUaRow[] = [
  { endpoint: '/api/premium/cve-check', ua: 'gptbot', free_hits: 2, unpaid_402: 10, paid: 3 },
  { endpoint: '/api/premium/whats-new', ua: 'gptbot', free_hits: 0, unpaid_402: 5, paid: 2 },
  { endpoint: '/api/premium/cve-check', ua: 'carbonmonitor', free_hits: 0, unpaid_402: 100, paid: 0 },
  { endpoint: '/api/premium/whats-new', ua: 'claude-user', free_hits: 1, unpaid_402: 0, paid: 4 },
];

describe('deriveApiAgentsView', () => {
  it('collapses a UA across endpoints into one leaderboard row', () => {
    const { agents } = deriveApiAgentsView(ROWS);
    const gpt = agents.find((a) => a.ua === 'gptbot');
    expect(gpt).toBeDefined();
    expect(gpt!.paid).toBe(5);
    expect(gpt!.unpaid402).toBe(15);
    expect(gpt!.free).toBe(2);
    expect(gpt!.total).toBe(22);
  });

  it('tags known crawlers vs real agents', () => {
    const { agents } = deriveApiAgentsView(ROWS);
    expect(agents.find((a) => a.ua === 'carbonmonitor')!.kind).toBe('crawler');
    expect(agents.find((a) => a.ua === 'gptbot')!.kind).toBe('agent');
    expect(agents.find((a) => a.ua === 'claude-user')!.kind).toBe('agent');
  });

  it('sorts the leaderboard by total calls descending', () => {
    const { agents } = deriveApiAgentsView(ROWS);
    expect(agents.map((a) => a.ua)).toEqual(['carbonmonitor', 'gptbot', 'claude-user']);
  });

  it('rolls up totals across all callers', () => {
    const { totals } = deriveApiAgentsView(ROWS);
    expect(totals.paid).toBe(9);
    expect(totals.unpaid402).toBe(115);
    expect(totals.free).toBe(3);
    expect(totals.calls).toBe(127);
  });

  it('splits real-agent vs crawler call volume', () => {
    const { totals } = deriveApiAgentsView(ROWS);
    expect(totals.realAgentCalls).toBe(27); // gptbot 22 + claude-user 5
    expect(totals.crawlerCalls).toBe(100); // carbonmonitor
  });

  it('counts distinct real agents only (crawlers excluded)', () => {
    const { totals } = deriveApiAgentsView(ROWS);
    expect(totals.distinctAgents).toBe(2);
  });

  it('builds a crawler-filtered endpoint demand map sorted by paid', () => {
    const { endpoints } = deriveApiAgentsView(ROWS);
    // carbonmonitor's 100x 402 on cve-check must not appear in demand.
    const cve = endpoints.find((e) => e.endpoint === '/api/premium/cve-check')!;
    const whatsNew = endpoints.find((e) => e.endpoint === '/api/premium/whats-new')!;
    expect(cve.unpaid402).toBe(10); // agent only, not 110
    expect(cve.paid).toBe(3);
    expect(whatsNew.paid).toBe(6); // gptbot 2 + claude-user 4
    expect(whatsNew.unpaid402).toBe(5);
    // whats-new (6 paid) ranks above cve-check (3 paid)
    expect(endpoints.map((e) => e.endpoint)).toEqual(['/api/premium/whats-new', '/api/premium/cve-check']);
    // conversion = paid / (paid + unpaid402)
    expect(cve.conversion).toBeCloseTo(3 / 13, 6);
  });

  it('handles an empty row set without throwing', () => {
    const { totals, agents, endpoints } = deriveApiAgentsView([]);
    expect(totals.calls).toBe(0);
    expect(totals.distinctAgents).toBe(0);
    expect(agents).toEqual([]);
    expect(endpoints).toEqual([]);
  });
});

describe('clampApiAgentsDays', () => {
  it('defaults to 7 for null / invalid / below-range input', () => {
    expect(clampApiAgentsDays(null)).toBe(7);
    expect(clampApiAgentsDays('abc')).toBe(7);
    expect(clampApiAgentsDays(0)).toBe(7);
    expect(clampApiAgentsDays(-5)).toBe(7);
  });
  it('passes through valid day counts and floors fractions', () => {
    expect(clampApiAgentsDays(1)).toBe(1);
    expect(clampApiAgentsDays('7')).toBe(7);
    expect(clampApiAgentsDays(14)).toBe(14);
    expect(clampApiAgentsDays(7.9)).toBe(7);
  });
  it('caps at 30', () => {
    expect(clampApiAgentsDays(30)).toBe(30);
    expect(clampApiAgentsDays(365)).toBe(30);
  });
});
