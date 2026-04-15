'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import timelineData from '@/../data/timeline.json';

type Category = 'model-release' | 'pricing' | 'acquisition' | 'policy' | 'research' | 'milestone' | 'open-source';

interface TimelineEvent {
  date: string;
  title: string;
  provider: string;
  category: Category;
  description: string;
}

const CATEGORIES: { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Model Releases', value: 'model-release' },
  { label: 'Pricing', value: 'pricing' },
  { label: 'Policy', value: 'policy' },
  { label: 'Open Source', value: 'open-source' },
  { label: 'Acquisitions', value: 'acquisition' },
  { label: 'Research', value: 'research' },
  { label: 'Milestones', value: 'milestone' },
];

const CATEGORY_DOT_COLORS: Record<Category, string> = {
  'model-release': 'bg-accent-primary',
  pricing: 'bg-accent-green',
  policy: 'bg-accent-amber',
  'open-source': 'bg-accent-cyan',
  acquisition: 'bg-purple-500',
  research: 'bg-pink-500',
  milestone: 'bg-accent-primary',
};

const CATEGORY_TAG_COLORS: Record<Category, string> = {
  'model-release': 'bg-accent-primary/10 text-accent-primary',
  pricing: 'bg-accent-green/10 text-accent-green',
  policy: 'bg-accent-amber/10 text-accent-amber',
  'open-source': 'bg-accent-cyan/10 text-accent-cyan',
  acquisition: 'bg-purple-500/10 text-purple-400',
  research: 'bg-pink-500/10 text-pink-400',
  milestone: 'bg-accent-primary/10 text-accent-primary',
};

const CATEGORY_LABELS: Record<Category, string> = {
  'model-release': 'Model Release',
  pricing: 'Pricing',
  policy: 'Policy',
  'open-source': 'Open Source',
  acquisition: 'Acquisition',
  research: 'Research',
  milestone: 'Milestone',
};

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  OpenAI: 'bg-green-500/10 text-green-400 border-green-500/20',
  Google: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Meta: 'bg-blue-600/10 text-blue-300 border-blue-600/20',
  Mistral: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  xAI: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  DeepSeek: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  EU: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getYearFromDate(dateStr: string): string {
  return dateStr.slice(0, 4);
}

export default function TimelinePage() {
  const [activeFilter, setActiveFilter] = useState<Category | 'all'>('all');

  const events = (timelineData.events as TimelineEvent[]).filter(
    (e) => activeFilter === 'all' || e.category === activeFilter
  );

  // Group events by year for year markers
  let lastYear = '';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Clock className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Timeline</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl">
          A chronological record of major AI model releases, industry milestones, and pivotal events from 2024 to present.
        </p>
      </div>

      {/* Editorial Intro */}
      <div className="max-w-4xl mb-10 text-text-secondary leading-relaxed space-y-4">
        <p>
          The pace of AI advancement is accelerating. Every month brings new model releases, price drops, capability breakthroughs, and industry consolidation. Tracking this timeline helps you understand the trajectory: where we came from, where we are now, and what&apos;s coming next.
        </p>
        <p>
          From April 2024 to April 2026, we&apos;ve seen Claude evolve from Opus to Sonnet to a new generation. OpenAI released GPT-4o with vision and function calling. Google launched Gemini 2.5 with 2 million token context. Mistral and Llama launched open-source models that changed the economics of AI deployment. Pricing dropped dramatically as providers competed for market share. Policy shifted too, with regulation discussions in the EU and debates over AI safety standards.
        </p>
        <p>
          What patterns are visible in this data? Model releases cluster around major announcements. Pricing announcements typically decrease (rarely increase). Open-source releases create competitive pressure on commercial models. Major companies iterate quarterly. Filter this timeline by category to focus on what matters most to you: model releases, pricing changes, policy shifts, acquisitions, or research breakthroughs.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveFilter(cat.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeFilter === cat.value
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] sm:left-[119px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-0">
          {events.map((event, index) => {
            const year = getYearFromDate(event.date);
            const showYearMarker = year !== lastYear;
            lastYear = year;

            return (
              <div key={`${event.date}-${event.title}`}>
                {/* Year marker */}
                {showYearMarker && (
                  <div className="relative flex items-center mb-6 mt-2">
                    <div className="hidden sm:block w-[108px] shrink-0" />
                    <div className="w-[15px] h-[15px] shrink-0 rounded-full bg-bg-tertiary border-2 border-text-muted z-10 flex items-center justify-center sm:mx-0">
                      <div className="w-[5px] h-[5px] rounded-full bg-text-muted" />
                    </div>
                    <span className="ml-4 text-lg font-bold text-text-primary">{year}</span>
                  </div>
                )}

                {/* Event */}
                <div className="relative flex items-start pb-8 group">
                  {/* Date (desktop) */}
                  <div className="hidden sm:block w-[108px] shrink-0 text-right pr-4 pt-0.5">
                    <span className="text-sm text-text-muted">{formatDate(event.date)}</span>
                  </div>

                  {/* Dot */}
                  <div className={`w-[15px] h-[15px] shrink-0 rounded-full border-2 border-bg-primary z-10 mt-1 ${CATEGORY_DOT_COLORS[event.category]}`} />

                  {/* Content */}
                  <div className="ml-4 flex-1 bg-bg-secondary border border-border rounded-xl p-4 hover:shadow-glow transition-shadow">
                    {/* Date (mobile) */}
                    <div className="sm:hidden text-xs text-text-muted mb-1.5">{formatDate(event.date)}</div>

                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-text-primary font-semibold">{event.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          PROVIDER_COLORS[event.provider] || 'bg-bg-tertiary text-text-secondary border-border'
                        }`}
                      >
                        {event.provider}
                      </span>
                    </div>

                    <p className="text-text-secondary text-sm leading-relaxed mb-2">
                      {event.description}
                    </p>

                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_TAG_COLORS[event.category]}`}
                    >
                      {CATEGORY_LABELS[event.category]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* End cap */}
        <div className="relative flex items-center">
          <div className="hidden sm:block w-[108px] shrink-0" />
          <div className="w-[15px] h-[15px] shrink-0 rounded-full bg-border z-10" />
          <span className="ml-4 text-sm text-text-muted italic">Timeline begins here</span>
        </div>
      </div>
    </div>
  );
}
