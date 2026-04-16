#!/bin/bash

echo "🚀 Démarrage de Penra - Tous les services..."
echo ""

# Arrêter les services précédents sur le port 3000 et 5173
echo "🛑 Arrêt des services précédents..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# Créer des fichiers de logs
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

echo "📝 Logs sauvegardés dans le dossier './logs'"
echo ""

# Lancer le backend
echo "✅ Backend lancé (port 3000)"
echo "   Logs: ./logs/backend.log"
nohup node backend/server.js > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"

sleep 2

# Lancer le frontend
echo "✅ Frontend lancé (port 5173)"
echo "   Logs: ./logs/frontend.log"
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID"

sleep 2

# Lancer Cloudflare tunnel
echo "✅ Cloudflare tunnel lancé"
echo "   Logs: ./logs/cloudflare.log"
nohup cloudflared tunnel --url http://localhost:3000 > "$LOG_DIR/cloudflare.log" 2>&1 &
CLOUDFLARE_PID=$!
echo "   PID: $CLOUDFLARE_PID"

echo ""
echo "═══════════════════════════════════════════════════"
echo "🎉 Tous les services sont lancés!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📍 Accédez à votre application:"
echo "   → http://localhost:5173"
echo ""
echo "📊 Voir les logs en temps réel:"
echo "   Backend:   tail -f logs/backend.log"
echo "   Frontend:  tail -f logs/frontend.log"
echo "   Cloudflare: tail -f logs/cloudflare.log"
echo ""
echo "🛑 Pour arrêter tous les services:"
echo "   → ./stop-all.sh"
echo ""
