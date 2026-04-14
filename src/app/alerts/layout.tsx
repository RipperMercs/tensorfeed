import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Outage Alerts | Get Notified When AI Services Go Down',
  description: 'Subscribe to free email alerts when Claude, ChatGPT, Gemini, or any major AI service goes down. Instant notifications for AI outages.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/alerts',
    title: 'AI Outage Alerts | Get Notified When AI Services Go Down',
    description: 'Subscribe to free email alerts when Claude, ChatGPT, Gemini, or any major AI service goes down. Instant notifications for AI outages.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Outage Alerts | Get Notified When AI Services Go Down',
    description: 'Subscribe to free email alerts when Claude, ChatGPT, Gemini, or any major AI service goes down. Instant notifications for AI outages.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
