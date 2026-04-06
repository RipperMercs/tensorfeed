import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ThemeProvider from '@/components/ThemeProvider';
import CookieConsent from '@/components/CookieConsent';

export const metadata: Metadata = {
  title: {
    default: 'TensorFeed.ai | AI News, Model Tracking & Real-Time Data',
    template: '%s | TensorFeed.ai',
  },
  description: 'AI news, model tracking, and real-time AI ecosystem data for humans and agents. Your daily hub for everything artificial intelligence.',
  metadataBase: new URL('https://tensorfeed.ai'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/tensorfeed-icon.png', sizes: '210x168', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'TensorFeed.ai',
    title: 'TensorFeed.ai | AI News, Model Tracking & Real-Time Data',
    description: 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.',
    url: 'https://tensorfeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TensorFeed.ai',
    description: 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.',
    images: ['/tensorfeed-logo.png'],
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
    'ai-data-freshness': '10-minutes',
    'ai-structured-data': 'true',
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
        <meta name="google-adsense-account" content="ca-pub-7224757913262984" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7224757913262984"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var m=document.cookie.match(/(^| )theme=([^;]+)/);var t=m?m[2]:'dark';document.documentElement.setAttribute('data-theme',t)})()`,
          }}
        />
        <link rel="alternate" type="text/markdown" href="/llms-full.txt" title="LLM Full Context" />
        <link rel="preconnect" href="https://tensorfeed.ai" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
