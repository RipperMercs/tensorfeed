import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    default: 'TensorFeed.ai | AI News, Model Tracking & Real-Time Data',
    template: '%s | TensorFeed.ai',
  },
  description: 'AI news, model tracking, and real-time AI ecosystem data for humans and agents. Your daily hub for everything artificial intelligence.',
  metadataBase: new URL('https://tensorfeed.ai'),
  openGraph: {
    type: 'website',
    siteName: 'TensorFeed.ai',
    title: 'TensorFeed.ai | AI News, Model Tracking & Real-Time Data',
    description: 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.',
    url: 'https://tensorfeed.ai',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TensorFeed.ai',
    description: 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
      'application/json': '/feed.json',
    },
  },
  other: {
    'ai-content-type': 'news-aggregator',
    'ai-api-endpoint': 'https://tensorfeed.ai/api/agents/news',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
