const fs = require('fs');
fs.writeFileSync('src/features/client/dashboard/client-dashboard-page.tsx', `
import { LayoutDashboard, Users, MessageSquareQuote, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store';

export default function ClientDashboardPage() {
  const { user } = useAuthStore();
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Bonjour, {user?.name || 'Client'} 👋</h1>
        <p className="text-gray-500 mt-2 text-lg">Voici un aperçu en temps réel de votre activité.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-green-500 flex items-center text-sm font-bold"><TrendingUp className="h-4 w-4 mr-1"/> 12%</span>
          </div>
          <p className="text-gray-500 font-medium">Appels entrants IA</p>
          <h2 className="text-4xl font-extrabold mt-1">128</h2>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center">
              <MessageSquareQuote className="h-6 w-6" />
            </div>
            <span className="text-green-500 flex items-center text-sm font-bold"><TrendingUp className="h-4 w-4 mr-1"/> 48%</span>
          </div>
          <p className="text-gray-500 font-medium">Automatisations Instagram</p>
          <h2 className="text-4xl font-extrabold mt-1">3,492</h2>
        </div>
      </div>
      
      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 className="text-xl font-bold mb-4">Activité récente</h3>
        <p className="text-gray-500">Connectez vos services pour voir le flux des données en temps réel.</p>
      </div>
    </div>
  );
}
`);

console.log('Client dashboard generated.');
