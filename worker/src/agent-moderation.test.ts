import { describe, it, expect } from 'vitest';
import {
  classifyLlamaGuardResponse,
  moderateFields,
  moderateText,
} from './agent-moderation';

// ┌──────────────────────────────────────────────────────────────────┐
// │ classifyLlamaGuardResponse (pure)                                │
// └──────────────────────────────────────────────────────────────────┘

describe('classifyLlamaGuardResponse', () => {
  it('classifies "safe" as pass', () => {
    expect(classifyLlamaGuardResponse('safe')).toEqual({ action: 'pass' });
  });

  it('classifies trailing-newline "safe\\n" as pass', () => {
    expect(classifyLlamaGuardResponse('safe\n')).toEqual({ action: 'pass' });
  });

  it('classifies uppercase "SAFE" as pass (case-insensitive)', () => {
    expect(classifyLlamaGuardResponse('SAFE')).toEqual({ action: 'pass' });
  });

  it('hard-blocks on S1 (violent crimes)', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS1')).toEqual({
      action: 'hard_block',
      category: 'S1',
    });
  });

  it('hard-blocks on S3 (sex crimes)', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS3')).toEqual({
      action: 'hard_block',
      category: 'S3',
    });
  });

  it('hard-blocks on S4 (CSAM)', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS4')).toEqual({
      action: 'hard_block',
      category: 'S4',
    });
  });

  it('hard-blocks on S9 (weapons)', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS9')).toEqual({
      action: 'hard_block',
      category: 'S9',
    });
  });

  it('hard-blocks on S11 (self-harm)', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS11')).toEqual({
      action: 'hard_block',
      category: 'S11',
    });
  });

  it('soft-reviews on S2 (non-violent crimes)', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS2')).toEqual({
      action: 'soft_review',
      category: 'S2',
    });
  });

  it('soft-reviews on S5 (defamation)', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS5')).toEqual({
      action: 'soft_review',
      category: 'S5',
    });
  });

  it('soft-reviews on S8 (IP infringement)', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS8')).toEqual({
      action: 'soft_review',
      category: 'S8',
    });
  });

  it('soft-reviews on S10 (hate)', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS10')).toEqual({
      action: 'soft_review',
      category: 'S10',
    });
  });

  it('hard-block trumps soft-review when both categories present', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS2,S3')).toEqual({
      action: 'hard_block',
      category: 'S3',
    });
    expect(classifyLlamaGuardResponse('unsafe\nS10,S4')).toEqual({
      action: 'hard_block',
      category: 'S4',
    });
  });

  it('returns the FIRST hard_block category encountered when multiple', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS1,S3,S4')).toEqual({
      action: 'hard_block',
      category: 'S1',
    });
  });

  it('tolerates whitespace around the comma list', () => {
    expect(classifyLlamaGuardResponse('unsafe\nS2 , S5')).toEqual({
      action: 'soft_review',
      category: 'S2',
    });
  });

  it('fails closed on empty response', () => {
    const v = classifyLlamaGuardResponse('');
    expect(v.action).toBe('fail_closed');
  });

  it('fails closed on non-string input', () => {
    const v = classifyLlamaGuardResponse(null as unknown as string);
    expect(v.action).toBe('fail_closed');
  });

  it('fails closed on unexpected prefix', () => {
    const v = classifyLlamaGuardResponse('maybe-unsafe\nS3');
    expect(v.action).toBe('fail_closed');
  });

  it('fails closed when unsafe is reported but no category extractable', () => {
    const v = classifyLlamaGuardResponse('unsafe\n');
    expect(v.action).toBe('fail_closed');
  });

  it('fails closed on out-of-range category number', () => {
    const v = classifyLlamaGuardResponse('unsafe\nS99');
    expect(v.action).toBe('fail_closed');
  });
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ moderateText (AI binding mocked)                                 │
// └──────────────────────────────────────────────────────────────────┘

function envWithAi(runImpl: (model: string, input: unknown) => Promise<unknown>) {
  return { AI: { run: runImpl } } as any;
}

describe('moderateText', () => {
  it('passes empty text without calling the AI', async () => {
    let called = false;
    const env = envWithAi(async () => {
      called = true;
      return { response: 'unsafe\nS4' };
    });
    const v = await moderateText(env, '');
    expect(v).toEqual({ action: 'pass' });
    expect(called).toBe(false);
  });

  it('passes whitespace-only text without calling the AI', async () => {
    const env = envWithAi(async () => ({ response: 'unsafe\nS4' }));
    const v = await moderateText(env, '   \n   ');
    expect(v).toEqual({ action: 'pass' });
  });

  it('fails closed when AI binding is missing', async () => {
    const env = {} as any;
    const v = await moderateText(env, 'real content');
    expect(v.action).toBe('fail_closed');
    if (v.action === 'fail_closed') expect(v.error).toBe('ai_binding_unavailable');
  });

  it('passes safe content', async () => {
    const env = envWithAi(async () => ({ response: 'safe' }));
    const v = await moderateText(env, 'I do data analysis');
    expect(v).toEqual({ action: 'pass' });
  });

  it('hard-blocks on hard category', async () => {
    const env = envWithAi(async () => ({ response: 'unsafe\nS3' }));
    const v = await moderateText(env, 'banned content');
    expect(v).toEqual({ action: 'hard_block', category: 'S3' });
  });

  it('soft-reviews on judgment-call category', async () => {
    const env = envWithAi(async () => ({ response: 'unsafe\nS10' }));
    const v = await moderateText(env, 'borderline');
    expect(v).toEqual({ action: 'soft_review', category: 'S10' });
  });

  it('fails closed when AI throws', async () => {
    const env = envWithAi(async () => {
      throw new Error('rpc timeout');
    });
    const v = await moderateText(env, 'real content');
    expect(v.action).toBe('fail_closed');
    if (v.action === 'fail_closed') expect(v.error).toMatch(/ai_call_failed/);
  });

  it('fails closed when AI returns malformed response (no .response field)', async () => {
    const env = envWithAi(async () => ({ unexpected: 'shape' }));
    const v = await moderateText(env, 'real content');
    expect(v.action).toBe('fail_closed');
    if (v.action === 'fail_closed') expect(v.error).toBe('malformed_response');
  });

  it('calls AI with @cf/meta/llama-guard-3-8b and chat-shape input', async () => {
    let capturedModel = '';
    let capturedInput: any = null;
    const env = envWithAi(async (model, input) => {
      capturedModel = model;
      capturedInput = input;
      return { response: 'safe' };
    });
    await moderateText(env, 'hello');
    expect(capturedModel).toBe('@cf/meta/llama-guard-3-8b');
    expect(capturedInput).toEqual({ messages: [{ role: 'user', content: 'hello' }] });
  });
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ moderateFields                                                   │
// └──────────────────────────────────────────────────────────────────┘

describe('moderateFields', () => {
  it('returns pass when all fields pass', async () => {
    const env = envWithAi(async () => ({ response: 'safe' }));
    const r = await moderateFields(env, [
      { name: 'display_name', text: 'Agent X' },
      { name: 'expanded_description', text: 'I do data work' },
    ]);
    expect(r.verdict).toEqual({ action: 'pass' });
    expect(r.per_field.display_name).toEqual({ action: 'pass' });
    expect(r.per_field.expanded_description).toEqual({ action: 'pass' });
  });

  it('returns the strictest verdict when fields differ', async () => {
    const responses = ['safe', 'unsafe\nS3'];
    let i = 0;
    const env = envWithAi(async () => ({ response: responses[i++] }));
    const r = await moderateFields(env, [
      { name: 'display_name', text: 'OK' },
      { name: 'expanded_description', text: 'bad content' },
    ]);
    expect(r.verdict).toEqual({ action: 'hard_block', category: 'S3' });
  });

  it('skips null/undefined fields', async () => {
    const env = envWithAi(async () => ({ response: 'safe' }));
    const r = await moderateFields(env, [
      { name: 'display_name', text: 'Agent X' },
      { name: 'expanded_description', text: null },
      { name: 'other', text: undefined },
    ]);
    expect(Object.keys(r.per_field)).toEqual(['display_name']);
  });

  it('strictness order: hard_block > soft_review > fail_closed > pass', async () => {
    const responses = ['unsafe\nS10', 'unexpected-malformed', 'unsafe\nS1', 'safe'];
    let i = 0;
    const env = envWithAi(async () => ({ response: responses[i++] }));
    const r = await moderateFields(env, [
      { name: 'a', text: 'a' },
      { name: 'b', text: 'b' },
      { name: 'c', text: 'c' },
      { name: 'd', text: 'd' },
    ]);
    expect(r.verdict).toEqual({ action: 'hard_block', category: 'S1' });
  });
});
