export const SITE_NAME = 'TensorFeed.ai';
export const SITE_URL = 'https://tensorfeed.ai';
export const SITE_DESCRIPTION = 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.';
export const PUBLISHER = 'Pizza Robot Studios LLC';
export const CONTACT_EMAIL = 'evan@pizzarobotstudios.com';

export const NAV_LINKS = [
  { href: '/', label: 'Feed' },
  { href: '/models', label: 'Models' },
  { href: '/agents', label: 'Agents' },
  { href: '/research', label: 'Research' },
  { href: '/status', label: 'Status' },
  { href: '/live', label: 'Live' },
  { href: '/originals', label: 'Originals' },
] as const;

export const CATEGORIES = [
  'All',
  'Anthropic/Claude',
  'OpenAI',
  'Google/Gemini',
  'Meta/Llama',
  'Open Source',
  'Startups',
  'Hardware/Chips',
  'Policy & Safety',
  'Tools & Dev',
] as const;

export const SISTER_SITES = [
  { name: 'TerminalFeed.io', url: 'https://terminalfeed.io', description: 'Real-Time Data Dashboard', icon: '📺' },
  { name: 'VR.org', url: 'https://vr.org', description: 'VR & AR News', icon: '🥽' },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  operational: 'text-accent-green',
  degraded: 'text-accent-amber',
  down: 'text-accent-red',
  unknown: 'text-text-muted',
};

export const STATUS_DOTS: Record<string, string> = {
  operational: 'bg-accent-green',
  degraded: 'bg-accent-amber',
  down: 'bg-accent-red',
  unknown: 'bg-text-muted',
};
