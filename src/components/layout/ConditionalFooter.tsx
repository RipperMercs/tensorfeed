'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

/**
 * Suppresses the global Footer on the homepage so the new SourceLogosFooter
 * (rendered inside src/app/page.tsx) is the only footer the user sees there.
 * Every other route keeps the original Footer.
 */
export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return <Footer />;
}
