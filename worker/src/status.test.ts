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

const {
  normalizeInstatusComponentStatus,
  normalizeInstatusPageStatus,
  aggregateGcpStatus,
  aggregateAwsStatus,
  awsEventAffectsService,
  awsEventSeverity,
} = _internal;

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
        // Resolved incident (has end date) — ignored
        {
          id: '1',
          begin: '2026-04-01T00:00:00Z',
          end: '2026-04-01T01:00:00Z',
          severity: 'high',
          affected_products: [{ id: VERTEX_GEMINI_ID, title: 'Vertex Gemini API' }],
        },
        // Active incident affecting an unrelated product — ignored
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

  it('matches via impacted_services keys when service field is generic', () => {
    const r = aggregateAwsStatus(
      [
        {
          service: 'multipleservices-us-east-1',
          service_name: 'Multiple services',
          summary: 'Connectivity issues',
          region_name: 'N. Virginia',
          impacted_services: { 'bedrock-us-east-1': {}, 'ec2-us-east-1': {} },
        },
      ],
      'bedrock',
    );
    expect(r.status).toBe('degraded');
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
});
