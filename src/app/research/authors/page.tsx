import type { Metadata } from 'next';
import Link from 'next/link';
import FeedStatusNotice from '@/components/research/FeedStatusNotice';

/**
 * The ranking itself is withdrawn, so AuthorsClient is intentionally not
 * rendered. Ordering authors by works-per-OpenAlex-author-id measures author
 * disambiguation more than research output: high-collision names merge many
 * distinct researchers into one inflated record and take every top slot, and
 * OpenAlex also registers organizations, patent-assignee placeholders and even
 * models ("Gemini 3.1 (Flash)", "Chatterbox TTS") as authors. Filtering the
 * non-people out still leaves a board with no recognizable AI researcher on it,
 * so no threshold rescues it. See worker/src/openalex-authors.ts.
 *
 * The URL is kept rather than deleted so inbound and indexed links resolve to
 * an explanation instead of a 404. /api/research/authors still serves, with a
 * matching data_quality: degraded marker.
 *
 * To restore: render <AuthorsClient /> below and revert the metadata.
 */
export const metadata: Metadata = {
  title: 'AI Researchers Leaderboard: Withdrawn | TensorFeed',
  description:
    'TensorFeed no longer publishes a top-AI-researchers ranking. Ordering by publication volume per OpenAlex author id reflects author name disambiguation more than research output. Institutions and citation velocity remain live.',
  alternates: { canonical: 'https://tensorfeed.ai/research/authors' },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'AI Researchers Leaderboard: Withdrawn | TensorFeed',
    description:
      'This ranking was withdrawn because publication volume per OpenAlex author id measures name disambiguation rather than research output.',
    url: 'https://tensorfeed.ai/research/authors',
    type: 'website',
  },
};

export default function AuthorsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <FeedStatusNotice
        status="withdrawn"
        title="The AI researchers leaderboard has been withdrawn"
        reason="Ranking authors by publication volume per OpenAlex author id measures name disambiguation more than research output. Common names merge many distinct researchers into a single record and take every top slot, while OpenAlex also registers organizations, patent-assignee placeholders and even AI models as authors. We removed the non-people, and the remaining ranking still did not describe anyone real, so we stopped publishing it rather than present a number we would not stand behind."
        alternatives={[
          { href: '/research/institutions', label: 'Top Institutions' },
          { href: '/research/citation-velocity', label: 'Citation Velocity' },
        ]}
        apiPath="/api/research/authors"
      />

      <p className="text-text-secondary text-sm mt-6 leading-relaxed">
        Bringing it back means changing what is measured, not tuning a
        threshold. Citation impact among recent AI authors is the obvious
        candidate. Until then, institution-level output is the reliable view of
        who is producing AI research, and it is{' '}
        <Link href="/research/institutions" className="text-accent-primary hover:underline">
          updated daily
        </Link>
        .
      </p>
    </div>
  );
}
