import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Provisioning Support: Who Ships the Cloudflare-Stripe Protocol',
  description:
    'Live tracker of providers that support the Cloudflare-Stripe agent provisioning protocol shipped April 30, 2026. AI agents can self-serve onto Cloudflare, Vercel, Supabase, PlanetScale, Clerk, Sentry, PostHog, Inngest, Hugging Face today. Neon, Turso, Auth0, WorkOS, Stytch, Netlify, Fly are conspicuously missing.',
  alternates: { canonical: 'https://tensorfeed.ai/agent-provisioning' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agent-provisioning',
    title: 'Agent Provisioning Support Tracker',
    description:
      'Who ships the Cloudflare-Stripe agent provisioning protocol, who has not. Hosting, database, auth, observability, background jobs, AI infrastructure.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Provisioning Support Tracker',
    description: 'Live status of every provider on the Cloudflare-Stripe protocol launch list.',
  },
};

export default function AgentProvisioningLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
