import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { settingsService, type AppSettings } from '../../../services/settings.service';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface IntegrationStatus {
  meta?: { configured: boolean; message: string };
  elevenlabs?: { configured: boolean; message: string };
  twilio?: { configured: boolean; connected: boolean; message: string; voiceWebhookUrl?: string; statusWebhookUrl?: string };
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--steel-slate)]">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-[var(--steel-slate)] italic">{hint}</p>}
    </div>
  );
}

function IntegrationBadge({ ok, message }: { ok: boolean; message: string }) {
  return (
    <Badge variant={ok ? "success" : "destructive"} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
      {message}
    </Badge>
  );
}

export default function SettingsPage() {
  const [form, setForm] = useState<AppSettings>({
    webhookUrl: '', calendlyUrl: '', twilioToken: '',
    elevenLabsKey: '', defaultSystemPrompt: '',
  });
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
  });

  const { data: integrations, isLoading: integrationsLoading } = useQuery<IntegrationStatus>({
    queryKey: ['integration-status'],
    queryFn: settingsService.getIntegrationStatus,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (data) setForm(data || {
        webhookUrl: '', calendlyUrl: '', twilioToken: '',
        elevenLabsKey: '', defaultSystemPrompt: '',
    });
  }, [data]);

  const mutation = useMutation({
    mutationFn: settingsService.update,
    onSuccess: (updated) => {
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-10 pb-20">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--steel-shadow)]">Paramètres Système</h1>
          <p className="text-[var(--steel-slate)] mt-1 font-medium">Configuration globale de la plateforme Penra</p>
        </div>
        <div className="flex items-center gap-3">
            {saved && (
                <span className="text-xs font-bold text-green-600 uppercase tracking-widest animate-pulse">Configuration enregistrée</span>
            )}
            <Button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending}
              className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-8 font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-200"
            >
              {mutation.isPending ? 'Enregistrement...' : 'Sauvegarder'}
            </Button>
        </div>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-10">
        {/* Integration status */}
        <Card className="border-[var(--steel-alabaster)] shadow-sm bg-white">
          <CardHeader className="bg-[var(--steel-snow)]/30 border-b border-[var(--steel-snow)]">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-[var(--steel-shadow)]">
              État des services connectés
            </CardTitle>
            <CardDescription className="text-xs font-medium text-[var(--steel-slate)]">Vérification en temps réel des APIs tierces</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {integrationsLoading ? (
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--steel-slate)] uppercase">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyse des connexions...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <IntegrationBadge
                  ok={!!integrations?.meta?.configured}
                  message={integrations?.meta?.message ?? 'Facebook/Instagram'}
                />
                <IntegrationBadge
                  ok={!!integrations?.twilio?.connected}
                  message={integrations?.twilio?.message ?? 'Twilio Voice'}
                />
                <IntegrationBadge
                  ok={!!integrations?.elevenlabs?.configured}
                  message={integrations?.elevenlabs?.message ?? 'ElevenLabs IA'}
                />
              </div>
            )}

            {integrations?.twilio?.voiceWebhookUrl && (
              <div className="space-y-3 pt-4 border-t border-[var(--steel-snow)]">
                <p className="text-[10px] uppercase font-bold text-[var(--steel-slate)] tracking-wider">Configuration Webhook Voice (Console Twilio)</p>
                <div className="bg-white border border-[var(--steel-alabaster)] px-4 py-3 rounded-xl font-mono text-[11px] text-[var(--steel-slate)] break-all select-all cursor-copy hover:bg-[var(--steel-snow)]/50 transition-colors">
                  {integrations.twilio.voiceWebhookUrl}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Automatisations */}
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                  <span className="w-6 h-[1px] bg-indigo-200"></span>
                  Automatisations
              </h2>

              <Card className="border-[var(--steel-alabaster)] shadow-sm bg-white">
                  <CardContent className="p-6 space-y-6">
                      <FieldGroup
                          label="Webhook de Notification (Make/n8n)"
                          hint="URL utilisée pour déclencher vos scénarios d'automatisation."
                      >
                          <Input
                              className="bg-white border-[var(--steel-alabaster)] h-11 text-sm"
                              type="url"
                              value={form.webhookUrl}
                              onChange={e => set('webhookUrl', e.target.value)}
                              placeholder="https://..."
                          />
                      </FieldGroup>

                      <FieldGroup
                          label="Lien Prise de RDV (Calendly)"
                          hint="Lien par défaut utilisé par les agents vocaux."
                      >
                          <Input
                              className="bg-white border-[var(--steel-alabaster)] h-11 text-sm"
                              type="url"
                              value={form.calendlyUrl}
                              onChange={e => set('calendlyUrl', e.target.value)}
                              placeholder="https://..."
                          />
                      </FieldGroup>
                  </CardContent>
              </Card>
            </section>

            {/* Sécurité APIs */}
            <section className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                    <span className="w-6 h-[1px] bg-indigo-200"></span>
                    Accès & APIs
                </h2>

                <Card className="border-[var(--steel-alabaster)] shadow-sm bg-white">
                    <CardContent className="p-6 space-y-6">
                        <FieldGroup
                            label="Token Twilio"
                            hint="Utilisé pour la gestion dynamique des numéros de téléphone."
                        >
                            <Input
                                className="bg-white border-[var(--steel-alabaster)] h-11 text-sm font-mono"
                                type="password"
                                value={form.twilioToken}
                                onChange={e => set('twilioToken', e.target.value)}
                                placeholder="••••••••••••••••"
                            />
                        </FieldGroup>

                        <FieldGroup
                            label="Clé API ElevenLabs"
                            hint="Accès à la synthèse vocale pour les agents IA."
                        >
                            <Input
                                className="bg-white border-[var(--steel-alabaster)] h-11 text-sm font-mono"
                                type="password"
                                value={form.elevenLabsKey}
                                onChange={e => set('elevenLabsKey', e.target.value)}
                                placeholder="sk_••••••••••••••••"
                            />
                        </FieldGroup>
                    </CardContent>
                </Card>
            </section>

            {/* IA Configuration */}
            <section className="col-span-full space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                    <span className="w-6 h-[1px] bg-indigo-200"></span>
                    Intelligence Artificielle
                </h2>

                <Card className="border-[var(--steel-alabaster)] shadow-sm bg-white">
                    <CardContent className="p-6">
                        <FieldGroup
                            label="Prompt Système par Défaut"
                            hint="Instructions globales appliquées à tous les nouveaux agents créés."
                        >
                            <Textarea
                                className="min-h-[160px] bg-white border-[var(--steel-alabaster)] text-sm resize-none leading-relaxed"
                                value={form.defaultSystemPrompt}
                                onChange={e => set('defaultSystemPrompt', e.target.value)}
                                placeholder="Tu es un assistant virtuel professionnel..."
                            />
                        </FieldGroup>
                    </CardContent>
                </Card>
            </section>
        </div>

        {mutation.isError && (
          <p className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {(mutation.error as Error)?.message || 'Erreur lors de la sauvegarde'}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className={cn(
              'px-8 min-w-[160px]',
              saved && 'bg-green-600 hover:bg-green-600'
            )}
          >
            {mutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : saved ? (
              'Sauvegardé'
            ) : (
              'Sauvegarder'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
