import Link from 'next/link';
import { SISTER_SITES, CONTACT_EMAIL } from '@/lib/constants';
import NewsletterSignup from '@/components/NewsletterSignup';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Left: Publisher info */}
          <div>
            <p className="text-sm text-text-secondary">
              A{' '}
              <span className="text-text-primary font-medium">
                Pizza Robot Studios
              </span>{' '}
              Project
            </p>
            <p className="text-xs text-text-muted mt-1">
              &copy; 2026 Pizza Robot Studios LLC. All rights reserved.
            </p>
          </div>

          {/* Middle: Site links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 sm:justify-center">
            <Link
              href="/about"
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Privacy
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Contact
            </a>
            <a
              href="https://x.com/tensorfeed"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              @tensorfeed
            </a>
          </div>

          {/* Right: Sister sites */}
          <div className="sm:text-right">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
              Sister Sites
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
              {SISTER_SITES.map((site) => (
                <a
                  key={site.url}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-primary hover:text-accent-cyan transition-colors"
                >
                  {site.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-8 pt-4 border-t border-border">
          <div className="max-w-sm mx-auto">
            <NewsletterSignup variant="footer" />
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="mt-4 pt-4 border-t border-border text-center">
          <p className="text-xs text-text-muted">
            Designed for humans and AI agents
          </p>
        </div>
      </div>
    </footer>
  );
}
