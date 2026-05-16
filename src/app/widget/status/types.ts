// Data contract from the design handoff (README section 12). The widget
// renders exactly this shape; feed.ts maps TensorFeed's live endpoints
// onto it.

export type ItemState = 'nominal' | 'degraded' | 'downgraded' | 'critical' | 'offline';

export interface Item {
  id: string;
  name: string; // display
  vendor: string; // display, small caps
  state: ItemState;
  latencyMs: number | null; // probed p95, or null when this provider is not latency-probed
  uptimePct: number | null; // real 7-day uptime % (shown when there is no latency probe)
  lastCheckedAgoS: number | null; // seconds since last successful check
  history: number[]; // length 16, each in [0, 1], drives the sparkline
  detailHref: string;
}

export interface Feed {
  pollIntervalMs: number;
  generatedAt: string;
  llms: Item[];
  services: Item[];
}

export type Condition = 'nominal' | 'degraded' | 'critical';
