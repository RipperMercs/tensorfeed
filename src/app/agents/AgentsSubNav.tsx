'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, ShieldCheck, Wallet } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: (pathname: string) => boolean;
}

// Self-directory entry (/agents/hireable) intentionally omitted from the
// nav, parked 2026-05-13 for zero buyer demand; reachable by direct URL.
// Revisit nav inclusion as a product decision, not a styling one.
const NAV: NavItem[] = [
  {
    href: '/agents',
    label: 'Directory',
    icon: Bot,
    isActive: (p) => p === '/agents',
  },
  {
    href: '/agents/leaderboard',
    label: 'Trust Feed',
    icon: ShieldCheck,
    isActive: (p) =>
      p === '/agents/leaderboard' || p.startsWith('/agents/profile'),
  },
  {
    href: '/agents/claim',
    label: 'Claim Wallet',
    icon: Wallet,
    isActive: (p) => p === '/agents/claim',
  },
];

export default function AgentsSubNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav
      aria-label="TensorFeed Jobs"
      className="border-b border-border bg-bg-secondary/40 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 py-2">
          <Link
            href="/agents"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-accent-primary"
            aria-label="TensorFeed Jobs home"
          >
            <span className="live-dot" />
            TF Jobs
          </Link>
          <ul className="flex items-center gap-1 sm:gap-2 overflow-x-auto text-sm">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.isActive(pathname);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                      active
                        ? 'bg-accent-primary/15 text-accent-primary'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
