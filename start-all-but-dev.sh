#!/bin/bash
# Script pour lancer tous les services en arrière-plan sauf le frontend (npm run dev)

# Lancer le backend en arrière-plan
node backend/server.js &

# Lancer d'autres scripts nécessaires en arrière-plan (décommente si besoin)
# bash start-all.sh &
# bash check-mock-data.sh &
# etc.

echo "Tous les services sont lancés en arrière-plan. Lance npm run dev dans un autre terminal pour le frontend."
