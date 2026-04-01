'use client';

import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { STATUS_DOTS, STATUS_COLORS } from '@/lib/constants';

interface StatusService {
  name: string;
  provider: string;
  status: string;
  statusPageUrl?: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
}

const STATUS_PRIORITY: Record<string, number> = {
  down: 0,
  degraded: 1,
  operational: 2,
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

function SkeletonCard() {
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-4 bg-bg-tertiary rounded w-32 mb-2" />
          <div className="h-3 bg-bg-tertiary rounded w-20" />
        </div>
        <div className="h-4 bg-bg-tertiary rounded w-20" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-bg-tertiary rounded w-full" />
        <div className="h-3 bg-bg-tertiary rounded w-3/4" />
      </div>
    </div>
  );
}

export default function StatusDashboard() {
  const [statuses, setStatuses] = useState<StatusService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatuses() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/status');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.services?.length) {
            const sorted = [...data.services].sort(
              (a: StatusService, b: StatusService) =>
                (STATUS_PRIORITY[a.status] ?? 3) - (STATUS_PRIORITY[b.status] ?? 3)
            );
            setStatuses(sorted);
          }
        }
      } catch {}
      setLoading(false);
    }

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 120000);
    return () => clearInterval(interval);
  }, []);

  const operationalCount = statuses.filter((s) => s.status === 'operational').length;
  const degradedCount = statuses.filter((s) => s.status === 'degraded').length;
  const downCount = statuses.filter((s) => s.status === 'down').length;

  return (
    <>
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
          Real-time operational status of major AI services. Updated every 2 minutes.
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
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : statuses.map((service) => <StatusCard key={service.name} service={service} />)}
      </div>
    </>
  );
}
