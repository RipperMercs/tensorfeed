/**
 * Model-key resolution shared by the paid model-intelligence endpoints
 * (cost projection, compare/models). Exact id or display-name match wins
 * first, case-insensitively. A relaxed second pass then accepts the
 * widely copied short forms (opus-4-8 for claude-opus-4-8, dot and space
 * variants like "GPT-5.5" or "Claude Opus 4.8") but ONLY when the relaxed
 * key resolves to exactly one model across the whole pricing payload.
 * Ambiguous short forms (gemini-3 matches two Gemini 3.x rows) stay
 * unmatched rather than silently guessing: an agent paid for this call,
 * so a wrong-model answer is worse than an honest model_not_found.
 *
 * Added 2026-07-02: TF's own documented examples used the short forms,
 * so any agent copying them got model_not_found back on a paid call.
 */

export interface ResolvableModel {
  id: string;
  name: string;
}

export interface ResolvableProvider<M extends ResolvableModel> {
  models: M[];
}

function normalizeKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s.]+/g, '-');
}

export function resolveModelKey<M extends ResolvableModel, P extends ResolvableProvider<M>>(
  providers: P[] | null | undefined,
  key: string,
): { provider: P; model: M } | null {
  if (!providers) return null;
  const k = key.trim().toLowerCase();
  if (!k) return null;
  const kn = normalizeKey(key);

  let exact: { provider: P; model: M } | null = null;
  const relaxed: Array<{ provider: P; model: M }> = [];

  for (const provider of providers) {
    for (const model of provider.models) {
      const id = model.id.toLowerCase();
      const name = model.name.toLowerCase();
      if (id === k || name === k) {
        if (!exact) exact = { provider, model };
        continue;
      }
      if (id === kn || normalizeKey(model.name) === kn || id.endsWith('-' + kn)) {
        relaxed.push({ provider, model });
      }
    }
  }

  if (exact) return exact;
  return relaxed.length === 1 ? relaxed[0] : null;
}
