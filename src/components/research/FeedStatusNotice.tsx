import Link from 'next/link';
import { AlertTriangle, Archive } from 'lucide-react';

/**
 * Banner for a research feed that TensorFeed no longer maintains as a live
 * surface. Two distinct states, because they are not the same claim:
 *
 *   frozen    - the data is accurate and still citable, it just stopped
 *               updating because the upstream source became unreachable.
 *               The page keeps rendering the data underneath.
 *   withdrawn - the data is not trustworthy and should not be cited. The
 *               page renders this notice INSTEAD of the data.
 *
 * Both mirror the `data_quality` block the matching API endpoint returns, so
 * a human and an agent get the same warning from the same facts.
 */
export type FeedStatus = 'frozen' | 'withdrawn';

interface Props {
  status: FeedStatus;
  title: string;
  /** Plain explanation of what happened. */
  reason: string;
  /** ISO date the data was last known good, when status is frozen. */
  since?: string;
  /** Where a reader should go instead. */
  alternatives?: { href: string; label: string }[];
  /** The still-served JSON endpoint, so agents keep a stable contract. */
  apiPath?: string;
}

export default function FeedStatusNotice({
  status,
  title,
  reason,
  since,
  alternatives = [],
  apiPath,
}: Props) {
  const frozen = status === 'frozen';
  const Icon = frozen ? Archive : AlertTriangle;
  const tone = frozen
    ? 'bg-amber-500/5 border-amber-500/25'
    : 'bg-red-500/5 border-red-500/25';
  const iconTone = frozen ? 'text-amber-400' : 'text-red-400';

  return (
    <section
      role="note"
      aria-labelledby="feed-status-heading"
      className={`rounded-xl border p-5 sm:p-6 ${tone}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconTone}`} aria-hidden="true" />
        <div className="min-w-0">
          <h2
            id="feed-status-heading"
            className="text-lg font-semibold text-text-primary mb-1"
          >
            {title}
          </h2>
          <p className="text-text-secondary leading-relaxed text-sm sm:text-base">
            {reason}
          </p>

          {frozen && since && (
            <p className="text-text-muted text-sm mt-2 font-mono">
              Last updated {since}. The records below are unchanged since then and
              remain accurate for the seasons they cover.
            </p>
          )}

          {alternatives.length > 0 && (
            <p className="text-text-secondary text-sm mt-3">
              For current data, use{' '}
              {alternatives.map((a, i) => (
                <span key={a.href}>
                  {i > 0 && (i === alternatives.length - 1 ? ' or ' : ', ')}
                  <Link href={a.href} className="text-accent-primary hover:underline">
                    {a.label}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}

          {apiPath && (
            <p className="text-text-muted text-xs mt-3 font-mono">
              {apiPath} still responds, and carries the same status in its
              data_quality field.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
