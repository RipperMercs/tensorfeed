'use client';

import { usePathname } from 'next/navigation';

/**
 * Suppresses all wrapped chrome (LiveTicker, StatusAlertBar, CookieConsent,
 * etc.) on /widget/* routes so embeddable iframe surfaces render bare.
 * Pairs with the Navbar + ConditionalFooter route checks; this single
 * gate covers everything else from layout.tsx.
 */
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/widget')) return null;
  return <>{children}</>;
}
