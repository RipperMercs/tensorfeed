export interface TensorfeedStatusOptions {
  /** Accent scheme. Default "blue" (light-blue spine, green status).
   *  "auto" greens the whole accent when all systems are nominal.
   *  "green" forces green. */
  accent?: 'blue' | 'auto' | 'green';
  /** Client poll interval in seconds (5 to 600). Default 30. */
  poll?: number;
}

/** Build the widget iframe URL with clean, default-aware query params. */
export function tensorfeedStatusSrc(opts?: TensorfeedStatusOptions): string;

/** Register the <tensorfeed-status> custom element. Idempotent; a no-op
 *  in non-DOM (SSR) environments. Called automatically on import. */
export function defineTensorFeedStatus(tag?: string): void;

/** The custom element class, exported for advanced registration. */
export class TensorFeedStatus extends HTMLElement {}
