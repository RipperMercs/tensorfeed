import { describe, expect, it } from 'vitest';
import { resolveModelKey } from './model-key-resolve';

// Mirrors the live pricing payload shape (2026-07-02 snapshot subset).
const PROVIDERS = [
  {
    provider: 'Anthropic',
    models: [
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    ],
  },
  {
    provider: 'OpenAI',
    models: [
      { id: 'gpt-5-5', name: 'GPT-5.5' },
      { id: 'o1', name: 'o1' },
    ],
  },
  {
    provider: 'Google',
    models: [
      { id: 'gemini-3-1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
      { id: 'gemini-3-5-flash', name: 'Gemini 3.5 Flash' },
    ],
  },
];

describe('resolveModelKey', () => {
  it('matches an exact id case-insensitively', () => {
    expect(resolveModelKey(PROVIDERS, 'claude-opus-4-8')?.model.id).toBe('claude-opus-4-8');
    expect(resolveModelKey(PROVIDERS, 'GPT-5-5')?.model.id).toBe('gpt-5-5');
  });

  it('matches an exact display name case-insensitively', () => {
    expect(resolveModelKey(PROVIDERS, 'claude opus 4.7')?.model.id).toBe('claude-opus-4-7');
  });

  it('resolves an unambiguous short form (the widely copied doc example)', () => {
    expect(resolveModelKey(PROVIDERS, 'opus-4-7')?.model.id).toBe('claude-opus-4-7');
    expect(resolveModelKey(PROVIDERS, 'haiku-4-5')?.model.id).toBe('claude-haiku-4-5');
  });

  it('resolves dot and space display variants', () => {
    expect(resolveModelKey(PROVIDERS, 'GPT-5.5')?.model.id).toBe('gpt-5-5');
    expect(resolveModelKey(PROVIDERS, 'Gemini 3.5 Flash')?.model.id).toBe('gemini-3-5-flash');
  });

  it('refuses ambiguous short forms rather than guessing', () => {
    // gemini-3 could be either Gemini 3.x row; a paid call must not guess.
    expect(resolveModelKey(PROVIDERS, 'gemini-3')).toBeNull();
  });

  it('returns null for unknown keys, empty keys, and missing payloads', () => {
    expect(resolveModelKey(PROVIDERS, 'totally-unknown')).toBeNull();
    expect(resolveModelKey(PROVIDERS, '')).toBeNull();
    expect(resolveModelKey(PROVIDERS, '   ')).toBeNull();
    expect(resolveModelKey(null, 'gpt-5-5')).toBeNull();
    expect(resolveModelKey(undefined, 'gpt-5-5')).toBeNull();
  });

  it('prefers the exact match when a key is both exact and a suffix of another id', () => {
    const providers = [
      {
        provider: 'X',
        models: [
          { id: 'opus-4-7', name: 'Opus 4.7 Standalone' },
          { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
        ],
      },
    ];
    expect(resolveModelKey(providers, 'opus-4-7')?.model.name).toBe('Opus 4.7 Standalone');
  });
});
