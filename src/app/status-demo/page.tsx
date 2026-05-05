import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import StatusGrid, { type StatusGridService } from '@/components/home/StatusGrid';

// Visual-test page for the status-grid alert states. Renders three
// hardcoded cards (OK, WARN, DOWN) so the alert visuals can be
// reviewed without waiting for a real provider to degrade. NOT in
// sitemap, NOT in llms.txt, NOT linked from anywhere - reachable
// only by typing /status-demo. Safe to leave on prod as a reference
// surface; obvious "DEMO" banner makes the simulation explicit.

export const metadata: Metadata = {
  title: 'Status Alert Demo (visual reference)',
  description:
    'Visual reference for the TensorFeed status-grid alert states (OK / WARN / DOWN). Services are simulated.',
  robots: { index: false, follow: false },
};

// Generate believable sparkline series for each demo card. Same shape
// as the real grid, different value ranges so OK reads calm, WARN
// reads variable, DOWN reads dead-flat.
function spark(seed: number, base: number, variance: number, dropAt?: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    const trig = Math.sin((seed + i) * 0.55);
    const drift = ((seed * (i + 1)) % 11) - 5;
    let v = base + trig * variance * 0.4 + drift * (variance / 12);
    if (dropAt !== undefined && i >= dropAt) v = 0;
    out.push(Math.max(0, Math.round(v)));
  }
  return out;
}

const DEMO_SERVICES: StatusGridService[] = [
  // OK — calm green pill, neutral background, gentle sparkline
  {
    id: 'demo-ok-1',
    name: 'Claude (demo OK)',
    status: 'ok',
    latency: 142,
    lastCheck: '12s ago',
    spark: spark(101, 145, 30),
    href: '/is-claude-down',
  },
  {
    id: 'demo-ok-2',
    name: 'OpenAI (demo OK)',
    status: 'ok',
    latency: 89,
    lastCheck: '8s ago',
    spark: spark(87, 92, 22),
    href: '/is-chatgpt-down',
  },
  // WARN — amber gradient fill, soft glow, static (no pulse)
  {
    id: 'demo-warn-1',
    name: 'Gemini (demo DEGRADED)',
    status: 'warn',
    latency: 432,
    lastCheck: '11s ago',
    spark: spark(50, 280, 180),
    href: '/is-gemini-down',
  },
  {
    id: 'demo-warn-2',
    name: 'Bedrock (demo DEGRADED)',
    status: 'warn',
    latency: 510,
    lastCheck: '15s ago',
    spark: spark(33, 350, 220),
    href: '/is-bedrock-down',
  },
  // DOWN — red gradient fill, harder glow, slow 2.2s pulse loop
  {
    id: 'demo-down-1',
    name: 'Mistral (demo DOWN)',
    status: 'down',
    latency: 0,
    lastCheck: '4s ago',
    spark: spark(11, 220, 80, 18),
    href: '/is-mistral-down',
  },
  {
    id: 'demo-down-2',
    name: 'DeepSeek (demo DOWN)',
    status: 'down',
    latency: 0,
    lastCheck: '6s ago',
    spark: spark(70, 200, 60, 16),
    href: '/is-deepseek-down',
  },
];

export default function StatusDemoPage() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to TensorFeed
      </Link>

      {/* DEMO banner so this page can never be mistaken for a real outage */}
      <div
        role="alert"
        className="flex items-center gap-3 rounded-lg border px-4 py-3 mb-8"
        style={{
          background: 'rgba(245,158,11,0.08)',
          borderColor: 'rgba(245,158,11,0.30)',
          color: 'var(--accent-amber)',
        }}
      >
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div className="text-sm">
          <strong>Visual reference page.</strong>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            All services on this page are simulated. The real status feed lives at{' '}
            <Link href="/status" className="text-accent-primary hover:underline">
              /status
            </Link>{' '}
            and the homepage status grid. This page exists so the OK / DEGRADED / DOWN alert
            visuals can be reviewed without waiting for a real provider to fail.
          </span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-text-primary mb-3">Status Grid Alert States</h1>
      <p className="text-text-secondary mb-8 max-w-2xl">
        Six demo cards covering each visual tier. OK stays neutral. WARN fills with an amber
        gradient, gets a 3px amber edge, and a soft static glow. DOWN fills red, gets a stronger
        glow, and slow-pulses on a 2.2-second loop (with a static fallback for users who have
        prefers-reduced-motion enabled).
      </p>

      <StatusGrid services={DEMO_SERVICES} />

      <div className="mt-10 text-sm text-text-muted">
        <p>
          The site-wide{' '}
          <span style={{ color: 'var(--accent-amber)' }}>amber</span> /{' '}
          <span style={{ color: 'var(--accent-red)' }}>red</span> StatusAlertBar at the top of
          every page is driven by the live{' '}
          <Link href="/api/status" className="text-accent-primary hover:underline">
            /api/status
          </Link>{' '}
          endpoint and is not simulated here. To see the bar in alert mode you would need a real
          provider to degrade or go down.
        </p>
      </div>
    </div>
  );
}
