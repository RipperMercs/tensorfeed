'use client';

import { useState } from 'react';
import { Bell, Check, Loader2, Shield } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [allServices, setAllServices] = useState(true);
  const [frequency, setFrequency] = useState<'instant' | 'digest'>('instant');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function toggleService(id: string) {
    const next = new Set(selectedServices);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedServices(next);
    if (next.size > 0) setAllServices(false);
  }

  function handleAllToggle() {
    setAllServices(!allServices);
    if (!allServices) {
      setSelectedServices(new Set());
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('loading');
    try {
      const services = allServices
        ? SERVICES.map(s => s.id)
        : Array.from(selectedServices);

      if (services.length === 0) {
        setStatus('error');
        setMessage('Please select at least one service to monitor.');
        return;
      }

      const res = await fetch('https://tensorfeed.ai/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, services, frequency }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage('You are subscribed to AI outage alerts. You will receive a confirmation email shortly.');
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setMessage((data as { error?: string }).error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Could not connect. Please try again.');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      {status === 'success' ? (
        <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-8 text-center">
          <Check className="w-12 h-12 text-accent-green mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">You are subscribed!</h2>
          <p className="text-text-secondary">{message}</p>
          <Link href="/status" className="inline-block mt-4 text-sm text-accent-primary hover:text-accent-cyan transition-colors">
            View current status dashboard
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
              required
            />
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">Services to monitor</label>

            <button
              type="button"
              onClick={handleAllToggle}
              className={`mb-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                allServices
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary border border-border hover:text-text-primary'
              }`}
            >
              All services
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SERVICES.map(service => {
                const selected = allServices || selectedServices.has(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    disabled={allServices}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm transition-colors border ${
                      selected
                        ? 'bg-accent-primary/10 border-accent-primary/30 text-text-primary'
                        : 'bg-bg-secondary border-border text-text-muted hover:text-text-secondary'
                    } ${allServices ? 'opacity-60' : ''}`}
                  >
                    <span className="font-medium">{service.name}</span>
                    <span className="block text-xs text-text-muted">{service.provider}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">Alert frequency</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFrequency('instant')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                  frequency === 'instant'
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-bg-secondary text-text-secondary border-border hover:text-text-primary'
                }`}
              >
                <span className="block font-semibold">Instant</span>
                <span className="block text-xs mt-0.5 opacity-80">Email on every incident</span>
              </button>
              <button
                type="button"
                onClick={() => setFrequency('digest')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                  frequency === 'digest'
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-bg-secondary text-text-secondary border-border hover:text-text-primary'
                }`}
              >
                <span className="block font-semibold">Daily Digest</span>
                <span className="block text-xs mt-0.5 opacity-80">Summary if any incidents</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-accent-primary hover:bg-accent-secondary text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
            Subscribe to Alerts
          </button>

          {status === 'error' && (
            <p className="text-accent-red text-sm text-center">{message}</p>
          )}

          {/* Privacy note */}
          <div className="flex items-start gap-2 text-xs text-text-muted">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              We only email you about service outages. No spam, no marketing.
              Unsubscribe anytime with one click.
              See our <Link href="/privacy" className="text-accent-primary hover:underline">privacy policy</Link>.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
