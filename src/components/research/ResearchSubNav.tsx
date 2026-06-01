'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/research', label: 'Overview' },
  { href: '/research/papers', label: 'Latest Papers' },
  { href: '/research/milestones', label: 'Milestones' },
  { href: '/research/authors', label: 'Authors' },
  { href: '/research/citation-velocity', label: 'Citation Velocity' },
  { href: '/research/topics', label: 'Emerging Topics' },
  { href: '/research/institutions', label: 'Institutions' },
  { href: '/research/conference-acceptances', label: 'Conferences' },
  { href: '/research/nlp-proceedings', label: 'NLP Papers' },
];

/**
 * Sub-navigation shared across every /research page. Mirrors the
 * existing /agents sub-nav pattern (per project memory). Highlights
 * the active route via pathname match.
 */
export default function ResearchSubNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Research sub-navigation"
      className="mb-8 -mx-4 px-4 overflow-x-auto"
    >
      <div className="flex items-center gap-1 sm:gap-2 border-b border-border pb-0">
        {NAV.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/research' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-3 py-2 text-sm font-mono transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-accent-cyan text-text-primary'
                  : 'border-transparent text-text-muted hover:text-accent-cyan'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
