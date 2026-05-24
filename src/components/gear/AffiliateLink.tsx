import { ReactNode } from 'react';
import { Cta } from '@/data/gear/types';

/**
 * Single source of truth for outbound product links. Adds the affiliate tag
 * at build time and stamps the correct rel attribute per Google's documented
 * signal for monetized links.
 *
 * Tag is sourced from NEXT_PUBLIC_AMAZON_AFFILIATE_TAG. The NEXT_PUBLIC_
 * prefix is required for static-export builds where env vars are inlined at
 * compile time. The tag is intentionally publicly visible in the final HTML;
 * the value is not a secret.
 */

interface Props {
  cta: Cta;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  /** Optional analytics attribute (data-link-kind) override. */
  linkKind?: 'affiliate' | 'direct';
}

function appendAmazonTag(url: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? '';
  if (!tag) return url;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('amazon.com') || u.hostname.endsWith('amazon.co.uk')) {
      u.searchParams.set('tag', tag);
      return u.toString();
    }
  } catch {
    // fallthrough: return original
  }
  return url;
}

export default function AffiliateLink({
  cta,
  className,
  children,
  ariaLabel,
  linkKind,
}: Props) {
  const isAffiliate = cta.affiliate === true && cta.kind === 'amazon';
  const href = isAffiliate ? appendAmazonTag(cta.url) : cta.url;
  const rel = isAffiliate
    ? 'sponsored noopener noreferrer'
    : 'noopener noreferrer';
  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className={className}
      aria-label={ariaLabel}
      data-link-kind={linkKind ?? (isAffiliate ? 'affiliate' : 'direct')}
    >
      {children}
    </a>
  );
}
