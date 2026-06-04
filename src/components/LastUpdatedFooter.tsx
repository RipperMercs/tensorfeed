import freshnessData from '../../data/page-freshness.json';

type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'editorial';

interface FreshnessEntry {
  last_reviewed: string;
  cadence: Cadence;
  notes?: string;
}

const PAGES = (freshnessData as { pages: Record<string, FreshnessEntry> }).pages;

const CADENCE_DAYS: Record<Exclude<Cadence, 'editorial'>, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

const CADENCE_LABEL: Record<Cadence, string> = {
  daily: 'reviewed daily',
  weekly: 'reviewed weekly',
  biweekly: 'reviewed every two weeks',
  monthly: 'reviewed monthly',
  editorial: 'editorial cadence',
};

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function computeNextReview(lastReviewed: string, cadence: Cadence): { dueISO: string; overdue: boolean } | null {
  if (cadence === 'editorial') return null;
  const interval = CADENCE_DAYS[cadence];
  const d = new Date(lastReviewed + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + interval);
  const dueISO = d.toISOString().slice(0, 10);
  const overdue = Date.now() > d.getTime();
  return { dueISO, overdue };
}

interface Props {
  /** Page path key into data/page-freshness.json, e.g. "/ai-infrastructure". */
  path: string;
}

/**
 * Editorial freshness stamp for static / hand-curated pages whose data does
 * NOT come from a Worker cron endpoint. Worker-backed pages already display
 * their own lastUpdated and should not use this component.
 *
 * Reads last_reviewed and cadence from data/page-freshness.json. Computes a
 * next-review date for non-editorial cadences and surfaces an OVERDUE flag
 * if today is past it. Returns null if no entry exists for the given path
 * (fail-quiet so adding new pages does not break builds).
 */
export default function LastUpdatedFooter({ path }: Props) {
  const entry = PAGES[path];
  if (!entry) return null;

  const formatted = formatDate(entry.last_reviewed);
  const cadenceLabel = CADENCE_LABEL[entry.cadence];
  const next = computeNextReview(entry.last_reviewed, entry.cadence);

  return (
    <footer
      className="mt-12 pt-6 border-t border-bg-tertiary text-xs text-text-muted"
      aria-label="Page freshness"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono">
          Last reviewed:{' '}
          <time dateTime={entry.last_reviewed} className="text-text-secondary">
            {formatted}
          </time>
        </span>
        <span aria-hidden="true">&middot;</span>
        <span>{cadenceLabel}</span>
        {next && !next.overdue && (
          <>
            <span aria-hidden="true">&middot;</span>
            <span className="font-mono">
              Next review:{' '}
              <time dateTime={next.dueISO} className="text-text-secondary">
                {formatDate(next.dueISO)}
              </time>
            </span>
          </>
        )}
        {/*
          Overdue is an INTERNAL ops signal, not visitor-facing. A public amber
          OVERDUE reads as neglect, so we do not render it. The next-review
          stamp simply drops off once a page passes its due date, and the
          overdue set is surfaced to the operator by the freshness audit
          (scripts/freshness-audit.mjs) instead of to readers.
        */}
      </div>
      {entry.notes && (
        <p className="mt-2 italic text-text-muted/80 max-w-2xl leading-relaxed">{entry.notes}</p>
      )}
    </footer>
  );
}
