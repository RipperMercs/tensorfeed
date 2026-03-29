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
      name: 'Pizza Robot Studios LLC',
      url: 'https://pizzarobotstudios.com',
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
    applicationCategory: 'Monitoring',
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
}: {
  name: string;
  description: string;
  url: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url,
    license: 'https://tensorfeed.ai/about',
    creator: {
      '@type': 'Organization',
      name: 'TensorFeed.ai',
      url: 'https://tensorfeed.ai',
    },
  };

  return <JsonLd data={data} />;
}

export function ArticleJsonLd({
  title,
  description,
  datePublished,
  dateModified,
  author = 'Evan Marcus',
}: {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: { '@type': 'Person', name: author },
    publisher: {
      '@type': 'Organization',
      name: 'TensorFeed.ai',
      url: 'https://tensorfeed.ai',
    },
    datePublished,
    dateModified: dateModified || datePublished,
  };

  return <JsonLd data={data} />;
}
