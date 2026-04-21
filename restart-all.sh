#!/bin/bash
# Script pour tuer tous les processus Node liés au projet et relancer tous les services, y compris le frontend

# Tuer tous les processus node (backend, scripts, frontend)
echo "Arrêt de tous les processus Node.js et Vite..."
# Tuer tous les node et vite (attention : cela tue tous les node/vite de la machine)
pkill -f node
pkill -f vite

sleep 2

# Lancer le backend en arrière-plan
node backend/server.js &

# Lancer d'autres scripts nécessaires en arrière-plan (décommente si besoin)
# bash start-all.sh &
# bash check-mock-data.sh &
# etc.

# Lancer le frontend (npm run dev) en arrière-plan
npm run dev &

echo "Tous les services sont relancés en arrière-plan."
