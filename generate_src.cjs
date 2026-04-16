const fs = require('fs');
const path = require('path');

const dirs = [
  'src/assets',
  'src/components/layout',
  'src/components/ui',
  'src/components/charts',
  'src/features/auth',
  'src/features/admin/dashboard',
  'src/features/admin/clients',
  'src/features/admin/vocal-agents',
  'src/features/admin/instagram',
  'src/features/admin/invoices',
  'src/features/admin/closers',
  'src/features/admin/settings',
  'src/features/client/dashboard',
  'src/features/client/instagram',
  'src/features/client/vocal-agent',
  'src/features/client/subscription',
  'src/features/client/support',
  'src/hooks',
  'src/services',
  'src/stores',
  'src/types',
  'src/lib'
];

dirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

const files = {
  'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);`,
  'src/index.css': `@import "tailwindcss";

@theme {
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-900: #1e3a8a;
}

body {
  @apply bg-gray-50 text-gray-900 antialiased;
}`,
  'src/router.tsx': `import { createBrowserRouter } from 'react-router-dom';
import LoginPage from './features/auth/login-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  }
]);`,
  'src/lib/utils.ts': `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
  'src/features/auth/login-page.tsx': `import { useState } from 'react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg"
      >
        <h1 className="text-2xl font-bold text-center mb-6">Connexion</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
            <input type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>
          <button className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors">
            Se connecter
          </button>
        </form>
      </motion.div>
    </div>
  );
}`
};

Object.entries(files).forEach(([file, content]) => {
  fs.writeFileSync(file, content);
});

console.log('Base structure generated.');
