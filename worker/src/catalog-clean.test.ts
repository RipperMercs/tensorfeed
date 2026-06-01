import { describe, it, expect } from 'vitest';
import { isDatedSnapshot, isNonChatModality, isCatalogNoise, humanizeModelName } from './catalog-clean';

describe('isDatedSnapshot', () => {
  it('matches the dated-snapshot suffix forms', () => {
    for (const id of [
      'gpt-4o-2024-05-13', 'claude-opus-4-20250514', 'claude-3-opus-20240229',
      'command-r-08-2024', 'gemini-exp-1114', 'gemini-2.5-flash-lite-preview-06-17',
      'codestral-2405', 'gpt-4-0125-preview', 'gpt-4-0314',
    ]) {
      expect(isDatedSnapshot(id), id).toBe(true);
    }
  });
  it('does not match version numbers', () => {
    for (const id of ['gpt-5.5', 'gpt-4.1', 'claude-opus-4-1', 'mistral-large-3', 'gemini-3.1-pro-preview', 'o3-mini']) {
      expect(isDatedSnapshot(id), id).toBe(false);
    }
  });
});

describe('isNonChatModality', () => {
  it('flags non-chat modality variants', () => {
    for (const id of [
      'gpt-4o-mini-tts', 'gpt-realtime', 'gemini-embedding-001', 'gpt-4o-transcribe-diarize',
      'lyria-3-pro-preview', 'gemini-2.5-flash-image', 'gpt-image-2', 'gemini-robotics-er-1.5-preview',
      'gemini-2.5-flash-native-audio-latest', 'gemini-2.5-computer-use-preview-10-2025',
    ]) {
      expect(isNonChatModality(id), id).toBe(true);
    }
  });
  it('keeps chat LLMs', () => {
    for (const id of ['gpt-5.5', 'gpt-5-codex', 'gpt-5-search-api', 'o3-mini', 'gemini-3-pro-preview', 'mistral-large-3']) {
      expect(isNonChatModality(id), id).toBe(false);
    }
  });
});

describe('isCatalogNoise', () => {
  it('is the union of dated + non-chat', () => {
    expect(isCatalogNoise('gpt-4o-2024-05-13')).toBe(true);
    expect(isCatalogNoise('gpt-4o-mini-tts')).toBe(true);
    expect(isCatalogNoise('gpt-5.5')).toBe(false);
  });
});

describe('humanizeModelName', () => {
  it('humanizes common families', () => {
    expect(humanizeModelName('gpt-5.5')).toBe('GPT-5.5');
    expect(humanizeModelName('gpt-4o')).toBe('GPT-4o');
    expect(humanizeModelName('gpt-3.5-turbo')).toBe('GPT-3.5 Turbo');
    expect(humanizeModelName('o3-mini')).toBe('o3 Mini');
    expect(humanizeModelName('gemini-3-pro-preview')).toBe('Gemini 3 Pro Preview');
    expect(humanizeModelName('command-r-plus')).toBe('Command R Plus');
    expect(humanizeModelName('mistral-large-3')).toBe('Mistral Large 3');
    expect(humanizeModelName('gemma-3-27b-it')).toBe('Gemma 3 27b IT');
  });
});
