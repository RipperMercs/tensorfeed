'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  FileSearch,
  Clock,
  Hash,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

const API_BASE = 'https://tensorfeed.ai/api';

interface ReceiptView {
  id: string;
  endpoint: string;
  method: string;
  token_short: string;
  credits_charged: number;
  credits_remaining: number;
  request_hash: string;
  response_hash: string;
  captured_at: string | null;
  server_time: string;
  no_charge_reason: string | null;
  signature: string;
  key_id: string;
  signing_alg: string;
  signing_curve: string;
}

interface AttestationResponse {
  ok: boolean;
  attestation?: {
    id: string;
    stored_at: string;
    expires_at: string;
    receipt: ReceiptView;
  };
  error?: string;
  message?: string;
}

type SigState = 'unchecked' | 'checking' | 'valid' | 'invalid' | 'error';

function formatDate(iso: string | null): string {
  if (!iso) return 'n/a';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-2 border-b border-border/60 last:border-b-0">
      <dt className="text-xs uppercase tracking-wide text-text-secondary sm:w-44 flex-shrink-0">{label}</dt>
      <dd className={`text-sm text-text-primary break-all ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

export default function AttestClient() {
  const searchParams = useSearchParams();
  const urlId = searchParams.get('id') ?? '';
  const [inputId, setInputId] = useState(urlId);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AttestationResponse | null>(null);
  const [sigState, setSigState] = useState<SigState>('unchecked');

  const load = useCallback(async (id: string) => {
    if (!/^att_[0-9a-f]{16}$/.test(id)) {
      setData({ ok: false, error: 'bad_id', message: 'Attestation ids look like att_ followed by 16 hex characters.' });
      return;
    }
    setLoading(true);
    setSigState('unchecked');
    try {
      const res = await fetch(`${API_BASE}/attest/${id}`);
      const body = (await res.json()) as AttestationResponse;
      setData(body);
    } catch {
      setData({ ok: false, error: 'network', message: 'Could not reach the attestation API. Try again.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlId) void load(urlId);
  }, [urlId, load]);

  const checkSignature = useCallback(async () => {
    if (!data?.attestation) return;
    setSigState('checking');
    try {
      const res = await fetch(`${API_BASE}/receipt/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt: data.attestation.receipt }),
      });
      const body = (await res.json()) as { ok: boolean; valid?: boolean };
      if (!body.ok) setSigState('error');
      else setSigState(body.valid ? 'valid' : 'invalid');
    } catch {
      setSigState('error');
    }
  }, [data]);

  const att = data?.ok ? data.attestation : undefined;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">Data Attestation</h1>
        <p className="text-text-secondary max-w-2xl">
          An attestation is an Ed25519-signed record of a TensorFeed premium API response, stored by
          the paying agent as a citation anyone can check. If an AI agent showed you a TensorFeed
          fact, this page tells you whether TensorFeed really said it, and when.
        </p>
      </header>

      <section className="bg-bg-secondary border border-border rounded-xl p-6 mb-6" aria-label="Attestation lookup">
        <label htmlFor="attest-id" className="block text-sm font-semibold text-text-primary mb-2">
          <FileSearch className="w-4 h-4 inline mr-2" aria-hidden="true" />
          Attestation id
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="attest-id"
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value.trim())}
            placeholder="att_9f2c1a7b3e5d4f60"
            className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-secondary/50"
            aria-label="Attestation id"
          />
          <button
            onClick={() => void load(inputId)}
            disabled={loading}
            className="bg-bg-tertiary hover:bg-bg-tertiary/80 border border-border rounded-lg px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
            aria-label="Look up attestation"
          >
            {loading ? 'Loading...' : 'Look up'}
          </button>
        </div>
      </section>

      {loading && (
        <div className="bg-bg-secondary border border-border rounded-xl p-6 mb-6 animate-pulse" aria-hidden="true">
          <div className="h-4 bg-bg-tertiary rounded w-1/3 mb-4" />
          <div className="h-3 bg-bg-tertiary rounded w-full mb-2" />
          <div className="h-3 bg-bg-tertiary rounded w-5/6 mb-2" />
          <div className="h-3 bg-bg-tertiary rounded w-2/3" />
        </div>
      )}

      {!loading && data && !data.ok && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3" role="alert">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-text-primary font-semibold mb-1">Not found</p>
            <p className="text-sm text-text-secondary">{data.message ?? 'Unknown attestation id.'}</p>
          </div>
        </div>
      )}

      {!loading && att && (
        <section className="bg-bg-secondary border border-border rounded-xl p-6 mb-6" aria-label="Attestation record">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-text-primary font-mono">{att.id}</h2>
            {sigState === 'valid' && (
              <span className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" /> Signature valid
              </span>
            )}
            {sigState === 'invalid' && (
              <span className="flex items-center gap-2 text-red-400 text-sm font-semibold">
                <ShieldAlert className="w-5 h-5" aria-hidden="true" /> Signature INVALID
              </span>
            )}
            {sigState === 'error' && (
              <span className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                <ShieldQuestion className="w-5 h-5" aria-hidden="true" /> Check failed, retry
              </span>
            )}
            {(sigState === 'unchecked' || sigState === 'checking') && (
              <button
                onClick={() => void checkSignature()}
                disabled={sigState === 'checking'}
                className="flex items-center gap-2 bg-bg-tertiary hover:bg-bg-tertiary/80 border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary disabled:opacity-50"
                aria-label="Verify Ed25519 signature"
              >
                <KeyRound className="w-4 h-4" aria-hidden="true" />
                {sigState === 'checking' ? 'Checking...' : 'Verify signature'}
              </button>
            )}
          </div>

          <dl>
            <Row label="Endpoint" value={`${att.receipt.method} ${att.receipt.endpoint}`} />
            <Row label="Data captured at" value={formatDate(att.receipt.captured_at)} mono={false} />
            <Row label="Served at" value={formatDate(att.receipt.server_time)} mono={false} />
            <Row label="Credits charged" value={String(att.receipt.credits_charged)} />
            <Row label="Payer token" value={att.receipt.token_short} />
            <Row label="Response hash" value={att.receipt.response_hash} />
            <Row label="Signature key" value={`${att.receipt.key_id} (${att.receipt.signing_alg} / ${att.receipt.signing_curve})`} />
            <Row label="Stored" value={formatDate(att.stored_at)} mono={false} />
            <Row label="Expires" value={formatDate(att.expires_at)} mono={false} />
          </dl>
        </section>
      )}

      <section className="bg-bg-secondary border border-border rounded-xl p-6" aria-label="About attestations">
        <h2 className="text-lg font-bold text-text-primary mb-3">
          <Clock className="w-5 h-5 inline mr-2 text-accent-primary" aria-hidden="true" />
          How this works
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-text-secondary">
          <li>An AI agent calls a TensorFeed premium endpoint with <code className="font-mono text-text-primary">?attest=store</code> (1 extra credit).</li>
          <li>TensorFeed signs the response receipt with its Ed25519 key and stores it for 90 days under a public id.</li>
          <li>Anyone the agent shows that id to can fetch the record here and verify the signature against the published key at <code className="font-mono text-text-primary break-all">/.well-known/tensorfeed-receipt-key.json</code>.</li>
        </ol>
        <div className="flex flex-wrap gap-3 mt-4">
          <Link href="/developers" className="flex items-center gap-1.5 text-sm text-accent-primary hover:underline">
            <Hash className="w-4 h-4" aria-hidden="true" /> API docs on /developers
          </Link>
          <Link href="/agent-fair-trade" className="flex items-center gap-1.5 text-sm text-accent-primary hover:underline">
            <ExternalLink className="w-4 h-4" aria-hidden="true" /> Agent Fair Trade promises
          </Link>
        </div>
      </section>
    </main>
  );
}
