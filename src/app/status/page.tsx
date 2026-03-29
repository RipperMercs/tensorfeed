import { Metadata } from 'next';
import { Activity } from 'lucide-react';
import { MOCK_STATUSES } from '@/lib/mock-data';
import { STATUS_DOTS, STATUS_COLORS } from '@/lib/constants';
import { ServiceStatus, ServiceComponent } from '@/lib/types';

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

function UptimeBar({ uptime }: { uptime: number }) {
  const barColor =
    uptime >= 99.9
      ? 'bg-accent-green'
      : uptime >= 99.0
        ? 'bg-accent-amber'
        : 'bg-accent-red';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted">7-day uptime</span>
        <span className="text-xs font-mono text-text-secondary">{uptime.toFixed(2)}%</span>
      </div>
      <div className="h-1.5 w-full bg-bg-primary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${uptime}%` }}
        />
      </div>
    </div>
  );
}

function formatIncidentDate(dateStr: string | null): string {
  if (!dateStr) return 'None recorded';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusCard({ service }: { service: ServiceStatus }) {
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

      <div className="mb-4">
        <p className="text-xs text-text-muted mb-2">Components</p>
        <div className="space-y-1.5">
          {service.components.map((comp: ServiceComponent) => (
            <div key={comp.name} className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{comp.name}</span>
              <StatusDot status={comp.status} />
            </div>
          ))}
        </div>
      </div>

      <UptimeBar uptime={service.uptime7d} />

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Last incident</span>
          <span className="text-xs text-text-secondary">
            {formatIncidentDate(service.lastIncident)}
          </span>
        </div>
      </div>
    </div>
  );
}

const STATUS_PRIORITY: Record<string, number> = {
  down: 0,
  degraded: 1,
  operational: 2,
};

export default function StatusPage() {
  const statuses = [...MOCK_STATUSES].sort(
    (a, b) => (STATUS_PRIORITY[a.status] ?? 3) - (STATUS_PRIORITY[b.status] ?? 3)
  );

  const operationalCount = statuses.filter((s) => s.status === 'operational').length;
  const degradedCount = statuses.filter((s) => s.status === 'degraded').length;
  const downCount = statuses.filter((s) => s.status === 'down').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
