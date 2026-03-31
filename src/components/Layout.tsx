import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Target, FileText, Settings, TrendingUp, LogOut } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function Layout() {
  const { currentUser, logout } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';

  const navItems = [
    { to: '/targets', label: 'Targets', icon: Target, show: true },
    { to: '/simulator', label: 'Simulator', icon: TrendingUp, show: true },
    { to: '/reports', label: 'Reports', icon: BarChart3, show: true },
    { to: '/admin', label: 'Admin', icon: Settings, show: isAdmin },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Notify Me" className="w-8 h-8 rounded-lg" />
            <div>
              <h1 className="text-sm font-bold leading-tight">Notify Me</h1>
              <p className="text-[11px] text-slate-400">Target Page</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {navItems.filter(i => i.show).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white border-r-2 border-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white font-medium">{currentUser?.name}</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                isAdmin ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {isAdmin ? 'Admin' : 'Member'}
              </span>
            </div>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-white transition-colors p-1.5 rounded hover:bg-slate-800"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}
