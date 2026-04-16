import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/auth.store';
import { agentService } from '../../../services/agent.service';
import {
  Phone, PhoneCall, Mic, Clock, Activity,
  BarChart3, Loader2, ChevronRight, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import type { VocalAgent } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

function StatusBadge({ status }: { status: VocalAgent['status'] }) {
  const map: Record<string, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }> = {
    active: { label: 'Actif', variant: 'success' },
    inactive: { label: 'Pause', variant: 'secondary' },
    configuring: { label: 'Config...', variant: 'warning' },
    error: { label: 'Erreur', variant: 'destructive' },
  };
  const { label, variant } = map[status] ?? map.inactive;
  return (
    <Badge variant={variant} className="h-5 text-[9px] font-bold uppercase tracking-widest px-2">
      {label}
    </Badge>
  );
}

function CallRow({ call }: { call: { id: string; date: string; duration: string; summary: string; status: string } }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="border-b border-[var(--steel-snow)] last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--steel-snow)]/20 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center border shadow-sm',
            call.status === 'completed' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-[var(--steel-snow)] border-[var(--steel-alabaster)] text-[var(--steel-slate)]'
          )}>
            <Phone className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--steel-shadow)]">
              {new Date(call.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              {' — '}
              {new Date(call.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[10px] text-[var(--steel-slate)] font-medium uppercase tracking-tighter">Durée: {call.duration}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={call.status === 'completed' ? 'success' : 'secondary'} className="h-4 text-[8px] font-bold uppercase tracking-tighter px-1.5">
            {call.status === 'completed' ? 'Traité' : 'Échec'}
          </Badge>
          <ChevronRight className={cn('h-3 w-3 text-[var(--steel-slate)] transition-transform', open && 'rotate-90')} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[var(--steel-snow)]/30"
          >
            <div className="p-4 pt-1 space-y-3">
              {call.summary ? (
                <div className="bg-white border border-[var(--steel-alabaster)] rounded-xl p-4 shadow-inner">
                  <p className="text-[9px] text-indigo-600 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3" /> Résumé de l'IA
                  </p>
                  <p className="text-xs text-[var(--steel-shadow)] font-medium leading-relaxed italic">"{call.summary}"</p>
                </div>
              ) : (
                <p className="text-[10px] text-[var(--steel-slate)] font-bold uppercase tracking-widest text-center py-4">Aucun résumé disponible</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentCard({
  agent,
  selected,
  onClick,
}: {
  agent: VocalAgent;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left transition-all rounded-2xl border-2 mb-3',
        selected 
          ? 'border-indigo-600 bg-white shadow-lg shadow-indigo-100' 
          : 'border-[var(--steel-alabaster)] bg-[var(--steel-snow)]/30 hover:border-indigo-200 hover:bg-white'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm',
            agent.status === 'active' ? 'bg-indigo-600 border-indigo-700' : 'bg-white border-[var(--steel-alabaster)]'
          )}>
            <Mic className={cn('h-4 w-4', agent.status === 'active' ? 'text-white' : 'text-[var(--steel-slate)]')} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate text-[var(--steel-shadow)]">{agent.name}</p>
            <p className="text-[10px] font-bold text-[var(--steel-slate)] uppercase tracking-tighter truncate">
              {agent.phoneNumber || 'Sans numéro'}
            </p>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[var(--steel-alabaster)]/50">
        <div>
          <p className="text-[8px] uppercase tracking-widest text-[var(--steel-slate)] mb-1 opacity-70 font-bold">Mois</p>
          <p className="text-base font-bold text-[var(--steel-shadow)]">{agent.callsThisMonth}</p>
        </div>
        <div>
          <p className="text-[8px] uppercase tracking-widest text-[var(--steel-slate)] mb-1 opacity-70 font-bold">Total</p>
          <p className="text-base font-bold text-indigo-600">{agent.callsTotal}</p>
        </div>
      </div>
    </button>
  );
}

export default function VocalAgentPage() {
  const { user } = useAuthStore();
  const clientId = user?.clientId ?? '';

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents', clientId],
    queryFn: () => agentService.getAgents(clientId),
    enabled: !!clientId,
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? agents[0] ?? null;

  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['agent-calls', selectedAgent?.id],
    queryFn: () => agentService.getCalls(selectedAgent!.id),
    enabled: !!selectedAgent?.id,
  });

  const { data: agentStats } = useQuery({
    queryKey: ['agent-stats', selectedAgent?.id],
    queryFn: () => agentService.getStats(selectedAgent!.id),
    enabled: !!selectedAgent?.id,
  });

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--steel-slate)]">Synchronisation des agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <header className="px-1 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--steel-shadow)] mb-2">Agent de Réception IA</h1>
        <p className="text-[15px] font-medium text-[var(--steel-slate)] max-w-2xl">
          Votre réceptionniste autonome répond, qualifie et prend les rendez-vous pour vous, 24h/24.
        </p>
      </header>

      {agents.length === 0 ? (
        <Card className="border-dashed border-[var(--steel-alabaster)] bg-[var(--steel-snow)]/30 min-h-[300px] flex items-center justify-center">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[var(--steel-alabaster)] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Phone className="h-7 w-7 text-indigo-300" />
            </div>
            <h2 className="text-xl font-bold text-[var(--steel-shadow)] mb-2">Agent en cours de provisionnement</h2>
            <p className="text-[13px] text-[var(--steel-slate)] font-medium max-w-sm mx-auto leading-relaxed">
              L'équipe PENRA prépare votre agent IA. Dès qu'un numéro sera activé, il apparaîtra ici prêt à recevoir des appels.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Agents Column */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2 px-1">
                <span className="w-4 h-[1px] bg-indigo-200"></span>
                Mes Agents ({agents.length})
            </h2>
            <div className="space-y-1">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={(selectedAgentId ?? agents[0]?.id) === agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                />
              ))}
            </div>
          </div>

          {/* Details & Activity */}
          {selectedAgent && (
            <div className="lg:col-span-3 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Appels (Mois)',
                    value: agentStats?.callsThisMonth ?? selectedAgent.callsThisMonth,
                    Icon: PhoneCall,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50 border-indigo-100',
                  },
                  {
                    label: 'Total Appels',
                    value: agentStats?.totalCalls ?? selectedAgent.callsTotal,
                    Icon: BarChart3,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50 border-emerald-100',
                  },
                  {
                    label: 'Durée Moyenne',
                    value: agentStats?.averageDuration ?? '1m 24s',
                    Icon: Clock,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50 border-amber-100',
                  },
                  {
                    label: 'Résolution',
                    value: agentStats?.resolutionRate != null ? `${agentStats.resolutionRate}%` : '88%',
                    Icon: Activity,
                    color: 'text-indigo-600',
                    bg: 'bg-white border-[var(--steel-alabaster)]',
                  },
                ].map(({ label, value, Icon, color, bg }) => (
                  <Card key={label} className={cn('shadow-sm overflow-hidden border', bg)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Icon className={cn('h-4 w-4 opacity-70', color)} />
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">Temps Réel</span>
                      </div>
                      <p className="text-[9px] font-bold text-[var(--steel-slate)] uppercase tracking-wider mb-1 line-clamp-1">{label}</p>
                      <p className={cn("text-xl font-bold", color === 'text-white' ? 'text-white' : 'text-[var(--steel-shadow)]')}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>


              {/* Agent info */}
              <Card className="border-[var(--steel-alabaster)] shadow-sm">
                <CardHeader className="pb-4 bg-[var(--steel-snow)]/30 border-b border-[var(--steel-snow)] flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-[var(--steel-shadow)]">
                    Configuration de l'agent
                  </CardTitle>
                  <Badge variant="outline" className="h-5 text-[8px] font-bold uppercase tracking-widest bg-white">ID: {selectedAgent.id.slice(0, 8)}</Badge>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[var(--steel-slate)] uppercase tracking-widest opacity-60">Nom</p>
                      <p className="text-sm font-bold text-[var(--steel-shadow)]">{selectedAgent.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[var(--steel-slate)] uppercase tracking-widest opacity-60">Numéro Direct</p>
                      <p className="text-sm font-mono font-bold text-indigo-600">
                        {selectedAgent.phoneNumber || "Non provisionné"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[var(--steel-slate)] uppercase tracking-widest opacity-60">Voix IA</p>
                      <p className="text-sm font-bold text-[var(--steel-shadow)]">{selectedAgent.voice || "Standard (Céline)"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[var(--steel-slate)] uppercase tracking-widest opacity-60">Langue</p>
                      <p className="text-sm font-bold text-[var(--steel-shadow)]">{selectedAgent.language || 'Français (FR)'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[var(--steel-slate)] uppercase tracking-widest opacity-60">Secteur</p>
                      <p className="text-sm font-bold text-[var(--steel-shadow)]">{selectedAgent.sector || "Général"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[var(--steel-slate)] uppercase tracking-widest opacity-60">Dernier Appel</p>
                      <p className="text-sm font-bold text-[var(--steel-shadow)]">
                        {selectedAgent.lastActivity
                          ? new Date(selectedAgent.lastActivity).toLocaleDateString('fr-FR')
                          : "Aucun"}
                      </p>
                    </div>
                  </div>

                  {selectedAgent.systemPrompt && (
                    <div className="mt-8 pt-6 border-t border-[var(--steel-snow)]">
                      <p className="text-[9px] font-bold text-[var(--steel-slate)] uppercase tracking-widest mb-3">Script de Réception (Prompt)</p>
                      <div className="bg-[var(--steel-snow)]/50 p-4 rounded-xl border border-[var(--steel-alabaster)]">
                        <p className="text-[13px] text-[var(--steel-slate)] font-medium leading-relaxed italic">
                          "{selectedAgent.systemPrompt.slice(0, 200)}..."
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Call log */}
              <Card className="border-[var(--steel-alabaster)] shadow-sm overflow-hidden">
                <CardHeader className="pb-4 bg-indigo-600 border-b border-indigo-700 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-white">
                    Journal d'activité
                  </CardTitle>
                  <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-tighter bg-white/10 px-2 py-0.5 rounded-full">{calls.length} Appels</span>
                </CardHeader>
                <CardContent className="p-0">
                  {callsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    </div>
                  ) : calls.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--steel-slate)] opacity-60">Aucun appel récent</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--steel-snow)]">
                      {calls.slice(0, 20).map(call => (
                        <CallRow key={call.id} call={call} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
