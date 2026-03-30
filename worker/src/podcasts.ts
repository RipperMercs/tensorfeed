import { Env, PodcastEpisode, PodcastSource } from './types';

const PODCAST_SOURCES: PodcastSource[] = [
  { id: 'ai-daily-brief', name: 'AI Daily Brief', feedUrl: 'https://anchor.fm/s/d2e54928/podcast/rss', active: true },
  { id: 'practical-ai', name: 'Practical AI', feedUrl: 'https://changelog.com/practicalai/feed', active: true },
  { id: 'latent-space', name: 'Latent Space', feedUrl: 'https://api.substack.com/feed/podcast/1084089.rss', active: true },
  { id: 'last-week-in-ai', name: 'Last Week in AI', feedUrl: 'https://feeds.buzzsprout.com/2021966.rss', active: true },
];

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function extractFromXml(xml: string, tag: string): string {
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, ' - ')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

function extractEnclosureUrl(itemXml: string): string {
  const match = itemXml.match(/<enclosure[^>]*url="([^"]*)"[^>]*>/i);
  return match ? match[1] : '';
}

function extractItunesDuration(itemXml: string): string {
  const duration = extractFromXml(itemXml, 'itunes:duration');
  if (!duration) return '';

  // If already in HH:MM:SS or MM:SS format, return as-is
  if (duration.includes(':')) return duration;

  // Convert seconds to MM:SS or HH:MM:SS
  const totalSeconds = parseInt(duration, 10);
  if (isNaN(totalSeconds)) return duration;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function extractItunesImage(itemXml: string, channelXml: string): string {
  // Try item-level image first
  let img = extractAttribute(itemXml, 'itunes:image', 'href');
  if (img) return img;

  // Fall back to channel-level image
  img = extractAttribute(channelXml, 'itunes:image', 'href');
  if (img) return img;

  // Try <image><url> tag
  const imageBlock = extractFromXml(channelXml, 'image');
  if (imageBlock) {
    const url = extractFromXml(imageBlock, 'url');
    if (url) return url;
  }

  return '';
}

async function fetchPodcastFeed(source: PodcastSource, channelXmlCache: Map<string, string>): Promise<PodcastEpisode[]> {
  try {
    const response = await fetch(source.feedUrl, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`Podcast ${source.name}: HTTP ${response.status}`);
      return [];
    }

    const xml = await response.text();
    channelXmlCache.set(source.id, xml);

    const now = new Date().toISOString();
    const items = xml.split(/<item>/i).slice(1);
    const episodes: PodcastEpisode[] = [];

    for (const item of items) {
      if (episodes.length >= 20) break;

      const title = stripHtml(extractFromXml(item, 'title'));
      const link = extractFromXml(item, 'link') || extractFromXml(item, 'guid');
      const audioUrl = extractEnclosureUrl(item);
      const pubDate = extractFromXml(item, 'pubDate');
      const duration = extractItunesDuration(item);
      const description = stripHtml(
        extractFromXml(item, 'itunes:summary') ||
        extractFromXml(item, 'description') ||
        extractFromXml(item, 'content:encoded')
      );
      const podcastImage = extractItunesImage(item, xml);

      if (!title || !audioUrl) continue;

      episodes.push({
        id: hashString(audioUrl || link),
        podcastName: source.name,
        podcastImage,
        title,
        description: truncate(description, 300),
        url: link || audioUrl,
        audioUrl,
        duration,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : now,
        fetchedAt: now,
      });
    }

    return episodes;
  } catch (error) {
    console.warn(`Podcast ${source.name}: fetch failed -`, error);
    return [];
  }
}

export async function pollPodcastFeeds(env: Env): Promise<void> {
  console.log(`Podcast poll starting - ${PODCAST_SOURCES.filter(s => s.active).length} sources`);

  const activeSources = PODCAST_SOURCES.filter(s => s.active);
  const channelXmlCache = new Map<string, string>();
  const results = await Promise.allSettled(
    activeSources.map(s => fetchPodcastFeed(s, channelXmlCache))
  );

  const allEpisodes: PodcastEpisode[] = [];
  let successCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allEpisodes.push(...result.value);
      successCount++;
    }
  }

  // Deduplicate by audio URL
  const seen = new Set<string>();
  const deduped = allEpisodes.filter(ep => {
    if (seen.has(ep.audioUrl)) return false;
    seen.add(ep.audioUrl);
    return true;
  });

  // Sort by date, newest first
  deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Interleave: AI Daily Brief gets priority (every other slot), rest fill in between
  const priority = deduped.filter(ep => ep.podcastName === 'AI Daily Brief');
  const rest = deduped.filter(ep => ep.podcastName !== 'AI Daily Brief');
  const interleaved: PodcastEpisode[] = [];
  let pi = 0, ri = 0;
  while (interleaved.length < 100 && (pi < priority.length || ri < rest.length)) {
    if (pi < priority.length) interleaved.push(priority[pi++]);
    if (ri < rest.length) interleaved.push(rest[ri++]);
  }

  const final = interleaved.slice(0, 100);

  await env.TENSORFEED_CACHE.put('podcasts', JSON.stringify(final), {
    metadata: { count: final.length, sources: successCount, updatedAt: new Date().toISOString() },
  });

  console.log(`Podcast poll complete - ${final.length} episodes from ${successCount}/${activeSources.length} sources`);
}
