import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Target, FileText, Settings, TrendingUp } from 'lucide-react';

const navItems = [
  { to: '/simulator', label: 'Simulator', icon: TrendingUp },
  { to: '/targets', label: 'Targets', icon: Target },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin', label: 'Admin', icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">SaaS Revenue</h1>
              <p className="text-[11px] text-slate-400">Simulator & Tracker</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(item => (
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

        <div className="p-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            <p>ShopFlow Pro</p>
            <p className="mt-0.5">Mock Data Mode</p>
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
