import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/auth.store';
import { dashboardService } from '../../../services/dashboard.service';
import { Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STAT_CARDS = [
  {
    key: 'dmsThisMonth' as const,
    label: 'DMs envoyés (30j)',
    suffix: '',
  },
  {
    key: 'commentsThisMonth' as const,
    label: 'Commentaires vus',
    suffix: '',
  },
  {
    key: 'callsThisMonth' as const,
    label: 'Appels IA (30j)',
    suffix: '',
  },
  {
    key: 'responseRate' as const,
    label: 'Taux de réponse',
    suffix: '%',
  },
];

export default function ClientDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const clientId = user?.clientId ?? '';

  const { data: stats, isLoading } = useQuery({
    queryKey: ['client-dashboard', clientId],
    queryFn: () => dashboardService.getClientDashboard(clientId),
    enabled: !!clientId,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-8 max-w-6xl pb-10">
      {/* Welcome Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--steel-shadow)]">Bonjour, {user?.name || 'Client'}</h1>
          <p className="text-[var(--steel-slate)] mt-1 font-medium">Aperçu de vos performances d'automatisation</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/client/instagram')}
            className="h-10 border-[var(--steel-alabaster)] hover:bg-[var(--steel-snow)] text-black font-bold text-xs uppercase"
          >
            Instagram
          </Button>
          <Button
            onClick={() => navigate('/client/vocal-agent')}
            className="h-10 bg-black hover:bg-black/90 text-white px-6 font-bold text-xs uppercase tracking-wider"
          >
            Agent IA
          </Button>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, suffix }) => {
          const raw = stats?.[key];
          const value = raw != null ? `${raw}${suffix}` : isLoading ? '—' : `0${suffix}`;

          return (
            <Card key={key} className="border-[var(--steel-alabaster)] bg-white shadow-sm overflow-hidden text-left">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                   <p className="text-[10px] font-bold text-[var(--steel-slate)] uppercase tracking-widest">{label}</p>
                   {!isLoading && stats && (
                    <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-tighter">Live</Badge>
                  )}
                </div>
                <p className="text-3xl font-bold text-[var(--steel-shadow)]">{value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <Card className="lg:col-span-2 border-[var(--steel-alabaster)] shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-4 bg-white border-b border-[var(--steel-snow)] flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[var(--steel-shadow)]">Activité récente</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/client/instagram')}
                className="h-7 text-[10px] font-bold uppercase tracking-tight text-black"
              >
                Explorer
              </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--steel-slate)]" />
              </div>
            ) : (
              <div className="divide-y divide-[var(--steel-snow)]">
                {stats && stats.dmsThisMonth > 0 ? (
                  <>
                    <ActivityRow
                      title={`${stats.dmsThisMonth} DMs automatiques envoyés`}
                      sub="Automatisation Instagram active"
                      badge="Livré"
                      badgeVariant="success"
                    />
                    {stats.callsThisMonth > 0 && (
                      <ActivityRow
                        title={`${stats.callsThisMonth} appels traités par l'agent IA`}
                        sub="Agent vocal opérationnel"
                        badge="Traité"
                        badgeVariant="warning"
                      />
                    )}
                    {stats.responseRate > 0 && (
                      <ActivityRow
                        title={`Taux de réponse moyen : ${stats.responseRate}%`}
                        sub={`${stats.commentsThisMonth} commentaires détectés`}
                        badge="Stats"
                        badgeVariant="secondary"
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[10px] font-bold uppercase text-[var(--steel-slate)] tracking-widest">Aucune donnée</p>
                    <p className="text-xs text-[var(--steel-slate)] mt-1">Vos activités s'afficheront ici en temps réel.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <section className="space-y-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-black flex items-center gap-2 px-1">
                <span className="w-4 h-[1px] bg-[var(--steel-alabaster)]"></span>
                Raccourcis
            </h2>
            <div className="space-y-3">
              <QuickActionCard
                label="Automatisation IG"
                desc="Gérer les mots-clés & triggers"
                onClick={() => navigate('/client/instagram')}
              />
              <QuickActionCard
                label="Configuration Agent IA"
                desc="Modifier le script de réponse"
                onClick={() => navigate('/client/vocal-agent')}
              />

              <Card className="border-[var(--steel-alabaster)] bg-white mt-6 shadow-none">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-[var(--steel-slate)] uppercase tracking-wider mb-1">Votre Offre</p>
                  <p className="text-sm font-bold text-[var(--steel-shadow)]">{user?.company || 'Penra Client'}</p>
                  <p className="text-[10px] text-[var(--steel-slate)] mt-0.5 font-medium uppercase tracking-tighter">Support Prioritaire 24/7</p>
                </CardContent>
              </Card>
            </div>
        </section>
      </div>
    </div>
  );
}

function ActivityRow({ title, sub, badge, badgeVariant }: {
  title: string;
  sub: string;
  badge: string;
  badgeVariant: 'success' | 'warning' | 'secondary';
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-[var(--steel-snow)] transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-black"></div>
        <div>
          <p className="text-sm font-bold text-[var(--steel-shadow)]">{title}</p>
          <p className="text-[11px] text-[var(--steel-slate)] font-medium">{sub}</p>
        </div>
      </div>
      <Badge variant={badgeVariant} className="text-[9px] font-bold uppercase px-2 py-0 h-5 tracking-tighter">{badge}</Badge>
    </div>
  );
}

function QuickActionCard({ label, desc, onClick }: {
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--steel-alabaster)] hover:border-black/20 hover:shadow-sm transition-all text-left"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--steel-shadow)] group-hover:text-black transition-colors uppercase tracking-tight">{label}</p>
        <p className="text-[11px] text-[var(--steel-slate)] font-medium mt-0.5">{desc}</p>
      </div>
      <div className="w-7 h-7 rounded-full bg-[var(--steel-snow)] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
         <span className="text-xs">→</span>
      </div>
    </button>
  );
}
