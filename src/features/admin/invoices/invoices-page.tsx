import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../../../services/invoice.service';
import { clientService } from '../../../services/client.service';
import type { Invoice } from '../../../types';
import {
  Loader2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const map: Record<Invoice['status'], { label: string; variant: "success" | "warning" | "destructive" }> = {
    paid: { label: 'Payée', variant: 'success' },
    pending: { label: 'En attente', variant: 'warning' },
    overdue: { label: 'En retard', variant: 'destructive' },
  };
  const { label, variant } = map[status];
  return (
    <Badge variant={variant} className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
      {label}
    </Badge>
  );
}

interface LineItem { description: string; quantity: number; unitPrice: number }

function CreateModal({
  clients,
  onClose,
  onSave,
}: {
  clients: { id: string; company: string }[];
  onClose: () => void;
  onSave: (clientId: string, items: LineItem[]) => void;
}) {
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);

  const addLine = () => setItems(i => [...i, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeLine = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const setLine = <K extends keyof LineItem>(idx: number, key: K, val: LineItem[K]) =>
    setItems(items => items.map((item, j) => j === idx ? { ...item, [key]: val } : item));

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--steel-shadow)]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white border border-[var(--steel-alabaster)] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--steel-snow)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--steel-shadow)]">Nouvelle facture</h2>
            <p className="text-xs text-[var(--steel-slate)] font-medium">Saisissez les détails de facturation pour le client</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 rounded-full">
            <X className="h-5 w-5 text-[var(--steel-slate)]" />
          </Button>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); onSave(clientId, items); }}
          className="p-6 space-y-6 overflow-y-auto"
        >
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--steel-slate)]">Client destinataire</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-11 bg-[var(--steel-snow)] border-[var(--steel-alabaster)]">
                <SelectValue placeholder="Choisir un client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--steel-slate)]">Lignes de facturation</Label>
              <Button
                variant="outline"
                type="button"
                onClick={addLine}
                className="h-7 text-[10px] font-bold uppercase px-3 border-indigo-200 text-indigo-600"
              >
                + Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    required
                    className="col-span-6 h-10 border-[var(--steel-alabaster)] text-sm"
                    placeholder="Désignation de la prestation"
                    value={item.description}
                    onChange={e => setLine(idx, 'description', e.target.value)}
                  />
                  <Input
                    required
                    type="number"
                    min={1}
                    className="col-span-2 h-10 border-[var(--steel-alabaster)] text-sm text-center"
                    placeholder="Qté"
                    value={item.quantity}
                    onChange={e => setLine(idx, 'quantity', Number(e.target.value))}
                  />
                  <Input
                    required
                    type="number"
                    min={0}
                    step={0.01}
                    className="col-span-3 h-10 border-[var(--steel-alabaster)] text-sm"
                    placeholder="Prix u. (€)"
                    value={item.unitPrice}
                    onChange={e => setLine(idx, 'unitPrice', Number(e.target.value))}
                  />
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={items.length === 1}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--steel-snow)]">
               <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-[var(--steel-slate)]">Total HT</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
               </div>
            </div>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default function InvoicesPage() {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoiceService.getInvoices,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients(),
    select: data => data.map(c => ({ id: c.id, company: c.company })),
  });

  const createMutation = useMutation({
    mutationFn: ({ clientId, items }: { clientId: string; items: LineItem[] }) =>
      invoiceService.createInvoice({ clientId, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowModal(false);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: invoiceService.markPaid,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const totalMrr = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.amount, 0);

  const pending = invoices.filter(i => i.status === 'pending').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--steel-shadow)]">Facturation</h1>
          <p className="text-[var(--steel-slate)] mt-1 font-medium">Gestion des encaissements et suivi client</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-bold text-xs uppercase tracking-wider"
        >
          Nouvelle facture
        </Button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total factures', value: invoices.length },
          { label: 'En attente', value: pending },
          { label: 'Payées', value: invoices.filter(i => i.status === 'paid').length },
          { label: 'CA encaissé', value: `${totalMrr.toLocaleString('fr-FR')} €` },
        ].map(({ label, value }) => (
          <Card key={label} className="border-[var(--steel-alabaster)] bg-white shadow-sm overflow-hidden">
             <CardContent className="p-5">
                <p className="text-[10px] font-bold text-[var(--steel-slate)] uppercase tracking-widest mb-1">{label}</p>
                <p className="text-3xl font-bold text-[var(--steel-shadow)]">{value}</p>
             </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[var(--steel-alabaster)] rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 border-b border-[var(--steel-snow)] flex items-center justify-between bg-[var(--steel-snow)]/30">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--steel-shadow)]">
            Registre des factures
          </h3>
          <Badge variant="outline" className="text-[10px] bg-white border-[var(--steel-alabaster)] text-[var(--steel-slate)] px-3">
            {invoices.length} document{invoices.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--steel-slate)]" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-[var(--steel-slate)] font-bold text-sm tracking-widest uppercase">Aucun document trouvé</p>
            <p className="text-xs text-[var(--steel-slate)] mt-1">Générez votre première facture pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--steel-alabaster)] bg-[var(--steel-snow)]/10">
                  {['Référence', 'Client', 'Montant', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--steel-slate)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {invoices.map(inv => (
                    <motion.tr
                      key={inv.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-[var(--steel-alabaster)] hover:bg-[var(--steel-snow)]/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold text-[var(--steel-slate)]">#{inv.id.slice(0, 8).toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[var(--steel-shadow)]">
                          {inv.clientName}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-indigo-600">
                          {inv.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-[var(--steel-slate)]">
                          {new Date(inv.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        {inv.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markPaidMutation.mutate(inv.id)}
                            disabled={markPaidMutation.isPending && markPaidMutation.variables === inv.id}
                            className="h-8 text-[10px] font-bold uppercase tracking-tight border-green-200 text-green-600 hover:bg-green-50"
                          >
                            {markPaidMutation.isPending && markPaidMutation.variables === inv.id
                              ? '...'
                              : 'Marquer Payée'}
                          </Button>
                        )}
                        {inv.status === 'paid' && (
                            <span className="text-[10px] font-bold uppercase text-green-600">Archivée</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <CreateModal
            clients={clients}
            onClose={() => setShowModal(false)}
            onSave={(clientId, items) => createMutation.mutate({ clientId, items })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
