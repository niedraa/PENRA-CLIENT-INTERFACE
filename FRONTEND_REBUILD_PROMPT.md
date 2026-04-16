# 🔄 PROMPT COMPLET DE RECONSTRUCTION DU FRONTEND PENRA

## ✅ PRÉ-REQUIS

Avant de commencer, l'API backend doit être fonctionnelle à `http://localhost:3000/api`. Vous n'allez reconstruire QUE le frontend (dossier `src/`) en conservant:
- Le backend (dossier `backend/`)
- La configuration Vite, TypeScript, ESLint, Tailwind
- Les fichiers à la racine (package.json, vite.config.ts, tsconfig.json, index.html)

---

## 📋 ARCHITECTURE ACTUELLEMENT EN PLACE

### Backend API - Routes principales
- `POST /api/auth/login` - Authentification
- `GET /api/clients` - Liste des clients
- `GET /api/agents` - Liste des agents vocaux
- `GET /api/invoices` - Liste des factures
- `GET /api/commissions` - Liste des commissions
- `GET /api/instagram/automations` - Automations Instagram
- `GET /api/settings` - Paramètres globaux
- Endpoints spécifiques par ressource (create, update, delete)

### Stack Technologique Frontend
- **React 19** avec TypeScript 6.0
- **Vite** comme bundler
- **React Router v7** pour la navigation
- **Zustand** pour la gestion d'état global
- **TanStack React Query** pour la mise en cache des données
- **Tailwind CSS 4** pour le styling
- **Framer Motion** pour les animations
- **React Hook Form** + **Zod** pour les formulaires
- **Axios** pour les appels API
- **Lucide React** pour les icônes
- **Date-fns** pour les manipulations de dates
- **Recharts** pour les graphiques

---

## 📁 STRUCTURE ACTUELLE DU FRONTEND

```
src/
├── main.tsx                          # Point d'entrée React
├── index.css                         # Styles globaux
├── router.tsx                        # Configuration React Router
├── components/
│   ├── layout/
│   │   ├── admin-layout.tsx         # Layout admin avec Outlet
│   │   ├── admin-sidebar.tsx        # Sidebar admin
│   │   ├── client-layout.tsx        # Layout client
│   │   ├── client-sidebar.tsx       # Sidebar client
│   │   └── topbar.tsx               # Topbar avec notifications/profil
│   ├── ui/                          # Composants réutilisables
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── toggle.tsx
│   │   ├── modal.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── stat-card.tsx
│   │   ├── status-dot.tsx
│   │   ├── logo.tsx
│   │   └── instagram-icon.tsx
│   └── charts/                      # Composants de graphiques
├── features/
│   ├── auth/
│   │   └── login-page.tsx           # Page de connexion
│   ├── admin/
│   │   ├── dashboard/
│   │   │   └── admin-dashboard-page.tsx
│   │   ├── clients/
│   │   │   └── clients-page.tsx
│   │   ├── vocal-agents/
│   │   │   └── admin-vocal-agents-page.tsx
│   │   ├── instagram/
│   │   │   └── admin-instagram-page.tsx
│   │   ├── invoices/
│   │   │   └── invoices-page.tsx
│   │   ├── closers/
│   │   │   └── closers-page.tsx
│   │   └── settings/
│   │       └── settings-page.tsx
│   └── client/
│       ├── dashboard/
│       │   └── client-dashboard-page.tsx
│       ├── instagram/
│       │   └── instagram-page.tsx
│       ├── vocal-agent/
│       │   └── vocal-agent-page.tsx
│       ├── subscription/
│       └── support/
├── hooks/                           # Hooks personnalisés
│   ├── useAuth.ts
│   ├── useFetch.ts
│   ├── useClients.ts
│   ├── useAgents.ts
│   ├── useDashboard.ts
│   ├── useInvoices.ts
│   ├── useElevenLabs.ts
│   └── index.ts
├── services/
│   ├── api.ts                       # Config Axios + interceptors
│   ├── auth.service.ts              # Service d'authentification
│   ├── client.service.ts            # Opérations clients
│   ├── agent.service.ts             # Opérations agents vocaux
│   ├── invoice.service.ts           # Opérations factures/commissions
│   ├── instagram.service.ts         # Opérations Instagram
│   ├── dashboard.service.ts         # Données du dashboard
│   └── settings.service.ts          # Paramètres globaux
├── stores/
│   ├── auth.store.ts                # Store Zustand pour l'auth
│   ├── app.store.ts                 # Store Zustand pour l'app
│   └── ui.store.ts                  # Store Zustand pour l'UI
├── types/
│   └── index.ts                     # Tous les types TypeScript
├── lib/
│   └── utils.ts                     # Utilitaires génériques
└── assets/                          # Images, fonts, etc.
```

---

## 🎭 PAGES & FONCTIONNALITÉS

### 1. **Page Login** (`/login`)
**Accès:** Public
**Fonction:** Authentification par email/mot de passe
**Formulaire:**
- Email (email@example.com)
- Mot de passe
**Actions:**
- Validé avec Zod
- Appel `/api/auth/login`
- Stockage du token et user dans localStorage
- Redirection vers `/admin` (admin) ou `/client` (client)
**UI:** Card centrée, logo, gradient background, animations Framer Motion

---

### 2. **Dashboard Admin** (`/admin`)
**Accès:** Admin only
**Affichages:**
- **Statistiques en cards:**
  - Total clients (count)
  - Total agents actifs
  - Commissions à payer (sum)
  - Factures impayées (sum)
- **Graphiques avec Recharts:**
  - Revenus par mois (derniers 12 mois)
  - Agents/Clients création par mois
  - État des factures (pie chart)
- **Tableau activité récente** (derniers 20 événements)
  - Action, client/agent, date, statut
  - Tri/pagination

---

### 3. **Gestion Clients** (`/admin/clients`)
**Fonctionnalités:**
- **Tableau des clients** avec colonnes:
  - Nom, Email, Entreprise, Services (badges), Statut, Abonnement, Prix/mois
  - Actions: Edit, Delete
- **Créer client** (modal ou drawer)
  - Formulaire: name, email, company, phone, services (multi-select), subscriptionPlan, monthlyPrice
  - Submit POST `/api/clients`
- **Éditer client** (modal ou drawer)
  - Pré-remplit les champs
  - Submit PATCH `/api/clients/{id}`
- **Supprimer client** (confirmation modal)
  - Submit DELETE `/api/clients/{id}`
- **Recherche/Filtre** par nom, email
- **Pagination** (10-50 par page)

---

### 4. **Gestion Agents Vocaux** (`/admin/vocal-agents`)
**Affichage:**
- **Tableau des agents** avec colonnes:
  - Nom, Client, Téléphone, Voix, Langue, Statut, Appels/mois, Dernière activité
  - Actions: Edit, Delete, Provisionner téléphone, Logs d'appels
- **Éditer agent**
  - Formulaire: name, voice, sector, language, systemPrompt, tone
- **Supprimer agent** (confirmation)
- **Provisionner téléphone** (action qui appelle `/api/agents/{id}/provision`)
- **Historique des appels** (drawer avec tableau)
  - Date, Durée, Résumé, Statut
  - Option d'écouter la transcription

---

### 5. **Gestion Instagram** (`/admin/instagram`)
**Affichages:**
- **Compte Instagram connecté** (si connecté)
  - Avatar, username
  - Bouton "Déconnecter"
- **Si pas connecté:**
  - Bouton "Se connecter à Instagram"
- **Automations Instagram** (tableau)
  - Post, Type (Comments/DM), Activation, Message, Nombre, Statut
  - Actions: Edit, Delete, Toggle, Test Webhook
- **Créer automation** (modal)
  - Sélection post, type, message, nombre, webhook URL
- **Statistiques Instagram**
  - Commentaires traités (mois)
  - DM envoyés (mois)
  - Taux de réponse (%)
  - Graphique: Commentaires/DM par jour (derniers 30j)

---

### 6. **Gestion Factures** (`/admin/invoices`)
**Affichages:**
- **Tableau des factures** avec colonnes:
  - Client, Montant, Statut (badge: paid/pending/overdue), Date, Date d'échéance
  - Actions: Marquer payée, Voir PDF
- **Filtres:** Par client, par statut, par date
- **Statistiques:**
  - Total impayé
  - Total payé (mois)
  - Nombre factures

---

### 7. **Gestion Closers** (`/admin/closers`)
**Affichages:**
- **Tableau des closers** avec colonnes:
  - Nom, Entreprise, SIREN, Nombre deals, Revenu, Commissions payées
  - Actions: Voir détails, Marquer commission payée
- **Commission par closer** (modal)
  - Tableau avec: Client, Montant deal, Taux, Montant commission, Statut

---

### 8. **Paramètres Admin** (`/admin/settings`)
**Affichages:**
- **Formulaire paramètres globaux:**
  - Webhook URL
  - Authentification API key
  - Email support
  - Logs d'audit (tableau)
- **Boutons:**
  - Sauvegarder
  - Exporter les données
  - Logs système

---

### 9. **Dashboard Client** (`/client`)
**Affichages:**
- **Statistiques personnelles:**
  - Agents actifs (count)
  - Appels ce mois-ci (count)
  - Durée moyenne appels
  - Appels après 20h
- **Graphiques:**
  - Appels par mois (derniers 12 mois)
  - Appels par heure (heatmap)
- **Agents du client** (tableau):
  - Nom, Téléphone, Statut, Appels/mois, Dernière activité
  - Actions: View details, Edit, Delete
- **Historique appels récents**

---

### 10. **Agent Vocal Client** (`/client/vocal-agent`)
**Affichages:**
- **Détails agent:**
  - Infos: Nom, Téléphone, Voix, Langue, Statut
  - Business info (nom, adresse, horaires, services, prix)
- **Appels récents** (tableau)
- **Configuration:**
  - Éditer systemPrompt
  - Éditer tone
  - Télécharger les enregistrements

---

### 11. **Instagram Client** (`/client/instagram`)
**Affichages:**
- **Si connecté:**
  - Compte (avatar, username)
  - Automations (idem admin, mais filtrées au client)
  - Statistiques propres
- **Si pas connecté:**
  - Bouton connexion

---

## 🔑 TYPES TYPESCRIPT

```typescript
// Auth
interface User {
  id: string
  email: string
  name: string
  role: 'client' | 'admin'
  company?: string
  avatar?: string
  clientId?: string
  createdAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// Client
interface Client {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  avatar?: string
  services: ServiceType[]
  status: 'active' | 'inactive' | 'pending'
  subscriptionPlan: string
  monthlyPrice: number
  nextRenewal: string
  createdAt: string
  notes?: string
}

type ServiceType = 'instagram' | 'vocal' | 'website'

// Vocal Agent
interface VocalAgent {
  id: string
  clientId: string
  clientName?: string
  name: string
  phoneNumber: string
  voice: string
  sector: string
  language: string
  status: 'active' | 'inactive' | 'configuring' | 'error'
  systemPrompt?: string
  callsThisMonth: number
  callsTotal: number
  lastActivity: string | null
}

interface CallRecord {
  id: string
  date: string
  time: string
  duration: number
  summary: string
  status: 'handled' | 'callback_requested' | 'missed'
  audioUrl?: string
  transcription?: string
}

// Invoice
interface Invoice {
  id: string
  clientId: string
  clientName: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  date: string
  dueDate: string
  pdfUrl?: string
}

// Commission
interface Commission {
  id: string
  closerId: string
  closerName: string
  clientId: string
  clientName: string
  dealAmount: number
  rate: number
  commissionAmount: number
  status: 'pending' | 'paid'
  createdAt: string
}

// Instagram
interface IGAutomation {
  id: string
  clientId: string
  postId: string
  type: 'comments' | 'dm'
  message: string
  count: number
  enabled: boolean
  status: 'active' | 'inactive' | 'processing'
  createdAt: string
  commentsSeen: number
  dmsSent: number
}

interface ConnectedInstagramAccount {
  id: string
  clientId: string
  username: string
  avatar: string
  accessToken: string
  expiresAt: string
  isConnected: boolean
}

interface InstagramPost {
  id: string
  clientId: string
  accountId: string
  caption: string
  media: string
  likes: number
  comments: number
  createdAt: string
}

// Settings
interface AppSettings {
  webhookUrl: string
  apiKey: string
  emailSupport: string
  logoUrl?: string
}
```

---

## 🎨 COMPOSANTS UI À CRÉER

### Composants de base (réutilisables)
1. **Button** - Styles: primary, secondary, danger, ghost
2. **Input** - Avec label, placeholder, icon optionnel, validation
3. **Select** - Single et multi-select
4. **Textarea** - Avec label, placeholder, counter
5. **Card** - Container standard
6. **Badge** - Styles: success, warning, error, info
7. **StatusDot** - Petit point coloré avec statut
8. **Modal** - Avec header, body, footer
9. **Table** - Avec colonnes, sorting, pagination
10. **StatCard** - Card avec icône, titre, valeur, tendance
11. **Toggle** - Switch on/off
12. **Logo** - Logo PENRA

### Composants complexes
1. **DataTable** - Table générique avec filtres, recherche, pagination, tri
2. **FormBuilder** - Génère formes à partir de config
3. **ChartContainer** - Wrapper pour Recharts
4. **Pagination** - Contrôles pagination
5. **Sidebar** - Navigation collapsible
6. **Topbar** - Header avec user menu

---

## 🛝 HOOKS PERSONNALISÉS

```typescript
// useAuth - Gestion authentification
export function useAuth() {
  const { user, token, isAuthenticated, login, logout, updateUser } = useAuthStore()
  return { user, token, isAuthenticated, login, logout, updateUser }
}

// useFetch - Requête générique avec React Query
export function useFetch<T>(url: string, options?: any): UseQueryResult<T>

// useClients - Gestion clients
export function useClients(): {
  clients: Client[]
  isLoading: boolean
  error: Error | null
  createClient: (data: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
}

// useAgents - Gestion agents
export function useAgents(): {
  agents: VocalAgent[]
  isLoading: boolean
  error: Error | null
  createAgent: (...) => Promise<VocalAgent>
  updateAgent: (...) => Promise<void>
  deleteAgent: (...) => Promise<void>
  provisionAgentPhone: (id: string) => Promise<void>
}

// useInvoices - Gestion factures
export function useInvoices(): {
  invoices: Invoice[]
  isLoading: boolean
  markInvoicePaid: (id: string) => Promise<void>
}

// useCommissions - Gestion commissions
export function useCommissions(): {
  commissions: Commission[]
  markCommissionPaid: (id: string) => Promise<void>
}

// useDashboard - Données dashboard
export function useAdminDashboard(): {
  stats: AdminStats
  recentActivity: Activity[]
  chartData: ChartData
  isLoading: boolean
}

export function useClientDashboard(): {
  stats: ClientStats
  chartData: ChartData
  isLoading: boolean
}
```

---

## 🌐 SERVICES À CRÉER

### 1. **api.ts**
- Instance Axios avec baseURL
- Interceptor pour token JWT
- Gestion erreur 401 (logout auto)
- Types erreur standardisés

### 2. **auth.service.ts**
```typescript
class AuthService {
  async login(email: string, password: string): Promise<{ user: User; token: string }>
  async logout(): Promise<void>
  async register(...): Promise<{ user: User; token: string }>
  async refreshToken(): Promise<string>
  async verify2FA(...): Promise<boolean>
}
```

### 3. **client.service.ts**
```typescript
class ClientService {
  async getAll(): Promise<Client[]>
  async getById(id: string): Promise<Client>
  async create(data: Omit<Client, 'id' | 'createdAt'>): Promise<Client>
  async update(id: string, data: Partial<Client>): Promise<void>
  async delete(id: string): Promise<void>
  async getStats(): Promise<ClientStats>
}
```

### 4. **agent.service.ts**
```typescript
class AgentService {
  async getAll(): Promise<VocalAgent[]>
  async getById(id: string): Promise<VocalAgent>
  async create(data: CreateAgentData): Promise<VocalAgent>
  async update(id: string, data: Partial<VocalAgent>): Promise<void>
  async delete(id: string): Promise<void>
  async provisionPhone(id: string): Promise<{ phoneNumber: string }>
  async getCallHistory(id: string): Promise<CallRecord[]>
  async getStats(id: string): Promise<VocalStats>
}
```

### 5. **invoice.service.ts**
```typescript
class InvoiceService {
  async getAll(): Promise<Invoice[]>
  async getById(id: string): Promise<Invoice>
  async markPaid(id: string): Promise<void>
  async downloadPDF(id: string): Promise<Blob>
  
  async getCommissions(): Promise<Commission[]>
  async markCommissionPaid(id: string): Promise<void>
}
```

### 6. **instagram.service.ts**
```typescript
class InstagramService {
  async getOAuthUrl(): Promise<string>
  async connect(code: string): Promise<ConnectedInstagramAccount>
  async disconnect(): Promise<void>
  async getPosts(): Promise<InstagramPost[]>
  async getAutomations(): Promise<IGAutomation[]>
  async createAutomation(data: CreateIGAutomationData): Promise<IGAutomation>
  async updateAutomation(id: string, data: Partial<IGAutomation>): Promise<void>
  async deleteAutomation(id: string): Promise<void>
  async toggleAutomation(id: string): Promise<void>
  async testWebhook(id: string): Promise<boolean>
}
```

### 7. **dashboard.service.ts**
```typescript
class DashboardService {
  async getAdminStats(): Promise<AdminStats>
  async getClientStats(): Promise<ClientStats>
  async getRecentActivity(): Promise<Activity[]>
  async getChartData(period: string): Promise<ChartData>
}
```

### 8. **settings.service.ts**
```typescript
class SettingsService {
  async getSettings(): Promise<AppSettings>
  async updateSettings(data: Partial<AppSettings>): Promise<void>
  async getAuditLogs(): Promise<AuditLog[]>
}
```

---

## 💾 STORES ZUSTAND

### **auth.store.ts**
```typescript
interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}
```

### **app.store.ts**
```typescript
interface AppStore {
  clients: Client[]
  agents: VocalAgent[]
  invoices: Invoice[]
  commissions: Commission[]
  igAutomations: IGAutomation[]
  settings: AppSettings
  initialized: boolean
  
  init: () => Promise<void>
  reset: () => void
  
  // Mutations
  createClient: (data) => Promise<Client>
  updateClient: (id, data) => Promise<void>
  deleteClient: (id) => Promise<void>
  // ... idem pour agents, invoices, etc.
}
```

### **ui.store.ts**
```typescript
interface UIStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Modals
  modals: Record<string, boolean>
  openModal: (name: string) => void
  closeModal: (name: string) => void
  
  // Notifications
  notifications: Notification[]
  addNotification: (notification) => void
  removeNotification: (id) => void
}
```

---

## 🎨 DESIGN TOKENS & TAILWIND

### Couleurs
```
- bg-primary, bg-secondary
- text-primary, text-secondary
- border-color
- accent (couleur principale)
- success, warning, error, info
```

### Typographie
```
- font-heading (sans-serif)
- font-body (sans-serif)
- text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl
```

### Spacing
```
- Utiliser scale: 4px (4, 8, 12, 16, 20, 24, 32, 40, 48...)
```

### Shadows & Border Radius
```
- rounded-lg (8px)
- shadow-sm, shadow-md, shadow-lg
```

---

## 📱 RESPONSIVE DESIGN

- **Mobile First** (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- **Sidebars:** Cachées sur mobile, icône hamburger
- **Tables:** Scroll horizontal sur mobile
- **Modals:** Fullscreen sur mobile

---

## 🔐 SÉCURITÉ & BEST PRACTICES

1. **Authentification:**
   - Token JWT stocké en localStorage (considérer httpOnly si backend supporte)
   - Logout auto si 401
   - Refresh token automatique

2. **Validation:**
   - Zod pour validation côté client
   - Afficher erreurs utilisateur claires

3. **Protected Routes:**
   - Vérifier `isAuthenticated` et `role` avant render
   - Redirect vers login si non authed

4. **API Errors:**
   - Gérer tous les codes d'erreur (400, 401, 403, 404, 500)
   - Afficher toast/notification pertinents

5. **Performance:**
   - React Query pour caching automatique
   - Lazy loading pages
   - Memoization des composants lourds

---

## 🚀 INSTRUCTIONS DE DÉMARRAGE

### 1. Supprimer le frontend actuel
```bash
rm -rf src/
```

### 2. Recréer la structure `src/` avec tous les fichiers listés ci-dessus

### 3. Installer les dépendances (déjà faites)
```bash
npm install
```

### 4. Démarrer le backend
```bash
npm run dev:api
```

### 5. Démarrer le frontend
```bash
npm run dev
```

### 6. Tester la connexion
- Aller à http://localhost:5173/login
- Email: `admin@penra.com` / Mot de passe: `admin123`

---

## 📊 FLUX DE DONNÉES

```
UI Component
  ↓
Hook (useClients, etc.)
  ↓
React Query (cache + fetching)
  ↓
Service (client.service.ts)
  ↓
apiClient (Axios)
  ↓
Backend API (/api/...)
  ↓
Response → Service → React Query → Hook → Component → Render
```

## 🔄 Zustand + React Query Integration

- **React Query:** Fetch et cache les données de l'API
- **Zustand:** Stocke user, token, preferences UI
- **localStorage:** Persiste auth entre sessions

---

## ✨ CRITÈRES DE RÉUSSITE

✅ Login fonctionne et redirige correctement
✅ Dashboard admin affiche statistiques et graphiques
✅ Toutes les pages listées fonctionnent
✅ CRUD sur clients, agents, factures fonctionne
✅ Formulaires valident avec Zod
✅ Erreurs API affichées proprement
✅ UI responsive sur mobile
✅ Animations fluides (Framer Motion)
✅ Aucun warning console TypeScript
✅ ESLint passe sans erreur

---

**Prêt à reconstruire le frontend de zéro !** 🚀
