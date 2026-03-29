'use client';

import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { isBookmarked, toggleBookmark } from '@/lib/bookmarks';

export default function BookmarkButton({ articleId }: { articleId: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(articleId));
  }, [articleId]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newState = toggleBookmark(articleId);
    setSaved(newState);
  }

  return (
    <button
      onClick={handleClick}
      className={`p-1 rounded transition-colors ${
        saved
          ? 'text-accent-primary'
          : 'text-text-muted hover:text-text-secondary'
      }`}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark article'}
      title={saved ? 'Bookmarked' : 'Bookmark'}
    >
      <Bookmark className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
