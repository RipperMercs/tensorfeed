import { describe, it, expect } from 'vitest';
import { buildFeed } from './feed';

function statusJson(extra: Record<string, unknown>) {
  return {
    ok: true,
    services: [
      { name: 'OpenAI API', provider: 'OpenAI', status: 'operational', ...extra },
    ],
  };
}

describe('toItem early_warning mapping', () => {
  it('maps early_warning to earlyWarning when present', () => {
    const feed = buildFeed(
      statusJson({
        early_warning: { source: 'tensorfeed_probe', note: 'probes see degradation', detected_at: '2026-06-03T12:00:00.000Z', probe_signal: 'provider_degraded' },
      }),
      null,
      null,
    );
    const item = [...feed.llms, ...feed.services].find((i) => i.name === 'OpenAI API');
    expect(item?.earlyWarning).toEqual({ note: 'probes see degradation', detectedAt: '2026-06-03T12:00:00.000Z' });
  });

  it('leaves earlyWarning undefined when the service has none', () => {
    const feed = buildFeed(statusJson({}), null, null);
    const item = [...feed.llms, ...feed.services].find((i) => i.name === 'OpenAI API');
    expect(item?.earlyWarning).toBeUndefined();
  });
});
