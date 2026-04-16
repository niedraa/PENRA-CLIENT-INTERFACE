import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink, Loader2, RefreshCw, X, Eye, 
  Trash2, Target, Zap
} from 'lucide-react';
import { InstagramIcon } from '../../../components/ui/instagram-icon';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { instagramService, type IgPost, type IgAutomation } from '../../../services/instagram.service';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';

// ─── Connect Banner ─────────────────────────────────────────────────────────

function ConnectBanner({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  return (
    <Card className="border-[var(--steel-alabaster)] bg-white shadow-sm">
      <CardContent className="p-12 flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--steel-snow)] border border-[var(--steel-alabaster)] shadow-sm flex items-center justify-center">
          <InstagramIcon className="h-8 w-8 text-black" />
        </div>
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-[var(--steel-shadow)] mb-2">Connectez votre compte Instagram</h2>
          <p className="text-[13px] text-[var(--steel-slate)] leading-relaxed font-medium">
            Activez les automatisations de DM et boostez votre engagement en connectant votre compte Business.
          </p>
        </div>
        <Button 
            onClick={onConnect} 
            disabled={connecting} 
            size="lg"
            className="rounded-full px-8 bg-black hover:bg-black/90 text-white shadow-md shadow-black/5"
        >
          {connecting ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Connexion...</>
          ) : (
            <>Connecter mon compte</>
          )}
        </Button>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--steel-slate)] opacity-80">
          REQUIERT UN COMPTE BUSINESS OU CREATOR
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Post Picker ─────────────────────────────────────────────────────────────

function PostPicker({
  posts,
  selectedId,
  onSelect,
}: {
  posts: IgPost[];
  selectedId: string;
  onSelect: (post: IgPost) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = posts.find(p => p.id === selectedId);

  return (
    <div className="relative">
      <Button
        variant="outline"
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full justify-between font-medium border-[var(--steel-alabaster)] bg-white h-11"
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="" className="w-5 h-5 rounded-sm object-cover flex-shrink-0" />
            )}
            <span className="truncate text-xs">{selected.caption?.slice(0, 50) || 'Post sans texte'}</span>
          </span>
        ) : (
          <span className="text-[var(--steel-slate)] text-xs">Choisir une publication...</span>
        )}
        <span className={cn('text-[var(--steel-slate)] transition-transform text-[10px]', open && 'rotate-180')}>▼</span>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 bg-white border border-[var(--steel-alabaster)] rounded-xl shadow-xl max-h-72 overflow-y-auto p-1"
          >
            {posts.length === 0 ? (
              <p className="p-4 text-xs text-[var(--steel-slate)] text-center font-bold uppercase tracking-widest">Aucun post trouvé</p>
            ) : (
              posts.map(post => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => { onSelect(post); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 p-2 hover:bg-[var(--steel-snow)] rounded-lg transition-colors text-left',
                    selectedId === post.id && 'bg-indigo-50 border border-indigo-100'
                  )}
                >
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-[var(--steel-snow)] flex items-center justify-center flex-shrink-0">
                      <InstagramIcon className="h-3 w-3 text-[var(--steel-slate)]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[var(--steel-shadow)] truncate leading-tight">{post.caption?.slice(0, 45) || '(Engagement)'}</p>
                    <div className="flex items-center gap-2 mt-1 opacity-70">
                       <span className="text-[9px] font-bold text-[var(--steel-slate)] uppercase">❤️ {post.likes}</span>
                       <span className="text-[9px] font-bold text-[var(--steel-slate)] uppercase">💬 {post.commentsCount}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Automation Card ──────────────────────────────────────────────────────────

function AutomationCard({
  auto,
  onToggle,
  onDelete,
  toggling,
  deleting,
}: {
  auto: IgAutomation;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  toggling: boolean;
  deleting: boolean;
}) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <Card className="border-[var(--steel-alabaster)] shadow-sm hover:shadow-md transition-all overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--steel-snow)] border border-[var(--steel-alabaster)] flex items-center justify-center flex-shrink-0">
              <InstagramIcon className="h-4 w-4 text-pink-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs font-bold text-[var(--steel-shadow)]">
                  Trigger: <span className="text-indigo-600">"{auto.triggerKeyword}"</span>
                </p>
                <Badge variant={auto.enabled ? 'success' : 'secondary'} className="h-4 text-[8px] font-bold uppercase tracking-widest px-1.5">
                  {auto.enabled ? 'Actif' : 'Pause'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={auto.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter text-indigo-500/70 hover:text-indigo-600 transition-colors"
                >
                  Voir le post <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <span className="text-[10px] text-[var(--steel-slate)] font-medium truncate max-w-[200px]">
                   {auto.dmMessage.slice(0, 40)}...
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-[var(--steel-snow)]">
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--steel-slate)] mb-0.5 opacity-60">Engagement</p>
                <p className="text-sm font-bold text-[var(--steel-shadow)]">{auto.commentsSeen}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--steel-slate)] mb-0.5 opacity-60">DMs</p>
                <p className="text-sm font-bold text-indigo-600">{auto.dmsSent}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTranscript(v => !v)}
                className="h-8 w-8 text-[var(--steel-slate)] hover:text-indigo-600 hover:bg-indigo-50"
              >
                <Eye className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(auto.id)}
                disabled={toggling}
                className={cn(
                    "text-[10px] font-bold uppercase h-8 px-3 rounded-md",
                    auto.enabled ? "text-amber-600 bg-amber-50 hover:bg-amber-100" : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                )}
              >
                {auto.enabled ? 'Pause' : 'Play'}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(auto.id)}
                disabled={deleting}
                className="h-8 w-8 text-[var(--steel-slate)] hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-[var(--steel-snow)] bg-[var(--steel-snow)]/20"
            >
              <div className="p-5">
                <p className="text-[9px] font-bold text-[var(--steel-slate)] uppercase tracking-widest mb-2">Message envoyé en DM</p>
                <div className="bg-white p-4 rounded-xl border border-[var(--steel-alabaster)] shadow-inner">
                    <p className="text-xs text-[var(--steel-shadow)] font-medium leading-relaxed italic">"{auto.dmMessage}"</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstagramPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<IgPost | null>(null);
  const [newForm, setNewForm] = useState({ keyword: '', dmMessage: '', enabled: true });
  const [showForm, setShowForm] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  // ── Handle OAuth callback code in URL ───────────────────────────────────
  const oauthCode = searchParams.get('code');
  const oauthErrorParam = searchParams.get('error');

  const exchangeMutation = useMutation({
    mutationFn: (code: string) => instagramService.connectAccount(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-account'] });
      queryClient.invalidateQueries({ queryKey: ['ig-posts'] });
      setSearchParams({}, { replace: true });
    },
    onError: (err: Error) => {
      setOauthError(err.message || 'Échec de la connexion Instagram');
      setSearchParams({}, { replace: true });
    },
  });

  useEffect(() => {
    if (oauthErrorParam) {
      setOauthError('Connexion refusée par Instagram.');
      setSearchParams({}, { replace: true });
    }
  }, [oauthErrorParam, setSearchParams]);

  useEffect(() => {
    if (oauthCode && !exchangeMutation.isPending) {
      exchangeMutation.mutate(oauthCode);
    }
  }, [oauthCode]);

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['ig-account'],
    queryFn: instagramService.getAccount,
  });

  const { data: posts = [], isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['ig-posts'],
    queryFn: instagramService.getPosts,
    enabled: !!account,
  });

  const { data: automations = [], isLoading: automationsLoading } = useQuery({
    queryKey: ['ig-automations'],
    queryFn: instagramService.getAutomations,
    enabled: !!account,
  });

  const { data: stats } = useQuery({
    queryKey: ['ig-stats'],
    queryFn: instagramService.getStats,
    enabled: !!account,
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: instagramService.createAutomation,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['ig-automations'] });
      queryClient.invalidateQueries({ queryKey: ['ig-stats'] });
      setNewForm({ keyword: '', dmMessage: '', enabled: true });
      setSelectedPost(null);
      setShowForm(false);
      setSuccessId(created.id);
      setTimeout(() => setSuccessId(null), 3000);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: instagramService.toggleAutomation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ig-automations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: instagramService.deleteAutomation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-automations'] });
      queryClient.invalidateQueries({ queryKey: ['ig-stats'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: instagramService.disconnectAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-account'] });
      queryClient.invalidateQueries({ queryKey: ['ig-posts'] });
      queryClient.invalidateQueries({ queryKey: ['ig-automations'] });
    },
  });

  // ── OAuth redirect ─────────────────────────────────────────────────────
  const handleConnect = async () => {
    try {
      setConnectingOAuth(true);
      const { url } = await instagramService.getOAuthUrl();
      window.location.href = url;
    } catch (err) {
      setOauthError((err as Error).message);
      setConnectingOAuth(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;
    createMutation.mutate({
      postId: selectedPost.id,
      postUrl: selectedPost.permalink,
      triggerKeyword: newForm.keyword.toUpperCase(),
      dmMessage: newForm.dmMessage,
      enabled: newForm.enabled,
    });
  };

  // ── Loading state ──────────────────────────────────────────────────────
  if (accountLoading || exchangeMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--steel-slate)]">
            {exchangeMutation.isPending ? 'Synchronisation...' : 'Chargement...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8 pb-20">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--steel-shadow)] mb-2">Instagram Automation</h1>
          <p className="text-[15px] font-medium text-[var(--steel-slate)]">
            Configurez vos triggers automatiques pour transformer vos commentaires en ventes.
          </p>
        </div>

        <div className="flex gap-4">
          <Card className="border-[var(--steel-alabaster)] shadow-sm bg-white min-w-[130px]">
            <CardContent className="p-4 py-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--steel-slate)] mb-1 opacity-60">DMS ENVOYÉS</p>
              <p className="text-2xl font-bold text-[var(--steel-shadow)]">{stats?.dmSent ?? '0'}</p>
            </CardContent>
          </Card>
          <Card className="border-[var(--steel-alabaster)] shadow-sm bg-white min-w-[130px]">
            <CardContent className="p-4 py-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--steel-slate)] mb-1 opacity-60">ENGAGEMENT</p>
              <p className="text-2xl font-bold text-[var(--steel-shadow)]">
                {stats?.responseRate != null ? `${stats.responseRate}%` : '0%'}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* OAuth error */}
      {oauthError && (
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-xs font-bold text-red-600 uppercase tracking-tight">{oauthError}</p>
            <Button variant="ghost" size="icon" onClick={() => setOauthError(null)} className="h-6 w-6 text-red-400">
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Not connected state */}
      {!account && (
        <div className="max-w-3xl">
          <ConnectBanner onConnect={handleConnect} connecting={connectingOAuth} />
        </div>
      )}

      {/* Connected state */}
      {account && (
        <>
          {/* Account info bar */}
          <Card className="border-[var(--steel-alabaster)] shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {account.profilePicUrl ? (
                    <img
                      src={account.profilePicUrl}
                      alt={account.username}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--steel-snow)] flex items-center justify-center border border-[var(--steel-alabaster)]">
                      <InstagramIcon className="h-5 w-5 text-pink-500" />
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--steel-shadow)]">@{account.username}</p>
                  <p className="text-[10px] font-bold text-[var(--steel-slate)] uppercase tracking-tight opacity-70">
                    {account.followers.toLocaleString()} abonnés — {account.postsCount} publications
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refetchPosts()}
                  disabled={postsLoading}
                  className="h-9 w-9 text-[var(--steel-slate)] hover:text-indigo-600"
                >
                  <RefreshCw className={cn('h-4 w-4', postsLoading && 'animate-spin')} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnectMutation.mutate()}
                  className="text-[10px] font-bold uppercase text-[var(--steel-slate)] hover:text-red-500"
                >
                  Déconnecter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Create automation form */}
          <section className="bg-white border border-[var(--steel-alabaster)] rounded-2xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowForm(v => !v)}
              className="w-full p-5 flex items-center justify-between hover:bg-[var(--steel-snow)]/30 transition-colors border-b border-[var(--steel-snow)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                   <Target className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-sm font-bold text-[var(--steel-shadow)] uppercase tracking-widest">Nouveau Trigger Automatique</span>
              </div>
              <span className={cn("text-[var(--steel-slate)] transition-transform", showForm && "rotate-180")}>▼</span>
            </button>

            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleCreateSubmit} className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-[var(--steel-slate)]">1. Sélectionner le post</Label>
                        <PostPicker
                          posts={posts}
                          selectedId={selectedPost?.id || ''}
                          onSelect={setSelectedPost}
                        />
                        <p className="text-[10px] text-[var(--steel-slate)] font-medium">L'automation sera active uniquement sur cette publication.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-[var(--steel-slate)]">2. Mot-clé déclencheur</Label>
                        <Input
                          placeholder="Ex: INFO, PRIX, GO..."
                          value={newForm.keyword}
                          onChange={e => setNewForm(v => ({ ...v, keyword: e.target.value }))}
                          className="bg-[var(--steel-snow)]/50 border-[var(--steel-alabaster)] font-bold uppercase placeholder:normal-case h-11"
                        />
                        <p className="text-[10px] text-[var(--steel-slate)] font-medium">L'agent détectera ce mot dans les commentaires.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-[var(--steel-slate)]">3. Message à envoyer (DM)</Label>
                        <Textarea
                          placeholder="Bonjour ! Voici les informations demandées..."
                          value={newForm.dmMessage}
                          onChange={e => setNewForm(v => ({ ...v, dmMessage: e.target.value }))}
                          className="bg-[var(--steel-snow)]/50 border-[var(--steel-alabaster)] min-h-[120px] resize-none text-sm font-medium leading-relaxed"
                        />
                        <p className="text-[10px] text-[var(--steel-slate)] font-medium">Le message sera envoyé instantanément en privé.</p>
                      </div>

                      <div className="pt-4">
                        <Button
                          type="submit"
                          disabled={!selectedPost || !newForm.keyword || !newForm.dmMessage || createMutation.isPending}
                          className="w-full bg-[var(--steel-shadow)] hover:bg-black text-white h-11 font-bold uppercase tracking-widest shadow-lg shadow-gray-200"
                        >
                          {createMutation.isPending ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Création...</>
                          ) : (
                            'Activer l\'automation'
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Automations list */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2 px-1">
                <span className="w-6 h-[1px] bg-indigo-200"></span>
                Vos automatisations actives
            </h2>

            {automationsLoading ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => <div key={i} className="h-32 bg-[var(--steel-snow)] rounded-2xl animate-pulse"></div>)}
               </div>
            ) : automations.length === 0 ? (
              <Card className="border-dashed border-[var(--steel-alabaster)] bg-[var(--steel-snow)]/10">
                <CardContent className="py-20 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--steel-slate)] opacity-60">Aucun trigger configuré</p>
                  <Button variant="link" onClick={() => setShowForm(true)} className="mt-2 text-indigo-600 font-bold uppercase text-[10px]">Créer le premier maintenant →</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                  {automations.map(auto => (
                    <AutomationCard
                      key={auto.id}
                      auto={auto}
                      onToggle={(id) => toggleMutation.mutate(id)}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      toggling={toggleMutation.isPending}
                      deleting={deleteMutation.isPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
