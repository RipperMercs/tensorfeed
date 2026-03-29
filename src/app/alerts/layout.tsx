import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Outage Alerts | Get Notified When AI Services Go Down',
  description: 'Subscribe to free email alerts when Claude, ChatGPT, Gemini, or any major AI service goes down. Instant notifications for AI outages.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
