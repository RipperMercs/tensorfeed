'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Menu, X, Zap, Search, ChevronDown } from 'lucide-react';
import { NAV_LINKS } from '@/lib/constants';

const GUIDE_LINKS = [
  { href: '/what-is-ai', label: 'What is AI?' },
  { href: '/best-ai-tools', label: 'Best AI Tools' },
  { href: '/best-ai-chatbots', label: 'Best AI Chatbots' },
  { href: '/ai-api-pricing-guide', label: 'AI API Pricing Guide' },
  { href: '/what-are-ai-agents', label: 'What are AI Agents?' },
  { href: '/best-open-source-llms', label: 'Best Open Source LLMs' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const guidesRef = useRef<HTMLDivElement>(null);

  // Close guides dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (guidesRef.current && !guidesRef.current.contains(event.target as Node)) {
        setGuidesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isGuideActive = GUIDE_LINKS.some((link) => pathname.startsWith(link.href));

  return (
    <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 shrink-0 hover:opacity-80 transition-opacity">
            <span className="font-mono text-xl">
              <span className="font-bold text-text-primary">TENSOR</span>
              <span className="font-normal text-text-secondary">FEED</span>
            </span>
            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gradient-to-r from-accent-primary to-accent-cyan text-bg-primary leading-none">
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

              const isStatus = link.href === '/status';

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {link.label}
                    {isStatus && <span className="live-dot" />}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-gradient-to-r from-accent-primary to-accent-cyan" />
                  )}
                </Link>
              );
            })}

            {/* Guides dropdown */}
            <div className="relative" ref={guidesRef}>
              <button
                onClick={() => setGuidesOpen(!guidesOpen)}
                className={`relative flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  isGuideActive
                    ? 'text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                Guides
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${guidesOpen ? 'rotate-180' : ''}`} />
                {isGuideActive && (
                  <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-gradient-to-r from-accent-primary to-accent-cyan" />
                )}
              </button>
              {guidesOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-bg-primary/95 backdrop-blur-md shadow-lg py-1 z-50">
                  {GUIDE_LINKS.map((guide) => {
                    const isActive = pathname.startsWith(guide.href);
                    return (
                      <Link
                        key={guide.href}
                        href={guide.href}
                        onClick={() => setGuidesOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isActive
                            ? 'text-accent-primary bg-accent-primary/10'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                        }`}
                      >
                        {guide.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Search icon */}
            <button
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

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
      <div
        className={`md:hidden border-t border-border bg-bg-primary/95 backdrop-blur-md overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 border-t-0'
        }`}
      >
        <div className="px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);

            const isStatus = link.href === '/status';

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`relative block px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {link.label}
                  {isStatus && <span className="live-dot" />}
                </span>
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-gradient-to-b from-accent-primary to-accent-cyan" />
                )}
              </Link>
            );
          })}

          {/* Guides section in mobile */}
          <div className="pt-2 pb-1 px-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-secondary/60">Guides</span>
          </div>
          {GUIDE_LINKS.map((guide) => {
            const isActive = pathname.startsWith(guide.href);
            return (
              <Link
                key={guide.href}
                href={guide.href}
                onClick={() => setMobileOpen(false)}
                className={`relative block px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                {guide.label}
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-gradient-to-b from-accent-primary to-accent-cyan" />
                )}
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
    </nav>
  );
}
