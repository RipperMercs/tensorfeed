import { Metadata } from 'next';
import { Activity } from 'lucide-react';
import { STATUS_DOTS, STATUS_COLORS } from '@/lib/constants';
import { WebApplicationJsonLd } from '@/components/seo/JsonLd';

interface StatusService {
  name: string;
  provider: string;
  status: string;
  statusPageUrl?: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
}

async function fetchStatuses(): Promise<StatusService[]> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) return data.services;
    }
  } catch {}
  return [];
}

export const metadata: Metadata = {
  title: 'AI Service Status Dashboard',
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`}
    />
  );
}

function StatusLabel({ status }: { status: string }) {
  return (
    <span className={`text-sm capitalize ${STATUS_COLORS[status] || STATUS_COLORS.unknown}`}>
      {status}
    </span>
  );
}

function StatusCard({ service }: { service: StatusService }) {
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-5 hover:shadow-glow transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-text-primary font-semibold text-base">{service.name}</h3>
          <p className="text-text-muted text-xs mt-0.5">{service.provider}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={service.status} />
          <StatusLabel status={service.status} />
        </div>
      </div>

      {service.components.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-2">Components</p>
          <div className="space-y-1.5">
            {service.components.map((comp) => (
              <div key={comp.name} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{comp.name}</span>
                <StatusDot status={comp.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {service.lastChecked && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Last checked</span>
            <span className="text-xs text-text-secondary font-mono">
              {new Date(service.lastChecked).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_PRIORITY: Record<string, number> = {
  down: 0,
  degraded: 1,
  operational: 2,
};

export default async function StatusPage() {
  const raw = await fetchStatuses();
  const statuses = [...raw].sort(
    (a, b) => (STATUS_PRIORITY[a.status] ?? 3) - (STATUS_PRIORITY[b.status] ?? 3)
  );

  const operationalCount = statuses.filter((s) => s.status === 'operational').length;
  const degradedCount = statuses.filter((s) => s.status === 'degraded').length;
  const downCount = statuses.filter((s) => s.status === 'down').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <WebApplicationJsonLd
        name="TensorFeed AI Service Status Dashboard"
        description="Real-time operational status monitoring for major AI services including Claude, OpenAI, Gemini, and more."
        url="https://tensorfeed.ai/status"
      />
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-6 h-6 text-accent-primary" />
          <h1 className="text-2xl font-bold text-text-primary">AI Service Status</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Real-time operational status of major AI services
        </p>
      </div>

      {/* Summary Bar */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-6 flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-green" />
          <span className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{operationalCount}</span> operational
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-amber" />
          <span className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{degradedCount}</span> degraded
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-red" />
          <span className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{downCount}</span> down
          </span>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statuses.map((service) => (
          <StatusCard key={service.name} service={service} />
        ))}
      </div>
    </div>
  );
}
