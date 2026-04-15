'use client';

import { Bell, Shield, Clock } from 'lucide-react';
import Link from 'next/link';

const SERVICES = [
  { id: 'claude', name: 'Claude API', provider: 'Anthropic' },
  { id: 'openai', name: 'OpenAI API', provider: 'OpenAI' },
  { id: 'gemini', name: 'Gemini API', provider: 'Google' },
  { id: 'mistral', name: 'Mistral', provider: 'Mistral AI' },
  { id: 'huggingface', name: 'Hugging Face', provider: 'Hugging Face' },
  { id: 'replicate', name: 'Replicate', provider: 'Replicate' },
  { id: 'cohere', name: 'Cohere', provider: 'Cohere' },
  { id: 'perplexity', name: 'Perplexity', provider: 'Perplexity AI' },
  { id: 'copilot', name: 'Microsoft Copilot', provider: 'Microsoft' },
  { id: 'midjourney', name: 'Midjourney', provider: 'Midjourney' },
];

export default function AlertsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Editorial Intro */}
      <div className="prose prose-invert max-w-3xl mb-12 text-text-secondary leading-relaxed">
        <p>
          AI service outages are increasingly common and increasingly costly. When Claude, ChatGPT, or Gemini goes down, it disrupts thousands of applications, workflows, and businesses that depend on these APIs. Our monitoring data shows that major AI providers experience at least one significant incident per month, with some services degrading silently during peak traffic periods.
        </p>
        <p className="mt-4">
          That&apos;s why we&apos;re building TensorFeed Alerts. Instead of discovering an outage through frustrated user reports or failed API calls, you&apos;ll receive an instant email notification the moment we detect degradation or downtime. We monitor 10 major AI services including Claude API, OpenAI GPT-4, Google Gemini, Mistral, Hugging Face Inference, Replicate, Cohere, Perplexity, Microsoft Copilot, and Midjourney. Detection happens within 5 minutes, and alerts are hyper-targeted: you only hear about services you actually care about.
        </p>
        <p className="mt-4">
          Our data from the <Link href="/originals/ai-service-outages-month" className="text-accent-primary hover:underline">AI service outages report</Link> reveals patterns in downtime that developers need to understand. Infrastructure fails in predictable ways. By tracking incidents systematically on our <Link href="/incidents" className="text-accent-primary hover:underline">incident history page</Link>, we help teams build redundancy and fallback logic into their applications. No credit card required, no spam, just status updates when it matters.
        </p>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Bell className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">AI Outage Alerts</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Get notified the moment any AI service goes down. Free, instant email alerts.
        </p>
      </div>

      {/* Value Prop */}
      <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-5 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-accent-primary">10+</p>
            <p className="text-xs text-text-muted">AI services monitored</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent-green">5 min</p>
            <p className="text-xs text-text-muted">Detection time</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent-cyan">Free</p>
            <p className="text-xs text-text-muted">No credit card needed</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center mb-8">
        <Clock className="w-12 h-12 text-accent-amber mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">Coming Soon</h2>
        <p className="text-text-secondary max-w-md mx-auto mb-4">
          Email alerts are currently being set up and tested. Check back soon to subscribe to
          instant outage notifications for all major AI services.
        </p>
        <p className="text-sm text-text-muted">
          In the meantime, monitor services live on our{' '}
          <Link href="/status" className="text-accent-primary hover:underline">
            status dashboard
          </Link>.
        </p>
      </div>

      {/* Services We Will Monitor */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Services we will monitor</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SERVICES.map(service => (
            <div
              key={service.id}
              className="text-left px-3 py-2.5 rounded-lg text-sm bg-bg-secondary border border-border"
            >
              <span className="font-medium text-text-primary">{service.name}</span>
              <span className="block text-xs text-text-muted">{service.provider}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-2 text-xs text-text-muted mt-8">
        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          When alerts launch, we will only email you about service outages. No spam, no marketing.
          See our <Link href="/privacy" className="text-accent-primary hover:underline">privacy policy</Link>.
        </p>
      </div>
    </div>
  );
}
