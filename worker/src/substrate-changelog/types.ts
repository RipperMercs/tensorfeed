export type SubstrateEventType = 'model_added' | 'model_removed' | 'model_repriced' | 'model_deprecated' | 'spec_version' | 'framework_release' | 'protocol_milestone';

export interface SubstrateEvent {
  id: string;
  type: SubstrateEventType;
  at: string;             // YYYY-MM-DD
  subject: string;
  provider: string | null;
  detail: string;
  version: string | null;
  source_url: string | null;
}

export interface ModelSnapshotEntry { provider: string; name: string; input: number; output: number }
export type ModelSnapshot = Record<string, ModelSnapshotEntry>;     // key = `${providerId}/${modelId}`
export type DeprecationSnapshot = Record<string, string>;           // deprecation.id -> status
export interface SpecSnapshot { mcp: string | null; x402: string | null; a2a: string | null; sources: { mcp: string | null; x402: string | null; a2a: string | null } }
export type FrameworkSnapshot = Record<string, string>;             // slug -> latest release tag
export type MilestoneSnapshot = Record<string, string>;             // milestone.id -> milestone.date (presence marks "already emitted")

export interface CapturedState {
  models: ModelSnapshot;
  deprecations: DeprecationSnapshot;
  specs: SpecSnapshot;
}
