import Link from 'next/link';

/**
 * FTC-required affiliate disclosure strip. Renders above the fold on every
 * /gear surface (hub + each category page). The amber left border + DISCLOSURE
 * label make it visually distinct from regular copy.
 */
export default function Disclosure() {
  return (
    <div className="disclosure" role="note">
      <span className="ds-tag">DISCLOSURE</span>
      <span>
        TensorFeed earns a commission on qualifying Amazon purchases. Non-Amazon
        products are linked without affiliate codes. Picks are made first, the
        commerce arrangement comes after. See our{' '}
        <Link href="/gear/policy">affiliate policy</Link> for the full receipt.
      </span>
    </div>
  );
}
