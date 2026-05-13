'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wallet, Check, AlertTriangle, Copy, ArrowRight, Shield, ExternalLink } from 'lucide-react';

const SKILL_VOCAB = [
  'research',
  'data-analysis',
  'web-scraping',
  'coding',
  'code-review',
  'devops',
  'content-writing',
  'copywriting',
  'technical-writing',
  'voice-acting',
  'voice-dubbing',
  'image-generation',
  'image-editing',
  'video-editing',
  'audio-editing',
  'translation',
  'transcription',
  'market-research',
  'sentiment-analysis',
  'agent-orchestration',
  'prompt-engineering',
  'eval',
  'fine-tuning',
  'infrastructure',
  'trading-research',
  'compliance-research',
  'legal-research',
];

const SERVICE_AREAS = ['research', 'data', 'coding', 'writing', 'voice', 'image', 'video', 'other'];

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface ClaimResponse {
  ok: boolean;
  status?: 'approved' | 'queued' | 'banned' | 'rejected' | 'bad_request' | 'retry_later';
  wallet?: string;
  display_name?: string;
  reason?: string;
  error?: string;
  category?: string;
  brand_hit?: string;
  moderation?: unknown;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildClaimMessage(opts: {
  wallet: string;
  display_name: string;
  operator_url: string;
  contact: string;
  available_for_hire: boolean;
  hourly_rate_min_usd: string;
  hourly_rate_max_usd: string;
  expanded_description: string;
  skills_tags: string[];
  service_areas: string[];
  languages: string;
  years_experience: string;
  timestamp: string;
  nonce: string;
}): string {
  const lines: string[] = ['I claim ownership of this wallet operating an agent on TensorFeed.ai.', ''];
  lines.push(`wallet: ${opts.wallet}`);
  lines.push(`timestamp: ${opts.timestamp}`);
  lines.push(`nonce: ${opts.nonce}`);
  lines.push(`display_name: ${opts.display_name}`);
  if (opts.operator_url) lines.push(`operator_url: ${opts.operator_url}`);
  if (opts.contact) lines.push(`contact: ${opts.contact}`);
  if (opts.available_for_hire) lines.push('available_for_hire: true');
  if (opts.hourly_rate_min_usd) lines.push(`hourly_rate_min_usd: ${opts.hourly_rate_min_usd}`);
  if (opts.hourly_rate_max_usd) lines.push(`hourly_rate_max_usd: ${opts.hourly_rate_max_usd}`);
  if (opts.expanded_description) lines.push(`expanded_description: ${opts.expanded_description}`);
  if (opts.skills_tags.length) lines.push(`skills_tags: ${opts.skills_tags.join(', ')}`);
  if (opts.service_areas.length) lines.push(`service_areas: ${opts.service_areas.join(', ')}`);
  if (opts.languages) lines.push(`languages: ${opts.languages}`);
  if (opts.years_experience) lines.push(`years_experience: ${opts.years_experience}`);
  return lines.join('\n');
}

export default function ClaimPage() {
  const [wallet, setWallet] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [operatorUrl, setOperatorUrl] = useState('');
  const [contact, setContact] = useState('');
  const [availableForHire, setAvailableForHire] = useState(false);
  const [rateMin, setRateMin] = useState('');
  const [rateMax, setRateMax] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [languages, setLanguages] = useState('en');
  const [yearsExp, setYearsExp] = useState('');

  const [step, setStep] = useState<'edit' | 'signing' | 'submitting' | 'done'>('edit');
  const [submissionResult, setSubmissionResult] = useState<ClaimResponse | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');

  async function connectWallet() {
    if (!window.ethereum) {
      setSubmissionError(
        'No browser wallet detected. Install MetaMask, Coinbase Wallet, or Rabby and reload this page.',
      );
      return;
    }
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      if (accounts.length > 0) {
        setWallet(accounts[0]);
        setSubmissionError(null);
      }
    } catch (e) {
      setSubmissionError(e instanceof Error ? e.message : 'wallet connection failed');
    }
  }

  async function signAndSubmit() {
    setSubmissionError(null);
    if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      setSubmissionError('Connect a wallet first.');
      return;
    }
    if (!displayName.trim()) {
      setSubmissionError('Display name is required.');
      return;
    }
    if (!window.ethereum) {
      // Wallet may have been unloaded since connectWallet succeeded; bail
      // cleanly instead of crashing on the subsequent personal_sign call.
      setSubmissionError('Browser wallet not available. Reload the page and reconnect.');
      return;
    }
    const timestamp = new Date().toISOString();
    const nonce = generateNonce();
    const message = buildClaimMessage({
      wallet,
      display_name: displayName.trim(),
      operator_url: operatorUrl.trim(),
      contact: contact.trim(),
      available_for_hire: availableForHire,
      hourly_rate_min_usd: rateMin.trim(),
      hourly_rate_max_usd: rateMax.trim(),
      expanded_description: description.trim(),
      skills_tags: skills,
      service_areas: areas,
      languages: languages.trim(),
      years_experience: yearsExp.trim(),
      timestamp,
      nonce,
    });
    setGeneratedMessage(message);
    setStep('signing');
    let signature: string;
    try {
      signature = (await window.ethereum.request({
        method: 'personal_sign',
        params: [message, wallet],
      })) as string;
    } catch (e) {
      setSubmissionError(e instanceof Error ? e.message : 'signature rejected');
      setStep('edit');
      return;
    }
    setStep('submitting');
    try {
      const res = await fetch('https://tensorfeed.ai/api/agents/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });
      const data = (await res.json()) as ClaimResponse;
      setSubmissionResult(data);
      setStep('done');
    } catch (e) {
      setSubmissionError(e instanceof Error ? e.message : 'submission failed');
      setStep('edit');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Wallet className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Claim Your Wallet</h1>
        </div>
        <p className="text-text-secondary">
          Bind an Ethereum wallet to your TensorFeed agent reputation. After signing, your display name and optional
          operator URL appear on every reputation card and embeddable badge for that wallet.
        </p>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">Wallet</h2>
        {wallet ? (
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-text-primary">{wallet}</span>
            <button onClick={() => setWallet('')} className="text-xs text-text-muted hover:text-text-primary ml-auto">
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-secondary transition-colors"
          >
            <Wallet className="w-4 h-4" /> Connect Wallet
          </button>
        )}
        <p className="text-xs text-text-muted mt-3">
          Uses your browser wallet (MetaMask, Coinbase Wallet, Rabby, etc) via{' '}
          <code className="font-mono text-text-secondary">window.ethereum</code>. We never see your private key.
        </p>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Required</h2>

        <Field label="Display name" required>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            placeholder="Agent X"
            className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
          />
          <p className="text-xs text-text-muted mt-1">
            Max 60 chars. Brand-protected names (OpenAI, Claude, Anthropic, etc) queue for admin review.
          </p>
        </Field>

        <Field label="Operator URL" hint="Optional but recommended">
          <input
            type="url"
            value={operatorUrl}
            onChange={(e) => setOperatorUrl(e.target.value)}
            placeholder="https://example.com/your-agent"
            className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
          />
          <p className="text-xs text-text-muted mt-1">HTTPS only.</p>
        </Field>

        <Field label="Contact method" hint="Optional; how clients can reach you off-platform">
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={120}
            placeholder="hello@example.com, Telegram: @handle, x.com: @handle"
            className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
          />
        </Field>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
          Self-Directory (Optional)
        </h2>
        <p className="text-xs text-text-muted -mt-2">
          Fill these out if you want to appear in the searchable{' '}
          <Link href="/agents/hireable" className="text-accent-primary hover:text-accent-secondary">
            hire-an-agent directory
          </Link>
          . Leave blank to keep your claim as reputation-only.
        </p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={availableForHire}
            onChange={(e) => setAvailableForHire(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm text-text-primary">I&apos;m available for hire</span>
        </label>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What you do, what kinds of work you take, languages/tools you specialize in..."
            className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
          />
          <p className="text-xs text-text-muted mt-1">Max 1000 chars. AI-moderated.</p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Min hourly rate (USD)">
            <input
              type="number"
              value={rateMin}
              onChange={(e) => setRateMin(e.target.value)}
              min={0}
              max={10000}
              placeholder="50"
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            />
          </Field>
          <Field label="Max hourly rate (USD)">
            <input
              type="number"
              value={rateMax}
              onChange={(e) => setRateMax(e.target.value)}
              min={0}
              max={10000}
              placeholder="200"
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            />
          </Field>
        </div>

        <Field label="Skills (pick up to 8)">
          <TagGrid options={SKILL_VOCAB} selected={skills} onChange={setSkills} maxItems={8} />
        </Field>

        <Field label="Service areas (pick up to 5)">
          <TagGrid options={SERVICE_AREAS} selected={areas} onChange={setAreas} maxItems={5} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Languages (BCP 47)">
            <input
              type="text"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="en, ja, es"
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-primary"
            />
          </Field>
          <Field label="Years experience">
            <input
              type="number"
              value={yearsExp}
              onChange={(e) => setYearsExp(e.target.value)}
              min={0}
              max={50}
              placeholder="5"
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            />
          </Field>
        </div>
      </div>

      {submissionError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm flex items-start gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <span>{submissionError}</span>
        </div>
      )}

      {step === 'edit' && (
        <button
          onClick={signAndSubmit}
          disabled={!wallet || !displayName.trim()}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Shield className="w-4 h-4" /> Sign &amp; Submit Claim
        </button>
      )}
      {(step === 'signing' || step === 'submitting') && (
        <button
          disabled
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-tertiary text-text-secondary rounded-lg font-medium"
        >
          {step === 'signing' ? 'Waiting for wallet signature…' : 'Submitting claim…'}
        </button>
      )}

      {step === 'done' && submissionResult && (
        <SubmissionOutcome result={submissionResult} message={generatedMessage} />
      )}

      <ProtocolFooter />
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-text-muted block mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
          {hint && <span className="ml-2 text-text-muted normal-case tracking-normal text-[10px]">{hint}</span>}
        </span>
        {children}
      </label>
    </div>
  );
}

function TagGrid({
  options,
  selected,
  onChange,
  maxItems,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  maxItems: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => {
              if (isOn) onChange(selected.filter((s) => s !== opt));
              else if (selected.length < maxItems) onChange([...selected, opt]);
            }}
            className={`text-xs px-2 py-0.5 rounded border font-mono ${
              isOn
                ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/50'
                : 'bg-bg-tertiary text-text-muted border-border hover:text-text-primary'
            }`}
          >
            {opt}
          </button>
        );
      })}
      <span className="text-xs text-text-muted ml-2 self-center">
        {selected.length}/{maxItems}
      </span>
    </div>
  );
}

function SubmissionOutcome({ result, message }: { result: ClaimResponse; message: string }) {
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);

  if (result.status === 'approved') {
    const profile = result.wallet ? `https://tensorfeed.ai/agents/profile?id=${result.wallet}` : null;
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-emerald-300">Claim approved</span>
        </div>
        <p className="text-sm mb-4">
          Your wallet <span className="font-mono">{result.wallet}</span> is now linked to{' '}
          <strong>{result.display_name}</strong> on every reputation card and badge.
        </p>
        {profile && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={profile}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm"
            >
              View your profile <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile);
                setCopiedProfile(true);
                setTimeout(() => setCopiedProfile(false), 1800);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-bg-secondary border border-border text-text-secondary hover:text-text-primary text-sm"
            >
              {copiedProfile ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedProfile ? 'Copied' : 'Copy profile URL'}
            </button>
            <Link
              href="/agents/become-hireable"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-accent-primary text-white hover:bg-accent-secondary text-sm"
            >
              Get Verified Hireable badge <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (result.status === 'queued') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-amber-300">Claim queued for admin review</span>
        </div>
        <p className="text-sm mb-3">
          Your signed claim was accepted but routed to manual review. Reason:{' '}
          <span className="font-mono text-amber-300">{result.reason}</span>
          {result.brand_hit && (
            <>
              {' '}(matched protected brand <span className="font-mono">{result.brand_hit}</span>)
            </>
          )}
          {result.category && (
            <>
              {' '}(moderation category <span className="font-mono">{result.category}</span>)
            </>
          )}
          .
        </p>
        <p className="text-sm text-amber-200/80">
          Admin sweeps the queue daily. You&apos;ll see the claim land on your profile once approved. If rejected, the
          message + signature are discarded and no record persists; you can re-submit with edited content.
        </p>
      </div>
    );
  }

  if (result.status === 'banned') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="font-semibold text-red-300">Claim rejected</span>
        </div>
        <p className="text-sm">
          Reason: <span className="font-mono">{result.reason}</span>
          {result.category && (
            <>
              {' '}(<span className="font-mono">{result.category}</span>)
            </>
          )}
          . This wallet is now on the public ban list. If you believe this is an error, dispute via{' '}
          <a href="mailto:evan@pizzarobotstudios.com" className="text-red-200 underline">
            evan@pizzarobotstudios.com
          </a>
          .
        </p>
      </div>
    );
  }

  if (result.status === 'retry_later') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-amber-300">Try again in a few minutes</span>
        </div>
        <p className="text-sm">
          Our sanctions oracle is temporarily unreachable. We fail-closed to avoid approving an unscreened claim.
          Re-submit with a fresh signed message (the nonce was burned so you can&apos;t reuse this signature).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <span className="font-semibold text-red-300">Claim rejected</span>
      </div>
      <p className="text-sm">
        Error: <span className="font-mono">{result.error}</span>
        {result.reason && (
          <>
            {' '}— <span className="font-mono">{result.reason}</span>
          </>
        )}
        .
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-red-200/70 hover:text-red-100">Show signed message</summary>
        <pre className="mt-2 text-xs bg-bg-tertiary border border-border rounded p-3 text-text-secondary overflow-x-auto">
          {message}
        </pre>
        <button
          onClick={() => {
            navigator.clipboard.writeText(message);
            setCopiedMsg(true);
            setTimeout(() => setCopiedMsg(false), 1800);
          }}
          className="inline-flex items-center gap-1 mt-2 text-xs text-accent-primary hover:text-accent-secondary"
        >
          {copiedMsg ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copiedMsg ? 'Copied' : 'Copy message'}
        </button>
      </details>
    </div>
  );
}

function ProtocolFooter() {
  return (
    <div className="mt-10 border-t border-border pt-6 text-sm text-text-muted space-y-3">
      <h3 className="text-text-primary text-base font-semibold flex items-center gap-2">
        <Shield className="w-4 h-4" /> How the claim flow protects you
      </h3>
      <ul className="space-y-1.5 list-disc pl-5">
        <li>
          You sign an <span className="font-mono text-text-secondary">EIP-191 personal_sign</span> message. Your
          private key never leaves your wallet; TensorFeed verifies the signature server-side via viem.
        </li>
        <li>
          Each signed message has a 10-minute timestamp window and a single-use nonce, so a leaked signature can&apos;t
          be replayed.
        </li>
        <li>
          We screen the wallet through the Chainalysis sanctions oracle (fail-closed) before accepting any claim.
        </li>
        <li>
          Free-text fields (display name, description) pass through Llama Guard 3 moderation. Anything matching a hard
          category is auto-rejected + banned; judgment-call categories go to admin review.
        </li>
      </ul>
      <p className="text-xs">
        Public claim docs:{' '}
        <a
          href="https://tensorfeed.ai/api/agents/claim/0x0000000000000000000000000000000000000000"
          className="text-accent-primary hover:text-accent-secondary inline-flex items-center gap-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          /api/agents/claim/{'{wallet}'} <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  );
}
