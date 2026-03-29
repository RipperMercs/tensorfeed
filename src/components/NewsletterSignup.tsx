'use client';

import { useState } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';

export default function NewsletterSignup({ variant = 'sidebar' }: { variant?: 'sidebar' | 'footer' | 'inline' }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('loading');
    try {
      const res = await fetch('https://tensorfeed.ai/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus('success');
        setMessage('You\'re in! Watch for the weekly digest.');
        setEmail('');
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setMessage((data as { error?: string }).error || 'Something went wrong. Try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Could not connect. Try again.');
    }
  }

  if (variant === 'sidebar') {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-2">
          <Mail className="w-4 h-4 text-accent-primary" />
          Weekly AI Digest
        </h3>
        <p className="text-xs text-text-muted mb-3">
          Top AI stories delivered to your inbox every week.
        </p>

        {status === 'success' ? (
          <div className="flex items-center gap-2 text-accent-green text-xs">
            <Check className="w-4 h-4" />
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="flex-1 min-w-0 bg-bg-primary border border-border rounded-md px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
              required
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="shrink-0 bg-accent-primary hover:bg-accent-secondary text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Join'}
            </button>
          </form>
        )}
        {status === 'error' && (
          <p className="text-xs text-accent-red mt-2">{message}</p>
        )}
      </div>
    );
  }

  // Footer/inline variant
  return (
    <div className={variant === 'footer' ? '' : 'my-6'}>
      <h3 className="text-sm font-semibold text-text-primary mb-1">Weekly AI Digest</h3>
      <p className="text-xs text-text-muted mb-2">Top AI stories, every Friday.</p>

      {status === 'success' ? (
        <div className="flex items-center gap-2 text-accent-green text-xs">
          <Check className="w-4 h-4" />
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 min-w-0 bg-bg-primary border border-border rounded-md px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="shrink-0 bg-accent-primary hover:bg-accent-secondary text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Subscribe'}
          </button>
        </form>
      )}
      {status === 'error' && (
        <p className="text-xs text-accent-red mt-2">{message}</p>
      )}
    </div>
  );
}
