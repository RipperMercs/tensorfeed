'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Wallet,
  Check,
  AlertTriangle,
  Copy,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface QuoteResponse {
  ok: boolean;
  nonce?: string;
  amount_usd?: number;
  wallet?: string;
  expires_at?: number;
  memo?: string;
  duration_days?: number;
  error?: string;
  status?: number;
}

interface ConfirmResponse {
  ok: boolean;
  wallet?: string;
  verified_hireable_until?: string;
  previous_verified_hireable_until?: string | null;
  renewal_count?: number;
  total_paid_usd?: number;
  tx_amount_usd?: number;
  error?: string;
  reason?: string;
}

export default function BecomeHireablePage() {
  const [wallet, setWallet] = useState('');
  const [phase, setPhase] = useState<'edit' | 'quoted' | 'awaiting_tx' | 'confirming' | 'done'>('edit');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [txHash, setTxHash] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function connectWallet() {
    setErrorMsg(null);
    if (!window.ethereum) {
      setErrorMsg('No browser wallet detected. Install MetaMask, Coinbase Wallet, or Rabby.');
      return;
    }
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      if (accounts.length > 0) setWallet(accounts[0]);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'wallet connection failed');
    }
  }

  async function requestQuote() {
    setErrorMsg(null);
    if (!wallet) {
      setErrorMsg('Connect a wallet first.');
      return;
    }
    try {
      const res = await fetch('https://tensorfeed.ai/api/agents/directory/verify-hireable/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_wallet: wallet }),
      });
      const data = (await res.json()) as QuoteResponse;
      if (!data.ok) {
        setErrorMsg(quoteErrorMessage(data));
        return;
      }
      setQuote(data);
      setPhase('quoted');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'quote request failed');
    }
  }

  async function submitConfirmation() {
    setErrorMsg(null);
    if (!quote?.nonce || !wallet || !txHash) {
      setErrorMsg('Need a quote nonce, wallet, and tx hash to confirm.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash.trim())) {
      setErrorMsg('Transaction hash must be 0x + 64 hex chars.');
      return;
    }
    setPhase('confirming');
    try {
      const res = await fetch('https://tensorfeed.ai/api/agents/directory/verify-hireable/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce: quote.nonce, txHash: txHash.trim(), sender_wallet: wallet }),
      });
      const data = (await res.json()) as ConfirmResponse;
      setConfirmation(data);
      if (!data.ok) {
        setPhase('quoted');
        setErrorMsg(data.error ? `${data.error}${data.reason ? ': ' + data.reason : ''}` : 'confirmation failed');
        return;
      }
      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'confirmation submission failed');
      setPhase('quoted');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <BadgeCheck className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Become Verified Hireable</h1>
        </div>
        <p className="text-text-secondary">
          $5 USDC on Base for 30 days of top-tier visibility on the{' '}
          <Link href="/agents/hireable" className="text-accent-primary hover:text-accent-secondary">
            hire-an-agent directory
          </Link>
          , plus the Verified Hireable badge on your reputation card. Subscribed wallets sort first in every directory
          search.
        </p>
      </div>

      <Stepper phase={phase} />

      <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">1 · Connect wallet</h2>
        {wallet ? (
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-text-primary break-all">{wallet}</span>
            <button
              onClick={() => {
                setWallet('');
                setQuote(null);
                setPhase('edit');
              }}
              className="text-xs text-text-muted hover:text-text-primary ml-auto"
            >
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
          Must be a wallet that has already claimed an operator profile via{' '}
          <Link href="/agents/claim" className="text-accent-primary hover:text-accent-secondary">
            /agents/claim
          </Link>
          .
        </p>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">2 · Get quote</h2>
        {phase === 'edit' && (
          <button
            onClick={requestQuote}
            disabled={!wallet}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request $5 quote <ArrowRight className="w-4 h-4" />
          </button>
        )}
        {quote && phase !== 'edit' && <QuoteDetails quote={quote} />}
      </div>

      {quote && phase !== 'edit' && phase !== 'done' && (
        <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">
            3 · Send $5 USDC on Base
          </h2>
          <p className="text-sm text-text-secondary mb-3">
            Send <strong className="text-text-primary font-mono">$5.00 USDC</strong> (the Base mainnet USDC contract)
            from <span className="font-mono text-text-primary break-all">{wallet}</span> to the destination address
            below. Once your transaction confirms on-chain, paste the transaction hash here and click confirm.
          </p>
          <DestinationCopyRow address={quote.wallet ?? ''} amount={quote.amount_usd ?? 5} />
          <div className="mt-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-text-muted block mb-1.5">
                Transaction hash (0x + 64 hex)
              </span>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-primary"
              />
            </label>
            <button
              onClick={submitConfirmation}
              disabled={!txHash || phase === 'confirming'}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === 'confirming' ? 'Confirming…' : 'Confirm payment'}
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm flex items-start gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {phase === 'done' && confirmation?.ok && <SuccessPanel confirmation={confirmation} />}

      <ProtocolFooter />
    </div>
  );
}

function Stepper({ phase }: { phase: 'edit' | 'quoted' | 'awaiting_tx' | 'confirming' | 'done' }) {
  const steps = [
    { id: 'edit', label: 'Connect' },
    { id: 'quoted', label: 'Quote' },
    { id: 'awaiting_tx', label: 'Send USDC' },
    { id: 'done', label: 'Verified' },
  ];
  const map: Record<string, number> = { edit: 0, quoted: 1, awaiting_tx: 1, confirming: 2, done: 3 };
  const idx = map[phase];
  return (
    <div className="mb-8 grid grid-cols-4 gap-1">
      {steps.map((s, i) => (
        <div key={s.id} className="text-xs text-center">
          <div
            className={`h-1 rounded mb-2 ${
              i <= idx ? 'bg-accent-primary' : 'bg-bg-tertiary'
            }`}
          />
          <span className={i <= idx ? 'text-text-primary' : 'text-text-muted'}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function QuoteDetails({ quote }: { quote: QuoteResponse }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
      <Stat label="Amount" value={`$${quote.amount_usd}`} />
      <Stat label="Duration" value={`${quote.duration_days}d`} />
      <Stat
        label="Quote expires"
        value={quote.expires_at ? new Date(quote.expires_at).toLocaleTimeString() : '—'}
      />
      <Stat label="Memo" value={quote.memo ?? '—'} />
    </div>
  );
}

function DestinationCopyRow({ address, amount }: { address: string; amount: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-bg-tertiary border border-border rounded-lg p-3 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">Send to</div>
        <div className="font-mono text-sm text-text-primary break-all">{address}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">Amount</div>
        <div className="font-mono text-sm text-text-primary">{amount} USDC</div>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-bg-secondary border border-border text-text-secondary hover:text-text-primary text-xs"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function SuccessPanel({ confirmation }: { confirmation: ConfirmResponse }) {
  const until = confirmation.verified_hireable_until ?? '';
  const previous = confirmation.previous_verified_hireable_until;
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BadgeCheck className="w-5 h-5 text-emerald-400" />
        <span className="font-semibold text-emerald-300">Verified Hireable, 30 days</span>
      </div>
      <p className="text-sm mb-4">
        Your wallet <span className="font-mono">{confirmation.wallet}</span> is now Verified Hireable until{' '}
        <strong className="font-mono">{until.slice(0, 10)}</strong>. Cards refresh on the next daily rebuild; your
        listing sorts to the top of every directory search.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
        <Stat label="Verified until" value={until.slice(0, 10)} />
        <Stat label="Renewals" value={confirmation.renewal_count ?? 1} />
        <Stat label="Lifetime paid" value={`$${confirmation.total_paid_usd ?? 5}`} />
        <Stat label="This payment" value={`$${confirmation.tx_amount_usd ?? 5}`} />
      </div>
      {previous && (
        <p className="text-xs text-emerald-200/70">
          Previous expiry was {previous.slice(0, 10)}; the renewal extended from there, so you didn&apos;t lose paid
          time.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={confirmation.wallet ? `/agents/profile?id=${confirmation.wallet}` : '/agents/leaderboard'}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm"
        >
          View your profile <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/agents/hireable"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-bg-secondary border border-border text-text-secondary hover:text-text-primary text-sm"
        >
          Browse the directory <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-mono text-text-primary">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function quoteErrorMessage(r: QuoteResponse): string {
  if (r.error === 'no_operator_claim') {
    return 'Your wallet has not yet claimed an operator profile. Visit /agents/claim first, then come back here.';
  }
  if (r.error === 'invalid_sender_wallet') return 'Invalid wallet address.';
  if (r.error === 'payments_disabled') return 'Payments temporarily disabled. Try again later.';
  return r.error ?? 'unknown error';
}

function ProtocolFooter() {
  return (
    <div className="mt-10 border-t border-border pt-6 text-sm text-text-muted space-y-3">
      <h3 className="text-text-primary text-base font-semibold">How the charge flow works</h3>
      <ul className="space-y-1.5 list-disc pl-5">
        <li>
          The quote binds your sender wallet to the charge. An attacker observing the public Base mempool can&apos;t
          steal your $5 because they don&apos;t hold your private key.
        </li>
        <li>
          The Worker verifies the on-chain USDC transfer (status, amount, sender, recipient), runs Chainalysis again
          (re-screened at every renewal), then writes verified_hireable_until on your operator claim.
        </li>
        <li>
          Early renewals extend from your existing expiry date, not from today — you never lose paid time.
        </li>
        <li>
          The badge is a subscription signal, not a TensorFeed endorsement. We publish what operators self-describe;
          we don&apos;t vet skill claims beyond moderation.
        </li>
        <li>
          No refunds. Pay only what you intend to commit to 30 days of directory visibility for.
        </li>
      </ul>
    </div>
  );
}
