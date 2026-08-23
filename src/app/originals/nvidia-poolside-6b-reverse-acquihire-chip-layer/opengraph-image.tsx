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
  return articleOgImage('nvidia-poolside-6b-reverse-acquihire-chip-layer');
}
