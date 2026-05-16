import type { ReactNode } from 'next';
import { Rajdhani, IBM_Plex_Mono } from 'next/font/google';

/**
 * Layout for all /widget/* embeddable surfaces.
 *
 * Site chrome (Navbar, Footer, alert bar) is already route-gated off
 * /widget/* by ChromeGate / Navbar / ConditionalFooter, so this layout
 * does not need to strip it. Its job is to load the HUD console fonts
 * reliably: next/font self-hosts the WOFF2 files at build time and
 * exposes them as CSS variables, which works in the static export and
 * removes the dependency on a body-injected @import (browsers ignore
 * @import inside a React <style>, which is why the widget previously
 * fell back to system fonts and looked nothing like the design).
 */

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--tfw-fdisp',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--tfw-fmono',
  display: 'swap',
});

export default function WidgetLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${rajdhani.variable} ${plexMono.variable}`}
      style={{ minHeight: '100%', width: '100%' }}
    >
      {children}
    </div>
  );
}
