'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

/**
 * Suppresses the global Footer on:
 *   - the homepage (SourceLogosFooter inside src/app/page.tsx is the
 *     only footer there)
 *   - any /widget/* route (embeddable iframe surfaces have no chrome
 *     so host sites get a clean drop-in)
 * Every other route keeps the original Footer.
 */
export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  if (pathname.startsWith('/widget')) return null;
  return <Footer />;
}
