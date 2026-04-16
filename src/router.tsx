import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/login-page';

// Client
import ClientLayout from './components/layout/client-layout';
import ClientDashboardPage from './features/client/dashboard/client-dashboard-page';
import InstagramPage from './features/client/instagram/instagram-page';
import VocalAgentPage from './features/client/vocal-agent/vocal-agent-page';

// Admin
import AdminLayout from './components/layout/admin-layout';
import AdminDashboardPage from './features/admin/dashboard/admin-dashboard-page';
import ClientsPage from './features/admin/clients/clients-page';
import AdminVocalAgentsPage from './features/admin/vocal-agents/admin-vocal-agents-page';
import InvoicesPage from './features/admin/invoices/invoices-page';
import SettingsPage from './features/admin/settings/settings-page';

// Auth guard
import { ProtectedRoute } from './components/layout/protected-route';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },

  // ── Client space ───────────────────────────────────────────────────────
  {
    path: '/client',
    element: (
      <ProtectedRoute allowedRole="client">
        <ClientLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ClientDashboardPage /> },
      { path: 'instagram', element: <InstagramPage /> },
      { path: 'vocal-agent', element: <VocalAgentPage /> },
    ],
  },

  // ── Admin space ────────────────────────────────────────────────────────
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRole="admin">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'vocal-agents', element: <AdminVocalAgentsPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
