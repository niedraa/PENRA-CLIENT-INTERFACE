import { Outlet } from 'react-router-dom';
import AdminSidebar from './admin-sidebar';
import { useAuthStore } from '../../stores/auth.store';
import { Bell, User } from 'lucide-react';

function AdminTopbar() {
  const user = useAuthStore(s => s.user);
  return (
    <header className="h-14 border-b border-[var(--steel-alabaster)] flex items-center justify-between px-6 bg-white flex-shrink-0">
      <span className="text-[10px] font-mono text-[var(--steel-pale-2)] uppercase tracking-widest px-2 py-1 bg-white rounded border border-[var(--steel-alabaster)]">
        PENRA_ADMIN
      </span>
      <div className="flex items-center gap-5">
        <button className="text-[var(--steel-pale-2)] hover:text-[var(--steel-shadow)] transition-colors relative">
          <Bell className="h-4.5 w-4.5" />
        </button>
        <div className="flex items-center gap-2.5 pl-5 border-l border-[var(--steel-alabaster)]">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-[var(--steel-shadow)] leading-none mb-0.5">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-indigo-500 font-medium uppercase tracking-tight">Administrateur</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[var(--steel-gunmetal)] flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-white text-[var(--steel-shadow)]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
