#!/bin/bash

echo "🛑 Arrêt de tous les services Penra..."
echo ""

# Arrêter les processus sur les ports utilisés
echo "Arrêt du backend (port 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "   ✅ Arrêté" || echo "   ℹ️  Rien à arrêter"

echo "Arrêt du frontend (port 5173)..."
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "   ✅ Arrêté" || echo "   ℹ️  Rien à arrêter"

echo "Arrêt du tunnel Cloudflare..."
pkill -f "cloudflared tunnel run" 2>/dev/null && echo "   ✅ Arrêté" || echo "   ℹ️  Rien à arrêter"

echo ""
echo "✅ Tous les services ont été arrêtés!"
