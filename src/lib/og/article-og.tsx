import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';
import { ORIGINALS } from '@/lib/originals-directory';

export const articleOgAlt = 'TensorFeed.ai article';
export const articleOgSize = { width: 1200, height: 630 };
export const articleOgContentType = 'image/png';

const interBold = fs.readFileSync(
  path.join(process.cwd(), 'src/lib/og/fonts/Inter-Bold.woff')
);
const interRegular = fs.readFileSync(
  path.join(process.cwd(), 'src/lib/og/fonts/Inter-Regular.woff')
);

export function articleOgImage(slug: string) {
  const article = ORIGINALS.find((a) => a.slug === slug);
  const title = article?.title ?? 'TensorFeed.ai';
  const author = article?.author ?? '';
  const date = article?.date ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: 24,
          backgroundColor: '#0a0a0f',
          backgroundImage:
            'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#0a0a0f',
            borderRadius: 20,
            padding: 64,
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontSize: 36,
              fontWeight: 700,
              color: '#e2e8f0',
              letterSpacing: -0.5,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: 30,
                letterSpacing: -1,
              }}
            >
              TF
            </div>
            <span>TensorFeed.ai</span>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: title.length > 110 ? 48 : title.length > 80 ? 56 : 64,
              fontWeight: 800,
              lineHeight: 1.1,
              color: '#e2e8f0',
              letterSpacing: -1.2,
              maxWidth: '100%',
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 26,
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', gap: 14 }}>
              {author && (
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                  {author}
                </span>
              )}
              {author && date && <span>·</span>}
              {date && <span>{date}</span>}
            </div>
            <div style={{ color: '#8b5cf6', fontWeight: 700 }}>/originals</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: interBold,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: interRegular,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  );
}
