/**
 * Pure-logic unit tests for the status module's headline-derivation logic.
 *
 * Locks in the behaviour that the homepage alert bar and /is-X-down pages
 * reflect the worst-of CORE inference components, not the umbrella indicator
 * that Statuspage flips for any peripheral component (e.g. ChatGPT Workspace
 * Connectors). Without this, OpenAI shows "degraded" for days at a time even
 * though Chat Completions, Embeddings, and Fine-tuning are all green.
 */

import { describe, it, expect } from 'vitest';
import { aggregateCoreStatus } from './status';

describe('aggregateCoreStatus', () => {
  it('returns null when no components are present so caller falls back to umbrella', () => {
    expect(aggregateCoreStatus([])).toBeNull();
  });

  it('returns null when every component is peripheral (caller falls back to umbrella)', () => {
    const result = aggregateCoreStatus([
      { name: 'Connectors/Apps', status: 'degraded' },
      { name: 'ChatGPT Atlas', status: 'operational' },
      { name: 'VS Code extension', status: 'operational' },
    ]);
    expect(result).toBeNull();
  });

  it('reports operational when all core components are green even if peripherals are degraded', () => {
    // The bug we fixed: Chat Completions/Responses/Embeddings green, but
    // Connectors/Apps degraded was bubbling up and showing "OpenAI degraded"
    // on the homepage.
    const result = aggregateCoreStatus([
      { name: 'Chat Completions', status: 'operational' },
      { name: 'Responses', status: 'operational' },
      { name: 'Embeddings', status: 'operational' },
      { name: 'Fine-tuning', status: 'operational' },
      { name: 'Batch', status: 'operational' },
      { name: 'Connectors/Apps', status: 'degraded' },
    ]);
    expect(result).toBe('operational');
  });

  it('reports degraded when a core component is degraded', () => {
    const result = aggregateCoreStatus([
      { name: 'Chat Completions', status: 'degraded' },
      { name: 'Embeddings', status: 'operational' },
      { name: 'Connectors/Apps', status: 'operational' },
    ]);
    expect(result).toBe('degraded');
  });

  it('reports down when any core component is down (worst-of wins)', () => {
    const result = aggregateCoreStatus([
      { name: 'Chat Completions', status: 'down' },
      { name: 'Embeddings', status: 'degraded' },
    ]);
    expect(result).toBe('down');
  });

  it('treats maintenance as operational so scheduled maintenance does not raise alerts', () => {
    const result = aggregateCoreStatus([
      { name: 'Embeddings', status: 'operational' },
      { name: 'Batch', status: 'maintenance' },
    ]);
    expect(result).toBe('operational');
  });

  it('classifies common peripheral patterns as non-core', () => {
    // Anything in this list, on its own, must NOT determine the headline.
    const peripheralOnly = [
      { name: 'Connectors/Apps', status: 'degraded' },
      { name: 'ChatGPT Workspace', status: 'degraded' },
      { name: 'ChatGPT Atlas', status: 'degraded' },
      { name: 'GPTs', status: 'degraded' },
      { name: 'VS Code extension', status: 'degraded' },
      { name: 'CLI', status: 'degraded' },
      { name: 'FedRAMP', status: 'degraded' },
      { name: 'Compliance API', status: 'degraded' },
      { name: 'File uploads', status: 'degraded' },
      { name: 'Login', status: 'degraded' },
      { name: 'Search', status: 'degraded' },
      { name: 'Agent', status: 'degraded' },
      { name: 'Deep Research', status: 'degraded' },
      { name: 'Sora', status: 'degraded' },
      { name: 'Conversations', status: 'degraded' },
      { name: 'Image Generation', status: 'degraded' },
      { name: 'Voice mode', status: 'degraded' },
    ];
    expect(aggregateCoreStatus(peripheralOnly)).toBeNull();
  });
});
