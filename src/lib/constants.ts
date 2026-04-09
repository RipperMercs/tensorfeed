export const SITE_NAME = 'TensorFeed.ai';
export const SITE_URL = 'https://tensorfeed.ai';
export const SITE_DESCRIPTION = 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.';
export const PUBLISHER = 'TensorFeed.ai';
export const CONTACT_EMAIL = 'feedback@tensorfeed.ai';
export const PRESS_EMAIL = 'press@tensorfeed.ai';

export const NAV_LINKS = [
  { href: '/status', label: 'Status' },
  { href: '/', label: 'Feed' },
  { href: '/today', label: 'Today' },
  { href: '/models', label: 'Models' },
  { href: '/compare', label: 'Compare' },
  { href: '/benchmarks', label: 'Benchmarks' },
  { href: '/agents', label: 'Agents' },
  { href: '/podcasts', label: 'Podcasts' },
  { href: '/originals', label: 'Originals' },
  { href: '/live', label: 'Live' },
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
  { name: 'Phreak.fm', url: 'https://phreak.fm', description: 'Signals, Frequencies, Culture', icon: '📡' },
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
