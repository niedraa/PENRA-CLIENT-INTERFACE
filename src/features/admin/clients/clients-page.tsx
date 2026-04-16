import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../../../services/client.service';
import type { Client } from '../../../types';
import {
  Plus, Search, Trash2, X, Loader2,
  AlertCircle, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Client['status'] }) {
  const variantMap: Record<Client['status'], "success" | "destructive" | "warning"> = {
    active: 'success',
    inactive: 'destructive',
    pending: 'warning',
  };
  
  const labelMap = {
    active: 'Actif',
    inactive: 'Inactif',
    pending: 'En attente',
  };

  return (
    <Badge variant={variantMap[status]} className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
      {labelMap[status]}
    </Badge>
  );
}

// ─── Client Form Modal ─────────────────────────────────────────────────────────

const EMPTY_FORM: Partial<Client> = {
  name: '', email: '', company: '', phone: '',
  status: 'active', subscriptionPlan: 'Premium',
  monthlyPrice: 0, services: [],
  nextRenewal: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
};

function ClientModal({
  client,
  onClose,
  onSave,
  saving,
  error,
}: {
  client: Partial<Client>;
  onClose: () => void;
  onSave: (data: Partial<Client>) => void;
  saving: boolean;
  error?: string | null;
}) {
  const [form, setForm] = useState<Partial<Client>>(client);
  const set = (k: keyof Client, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleService = (s: 'instagram' | 'vocal' | 'website') => {
    const cur = (form.services as string[]) ?? [];
    const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s];
    set('services', next as Client['services']);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--steel-shadow)]/40 backdrop-blur-sm flex items-center justify-center p-4">

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white border border-[var(--steel-alabaster)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--steel-alabaster)]">
          <h2 className="text-xl font-bold text-[var(--steel-shadow)]">{client.id ? 'Modifier le client' : 'Nouveau client'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); onSave(form); }}
          className="p-6 space-y-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Nom complet *</label>
              <Input
                required
                value={form.name ?? ''}
                onChange={e => set('name', e.target.value)}
                placeholder="Jean Dupont"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Email *</label>
              <Input
                required
                type="email"
                value={form.email ?? ''}
                onChange={e => set('email', e.target.value)}
                placeholder="jean@exemple.fr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Entreprise *</label>
              <Input
                required
                value={form.company ?? ''}
                onChange={e => set('company', e.target.value)}
                placeholder="ACME SAS"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Téléphone</label>
              <Input
                value={form.phone ?? ''}
                onChange={e => set('phone', e.target.value)}
                placeholder="+33 6 00 00 00 00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Statut</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-[var(--steel-alabaster)] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.status ?? 'active'}
                onChange={e => set('status', e.target.value as Client['status'])}
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="pending">En attente</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Plan</label>
              <Select value={form.subscriptionPlan} onValueChange={(v) => set('subscriptionPlan', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Prix mensuel (€)</label>
              <Input
                type="number"
                min={0}
                value={form.monthlyPrice ?? 0}
                onChange={e => set('monthlyPrice', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Renouvellement</label>
              <Input
                type="date"
                value={form.nextRenewal?.slice(0, 10) ?? ''}
                onChange={e => set('nextRenewal', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#6C757D]">Services inclus</label>
            <div className="flex flex-wrap gap-2">
              {(['instagram', 'vocal', 'website'] as const).map(s => {
                const active = (form.services as string[])?.includes(s);
                return (
                  <Button
                    key={s}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleService(s)}
                    className="h-8 text-[10px] font-bold uppercase tracking-wider"
                  >
                    {s === 'instagram' ? 'Instagram' : s === 'vocal' ? 'Vocal' : 'Site Web'}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--steel-slate)]">Notes internes</label>
            <textarea
              className="w-full min-h-[80px] p-3 rounded-md border border-[var(--steel-alabaster)] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={2}
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Informations supplémentaires..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-xs font-medium">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--steel-alabaster)]">
            <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="min-w-[140px]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (client.id ? 'Sauvegarder' : 'Créer le client')}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Client Row ────────────────────────────────────────────────────────────────

function ClientRow({
  client,
  onEdit,
  onDelete,
  deleting,
}: {
  client: Client;
  onEdit: (c: Client) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const initials = client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border-b border-[var(--steel-alabaster)] hover:bg-[var(--steel-snow)]/50 transition-colors"
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--steel-snow)] border border-[var(--steel-alabaster)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[var(--steel-shadow)] uppercase">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--steel-shadow)]">{client.name}</p>
            <p className="text-[11px] text-[var(--steel-slate)] font-medium">
              {client.email}
            </p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <p className="text-sm font-medium text-[var(--steel-shadow)]">
          {client.company}
        </p>
        <p className="text-[10px] text-[var(--steel-slate)] mt-0.5 uppercase tracking-tight font-medium">
          {client.phone || 'Pas de téléphone'}
        </p>
      </td>
      <td className="p-4">
        <StatusBadge status={client.status} />
      </td>
      <td className="p-4">
        <p className="text-sm font-semibold text-[var(--steel-shadow)]">{client.subscriptionPlan}</p>
        <p className="text-[10px] text-[var(--steel-slate)] mt-0.5 uppercase font-medium">
          {client.monthlyPrice.toLocaleString('fr-FR')}€ / mois
        </p>
      </td>
      <td className="p-4">
        <div className="flex flex-wrap gap-1">
          {(client.services ?? []).map(s => (
            <Badge key={s} variant="secondary" className="px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-tight bg-[var(--steel-platinum)]/50 text-[var(--steel-slate)]">
              {s}
            </Badge>
          ))}
        </div>
      </td>
      <td className="p-4">
        <p className="text-[11px] font-medium text-[var(--steel-slate)]">
          {new Date(client.nextRenewal).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </p>
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(client)} className="h-8 text-[11px] font-bold text-indigo-600 uppercase">
            Modifier
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (confirm('Supprimer ce client ?')) onDelete(client.id);
            }} 
            disabled={deleting}
            className="h-8 text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 uppercase"
          >
            {deleting ? '...' : 'Supprimer'}
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [modalClient, setModalClient] = useState<Partial<Client> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientService.getClients(search || undefined),
  });

  const { data: stats } = useQuery({
    queryKey: ['client-stats'],
    queryFn: clientService.getStats,
  });

  const createMutation = useMutation({
    mutationFn: clientService.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-stats'] });
      setModalClient(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientService.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-stats'] });
      setModalClient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientService.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-stats'] });
      setDeleteConfirm(null);
    },
  });

  const handleSave = (data: Partial<Client>) => {
    if (data.id) {
      updateMutation.mutate({ id: data.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const saveError =
    (createMutation.error as Error)?.message ||
    (updateMutation.error as Error)?.message ||
    null;

  return (
    <div className="max-w-7xl space-y-8 pb-10">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--steel-shadow)]">Clients</h1>
          <p className="text-[var(--steel-slate)] mt-2 font-medium">Gérez vos clients et leurs abonnements.</p>
        </div>
        <Button
          onClick={() => setModalClient(EMPTY_FORM)}
          className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-bold text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Nouveau client
        </Button>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats?.total ?? '—' },
          { label: 'Actifs', value: stats?.active ?? '—' },
          { label: 'Inactifs', value: stats?.inactive ?? '—' },
          { label: 'MRR', value: stats ? `${stats.mrr.toLocaleString('fr-FR')} €` : '—' },
        ].map(({ label, value }) => (
          <Card key={label} className="border-[var(--steel-alabaster)] bg-white shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold text-[var(--steel-slate)] uppercase tracking-widest mb-1">{label}</p>
              <p className="text-2xl font-bold text-[var(--steel-shadow)]">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Table */}
      <div className="bg-white border border-[var(--steel-alabaster)] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--steel-snow)] flex items-center justify-between bg-[var(--steel-snow)]/30">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--steel-slate)]" />
            <Input
              className="w-full pl-9 h-10 text-sm bg-white border-[var(--steel-alabaster)]"
              placeholder="Rechercher un client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="text-[10px] bg-white border-[var(--steel-alabaster)] text-[var(--steel-slate)] px-3">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-[#6C757D]" />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-[var(--steel-slate)]" />
            <p className="text-[var(--steel-slate)] text-sm font-bold uppercase tracking-widest">
              {search ? 'Aucun résultat' : 'Aucun client pour l\'instant'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--steel-alabaster)]">
                  {['Client', 'Entreprise', 'Statut', 'Plan', 'Services', 'Renouvellement', ''].map(h => (
                    <th key={h} className="p-4 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--steel-slate)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {clients.map(client => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      onEdit={c => setModalClient(c)}
                      onDelete={id => setDeleteConfirm(id)}
                      deleting={deleteMutation.isPending && deleteMutation.variables === client.id}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-[#212529]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#DEE2E6] rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="font-bold text-lg mb-2">Supprimer ce client ?</h3>
              <p className="text-sm text-[#6C757D] mb-6">
                Cette action supprimera le client et toutes ses données (agents, automations). Irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#E9ECEF] hover:bg-[#DEE2E6] transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit modal */}
      <AnimatePresence>
        {modalClient && (
          <ClientModal
            client={modalClient}
            onClose={() => setModalClient(null)}
            onSave={handleSave}
            saving={saving}
            error={saveError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
