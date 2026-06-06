import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import ConditionalFooter from '@/components/layout/ConditionalFooter';
import ChromeGate from '@/components/layout/ChromeGate';
import ThemeProvider from '@/components/ThemeProvider';
import ViewModeProvider from '@/components/ViewModeProvider';
import AgentView from '@/components/AgentView';
import CookieConsent from '@/components/CookieConsent';
import LiveTicker from '@/components/home/LiveTicker';
import TopAlertBar from '@/components/home/TopAlertBar';
import JsonLd from '@/components/seo/JsonLd';
import Script from 'next/script';
import pricingData from '@/../data/pricing.json';
import benchmarkData from '@/../data/benchmarks.json';
import { buildEvergreenTickerItems, type PricingDataLite, type BenchmarkDataLite } from '@/lib/ticker-data';

// Ticker price + benchmark rows derived once at build from the canonical data
// files (data/pricing.json + data/benchmarks.json), so the homepage ticker can
// never drift out of sync with them again. Passed to the client LiveTicker as a
// prop, which keeps the JSON out of the client bundle.
const TICKER_ITEMS = buildEvergreenTickerItems(
  pricingData as unknown as PricingDataLite,
  benchmarkData as unknown as BenchmarkDataLite,
);

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
    'google-adsense-account': 'ca-pub-7224757913262984',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var m=document.cookie.match(/(^| )theme=([^;]+)/);var t=m?m[2]:'dark';document.documentElement.setAttribute('data-theme',t);var v=document.cookie.match(/(^| )view-mode=([^;]+)/);document.documentElement.setAttribute('data-view-mode',v&&v[2]==='agent'?'agent':'human')})()`,
          }}
        />
        <link rel="alternate" type="text/markdown" href="/llms-full.txt" title="LLM Full Context" />
        <link rel="preconnect" href="https://tensorfeed.ai" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[200] focus:rounded-md focus:bg-accent-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to content
        </a>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'TensorFeed',
            url: 'https://tensorfeed.ai/',
            logo: 'https://tensorfeed.ai/tensorfeed-logo.png',
            sameAs: ['https://x.com/tensorfeed', 'https://github.com/RipperMercs/tensorfeed'],
            description:
              'Real-time AI news, model tracking, and ecosystem data for the AI industry.',
          }}
        />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'TensorFeed',
            url: 'https://tensorfeed.ai/',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://tensorfeed.ai/search?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          }}
        />
        <ThemeProvider>
          <ViewModeProvider>
            <ChromeGate>
              <LiveTicker evergreenItems={TICKER_ITEMS} />
              <TopAlertBar />
            </ChromeGate>
            <Navbar />
            <main id="main-content" className="flex-1">{children}</main>
            <ConditionalFooter />
            <ChromeGate>
              <CookieConsent />
              <AgentView />
            </ChromeGate>
          </ViewModeProvider>
        </ThemeProvider>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7224757913262984"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
