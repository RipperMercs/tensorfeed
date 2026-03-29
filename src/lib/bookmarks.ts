'use client';

const STORAGE_KEY = 'tensorfeed-bookmarks';

export function getBookmarks(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function toggleBookmark(articleId: string): boolean {
  const bookmarks = getBookmarks();
  const isBookmarked = bookmarks.has(articleId);
  if (isBookmarked) {
    bookmarks.delete(articleId);
  } else {
    bookmarks.add(articleId);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(bookmarks)));
  return !isBookmarked;
}

export function isBookmarked(articleId: string): boolean {
  return getBookmarks().has(articleId);
}
