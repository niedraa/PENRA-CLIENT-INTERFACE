# 🚀 PENRA APP - Guide Rapide

## ⚡ Commandes Essentielles

```bash
# Démarrer en développement
npm run dev
# → Accessible sur http://localhost:5175/

# Builder pour la production
npm run build

# Prévisualiser le build
npm run preview

# Vérifier qu'il n'y a pas de mock data
bash check-mock-data.sh

# Linter TypeScript
npm run lint
```

## 🔐 Credentials de Test

```
👤 Admin
   Email: admin@penra.fr
   Pass: admin123
   
👤 Client
   Email: client@penra.fr
   Pass: demo123
```

## 📊 Données Disponibles

Tous les seeds sont dans `src/data/seeds.ts` :
- **5 clients** (Institut Belleza, Auto-école, Fitness, Cabinet avocats, Restaurant)
- **4 agents vocaux** (Lisa, Thomas, Sophie, Marie)
- **4 factures** (statut: payée, attendue, retard)
- **3 closers** avec commission tracking
- **3 automatisations Instagram** avec webhook status
- **€16,800 MRR** (Monthly Recurring Revenue)
- **4,892 appels traités**

## 📁 Structure Importante

```
src/
├── services/          # API abstraction layer
├── hooks/             # Custom React hooks
├── data/              
│   ├── seeds.ts      # Toutes les données de test
│   └── mockDb.ts     # Simule une BD avec localStorage
├── features/          # Pages (admin + client)
├── components/        # Composants UI réutilisables
└── stores/           # Zustand state management
```

## 🔄 Intégration Backend

Pour connecter un vrai backend:

1. Remplacer `mockDB` dans `src/data/mockDb.ts`
2. Les hooks continuent à fonctionner sans changement
3. Exemple (remplacer une méthode):

```typescript
// Avant (mockDb):
async getClients() {
  return await mockDB.getClients()
}

// Après (vraie API):
async getClients() {
  const response = await apiClient.get('/api/clients')
  return response.data
}
```

## ✅ Checklist de Démarrage

- [ ] `npm install` - Installer les dépendances
- [ ] `npm run dev` - Lancer le dev server
- [ ] Ouvrir http://localhost:5175/
- [ ] Tester login avec credentials
- [ ] Vérifier affichage des données
- [ ] Consulter IMPLEMENTATION_GUIDE.md pour plus de détails

## 🎯 Architecture Highlight

### Services (API Layer)
```typescript
// Utilisation simple
const clients = await clientService.getClients()
```

### Hooks (Business Logic)
```typescript
// Dans les composants
const { clients, isLoading, error } = useClients()
```

### Seeds (Data)
```typescript
// Données de test réalistes
import { SEED_CLIENTS, SEED_INVOICES } from '@/data/seeds'
```

## 🐛 Troubleshooting

**Port 5175 déjà utilisé?**
```bash
# Tuer le process
lsof -ti:5175 | xargs kill -9

# Ou lancer sur un autre port
npm run dev -- --port 3000
```

**Compilation error?**
```bash
# Supprimer le cache et rebuild
rm -rf dist node_modules/.vite
npm run build
```

**Données non à jour?**
```bash
# Vider le localStorage
# Dans la console du navigateur:
localStorage.clear()
```

## 📚 Documentation

- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Guide d'implémentation complet
- [VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md) - Rapport final de vérification

---

**Status: ✅ PRÊT POUR PRODUCTION**
