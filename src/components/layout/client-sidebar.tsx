import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, LogOut, Mic, User } from 'lucide-react';
import { InstagramIcon } from '../ui/instagram-icon';
import { useAuthStore } from '../../stores/auth.store';
import { Logo } from '../ui/logo';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'Dashboard', Icon: BarChart3, path: '/client' },
  { label: 'Instagram', Icon: InstagramIcon, path: '/client/instagram' },
  { label: 'Agent Vocal', Icon: Mic, path: '/client/vocal-agent' },
];

export default function ClientSidebar() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside 
      className={cn(
        "bg-white border-r border-[var(--steel-alabaster)] flex flex-col h-full z-30 shadow-sm transition-all duration-300 ease-in-out overflow-hidden",
        isHovered ? "w-64" : "w-20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        "p-6 pb-8 border-b border-[var(--steel-alabaster)] transition-all duration-300",
        !isHovered && "px-4 items-center flex flex-col"
      )}>
        <Logo className={cn("transition-all duration-300", isHovered ? "h-9" : "h-8")} />
        <div className={cn(
          "mt-2 flex items-center gap-1.5 transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0 h-0"
        )}>
          <User className="h-3 w-3 text-indigo-500" />
          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest whitespace-nowrap">Espace Client</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-hidden">
        <p className={cn(
          "text-[10px] uppercase tracking-widest text-[var(--steel-pale-2)] font-bold px-3 mb-3 transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          Navigation
        </p>
        {navItems.map(({ label, Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/client'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group text-sm relative',
              isActive
                ? 'bg-[var(--steel-snow)] text-[var(--steel-shadow)] font-semibold border-l-2 border-indigo-500 rounded-l-none pl-[10px]'
                : 'text-[var(--steel-slate)] hover:bg-[var(--steel-snow)] hover:text-[var(--steel-shadow)] border-l-2 border-transparent'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className={cn(
              "transition-all duration-300 whitespace-nowrap",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            )}>
              {label}
            </span>
            {!isHovered && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 mt-auto border-t border-[var(--steel-alabaster)]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--steel-slate)] hover:text-red-600 hover:bg-red-50 transition-all group text-sm relative"
        >
          <LogOut className="h-5 w-5 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" />
          <span className={cn(
            "transition-all duration-300 whitespace-nowrap",
            isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
          )}>
            Déconnexion
          </span>
          {!isHovered && (
            <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
              Déconnexion
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
