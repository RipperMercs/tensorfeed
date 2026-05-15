/**
 * Locked 9-category palette for the AI Research Hub per Claude Design's
 * facelift spec section 3. Color flows through CSS variables (--cat-color,
 * --cat-tint, --cat-glow) on each consuming card's root element; every
 * descendant style references the variable. No hardcoded hex downstream
 * of this file.
 *
 * Categories surface in:
 *   - Milestone card border + top-edge glow + tint + pill
 *   - Velocity card border + tag pill + sparkline + citation count
 *   - Background particle field (one color per category)
 *   - Emerging keyword bubble border + velocity arrow
 *   - Firehose row category badge
 *   - Author / Institution pills
 *   - Ticker entry tag prefix
 *   - Search filter dropdown row dot + active filter chip
 */

export type CategoryKey =
  | 'multimodal'
  | 'robotics'
  | 'retrieval'
  | 'safety'
  | 'nlp'
  | 'vision'
  | 'rl'
  | 'theory'
  | 'application';

export interface CategoryDef {
  key: CategoryKey;
  name: string;
  short: string;
  color: string;
  tint: string;    // background-tint (low alpha)
  glow: string;    // box-shadow glow (mid alpha)
}

function withAlpha(hex: string, alpha: number): string {
  // Quick #RRGGBB -> rgba string conversion. Falls through for any
  // non-6-digit-hex input (rare; the palette below is all 6-digit).
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function defOf(key: CategoryKey, name: string, short: string, color: string): CategoryDef {
  return {
    key,
    name,
    short,
    color,
    tint: withAlpha(color, 0.08),
    glow: withAlpha(color, 0.45),
  };
}

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  multimodal:  defOf('multimodal',  'Multimodal',    'MULTIMODAL',  '#06b6d4'),
  robotics:    defOf('robotics',    'Robotics',      'ROBOTICS',    '#f59e0b'),
  retrieval:   defOf('retrieval',   'Retrieval',     'RETRIEVAL',   '#8b5cf6'),
  safety:      defOf('safety',      'Safety',        'SAFETY',      '#ef4444'),
  nlp:         defOf('nlp',         'NLP',           'NLP',         '#6366f1'),
  vision:      defOf('vision',      'Vision',        'VISION',      '#ec4899'),
  rl:          defOf('rl',          'Reinforcement', 'RL',          '#84cc16'),
  theory:      defOf('theory',      'Theory',        'THEORY',      '#3b82f6'),
  application: defOf('application', 'Application',   'APPLICATION', '#10b981'),
};

export const CATEGORY_KEYS: CategoryKey[] = Object.keys(CATEGORIES) as CategoryKey[];

export const CATEGORY_COLORS: string[] = CATEGORY_KEYS.map((k) => CATEGORIES[k].color);

const DEFAULT_CATEGORY: CategoryKey = 'application';

/**
 * Maps the Qwen-extracted subfield_tag values (from the arxiv extraction
 * pipeline schema in C:\Users\rippe\tensorfeed-research\) into the 9
 * canonical visual categories. Source subfields are richer than the
 * visual palette can carry, so we collapse them into the closest match.
 *
 * Unknown / unmapped subfields fall back to 'application' (the neutral
 * green) rather than 'theory' so the visual stays warm by default.
 */
const SUBFIELD_TO_CATEGORY: Record<string, CategoryKey> = {
  // multimodal cluster
  multimodal: 'multimodal',
  speech: 'multimodal',
  audio: 'multimodal',

  // vision
  vision: 'vision',
  'cs.cv': 'vision',

  // robotics
  robotics: 'robotics',
  embodied: 'robotics',
  'cs.ro': 'robotics',

  // retrieval
  retrieval: 'retrieval',
  rag: 'retrieval',
  'vector-store': 'retrieval',

  // safety / alignment
  'llm-alignment': 'safety',
  alignment: 'safety',
  safety: 'safety',
  'fairness-safety': 'safety',
  'red-team': 'safety',

  // nlp / language
  'llm-architecture': 'nlp',
  'llm-training': 'nlp',
  'llm-eval': 'nlp',
  llm: 'nlp',
  nlp: 'nlp',
  'cs.cl': 'nlp',
  'code-generation': 'nlp',

  // reinforcement learning
  rl: 'rl',
  'reinforcement-learning': 'rl',

  // theory
  theory: 'theory',
  optimization: 'theory',
  'theoretical-analysis': 'theory',

  // applied
  agents: 'application',
  'scientific-ml': 'application',
  efficiency: 'application',
  application: 'application',
  'dataset-release': 'application',
  'dataset': 'application',
  'survey': 'application',
  'position-paper': 'application',
  other: 'application',
};

export function categoryForSubfield(subfield: string | null | undefined): CategoryDef {
  if (!subfield) return CATEGORIES[DEFAULT_CATEGORY];
  const lc = subfield.toLowerCase();
  const direct = SUBFIELD_TO_CATEGORY[lc];
  if (direct) return CATEGORIES[direct];
  // Substring fallback for tags we did not explicitly map (e.g. composite
  // tags like 'llm-and-vision' or future schema additions).
  for (const [needle, cat] of Object.entries(SUBFIELD_TO_CATEGORY)) {
    if (lc.includes(needle)) return CATEGORIES[cat];
  }
  return CATEGORIES[DEFAULT_CATEGORY];
}

/**
 * Maps arXiv primaryCategory codes (cs.AI, cs.LG, cs.CL, cs.CV, etc.)
 * into the visual category. Distinct from subfield mapping because the
 * arXiv codes are more generic; cs.AI for instance is broad and we
 * lean it toward NLP since that's the dominant AI subfield on arXiv.
 */
const ARXIV_CATEGORY_TO_VISUAL: Record<string, CategoryKey> = {
  'cs.ai': 'nlp',
  'cs.cl': 'nlp',
  'cs.lg': 'theory',
  'cs.cv': 'vision',
  'cs.ro': 'robotics',
  'cs.ne': 'theory',
  'cs.gt': 'theory',
  'cs.ma': 'application',
  'cs.ir': 'retrieval',
  'cs.sd': 'multimodal',
  'cs.cy': 'safety',
  'stat.ml': 'theory',
  eess: 'multimodal',
};

export function categoryForArxiv(arxivCategory: string | null | undefined): CategoryDef {
  if (!arxivCategory) return CATEGORIES[DEFAULT_CATEGORY];
  const lc = arxivCategory.toLowerCase();
  const direct = ARXIV_CATEGORY_TO_VISUAL[lc];
  if (direct) return CATEGORIES[direct];
  return CATEGORIES[DEFAULT_CATEGORY];
}

/**
 * Deterministic category by string seed. Used when no semantic mapping
 * exists (e.g. citation-velocity papers carry an openalex_id but no
 * subfield tag). Stable across re-renders: same seed = same category.
 */
export function categoryForSeed(seed: string): CategoryDef {
  if (!seed) return CATEGORIES[DEFAULT_CATEGORY];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = (h ^ seed.charCodeAt(i)) * 16777619;
  return CATEGORIES[CATEGORY_KEYS[(h >>> 0) % CATEGORY_KEYS.length]];
}

/**
 * CSS variables to spread onto a card root so descendant styles can use
 * var(--cat-color), var(--cat-tint), var(--cat-glow) without per-card
 * inline color refs. Returned as a React-friendly style object.
 */
export function categoryStyle(cat: CategoryDef): React.CSSProperties {
  return {
    ['--cat-color' as string]: cat.color,
    ['--cat-tint' as string]: cat.tint,
    ['--cat-glow' as string]: cat.glow,
  };
}
