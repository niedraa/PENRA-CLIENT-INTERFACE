#!/bin/bash
# Vérifier qu'il n'y ait pas de données mockées en dur dans les pages
# Usage: npm run check:mock-data

echo "🔍 Vérification des données mockées..."
echo "─────────────────────────────────────"

# Patterns à chercher
PATTERNS=(
    "const.*mockClients\|const.*mockAgents\|const.*mockInvoices"
    "const.*mockClosers\|const.*mockCalls\|const.*mockUsers"
    "mockAppels\|mockFactures\|mockIGAuto"
    "const.*= \[\s*{.*email.*}.*}.*\]"
)

found_issues=0

for pattern in "${PATTERNS[@]}"; do
    results=$(grep -r "$pattern" src/features --include="*.tsx" --include="*.ts" 2>/dev/null)
    if [ ! -z "$results" ]; then
        echo "⚠️  Trouvé des données potentiellement mockées:"
        echo "$results" | head -5
        found_issues=$((found_issues + 1))
    fi
done

if [ $found_issues -eq 0 ]; then
    echo "✅ Aucune donnée mockée trouvée dans src/features/"
    echo "✅ Toutes les données utilisent les seeds"
    echo "✅ Application prête pour l'audit"
else
    echo ""
    echo "⚠️  Trouvé $found_issues type(s) de données mockées"
    echo "❌ À nettoyer avant la production"
    exit 1
fi

echo "─────────────────────────────────────"
exit 0
