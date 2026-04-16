import { useAuthStore } from '../../stores/auth.store';
import { Bell, User } from 'lucide-react';

export default function Topbar() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="h-14 border-b border-[var(--steel-alabaster)] flex items-center justify-between px-6 bg-white">
      <span className="text-[10px] font-mono text-[var(--steel-pale-2)] uppercase tracking-widest px-2 py-1 bg-[var(--steel-snow)] rounded border border-[var(--steel-alabaster)]">
        PENRA v1.2
      </span>

      <div className="flex items-center gap-5">
        <button className="text-[var(--steel-pale-2)] hover:text-[var(--steel-shadow)] transition-colors relative">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white" />
        </button>

        <div className="flex items-center gap-2.5 pl-5 border-l border-[var(--steel-alabaster)]">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-[var(--steel-shadow)] leading-none mb-0.5">{user?.name || 'Client'}</p>
            <p className="text-[10px] text-[var(--steel-slate)] font-medium uppercase tracking-tight">Premium Account</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center grayscale">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
