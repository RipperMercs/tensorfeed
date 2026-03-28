'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Zap } from 'lucide-react';
import { NAV_LINKS } from '@/lib/constants';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="font-mono text-lg">
              <span className="font-bold text-text-primary">TENSOR</span>
              <span className="font-normal text-text-secondary">FEED</span>
            </span>
            <span className="text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-gradient-to-r from-accent-primary to-accent-cyan text-bg-primary leading-none">
              .ai
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'text-accent-primary bg-accent-primary/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/api/agents/news"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-accent-primary/40 text-accent-primary hover:bg-accent-primary/10 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Agent API
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-bg-primary/95 backdrop-blur-md">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded text-sm transition-colors ${
                    isActive
                      ? 'text-accent-primary bg-accent-primary/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/api/agents/news"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-mono text-accent-primary hover:bg-accent-primary/10 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Agent API
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
