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
import { aggregateCoreStatus, _internal } from './status';
import { STATUS_PAGES } from './sources';

const {
  normalizeInstatusComponentStatus,
  normalizeInstatusPageStatus,
  aggregateGcpStatus,
  aggregateAwsStatus,
  decodeAwsEventsBuffer,
  awsEventAffectsService,
  awsEventSeverity,
  aggregateAzureStatus,
  parseAzureRssItems,
  azureItemSeverity,
} = _internal;

describe('Anthropic status config', () => {
  const anthropic = STATUS_PAGES.find((s) => s.provider === 'Anthropic');

  it('is still tracked', () => {
    expect(anthropic).toBeDefined();
    expect(anthropic?.name).toBe('Claude API');
  });

  it('scopes the headline away from client tools and non-API product surfaces', () => {
    // Regression guard: dropping peripheralExtra here silently reintroduces
    // "Claude API is Down" during a Claude Code outage. Names are the real ones
    // observed on status.anthropic.com 2026-07-29.
    const extra = anthropic?.peripheralExtra ?? [];
    expect(extra.length).toBeGreaterThan(0);
    for (const name of ['Claude Code', 'Claude Cowork', 'Claude for Government']) {
      expect(extra.some((p) => p.test(name)), `${name} should be peripheral`).toBe(true);
    }
  });

  it('keeps claude.ai core so a real consumer outage is still reported', () => {
    // Deliberate: claude.ai is what most people mean by "is Claude down".
    // Under-reporting a genuine outage is worse than over-reporting one, so the
    // consumer app must keep driving this headline.
    const extra = anthropic?.peripheralExtra ?? [];
    expect(extra.some((p) => p.test('claude.ai'))).toBe(false);
  });

  it('leaves the inference API surfaces core', () => {
    const extra = anthropic?.peripheralExtra ?? [];
    for (const name of ['api.anthropic.com', 'Claude on AWS Bedrock', 'Claude on Google Cloud Vertex AI']) {
      expect(extra.some((p) => p.test(name)), `${name} must stay core`).toBe(false);
    }
  });

  it('does not use an explicit componentFilter, which would fail closed to unknown', () => {
    expect(anthropic?.componentFilter).toBeUndefined();
  });
});

describe('Cursor status config', () => {
  const cursor = STATUS_PAGES.find((s) => s.name === 'Cursor');

  it('is tracked as a plain Atlassian statuspage', () => {
    expect(cursor).toBeDefined();
    expect(cursor?.provider).toBe('Cursor');
    expect(cursor?.type).toBe('statuspage');
    expect(cursor?.url).toBe('https://status.cursor.com/api/v2/summary.json');
  });

  it('uses neither a componentFilter nor peripheralExtra', () => {
    // Cursor is an editor product, not an inference API, so the IDE and web app
    // ARE the service. Over-reporting is the safe direction here.
    expect(cursor?.componentFilter).toBeUndefined();
    expect(cursor?.peripheralExtra).toBeUndefined();
  });

  it('reports down when the IDE is out, the real 2026-07-29 payload', () => {
    const result = aggregateCoreStatus([
      { name: 'Automations', status: 'operational' },
      { name: 'Bugbot', status: 'operational' },
      { name: 'CLI', status: 'operational' },
      { name: 'Cloud Agents', status: 'operational' },
      { name: 'cursor.com', status: 'operational' },
      { name: 'IDE', status: 'down' },
    ]);
    expect(result).toBe('down');
  });

  it('drops the CLI row from the headline via the default peripheral list', () => {
    const result = aggregateCoreStatus([
      { name: 'IDE', status: 'operational' },
      { name: 'cursor.com', status: 'operational' },
      { name: 'CLI', status: 'down' },
    ]);
    expect(result).toBe('operational');
  });
});

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
      { name: 'Codex Web', status: 'degraded' },
      { name: 'Codex API', status: 'degraded' },
      { name: 'Codex CLI', status: 'degraded' },
    ];
    expect(aggregateCoreStatus(peripheralOnly)).toBeNull();
  });

  it('treats every Codex surface as peripheral so a Codex outage does not flip the OpenAI headline', () => {
    // Production bug 2026-05-07: Codex API was degraded for >24h while every
    // core inference component (Chat Completions, Responses, etc.) was
    // operational, but the homepage alert bar showed OpenAI as degraded.
    // The original /codex web/i pattern only caught Codex Web; Codex API and
    // Codex CLI slipped through and were treated as core.
    const result = aggregateCoreStatus([
      { name: 'Chat Completions', status: 'operational' },
      { name: 'Responses', status: 'operational' },
      { name: 'Codex Web', status: 'degraded' },
      { name: 'Codex API', status: 'degraded' },
      { name: 'Codex CLI', status: 'degraded' },
    ]);
    expect(result).toBe('operational');
  });

  describe('with peripheralExtra (e.g. Anthropic client tools)', () => {
    // Same bug class as the Codex case above, on the Anthropic row: Claude Code
    // and claude.ai live on the same status page as api.anthropic.com, so a
    // broken client tool rendered as "Claude API is Down" while the inference
    // API served fine. The "Claude API" row answers whether the API is callable.
    const ANTHROPIC_EXTRA = [
      /claude\s*code/i,
      /cowork/i,
      /government/i,
      /desktop/i,
      /chrome/i,
      /\bextension\b/i,
    ];

    it('keeps the headline operational when only non-API product surfaces are down', () => {
      // The real component roster from status.anthropic.com on 2026-07-29, with
      // the inference path healthy. None of Cowork, Government, or Code being
      // down means the API is uncallable.
      const result = aggregateCoreStatus(
        [
          { name: 'claude.ai', status: 'operational' },
          { name: 'Claude API (api.anthropic.com)', status: 'operational' },
          { name: 'Claude Code', status: 'down' },
          { name: 'Claude Cowork', status: 'down' },
          { name: 'Claude for Government', status: 'down' },
          { name: 'Claude Console (platform.claude.com)', status: 'operational' },
        ],
        undefined,
        ANTHROPIC_EXTRA,
      );
      expect(result).toBe('operational');
    });

    it('keeps the headline operational when only a client tool is down', () => {
      const result = aggregateCoreStatus(
        [
          { name: 'api.anthropic.com', status: 'operational' },
          { name: 'Claude on AWS Bedrock', status: 'operational' },
          { name: 'Claude Code', status: 'down' },
          { name: 'claude.ai', status: 'operational' },
        ],
        undefined,
        ANTHROPIC_EXTRA,
      );
      expect(result).toBe('operational');
    });

    it('reports down when claude.ai is out even if the API is green', () => {
      // The 2026-07-29 shape: consumer app down, API serving. This must read as
      // an outage, since claude.ai is what "is Claude down" usually means.
      const result = aggregateCoreStatus(
        [
          { name: 'api.anthropic.com', status: 'operational' },
          { name: 'claude.ai', status: 'down' },
          { name: 'Claude Code', status: 'degraded' },
        ],
        undefined,
        ANTHROPIC_EXTRA,
      );
      expect(result).toBe('down');
    });

    it('still reports down when the inference API itself is down', () => {
      const result = aggregateCoreStatus(
        [
          { name: 'api.anthropic.com', status: 'down' },
          { name: 'Claude Code', status: 'operational' },
        ],
        undefined,
        ANTHROPIC_EXTRA,
      );
      expect(result).toBe('down');
    });

    it('still reports degraded from a cloud-hosted Claude endpoint', () => {
      const result = aggregateCoreStatus(
        [
          { name: 'api.anthropic.com', status: 'operational' },
          { name: 'Claude on Google Cloud Vertex AI', status: 'degraded' },
          { name: 'Claude Code', status: 'operational' },
        ],
        undefined,
        ANTHROPIC_EXTRA,
      );
      expect(result).toBe('degraded');
    });

    it('matches Claude Code name variants', () => {
      for (const name of ['Claude Code', 'ClaudeCode', 'Claude Code CLI', 'claude code (beta)']) {
        const result = aggregateCoreStatus(
          [{ name: 'api.anthropic.com', status: 'operational' }, { name, status: 'down' }],
          undefined,
          ANTHROPIC_EXTRA,
        );
        expect(result, `${name} should be peripheral`).toBe('operational');
      }
    });

    it('does not filter the API row itself', () => {
      // The tool patterns must not swallow api.anthropic.com or a "Claude API" row.
      const result = aggregateCoreStatus(
        [{ name: 'Claude API', status: 'down' }],
        undefined,
        ANTHROPIC_EXTRA,
      );
      expect(result).toBe('down');
    });

    it('returns null when everything is peripheral so the caller falls back to the umbrella', () => {
      // This is the graceful-degradation property that makes peripheralExtra
      // safer than an explicit componentFilter: no match means fall back to the
      // vendor indicator, not a blank 'unknown' headline.
      const result = aggregateCoreStatus(
        [{ name: 'Claude Code', status: 'down' }, { name: 'Claude Desktop', status: 'down' }],
        undefined,
        ANTHROPIC_EXTRA,
      );
      expect(result).toBeNull();
    });

    it('is ignored when an explicitFilter is also present', () => {
      const result = aggregateCoreStatus(
        [{ name: 'Claude Code', status: 'down' }],
        [/claude\s*code/i],
        ANTHROPIC_EXTRA,
      );
      expect(result).toBe('down');
    });
  });

  describe('with explicitFilter (e.g. GitHub Copilot)', () => {
    it('only considers matching components and ignores peripheral patterns', () => {
      // GitHub status page covers all of GitHub. We only care about Copilot.
      // "Actions" being down should NOT make Copilot read down for us.
      const result = aggregateCoreStatus(
        [
          { name: 'Copilot', status: 'operational' },
          { name: 'Copilot AI Model Providers', status: 'operational' },
          { name: 'Actions', status: 'down' },
          { name: 'Pages', status: 'degraded' },
        ],
        [/copilot/i],
      );
      expect(result).toBe('operational');
    });

    it('returns degraded when a Copilot component is degraded even if rest of GitHub is fine', () => {
      const result = aggregateCoreStatus(
        [
          { name: 'Copilot', status: 'degraded' },
          { name: 'Actions', status: 'operational' },
        ],
        [/copilot/i],
      );
      expect(result).toBe('degraded');
    });

    it('returns null when no components match the explicit filter', () => {
      const result = aggregateCoreStatus(
        [
          { name: 'Actions', status: 'operational' },
          { name: 'Pages', status: 'operational' },
        ],
        [/copilot/i],
      );
      expect(result).toBeNull();
    });
  });
});

describe('Instatus parser (Perplexity)', () => {
  it('normalizes component statuses from Instatus uppercase vocabulary', () => {
    expect(normalizeInstatusComponentStatus('OPERATIONAL')).toBe('operational');
    expect(normalizeInstatusComponentStatus('DEGRADEDPERFORMANCE')).toBe('degraded');
    expect(normalizeInstatusComponentStatus('PARTIALOUTAGE')).toBe('degraded');
    expect(normalizeInstatusComponentStatus('MAJOROUTAGE')).toBe('down');
    expect(normalizeInstatusComponentStatus('UNDERMAINTENANCE')).toBe('maintenance');
    expect(normalizeInstatusComponentStatus('weird')).toBe('unknown');
  });

  it('normalizes page-level Instatus status used as fallback when components missing', () => {
    expect(normalizeInstatusPageStatus('UP')).toBe('operational');
    expect(normalizeInstatusPageStatus('HASISSUES')).toBe('degraded');
    expect(normalizeInstatusPageStatus('DOWN')).toBe('down');
    expect(normalizeInstatusPageStatus('')).toBe('unknown');
  });
});

describe('Google Cloud incidents parser (Vertex Gemini)', () => {
  const VERTEX_GEMINI_ID = 'Z0FZJAMvEB4j3NbCJs6B';
  const VERTEX_PREDICTION_ID = 'sdXM79fz1FS6ekNpu37K';
  const SOMETHING_ELSE_ID = 'unrelated-product-id';

  it('reports operational when there are no active incidents touching the configured products', () => {
    const result = aggregateGcpStatus(
      [
        // Resolved incident (has end date), ignored
        {
          id: '1',
          begin: '2026-04-01T00:00:00Z',
          end: '2026-04-01T01:00:00Z',
          severity: 'high',
          affected_products: [{ id: VERTEX_GEMINI_ID, title: 'Vertex Gemini API' }],
        },
        // Active incident affecting an unrelated product, ignored
        {
          id: '2',
          begin: '2026-05-04T00:00:00Z',
          end: null,
          severity: 'medium',
          affected_products: [{ id: SOMETHING_ELSE_ID, title: 'Compute Engine' }],
        },
      ],
      [VERTEX_GEMINI_ID, VERTEX_PREDICTION_ID],
    );
    expect(result.status).toBe('operational');
    expect(result.affected).toEqual([]);
  });

  it('reports degraded when an active medium-severity incident affects a tracked product', () => {
    const result = aggregateGcpStatus(
      [
        {
          id: '3',
          begin: '2026-05-04T00:00:00Z',
          end: null,
          severity: 'medium',
          affected_products: [{ id: VERTEX_GEMINI_ID, title: 'Vertex Gemini API' }],
        },
      ],
      [VERTEX_GEMINI_ID, VERTEX_PREDICTION_ID],
    );
    expect(result.status).toBe('degraded');
    expect(result.affected).toEqual([{ name: 'Vertex Gemini API', status: 'degraded' }]);
  });

  it('reports down when any active incident is high severity', () => {
    const result = aggregateGcpStatus(
      [
        {
          id: '4',
          begin: '2026-05-04T00:00:00Z',
          end: null,
          severity: 'medium',
          affected_products: [{ id: VERTEX_PREDICTION_ID, title: 'Vertex AI Online Prediction' }],
        },
        {
          id: '5',
          begin: '2026-05-04T00:30:00Z',
          end: null,
          severity: 'high',
          affected_products: [{ id: VERTEX_GEMINI_ID, title: 'Vertex Gemini API' }],
        },
      ],
      [VERTEX_GEMINI_ID, VERTEX_PREDICTION_ID],
    );
    expect(result.status).toBe('down');
    expect(result.affected.find((a) => a.name === 'Vertex Gemini API')?.status).toBe('down');
  });
});

describe('AWS Health currentevents parser (Bedrock)', () => {
  it('reports operational when no events match the configured service substring', () => {
    const r = aggregateAwsStatus(
      [
        { service: 'ec2-us-east-1', service_name: 'EC2', summary: 'Increased Error Rates', region_name: 'N. Virginia' },
        { service: 's3-us-west-2', service_name: 'S3', summary: 'Latency increase', region_name: 'Oregon' },
      ],
      'bedrock',
    );
    expect(r.status).toBe('operational');
    expect(r.affected).toEqual([]);
  });

  it('reports degraded when bedrock matches via service_name', () => {
    const r = aggregateAwsStatus(
      [
        {
          service: 'bedrock-us-east-1',
          service_name: 'Amazon Bedrock',
          summary: 'Increased error rates for InvokeModel',
          region_name: 'N. Virginia',
        },
      ],
      'bedrock',
    );
    expect(r.status).toBe('degraded');
    expect(r.affected[0].name).toBe('Amazon Bedrock (N. Virginia)');
  });

  it('reports down when summary text indicates a major outage', () => {
    const r = aggregateAwsStatus(
      [
        {
          service: 'bedrock-us-east-1',
          service_name: 'Amazon Bedrock',
          summary: 'Service Disruption',
          region_name: 'N. Virginia',
        },
      ],
      'bedrock',
    );
    expect(r.status).toBe('down');
    expect(r.affected[0].status).toBe('down');
  });

  it('regional bundle event does not drive headline AND is suppressed from affected list', () => {
    // Production bug 2026-05-07: a localized power issue in mec1-az2 (UAE)
    // was published as a `multipleservices-me-central-1` bundle event with
    // bedrock listed in impacted_services. That projected as "AWS Bedrock
    // degraded" globally for >24h, even though Bedrock in primary regions
    // (us-east-1, us-west-2, eu-west-1, ap-northeast-1) was healthy.
    // Bundle events must not surface as components either, since the
    // /is-X-down page renders any non-empty components list as an "Active
    // Events" section with yellow chips, which would contradict the
    // operational headline.
    const r = aggregateAwsStatus(
      [
        {
          service: 'multipleservices-me-central-1',
          service_name: 'Multiple services',
          summary: 'Increased Error Rates',
          region_name: 'UAE',
          impacted_services: { 'bedrock-me-central-1': {}, 'ec2-me-central-1': {} },
        },
      ],
      'bedrock',
    );
    expect(r.status).toBe('operational');
    expect(r.affected).toHaveLength(0);
  });

  it('service-specific event drives headline; co-occurring bundle event is suppressed', () => {
    // If AWS publishes both a bundle event AND a Bedrock-specific event,
    // the service-specific one drives the headline AND is the only one
    // shown in components. Bundle events are always suppressed so headline
    // and component list cannot disagree.
    const r = aggregateAwsStatus(
      [
        {
          service: 'multipleservices-me-central-1',
          service_name: 'Multiple services',
          summary: 'Increased Error Rates',
          region_name: 'UAE',
          impacted_services: { 'bedrock-me-central-1': {} },
        },
        {
          service: 'bedrock-us-east-1',
          service_name: 'Amazon Bedrock',
          summary: 'Increased Error Rates',
          region_name: 'N. Virginia',
        },
      ],
      'bedrock',
    );
    expect(r.status).toBe('degraded');
    expect(r.affected).toHaveLength(1);
    expect(r.affected[0].name).toContain('N. Virginia');
  });

  it('escalates to down when ANY matching event is severe (worst-of)', () => {
    const r = aggregateAwsStatus(
      [
        {
          service: 'bedrock-us-east-1',
          service_name: 'Amazon Bedrock',
          summary: 'Increased latency',
          region_name: 'N. Virginia',
        },
        {
          service: 'bedrock-eu-west-1',
          service_name: 'Amazon Bedrock',
          summary: 'Service unavailable',
          region_name: 'Ireland',
        },
      ],
      'bedrock',
    );
    expect(r.status).toBe('down');
    expect(r.affected).toHaveLength(2);
  });

  it('checks event_log text for severity keywords (most recent updates often clearer)', () => {
    const r = aggregateAwsStatus(
      [
        {
          service: 'bedrock-us-east-1',
          service_name: 'Amazon Bedrock',
          summary: 'Investigating',
          region_name: 'N. Virginia',
          event_log: [
            { date: '1', summary: 'We are investigating reports of unavailable models' },
          ],
        },
      ],
      'bedrock',
    );
    expect(r.status).toBe('down');
  });

  it('awsEventAffectsService is case-insensitive across service, service_name, impacted_services', () => {
    expect(
      awsEventAffectsService(
        { service: 'BEDROCK-runtime-us-east-1', service_name: 'X' },
        'bedrock',
      ),
    ).toBe(true);
    expect(
      awsEventAffectsService(
        { service: 'x', service_name: 'Amazon BEDROCK Runtime' },
        'bedrock',
      ),
    ).toBe(true);
    expect(
      awsEventAffectsService(
        { service: 'x', service_name: 'y', impacted_services: { 'BEDROCK-eu': {} } },
        'bedrock',
      ),
    ).toBe(true);
    expect(awsEventAffectsService({ service: 'ec2', service_name: 'EC2' }, 'bedrock')).toBe(false);
  });

  it('awsEventSeverity defaults to degraded when text has no severe keywords', () => {
    expect(awsEventSeverity({ summary: 'Increased error rates' })).toBe('degraded');
    expect(awsEventSeverity({ summary: 'Latency in InvokeModel' })).toBe('degraded');
    expect(awsEventSeverity({ summary: 'Service unavailable' })).toBe('down');
    expect(awsEventSeverity({ summary: 'Major service disruption in us-east-1' })).toBe('down');
  });

  // Regression: AWS Health currentevents.json is UTF-16 BE with a FE FF
  // BOM. The previous decoder was 'utf-16' (alias for utf-16le), which
  // produced byte-swapped garbage and silently turned every Bedrock poll
  // into status 'unknown'. This test encodes a JSON payload as UTF-16 BE
  // by hand and asserts the helper round-trips it.
  it('decodeAwsEventsBuffer parses UTF-16 BE bytes with BOM (Bedrock unknown-status regression)', () => {
    const json = '[{"service":"bedrock-us-east-1","service_name":"Amazon Bedrock"}]';
    const bytes = new Uint8Array(2 + json.length * 2);
    bytes[0] = 0xfe;
    bytes[1] = 0xff;
    for (let i = 0; i < json.length; i++) {
      const code = json.charCodeAt(i);
      bytes[2 + i * 2] = (code >> 8) & 0xff;
      bytes[2 + i * 2 + 1] = code & 0xff;
    }
    const events = decodeAwsEventsBuffer(bytes.buffer);
    expect(events).toEqual([
      { service: 'bedrock-us-east-1', service_name: 'Amazon Bedrock' },
    ]);
  });
});

describe('Azure status RSS parser (Azure OpenAI)', () => {
  const KEYWORDS = ['azure openai', 'cognitive services', 'ai foundry'];

  it('reports operational when feed has zero items (Azure all-clear state)', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <title>Azure Status</title>
      <lastBuildDate>Tue, 05 May 2026 05:04:00 Z</lastBuildDate>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    expect(items).toEqual([]);
    const r = aggregateAzureStatus(items, KEYWORDS);
    expect(r.status).toBe('operational');
    expect(r.affected).toEqual([]);
  });

  it('reports operational when items exist but none match the keyword filter', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Storage Accounts - West Europe</title>
        <description>Increased latency for Storage Blob</description>
        <pubDate>Tue, 05 May 2026 04:00:00 Z</pubDate>
      </item>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    expect(items).toHaveLength(1);
    const r = aggregateAzureStatus(items, KEYWORDS);
    expect(r.status).toBe('operational');
  });

  it('reports degraded when an item matches via title and severity is mild', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Azure OpenAI - East US 2 - Increased error rates</title>
        <description>Customers may experience elevated 429 responses for chat completions.</description>
        <pubDate>Tue, 05 May 2026 04:00:00 Z</pubDate>
      </item>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    const r = aggregateAzureStatus(items, KEYWORDS);
    expect(r.status).toBe('degraded');
    expect(r.affected[0].name).toContain('Azure OpenAI');
  });

  it('reports down when item text indicates a major outage', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Azure OpenAI Service Disruption - Multiple regions</title>
        <description>Service unavailable in East US, West US, and North Europe.</description>
        <pubDate>Tue, 05 May 2026 04:00:00 Z</pubDate>
      </item>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    const r = aggregateAzureStatus(items, KEYWORDS);
    expect(r.status).toBe('down');
    expect(r.affected[0].status).toBe('down');
  });

  it('matches via description when the title is generic', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Cognitive Services - Multi-region issue</title>
        <description>Several customers using cognitive services are reporting issues</description>
        <pubDate>Tue, 05 May 2026 04:00:00 Z</pubDate>
      </item>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    const r = aggregateAzureStatus(items, KEYWORDS);
    expect(r.status).toBe('degraded');
  });

  it('escalates to down when ANY matching item is severe (worst-of)', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Azure OpenAI - West US - Latency</title>
        <description>Some customers experiencing elevated latency.</description>
      </item>
      <item>
        <title>Azure OpenAI - East US - Service unavailable</title>
        <description>Severe disruption affecting all chat completions.</description>
      </item>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    expect(items).toHaveLength(2);
    const r = aggregateAzureStatus(items, KEYWORDS);
    expect(r.status).toBe('down');
    expect(r.affected).toHaveLength(2);
  });

  it('strips CDATA wrappers and embedded HTML from descriptions', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title><![CDATA[Azure OpenAI - <b>Brief</b> issue]]></title>
        <description><![CDATA[<p>Some customers are seeing <strong>increased</strong> error rates.</p>]]></description>
      </item>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    expect(items[0].title).toBe('Azure OpenAI - Brief issue');
    expect(items[0].description).toContain('Some customers are seeing');
    expect(items[0].description).not.toContain('<strong>');
  });

  it('handles RSS items with attributes on the opening tag', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item rdf:about="urn:azure:1">
        <title>Azure OpenAI issue</title>
        <description>Issue text</description>
      </item>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Azure OpenAI issue');
  });

  it('truncates long titles in the affected list to fit small UI labels', () => {
    const longTitle = 'Azure OpenAI - ' + 'A'.repeat(150);
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>${longTitle}</title><description>x</description></item>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    const r = aggregateAzureStatus(items, KEYWORDS);
    expect(r.affected[0].name.length).toBeLessThanOrEqual(80);
    expect(r.affected[0].name.endsWith('...')).toBe(true);
  });

  it('keyword match is case-insensitive', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>AZURE OPENAI degradation</title><description>x</description></item>
    </channel></rss>`;
    const items = parseAzureRssItems(xml);
    const r = aggregateAzureStatus(items, KEYWORDS);
    expect(r.status).toBe('degraded');
  });

  it('azureItemSeverity defaults to degraded when no severe keywords present', () => {
    expect(
      azureItemSeverity({ title: 'Azure OpenAI - East US', description: 'Increased latency', pubDate: '' }),
    ).toBe('degraded');
    expect(
      azureItemSeverity({ title: 'Azure OpenAI - East US', description: 'Service unavailable', pubDate: '' }),
    ).toBe('down');
    expect(
      azureItemSeverity({ title: 'Azure OpenAI - Major outage', description: '', pubDate: '' }),
    ).toBe('down');
  });
});
