const fs = require('fs');
const path = require('path');

// 1. Copy the logo
fs.mkdirSync('src/assets', { recursive: true });
fs.copyFileSync(
  'logo/Gemini_Generated_Image_dmyuvmdmyuvmdmyu-removebg-preview.png',
  'src/assets/logo.png'
);

// 2. Types
fs.writeFileSync('src/types/index.ts', `
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'admin';
  company?: string;
  avatar?: string;
  clientId?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
`);

// 3. API configuration
fs.writeFileSync('src/services/api.ts', `
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
`);

// 4. Auth Service
fs.writeFileSync('src/services/auth.service.ts', `
import { api } from './api';
import { User } from '../types';

interface LoginResponse {
  user: User;
  token: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};
`);

// 5. Auth Store (Zustand)
fs.writeFileSync('src/stores/auth.store.ts', `
import { create } from 'zustand';
import { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: getStoredUser(),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
`);

// 6. Logo Component
fs.mkdirSync('src/components/ui', { recursive: true });
fs.writeFileSync('src/components/ui/logo.tsx', `
import React from 'react';
import logoUrl from '../../assets/logo.png';

export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2">
      <img src={logoUrl} alt="PENRA Logo" className={className} />
    </div>
  );
}
`);

// 7. Login Page
fs.writeFileSync('src/features/auth/login-page.tsx', `
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { Logo } from '../../components/ui/logo';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.login);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMsg(null);
    try {
      const response = await authService.login(data.email, data.password);
      setAuth(response.user, response.token);
      
      // Redirect based on role
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/client');
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Identifiants incorrects.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
      >
        <div className="flex justify-center mb-8">
          <Logo className="h-16" />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Bienvenue</h1>
        <p className="text-gray-500 text-center mb-8">Connectez-vous à votre espace PENRA</p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              {...register('email')}
              placeholder="admin@penra.com"
              className={cn(
                "block w-full rounded-lg border shadow-sm p-3 transition-colors outline-none",
                errors.email ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
              )} 
            />
            {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input 
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className={cn(
                "block w-full rounded-lg border shadow-sm p-3 transition-colors outline-none",
                errors.password ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
              )} 
            />
            {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full flex items-center justify-center bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 mt-6"
          >
            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Se connecter'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
`);

// 8. Dummy pages for redirect targets
fs.mkdirSync('src/features/admin/dashboard', { recursive: true });
fs.writeFileSync('src/features/admin/dashboard/admin-dashboard-page.tsx', `
import React from 'react';
import { useAuthStore } from '../../../stores/auth.store';

export default function AdminDashboardPage() {
  const logout = useAuthStore(s => s.logout);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <button onClick={logout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Déconnexion</button>
    </div>
  );
}
`);

fs.mkdirSync('src/features/client/dashboard', { recursive: true });
fs.writeFileSync('src/features/client/dashboard/client-dashboard-page.tsx', `
import React from 'react';
import { useAuthStore } from '../../../stores/auth.store';

export default function ClientDashboardPage() {
  const logout = useAuthStore(s => s.logout);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Client Dashboard</h1>
      <button onClick={logout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Déconnexion</button>
    </div>
  );
}
`);

// 9. Update router setup
fs.writeFileSync('src/router.tsx', `
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/login-page';
import AdminDashboardPage from './features/admin/dashboard/admin-dashboard-page';
import ClientDashboardPage from './features/client/dashboard/client-dashboard-page';
import { useAuthStore } from './stores/auth.store';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'admin' | 'client' }) => {
  const { isAuthenticated, user } = useAuthStore.getState();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/client'} replace />;
  }
  
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: <ProtectedRoute allowedRole="admin"><AdminDashboardPage /></ProtectedRoute>,
  },
  {
    path: '/client',
    element: <ProtectedRoute allowedRole="client"><ClientDashboardPage /></ProtectedRoute>,
  }
]);
`);

console.log('Auth setup complete.');
