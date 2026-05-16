import type { ReactNode } from 'react';
import { Rajdhani, IBM_Plex_Mono } from 'next/font/google';
import './status/tensorfeed.css';

/**
 * Layout for all /widget/* embeddable surfaces.
 *
 * Site chrome (Navbar, Footer, alert bar) is already route-gated off
 * /widget/* by ChromeGate / Navbar / ConditionalFooter, so this layout
 * does not strip it. Its jobs:
 *  1. Load the HUD console fonts via next/font (self-hosted WOFF2 at
 *     build, works in static export). The design CSS reads
 *     --tf-font-display / --tf-font-mono; next/font sets exactly those.
 *  2. Drop in the design stylesheet (tensorfeed.css, .tf-* namespaced,
 *     zero host leakage). The bundle's @import was removed since the
 *     fonts are now self-hosted here.
 */

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--tf-font-display',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--tf-font-mono',
  display: 'swap',
});

export default function WidgetLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${rajdhani.variable} ${ibmPlexMono.variable}`}
      style={{ minHeight: '100%', width: '100%' }}
    >
      {children}
    </div>
  );
}
