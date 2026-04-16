import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService } from '../../../services/agent.service';
import { clientService } from '../../../services/client.service';
import type { VocalAgent } from '../../../types';
import {
  Loader2, X, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VocalAgent['status'] }) {
  const map: Record<VocalAgent['status'], { label: string; variant: "success" | "destructive" | "warning" | "secondary" }> = {
    active: { label: 'Actif', variant: 'success' },
    inactive: { label: 'Inactif', variant: 'secondary' },
    configuring: { label: 'Config.', variant: 'warning' },
    error: { label: 'Erreur', variant: 'destructive' },
  };
  const { label, variant } = map[status] ?? { label: 'Inactif', variant: 'secondary' };
  return (
    <Badge variant={variant} className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
      {label}
    </Badge>
  );
}

// ─── Agent Form Modal ──────────────────────────────────────────────────────────

interface AgentFormData {
  clientId: string;
  name: string;
  voice: string;
  sector: string;
  language: string;
  systemPrompt: string;
  tone: string;
}

const EMPTY_AGENT_FORM: AgentFormData = {
  clientId: '', name: '', voice: '', sector: '',
  language: 'fr-FR', systemPrompt: '', tone: 'professional',
};

function AgentModal({
  agent,
  clients,
  onClose,
  onSave,
  saving,
  error,
}: {
  agent: Partial<VocalAgent> & { clientId?: string };
  clients: { id: string; company: string }[];
  onClose: () => void;
  onSave: (data: AgentFormData) => void;
  saving?: boolean;
  error?: string | null;
}) {
  const [form, setForm] = useState<AgentFormData>({
    clientId: agent.clientId ?? '',
    name: agent.name ?? '',
    voice: agent.voice ?? '',
    sector: agent.sector ?? '',
    language: agent.language ?? 'fr-FR',
    systemPrompt: (agent as VocalAgent).systemPrompt ?? '',
    tone: 'professional',
  });
  const set = <K extends keyof AgentFormData>(k: K, v: AgentFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-[var(--steel-shadow)]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white border border-[var(--steel-alabaster)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--steel-snow)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--steel-shadow)]">
              {agent.id ? 'Modifier l\'agent' : 'Nouvel agent IA'}
            </h2>
            <p className="text-xs text-[var(--steel-slate)] font-medium">Configurez les paramètres de l'assistant vocal</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 rounded-full">
            <X className="h-5 w-5 text-[var(--steel-slate)]" />
          </Button>
        </div>

        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--steel-slate)]">Client propriétaire</Label>
            <Select value={form.clientId} onValueChange={(v) => set('clientId', v)}>
              <SelectTrigger className="w-full h-11 bg-[var(--steel-snow)] border-[var(--steel-alabaster)]">
                <SelectValue placeholder="Choisir un client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--steel-slate)]">Nom de l'agent</Label>
            <Input
              required
              className="h-11 bg-[var(--steel-snow)] border-[var(--steel-alabaster)]"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Concierge Penra"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--steel-slate)]">ID Voix (ElevenLabs)</Label>
              <Input
                className="h-11 bg-[var(--steel-snow)] border-[var(--steel-alabaster)] font-mono text-xs"
                value={form.voice}
                onChange={e => set('voice', e.target.value)}
                placeholder="Rachel"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--steel-slate)]">Langue</Label>
              <Select value={form.language} onValueChange={(v) => set('language', v)}>
                <SelectTrigger className="h-11 bg-[var(--steel-snow)] border-[var(--steel-alabaster)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr-FR">Français (fr-FR)</SelectItem>
                  <SelectItem value="en-US">English (en-US)</SelectItem>
                  <SelectItem value="es-ES">Español (es-ES)</SelectItem>
                  <SelectItem value="de-DE">Deutsch (de-DE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--steel-slate)]">Script Système (Prompt)</Label>
            <Textarea
              className="min-h-[140px] bg-[var(--steel-snow)] border-[var(--steel-alabaster)] text-sm resize-none"
              value={form.systemPrompt}
              onChange={e => set('systemPrompt', e.target.value)}
              placeholder="Tu es un assistant virtuel pour..."
            />
            <p className="text-[10px] text-[var(--steel-slate)] italic">
              Indiquez les instructions précises sur le comportement de l'IA.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 border border-red-100 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--steel-snow)]">
            <Button type="button" variant="ghost" onClick={onClose} className="font-bold text-[var(--steel-slate)] uppercase text-xs">
              Annuler
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 font-bold uppercase text-xs tracking-wider">
              {saving ? 'Enregistrement...' : (agent.id ? 'Sauvegarder' : 'Créer l\'agent')}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Agent Card ────────────────────────────────────────────────────────────────


function AgentCard({
  agent,
  onEdit,
  onDelete,
  onProvision,
  provisioning,
  deleting,
}: {
  agent: VocalAgent;
  onEdit: (a: VocalAgent) => void;
  onDelete: (id: string) => void;
  onProvision: (id: string) => void;
  provisioning: boolean;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-white border border-[var(--steel-alabaster)] rounded-xl shadow-sm overflow-hidden"
    >
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border border-[var(--steel-alabaster)]',
            agent.status === 'active' ? 'bg-indigo-50 border-indigo-100' : 'bg-[var(--steel-snow)]'
          )}>
             <p className="text-[10px] font-bold text-[var(--steel-shadow)] uppercase">Agent</p>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-[var(--steel-shadow)] truncate">{agent.name}</p>
              <StatusBadge status={agent.status} />
            </div>
            <p className="text-xs text-[var(--steel-slate)] font-medium truncate">
              {agent.clientName} · <span className="font-mono">{agent.phoneNumber || 'Sans numéro'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:flex gap-4 mr-4">
            <div className="text-center">
              <p className="text-[10px] text-[var(--steel-slate)] uppercase font-bold">Ce mois</p>
              <p className="text-lg font-bold text-[var(--steel-shadow)]">
                {agent.callsThisMonth}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-[var(--steel-slate)] uppercase font-bold">Total</p>
              <p className="text-lg font-bold text-[var(--steel-shadow)]">{agent.callsTotal}</p>
            </div>
          </div>

          {!agent.phoneNumber && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onProvision(agent.id)}
              disabled={provisioning}
              className="h-8 text-[10px] font-bold uppercase tracking-tight border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              {provisioning ? '...' : 'Provisionner'}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(v => !v)}
            className="h-8 text-[11px] font-bold text-indigo-600 uppercase"
          >
            {expanded ? 'Fermer' : 'Détails'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(agent)}
            className="h-8 text-[11px] font-bold text-indigo-600 uppercase"
          >
            Modifier
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
                if (confirm('Supprimer cet agent ?')) onDelete(agent.id);
            }}
            disabled={deleting}
            className="h-8 text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 uppercase"
          >
            {deleting ? '...' : 'Supprimer'}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 border-t border-[#DEE2E6] grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-4">
              <div>
                <p className="text-[#6C757D] text-xs mb-1">Voix</p>
                <p className="font-medium">{agent.voice || 'Polly.Celine'}</p>
              </div>
              <div>
                <p className="text-[#6C757D] text-xs mb-1">Langue</p>
                <p className="font-medium">{agent.language}</p>
              </div>
              <div>
                <p className="text-[#6C757D] text-xs mb-1">Secteur</p>
                <p className="font-medium">{agent.sector || '—'}</p>
              </div>
              <div>
                <p className="text-[#6C757D] text-xs mb-1">Dernière activité</p>
                <p className="font-medium">
                  {agent.lastActivity ? new Date(agent.lastActivity).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
              {agent.systemPrompt && (
                <div className="col-span-full">
                  <p className="text-[#6C757D] text-xs mb-1">Script système</p>
                  <p className="text-xs text-[#6C757D] bg-[#F8F9FA] rounded-lg p-3 line-clamp-2">
                    {agent.systemPrompt}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminVocalAgentsPage() {
  const [modalAgent, setModalAgent] = useState<Partial<VocalAgent> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [provisionWarning, setProvisionWarning] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['all-agents'],
    queryFn: () => agentService.getAgents(),
    refetchInterval: 15_000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients(),
    select: (data) => data.map(c => ({ id: c.id, company: c.company })),
  });

  const createMutation = useMutation({
    mutationFn: agentService.createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-agents'] });
      setModalAgent(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof agentService.updateAgent>[1] }) =>
      agentService.updateAgent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-agents'] });
      setModalAgent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: agentService.deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-agents'] });
      setDeleteConfirm(null);
    },
  });

  const provisionMutation = useMutation({
    mutationFn: agentService.provisionPhone,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['all-agents'] });
      if (result.warning) setProvisionWarning(result.warning);
    },
    onError: (err: Error) => setProvisionWarning(err.message),
  });

  const handleSave = (data: { clientId: string; name: string; voice: string; sector: string; language: string; systemPrompt: string; tone: string }) => {
    if (modalAgent?.id) {
      updateMutation.mutate({ id: modalAgent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const saveError =
    (createMutation.error as Error)?.message ||
    (updateMutation.error as Error)?.message ||
    null;

  const totalCalls = agents.reduce((s, a) => s + a.callsTotal, 0);
  const activeAgents = agents.filter(a => a.status === 'active').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--steel-shadow)]">Agents IA Vocaux</h1>
          <p className="text-[var(--steel-slate)] mt-1 font-medium">Gestion centralisée des agents Twilio & ElevenLabs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['all-agents'] })}
            className="h-10 border-[var(--steel-alabaster)] hover:bg-[var(--steel-snow)] text-[var(--steel-slate)] font-bold text-xs uppercase"
          >
            Actualiser
          </Button>
          <Button
            onClick={() => setModalAgent({ clientId: '' })}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-bold text-xs uppercase tracking-wider"
          >
            Nouvel agent
          </Button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total agents', value: agents.length },
          { label: 'Actifs', value: activeAgents },
          { label: 'Total appels', value: totalCalls },
          { label: 'En config.', value: agents.filter(a => a.status === 'configuring').length },
        ].map(({ label, value }) => (
          <Card key={label} className="border-[var(--steel-alabaster)] bg-white shadow-sm overflow-hidden">
             <CardContent className="p-5">
                <p className="text-[10px] font-bold text-[var(--steel-slate)] uppercase tracking-widest mb-1">{label}</p>
                <p className="text-3xl font-bold text-[var(--steel-shadow)]">{value}</p>
             </CardContent>
          </Card>
        ))}
      </div>

      {/* Provision warning */}
      <AnimatePresence>
        {provisionWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="text-sm font-medium flex-1">{provisionWarning}</p>
            <Button variant="ghost" size="sm" onClick={() => setProvisionWarning(null)} className="h-8 w-8 p-0 hover:bg-amber-100">
               <X className="h-4 w-4 text-amber-600" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agents list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--steel-slate)]" />
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white border border-[var(--steel-alabaster)] p-16 text-center rounded-2xl">
          <p className="text-[var(--steel-slate)] font-bold text-sm tracking-widest uppercase">Aucun agent configuré</p>
          <p className="text-xs text-[var(--steel-slate)] mt-1">Créez votre premier agent vocal pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={a => setModalAgent(a)}
                onDelete={id => setDeleteConfirm(id)}
                onProvision={id => provisionMutation.mutate(id)}
                provisioning={provisionMutation.isPending && provisionMutation.variables === agent.id}
                deleting={deleteMutation.isPending && deleteMutation.variables === agent.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-[var(--steel-shadow)]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--steel-alabaster)] rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            >
              <h3 className="font-bold text-xl mb-2 text-[var(--steel-shadow)]">Confirmer la suppression</h3>
              <p className="text-sm text-[var(--steel-slate)] font-medium mb-8 leading-relaxed">
                Cet agent et tout son historique seront définitivement supprimés. Cette action est irréversible.
              </p>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1 h-11 font-bold text-[11px] uppercase tracking-wider text-[var(--steel-slate)]">
                  Annuler
                </Button>
                <Button
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  variant="destructive"
                  className="flex-1 h-11 px-6 font-bold text-[11px] uppercase tracking-wider"
                >
                  {deleteMutation.isPending ? '...' : 'Supprimer'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit modal */}
      <AnimatePresence>
        {modalAgent !== null && (
          <AgentModal
            agent={modalAgent}
            clients={clients}
            onClose={() => setModalAgent(null)}
            onSave={handleSave}
            saving={saving}
            error={saveError ?? undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
