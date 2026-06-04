interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebsiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TensorFeed.ai',
    url: 'https://tensorfeed.ai',
    description: 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.',
    publisher: {
      '@type': 'Organization',
      name: 'TensorFeed.ai',
      url: 'https://tensorfeed.ai',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://tensorfeed.ai/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return <JsonLd data={data} />;
}

export function WebApplicationJsonLd({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    publisher: {
      '@type': 'Organization',
      name: 'TensorFeed.ai',
      url: 'https://tensorfeed.ai',
    },
  };

  return <JsonLd data={data} />;
}

export function DatasetJsonLd({
  name,
  description,
  url,
  jsonUrl,
  keywords,
  license,
}: {
  name: string;
  description: string;
  url: string;
  /** Relative or absolute URL of the machine-readable JSON twin. Emitted as a schema.org distribution (DataDownload). */
  jsonUrl?: string;
  keywords?: string[];
  license?: string;
}) {
  const abs = (u: string) => (u.startsWith('http') ? u : `https://tensorfeed.ai${u}`);
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url,
    license: license || 'https://tensorfeed.ai/about',
    isAccessibleForFree: true,
    creator: {
      '@type': 'Organization',
      name: 'TensorFeed.ai',
      url: 'https://tensorfeed.ai',
    },
  };
  if (keywords && keywords.length) data.keywords = keywords;
  if (jsonUrl) {
    data.distribution = [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: abs(jsonUrl),
      },
    ];
  }

  return <JsonLd data={data} />;
}

export function ItemListJsonLd({
  name,
  description,
  url,
  items,
}: {
  name: string;
  description?: string;
  url?: string;
  items: { name: string; url?: string }[];
}) {
  const abs = (u: string) => (u.startsWith('http') ? u : `https://tensorfeed.ai${u}`);
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.url ? { url: abs(it.url) } : {}),
    })),
  };
  if (description) data.description = description;
  if (url) data.url = url;

  return <JsonLd data={data} />;
}

export function FAQPageJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
  return <JsonLd data={data} />;
}

export function SoftwareApplicationJsonLd({
  name,
  description,
  url,
  provider,
  providerUrl,
  offers,
}: {
  name: string;
  description: string;
  url: string;
  provider: string;
  providerUrl: string;
  offers?: { price: string; priceCurrency: string; description: string };
}) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: 'AI Model',
    operatingSystem: 'Cloud API',
    provider: {
      '@type': 'Organization',
      name: provider,
      url: providerUrl,
    },
  };

  if (offers) {
    data.offers = {
      '@type': 'Offer',
      price: offers.price,
      priceCurrency: offers.priceCurrency,
      description: offers.description,
    };
  }

  return <JsonLd data={data} />;
}

const AUTHOR_SLUGS: Record<string, string> = {
  'Adrian Vale': 'adrian-vale',
  'Kira Nolan': 'kira-nolan',
  'Marcus Chen': 'marcus-chen',
};

function authorUrlFor(name: string): string {
  const slug = AUTHOR_SLUGS[name];
  return slug ? `https://tensorfeed.ai/authors/${slug}` : 'https://tensorfeed.ai/authors';
}

export function ArticleJsonLd({
  title,
  description,
  datePublished,
  dateModified,
  author = 'Adrian Vale',
  url,
  image,
}: {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url?: string;
  image?: string;
}) {
  const articleImage = image || 'https://tensorfeed.ai/tensorfeed-logo.png';
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description,
    author: {
      '@type': 'Person',
      name: author,
      url: authorUrlFor(author),
    },
    publisher: {
      '@type': 'Organization',
      name: 'TensorFeed.ai',
      url: 'https://tensorfeed.ai',
      logo: {
        '@type': 'ImageObject',
        url: 'https://tensorfeed.ai/tensorfeed-logo.png',
        width: 1024,
        height: 1024,
      },
    },
    datePublished,
    dateModified: dateModified || datePublished,
    image: [articleImage],
  };

  if (url) {
    data.mainEntityOfPage = {
      '@type': 'WebPage',
      '@id': url,
    };
    data.url = url;
  }

  return <JsonLd data={data} />;
}

/**
 * BreadcrumbListJsonLd: emits the schema.org BreadcrumbList Google
 * uses to render breadcrumb trails in search results. Pass an ordered
 * list of { name, url } pairs from root to current page.
 *
 * Example:
 *   <BreadcrumbListJsonLd items={[
 *     { name: 'Home', url: 'https://tensorfeed.ai' },
 *     { name: 'Status', url: 'https://tensorfeed.ai/status' },
 *     { name: 'Is Claude Down?', url: 'https://tensorfeed.ai/is-claude-down' },
 *   ]} />
 */
export function BreadcrumbListJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return <JsonLd data={data} />;
}

/**
 * ServiceJsonLd: emits schema.org Service for the /is-X-down pages.
 * Lets Google understand "this page is monitoring a specific service
 * provided by company X" rather than treating it as a generic
 * WebApplication. Pairs cleanly with the existing WebApplicationJsonLd
 * - both can be present on the same page.
 */
export function ServiceJsonLd({
  serviceName,
  providerName,
  providerUrl,
  url,
  description,
}: {
  serviceName: string;
  providerName: string;
  providerUrl: string;
  url: string;
  description: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceName,
    description,
    provider: {
      '@type': 'Organization',
      name: providerName,
      url: providerUrl,
    },
    url,
    serviceType: 'AI / Large Language Model API',
    areaServed: 'Worldwide',
  };
  return <JsonLd data={data} />;
}
