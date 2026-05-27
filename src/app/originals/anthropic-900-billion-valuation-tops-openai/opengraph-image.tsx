import {
  articleOgImage,
  articleOgAlt,
  articleOgSize,
  articleOgContentType,
} from '@/lib/og/article-og';

export const alt = articleOgAlt;
export const size = articleOgSize;
export const contentType = articleOgContentType;

export default function OpengraphImage() {
  return articleOgImage('anthropic-900-billion-valuation-tops-openai');
}
