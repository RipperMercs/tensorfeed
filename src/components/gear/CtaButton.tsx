import { Cta } from '@/data/gear/types';
import AffiliateLink from './AffiliateLink';

interface Props {
  cta: Cta;
  variant?: 'primary' | 'secondary' | 'product';
}

/**
 * The amber/cyan distinction is the FTC-required visual cue: amber means
 * "we earn on this click", cyan means "we do not". The colors come from
 * the .amazon and .direct classes in gear.css; this component just wires
 * the kind through to the right class and the AffiliateLink wrapper.
 */
export default function CtaButton({ cta, variant = 'product' }: Props) {
  const icon =
    cta.kind === 'amazon' ? (
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <path d="M3 7l9 5 9-5M3 7v10l9 5 9-5V7M3 7l9-5 9 5" />
      </svg>
    ) : (
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <path d="M7 17L17 7M9 7h8v8" />
      </svg>
    );

  const baseClass =
    variant === 'product'
      ? `pc-cta ${cta.kind}`
      : variant === 'primary'
        ? 'cta-btn primary'
        : 'cta-btn secondary';

  const ariaLabel = cta.kind === 'amazon' ? `${cta.label} on Amazon` : cta.label;

  return (
    <AffiliateLink cta={cta} className={baseClass} ariaLabel={ariaLabel}>
      {cta.label}
      {icon}
    </AffiliateLink>
  );
}
