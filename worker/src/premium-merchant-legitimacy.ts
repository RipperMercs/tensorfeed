// Merchant legitimacy verdict module. Pure deterministic rubric over five
// open-data signals: RDAP domain age, DoH DNS hygiene, crt.sh cert history,
// Majestic popularity rank, and Phishing.Database active list.

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function normalizeDomain(raw: string): string | null {
  if (!raw) return null;
  let d = raw.trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // strip scheme
  d = d.split('/')[0].split('?')[0];             // strip path and query
  d = d.split('@').pop() as string;              // strip any userinfo
  d = d.split(':')[0];                           // strip port
  if (d.startsWith('www.')) d = d.slice(4);
  return DOMAIN_RE.test(d) ? d : null;
}
