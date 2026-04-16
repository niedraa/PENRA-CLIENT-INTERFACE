# 📋 ARCHITECTURE FRONTEND PENRA - RÉFÉRENCE RAPIDE

## 🎯 Vue d'ensemble du projet

**Frontend React + TypeScript** pour plateforme PENRA (gestion clients, agents vocaux, Instagram automation, factures).

Deux rôles: **Admin** (gestion globale) et **Client** (gestion personnelle)

---

## 📊 Flux de données

```
┌─────────────────────────────────────────┐
│     Components (React)                  │
│  (pages, formulaires, tableaux)         │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     Hooks Personnalisés                 │
│  (useClients, useAgents, etc.)          │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     React Query                         │
│  (caching, syncing, fetching)           │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     Services                            │
│  (client.service, agent.service, etc.)  │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     Axios (apiClient)                   │
│  (HTTP + interceptors JWT)              │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     Backend API                         │
│  (http://localhost:3000/api)            │
└─────────────────────────────────────────┘

STATE MANAGEMENT:
├── Zustand Stores (Global)
│   ├── auth.store → user, token
│   ├── app.store → clients, agents, invoices, etc.
│   └── ui.store → sidebar, modals, notifications
└── localStorage → user, token (persist entre sessions)
```

---

## 🗂️ Arborescence Clé

```
src/
├── main.tsx                           # Entrée React
├── router.tsx                         # Routes React Router
├── index.css                          # Styles globaux Tailwind
├── components/
│   ├── layout/                        # Layouts (ClientLayout, AdminLayout)
│   └── ui/                            # Composants réutilisables (Button, Input, etc.)
├── features/
│   ├── auth/login-page.tsx
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── vocal-agents/
│   │   ├── instagram/
│   │   ├── invoices/
│   │   ├── closers/
│   │   └── settings/
│   └── client/
│       ├── dashboard/
│       ├── instagram/
│       └── vocal-agent/
├── hooks/
│   ├── useAuth.ts
│   ├── useClients.ts
│   ├── useAgents.ts
│   ├── useInvoices.ts
│   ├── useDashboard.ts
│   └── useFetch.ts
├── services/
│   ├── api.ts
│   ├── auth.service.ts
│   ├── client.service.ts
│   ├── agent.service.ts
│   ├── invoice.service.ts
│   ├── instagram.service.ts
│   ├── dashboard.service.ts
│   └── settings.service.ts
├── stores/
│   ├── auth.store.ts
│   ├── app.store.ts
│   └── ui.store.ts
├── types/index.ts
└── lib/utils.ts
```

---

## 🔀 Routes (React Router)

### Public
- `/login` → LoginPage (formulaire email/password)

### Admin
- `/admin` → AdminDashboardPage
- `/admin/clients` → ClientsPage (CRUD)
- `/admin/vocal-agents` → AdminVocalAgentsPage (CRUD)
- `/admin/instagram` → AdminInstagramPage (automations)
- `/admin/invoices` → InvoicesPage
- `/admin/closers` → ClosersPage
- `/admin/settings` → SettingsPage

### Client
- `/client` → ClientDashboardPage
- `/client/instagram` → InstagramPage
- `/client/vocal-agent` → VocalAgentPage

---

## 📦 Dépendances Principales

```json
{
  "react": "^19.2.4",
  "react-router-dom": "^7.14.1",
  "zustand": "^5.0.12",
  "@tanstack/react-query": "^5.99.0",
  "axios": "^1.15.0",
  "react-hook-form": "^7.72.1",
  "zod": "^4.3.6",
  "tailwindcss": "^4.2.2",
  "framer-motion": "^12.38.0",
  "recharts": "^3.8.1",
  "lucide-react": "^1.8.0",
  "date-fns": "^4.1.0"
}
```

---

## 🔑 Types Principaux

```typescript
User {
  id, email, name, role ('client'|'admin'), company?, clientId?, createdAt
}

Client {
  id, name, email, company, phone?, services (array), status, subscriptionPlan, monthlyPrice, createdAt
}

VocalAgent {
  id, clientId, name, phoneNumber, voice, sector, language, status, systemPrompt?, callsThisMonth, callsTotal, lastActivity
}

Invoice {
  id, clientId, clientName, amount, status ('paid'|'pending'|'overdue'), date, dueDate
}

Commission {
  id, closerId, closerName, clientId, clientName, dealAmount, rate, commissionAmount, status
}

IGAutomation {
  id, clientId, postId, type ('comments'|'dm'), message, count, enabled, status
}

InstagramPost {
  id, clientId, accountId, caption, media, likes, comments, createdAt
}

AppSettings {
  webhookUrl, apiKey, emailSupport, logoUrl?
}
```

---

## 🛝 Hooks Disponibles

| Hook | Données | Actions |
|------|---------|---------|
| `useAuth()` | user, token, isAuthenticated | login, logout, updateUser |
| `useClients()` | clients[], isLoading | create, update, delete |
| `useAgents()` | agents[], isLoading | create, update, delete, provisionPhone |
| `useInvoices()` | invoices[], isLoading | markPaid |
| `useCommissions()` | commissions[] | markPaid |
| `useDashboard()` | stats, chartData, activity | - |
| `useFetch<T>(url)` | generic query | standard React Query |

---

## 🌐 Services Architecture

```typescript
// Chaque service communique avec apiClient (Axios)

AuthService.login(email, password)          → /api/auth/login
ClientService.getAll()                      → /api/clients
ClientService.create/update/delete(id, {})  → /api/clients/{id}
AgentService.provisionPhone(id)             → /api/agents/{id}/provision
InvoiceService.markPaid(id)                 → /api/invoices/{id}/mark-paid
InstagramService.connect(code)              → /api/instagram/connect
etc.
```

---

## 💾 Stores (Zustand)

### auth.store
- `user: User | null`
- `token: string | null`
- `isAuthenticated: boolean`
- `login(user, token)`
- `logout()`
- `updateUser(partial)`

### app.store
- `clients: Client[]`
- `agents: VocalAgent[]`
- `invoices: Invoice[]`
- `commissions: Commission[]`
- `igAutomations: IGAutomation[]`
- `settings: AppSettings`
- `init()` - Charger toutes les données
- `reset()` - Réinitialiser l'état

### ui.store
- `sidebarOpen: boolean`
- `modals: Record<string, boolean>`
- `notifications: Notification[]`

---

## 🎨 Composants UI

**Basiques:**
Button, Input, Select, Textarea, Card, Badge, Modal, Toggle, StatusDot, Table, Logo

**Complexes:**
DataTable (avec filtres, tri, pagination), StatCard, ChartContainer, Sidebar, Topbar

---

## 📐 Validation des Formulaires

- **React Hook Form** pour gestion du formulaire
- **Zod** pour validation schemas
- Erreurs affichées inline sous les champs
- Submit button désactivé si forme invalide

---

## 🔐 Sécurité

1. **JWT Token** → localStorage (considérer httpOnly)
2. **Interceptor Axios** → Ajoute Authorization header
3. **Protected Routes** → Vérifier `isAuthenticated` et `role`
4. **401 Auto-Logout** → Interceptor response redirige vers login
5. **Error Handling** → Afficher messages utilisateur clairs

---

## ⚡ Performance Optimizations

- React Query caching automatique
- Lazy loading des pages (Code splitting)
- Memoization des composants (useMemo, React.memo)
- Pagination sur grandes listes
- Recharts optimisé pour gros datasets

---

## 🚀 Scripts Package

```bash
npm run dev              # Dev frontend (localhost:5173)
npm run dev:api         # Dev backend (localhost:3000)
npm run dev:full        # Dev frontend + backend
npm run build           # Build production
npm run lint            # ESLint check
npm run test:api        # Tests backend
```

---

## 📱 Design Responsive

- **Mobile First** avec Tailwind classes (sm:, md:, lg:, xl:)
- Sidebars masqués sur mobile (drawer/hamburger)
- Tables scrollables horizontal
- Modals fullscreen sur mobile
- Buttons suffisamment grandes pour touch (min 44px)

---

## ✅ Checklist Implémentation

- [ ] Structure de dossiers créée
- [ ] Tous les composants UI implémentés
- [ ] Routes React Router configurées
- [ ] Stores Zustand initialisés
- [ ] Services créés et testés
- [ ] Hooks personnalisés fonctionnels
- [ ] Pages admin complètes
- [ ] Pages client complètes
- [ ] Authentification fonctionnelle
- [ ] Gestion erreurs API
- [ ] Formulaires avec validation Zod
- [ ] Responsive design testé
- [ ] ESLint passing
- [ ] TypeScript strict mode
- [ ] Tests unitaires (optionnel)

---

**Document généré:** 15 Avril 2026
**Dernière maj:** Auto-généré depuis analyse codebase
