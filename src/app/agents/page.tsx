'use client';

import { useState } from 'react';
import { Bot, Wrench, Palette, Search, Code, ExternalLink } from 'lucide-react';
import agentsData from '@/../data/agents-directory.json';

// Metadata must be in a separate file for client components, but we keep
// the page as 'use client' for the interactive filter. Next.js will still
// pick up a static metadata export from a server-side layout or generateMetadata.
// For simplicity we co-locate it here; Next.js allows metadata in client pages
// starting from Next 14.

const categoryIcons: Record<string, React.ElementType> = {
  coding: Code,
  research: Search,
  general: Bot,
  creative: Palette,
  frameworks: Wrench,
};

const resources = [
  {
    name: 'Anthropic Claude MCP Docs',
    url: 'https://modelcontextprotocol.io',
    description: 'Learn how to build integrations with the Model Context Protocol for tool-use and data access.',
  },
  {
    name: 'OpenAI Assistants API',
    url: 'https://platform.openai.com/docs/assistants',
    description: 'Build AI assistants with persistent threads, file retrieval, and function calling.',
  },
  {
    name: 'LangChain Documentation',
    url: 'https://docs.langchain.com',
    description: 'Open-source framework for building LLM-powered apps with chains, agents, and retrieval.',
  },
  {
    name: 'CrewAI Getting Started',
    url: 'https://docs.crewai.com',
    description: 'Orchestrate role-playing AI agents that collaborate on complex, multi-step tasks.',
  },
];

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'coding', label: 'Coding Agents' },
  { id: 'research', label: 'Research Agents' },
  { id: 'general', label: 'General / Personal' },
  { id: 'creative', label: 'Creative Agents' },
  { id: 'frameworks', label: 'Frameworks' },
];

export default function AgentsPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredAgents =
    activeCategory === 'all'
      ? agentsData.agents
      : agentsData.agents.filter((agent) => agent.category === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Bot className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Agents</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl">
          Discover AI agents, frameworks, and tools shaping the ecosystem.
        </p>
      </div>

      {/* Agent Directory */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Agent Directory</h2>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === tab.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => {
            const IconComponent = categoryIcons[agent.category] || Bot;
            const categoryLabel =
              agentsData.categories.find((c) => c.id === agent.category)?.name || agent.category;

            return (
              <div
                key={agent.id}
                className="bg-bg-secondary border border-border rounded-xl p-5 hover:shadow-glow transition-shadow flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  <IconComponent className="w-5 h-5 text-accent-cyan mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-text-primary font-semibold leading-tight">{agent.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary font-medium">
                        {agent.provider}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-border">
                        {categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-text-secondary text-sm mb-4 flex-1">{agent.description}</p>

                <div className="flex items-center justify-between mt-auto">
                  <div>
                    <p className="text-xs text-text-muted">{agent.pricing}</p>
                    <p className="text-xs text-text-muted">Launched {agent.launched}</p>
                  </div>
                  <a
                    href={agent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-accent-primary hover:text-accent-secondary font-medium transition-colors"
                  >
                    Visit
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Build an Agent Resources */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Build an Agent</h2>
        <p className="text-text-muted text-sm mb-6">
          Resources and documentation to help you build your own AI agents.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {resources.map((resource) => (
            <a
              key={resource.name}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-bg-secondary border border-border rounded-xl p-4 hover:shadow-glow transition-shadow group"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-text-primary text-sm font-semibold group-hover:text-accent-primary transition-colors">
                  {resource.name}
                </h3>
                <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-primary transition-colors shrink-0" />
              </div>
              <p className="text-text-muted text-xs">{resource.description}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
