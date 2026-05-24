import { BadgeKind } from '@/data/gear/types';

interface Props {
  kind: BadgeKind | 'pin';
  label?: string;
}

/**
 * Small mono pill rendered on the product card's badge tray. Five visual
 * variants: editor, new, experimental, and pin (for ad-hoc short editorial
 * flags like "BEST FOR LOCAL LLM").
 */
export default function Badge({ kind, label }: Props) {
  if (kind === 'editor') {
    return (
      <span className="badge editor" role="listitem" aria-label="Editor's pick">
        <span className="star" aria-hidden="true" /> EDITOR&apos;S PICK
      </span>
    );
  }
  if (kind === 'new') {
    return (
      <span className="badge new" role="listitem" aria-label="New product">
        NEW
      </span>
    );
  }
  if (kind === 'experimental') {
    return (
      <span className="badge experimental" role="listitem" aria-label="Experimental">
        EXPERIMENTAL
      </span>
    );
  }
  if (kind === 'pin' && label) {
    return (
      <span className="badge local-llm" role="listitem" aria-label={label}>
        {label}
      </span>
    );
  }
  return null;
}
