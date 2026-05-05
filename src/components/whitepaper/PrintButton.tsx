'use client';

import { Download } from 'lucide-react';

/**
 * Client-side button that triggers the browser's Save-as-PDF flow via
 * window.print(). The whitepaper page applies a print stylesheet that
 * normalizes typography and hides chrome, so the printed output is
 * publication-grade. Lives as its own client component so the page
 * shell stays a server component (preserves metadata export).
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-3 py-2 bg-accent-primary text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
    >
      <Download className="w-4 h-4" />
      Save as PDF
    </button>
  );
}
