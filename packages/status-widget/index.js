/**
 * @tensorfeed/status-widget
 *
 * The live TensorFeed AI status monitor, as a zero-dependency, framework
 * agnostic custom element plus a tiny helper. The widget itself is a
 * fully self-contained page at tensorfeed.ai/widget/status; this package
 * just makes embedding it a one-liner and keeps the query params honest.
 *
 * HTML / any framework:
 *   import '@tensorfeed/status-widget';
 *   <tensorfeed-status accent="blue" poll="30" height="600"></tensorfeed-status>
 *
 * React (no custom element needed):
 *   import { tensorfeedStatusSrc } from '@tensorfeed/status-widget';
 *   <iframe src={tensorfeedStatusSrc({ accent: 'blue' })}
 *           title="TensorFeed live AI status"
 *           style={{ width: '100%', height: 600, border: 0, maxWidth: 720 }} />
 */

const BASE = 'https://tensorfeed.ai/widget/status';

/**
 * Build the widget iframe URL. Mirrors the widget's own defaults so the
 * URL stays clean: accent defaults to blue, poll to 30s; only
 * non-defaults are added as query params.
 */
export function tensorfeedStatusSrc(opts = {}) {
  const params = new URLSearchParams();
  const accent = String(opts.accent || 'blue').toLowerCase();
  if (accent === 'auto' || accent === 'green') params.set('accent', accent);
  const poll = Number(opts.poll);
  if (Number.isFinite(poll) && poll >= 5 && poll <= 600 && poll !== 30) {
    params.set('poll', String(Math.round(poll)));
  }
  params.set('utm_source', 'npm');
  params.set('utm_medium', 'component');
  return `${BASE}?${params.toString()}`;
}

function resolveHeight(h) {
  if (h == null || h === '') return '600px';
  const s = String(h);
  if (/^\d+$/.test(s)) return `${s}px`;
  // Only accept a plain CSS length (number plus a known unit). Anything else
  // falls back to the default so a host-set attribute cannot inject into the
  // shadow-root style block.
  return /^\d+(\.\d+)?(px|%|r?em|vh|vw)$/.test(s) ? s : '600px';
}

// Guarded base so `import`-ing this package never throws in Node / SSR
// (Next.js, etc.) where HTMLElement does not exist. The element only
// actually does anything once defineTensorFeedStatus runs in a browser.
const ElementBase = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};

class TensorFeedStatus extends ElementBase {
  static get observedAttributes() {
    return ['accent', 'poll', 'height', 'label'];
  }

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this._render();
  }

  _render() {
    const src = tensorfeedStatusSrc({
      accent: this.getAttribute('accent'),
      poll: this.getAttribute('poll'),
    });
    const height = resolveHeight(this.getAttribute('height'));
    const label = this.getAttribute('label') || 'TensorFeed live AI status';
    // Shadow DOM keeps host page CSS from touching the iframe and vice
    // versa. The widget brings all its own styling.
    this.shadowRoot.innerHTML =
      `<style>:host{display:block;width:100%}` +
      `iframe{display:block;width:100%;max-width:720px;height:${height};border:0;` +
      `border-radius:6px 28px 28px 6px;overflow:hidden}</style>` +
      `<iframe src="${src}" title="${label.replace(/"/g, '&quot;')}" ` +
      `loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }
}

/**
 * Register the <tensorfeed-status> custom element. Safe to call more
 * than once and a no-op in non-DOM environments (SSR).
 */
export function defineTensorFeedStatus(tag = 'tensorfeed-status') {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (!customElements.get(tag)) customElements.define(tag, TensorFeedStatus);
}

// Importing the package auto-registers the element (declared as a side
// effect in package.json). React-only users can ignore this and use
// tensorfeedStatusSrc directly.
defineTensorFeedStatus();

export { TensorFeedStatus };
