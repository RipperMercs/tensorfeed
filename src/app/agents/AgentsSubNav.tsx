'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Trophy, Wallet } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: (pathname: string) => boolean;
}

// Self-directory entry (/agents/hireable) intentionally omitted — parked
// 2026-05-13; reachable by direct URL only until a real demand signal fires.
const NAV: NavItem[] = [
  {
    href: '/agents',
    label: 'Catalog',
    icon: Bot,
    isActive: (p) => p === '/agents',
  },
  {
    href: '/agents/leaderboard',
    label: 'Reputation',
    icon: Trophy,
    isActive: (p) => p === '/agents/leaderboard' || p.startsWith('/agents/profile'),
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
    <nav aria-label="Agent surfaces" className="border-b border-border bg-bg-secondary/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 text-sm">
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
    </nav>
  );
}
