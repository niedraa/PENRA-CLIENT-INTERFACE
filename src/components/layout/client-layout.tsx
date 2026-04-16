import { Outlet } from 'react-router-dom';
import ClientSidebar from './client-sidebar';
import Topbar from './topbar';

export default function ClientLayout() {
  return (
    <div className="flex h-screen bg-white text-[var(--steel-shadow)]">
      <ClientSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
