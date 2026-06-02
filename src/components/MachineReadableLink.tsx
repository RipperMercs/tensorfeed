import { Braces } from 'lucide-react';

/**
 * Small visible affordance that advertises a catalog page's machine-readable
 * JSON twin: the same data agents consume, one click away. Reinforces the
 * machine-readable-first thesis and gives humans and crawlers a direct link to
 * the endpoint. The Dataset JSON-LD on the same page also encodes this endpoint
 * as a schema.org distribution, so the twin is discoverable structurally too.
 */
export default function MachineReadableLink({
  endpoint,
  label = 'Machine-readable JSON',
  className = '',
}: {
  endpoint: string;
  label?: string;
  className?: string;
}) {
  const href = endpoint.startsWith('http') ? endpoint : `https://tensorfeed.ai${endpoint}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-accent-primary transition-colors ${className}`}
      aria-label={`${label}: ${endpoint}`}
    >
      <Braces className="w-3.5 h-3.5" />
      <span>{label}</span>
      <span className="text-text-muted/70">{endpoint}</span>
    </a>
  );
}
