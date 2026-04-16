import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../../services/dashboard.service';
import {
  Activity, Loader2
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { cn } from '../../../lib/utils';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--steel-alabaster)] rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs text-[var(--steel-slate)] mb-1">{label}</p>
      <p className="text-base font-bold text-[var(--steel-shadow)]">
        {payload[0].value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, change
}: {
  label: string;
  value: string | number;
  change?: number;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <Card className="bg-white border-[var(--steel-alabaster)] shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">{label}</p>
          {change !== undefined && (
            <Badge 
              variant="outline" 
              className="px-1.5 py-0.5 text-[10px] font-bold border-[var(--steel-alabaster)] text-[var(--steel-shadow)]"
            >
              {isPositive ? '↑' : '↓'} {Math.abs(change)}%
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-[var(--steel-shadow)]">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Activity Item ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  user_registered:    { color: 'bg-[var(--steel-shadow)]', label: 'Nouvel utilisateur' },
  client_created:     { color: 'bg-[var(--steel-shadow)]', label: 'Client créé' },
  client_updated:     { color: 'bg-[var(--steel-shadow)]', label: 'Client modifié' },
  agent_created:      { color: 'bg-[var(--steel-shadow)]', label: 'Agent créé' },
  agent_updated:      { color: 'bg-[var(--steel-shadow)]', label: 'Agent modifié' },
  automation_created: { color: 'bg-[var(--steel-shadow)]', label: 'Automation créée' },
  automation_toggled: { color: 'bg-[var(--steel-shadow)]', label: 'Automation modifiée' },
  call_received:      { color: 'bg-[var(--steel-shadow)]', label: 'Appel reçu' },
  invoice_created:    { color: 'bg-[var(--steel-shadow)]', label: 'Facture créée' },
  outbound_job_failed:{ color: 'bg-[var(--steel-shadow)]', label: 'Échec DM' },
};

function ActivityItem({ item }: {
  item: { id: string; type: string; message: string; timestamp: string }
}) {
  const cfg = TYPE_CONFIG[item.type] ?? { color: 'bg-[var(--steel-pale-2)]', label: item.type };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--steel-snow)] last:border-0 hover:bg-[var(--steel-snow)]/50 transition-colors px-2 -mx-2 rounded-lg">
      <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', cfg.color)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--steel-shadow)] truncate">{item.message}</p>
        <p className="text-xs text-[var(--steel-pale-2)] mt-0.5">
          {cfg.label} · {new Date(item.timestamp).toLocaleString('fr-FR', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: dashboardService.getAdminDashboard,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#ADB5BD]" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'MRR',
      value: data ? `${data.mrr.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €` : '—',
      change: data?.mrrChange,
    },
    {
      label: 'Clients actifs',
      value: data?.activeClients ?? '—',
      change: data?.clientsChange,
    },
    {
      label: 'Appels traités',
      value: data?.totalCalls ?? '—',
      change: data?.callsChange,
    },
    {
      label: 'Automations actives',
      value: data?.activeAutomations ?? '—',
      change: data?.automationsChange,
    },
  ];

  const chartData = data?.revenueChart ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--steel-shadow)]">Dashboard Admin</h1>
          <p className="text-sm text-[var(--steel-slate)] mt-0.5">Vue d'ensemble de l'activité PENRA.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--steel-slate)] bg-white border border-[var(--steel-alabaster)] px-3 py-1.5 rounded-lg">
          <Activity className="h-3.5 w-3.5 text-[var(--steel-shadow)]" />
          Live · 30s
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <Card className="xl:col-span-2 bg-white border-[var(--steel-alabaster)] shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-[var(--steel-shadow)]">Revenus mensuels</CardTitle>
                <CardDescription className="text-[var(--steel-pale-2)]">12 derniers mois</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[var(--steel-pale-2)]">
                <p className="text-sm">Aucune donnée de facturation</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--steel-shadow)" stopOpacity={0.05} />
                      <stop offset="95%" stopColor="var(--steel-shadow)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--steel-alabaster)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--steel-pale-2)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--steel-pale-2)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}€`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--steel-shadow)"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card className="bg-white border-[var(--steel-alabaster)] shadow-sm">
          <CardHeader className="pb-3 text-sm">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Activité récente</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-tight text-indigo-600">
                Tout voir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-y-auto max-h-[280px]">
              {(data?.recentActivity ?? []).length === 0 ? (
                <p className="text-sm text-[var(--steel-pale-2)] text-center py-8">Aucune activité</p>
              ) : (
                (data?.recentActivity ?? []).map(item => (
                  <ActivityItem key={item.id} item={item} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
