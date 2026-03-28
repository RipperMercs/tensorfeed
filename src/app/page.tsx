import NewsFeed from '@/components/news/NewsFeed';
import Sidebar from '@/components/layout/Sidebar';
import { MOCK_ARTICLES } from '@/lib/mock-data';

export default function HomePage() {
  const articles = MOCK_ARTICLES;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <NewsFeed articles={articles} />
        </div>
        <aside className="w-full lg:w-80 shrink-0">
          <Sidebar />
        </aside>
      </div>
    </div>
  );
}
