import { describe, expect, it } from 'vitest';
import { isAIRelated } from './terminalfeed';

// isAIRelated is the pure AI-relevance filter applied to federated TerminalFeed
// content (the AFTA federation surface). Its keyword regex is dense: many
// alternations, word boundaries, and "." wildcards inside multi-word terms, so
// a regex regression would mis-classify the federated feed. Deterministic.

describe('isAIRelated', () => {
  it('matches AI terms case-insensitively, including multi-word and optional-separator forms', () => {
    for (const t of [
      'AI is everywhere',
      'a new GPT model',
      'machine learning paper',
      'Anthropic raised a round',
      'an LLM agent shipped',
      'hugging face hub',
      'huggingface repo',
      'RAG pipeline',
      'stable diffusion art',
    ]) {
      expect(isAIRelated(t), t).toBe(true);
    }
  });

  it('does not match unrelated text', () => {
    for (const t of [
      'the weather is nice today',
      'a long train ride',
      'chain of custody',
      'mountain rain',
      'retail sales report',
    ]) {
      expect(isAIRelated(t), t).toBe(false);
    }
  });

  it('respects word boundaries: a bare token matches, the same letters inside a word do not', () => {
    expect(isAIRelated('AI')).toBe(true);
    expect(isAIRelated('chain')).toBe(false);
    expect(isAIRelated('brain')).toBe(false);
  });
});
