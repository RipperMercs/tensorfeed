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
  return articleOgImage('openai-model-sandbox-escape-30-day-review');
}
