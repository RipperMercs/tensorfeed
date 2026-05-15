'use client';

import { useEffect, useState } from 'react';

/**
 * Reads three URL search params used to tune the /research hub:
 *
 *   ?motion=0..3   — multiplier passed to HeroConstellation and
 *                    KnowledgeLandscape rAF speeds. 0 = freeze the
 *                    rendered scene (cheaper than reduced-motion since
 *                    no media-query gate, just no time advancement).
 *
 *   ?bg=on|off     — toggles the canvas particle field behind all
 *                    content. Off makes the page render-time leaner,
 *                    useful for low-power mobile or embeds.
 *
 *   ?palette=default|mono|vibrant
 *                  — applied via CSS `filter` on the page root so all
 *                    category colors shift uniformly without touching
 *                    the color resolution chain. mono drops saturation
 *                    to ~10%; vibrant boosts saturation and adds a small
 *                    hue rotation that warms the palette.
 *
 * Returned values are clamped + validated so a malicious or noisy URL
 * can't push the visual into a bad state. Defaults match the spec.
 */

export interface ResearchTweaks {
  motion: number;
  bg: boolean;
  palette: 'default' | 'mono' | 'vibrant';
  /** CSS filter string for the page root, '' when palette is default. */
  paletteFilter: string;
  /** Whether the hook has read the URL yet (false on SSR + first paint). */
  ready: boolean;
}

const DEFAULTS: ResearchTweaks = {
  motion: 1,
  bg: true,
  palette: 'default',
  paletteFilter: '',
  ready: false,
};

function clampMotion(raw: string | null): number {
  if (raw == null) return 1;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(3, n));
}

function parseBg(raw: string | null): boolean {
  if (raw == null) return true;
  const lc = raw.toLowerCase();
  if (lc === 'off' || lc === '0' || lc === 'false' || lc === 'no') return false;
  return true;
}

function parsePalette(raw: string | null): 'default' | 'mono' | 'vibrant' {
  if (raw === 'mono' || raw === 'vibrant') return raw;
  return 'default';
}

function filterFor(palette: 'default' | 'mono' | 'vibrant'): string {
  if (palette === 'mono') return 'saturate(0.1)';
  if (palette === 'vibrant') return 'saturate(1.35) hue-rotate(-8deg)';
  return '';
}

export function useResearchTweaks(): ResearchTweaks {
  const [tweaks, setTweaks] = useState<ResearchTweaks>(DEFAULTS);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const palette = parsePalette(params.get('palette'));
    setTweaks({
      motion: clampMotion(params.get('motion')),
      bg: parseBg(params.get('bg')),
      palette,
      paletteFilter: filterFor(palette),
      ready: true,
    });
  }, []);

  return tweaks;
}
