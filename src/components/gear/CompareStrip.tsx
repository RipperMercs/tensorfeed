/**
 * Persistent CTA at the bottom of the product grid for the (future) compare
 * page. Renders as a div with aria-disabled until /gear/compare exists.
 */
export default function CompareStrip() {
  return (
    <div className="compare-strip" aria-disabled="true">
      <div className="cs-left">
        <span className="cs-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </span>
        <div>
          <h4>Need to compare side-by-side?</h4>
          <p>
            Build a custom comparison across VRAM, memory bandwidth, on-device
            LLM ceiling, and street price.
          </p>
        </div>
      </div>
      <span
        className="cta-btn primary"
        aria-disabled="true"
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
      >
        Compare (coming soon)
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    </div>
  );
}
