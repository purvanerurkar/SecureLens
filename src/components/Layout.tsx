import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Shield, Bug, Brain, Wrench, RefreshCw, FileText,
  Settings, LogOut, ScanLine, Boxes
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/applications', label: 'Applications', icon: Boxes },
  { to: '/scans', label: 'Scans', icon: ScanLine },
  { to: '/vulnerabilities', label: 'Vulnerabilities', icon: Bug },
  { to: '/ai-analyst', label: 'AI Analyst', icon: Brain },
  { to: '/remediation', label: 'Remediation', icon: Wrench },
  { to: '/retesting', label: 'Retesting', icon: RefreshCw },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#07090f]">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 flex-shrink-0 z-40 transition-transform ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="h-full flex flex-col bg-[#0a0d16] border-r border-slate-800/40">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-800/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white tracking-tight">SecureLens AI</div>
                <div className="text-[10px] text-slate-500 font-medium">Find. Prove. Fix. Verify.</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="px-3 py-4 border-t border-slate-800/40">
            <div className="flex items-center gap-2 px-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-300 truncate">{user?.email}</div>
                <div className="text-[10px] text-slate-500">Authenticated</div>
              </div>
            </div>
            <button onClick={handleSignOut} className="nav-link w-full text-red-400/80 hover:text-red-400 hover:bg-red-500/5">
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-[#07090f]/80 backdrop-blur-md border-b border-slate-800/40 px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white"
            >
              <div className="space-y-1.5">
                <div className="w-5 h-0.5 bg-current" />
                <div className="w-5 h-0.5 bg-current" />
                <div className="w-5 h-0.5 bg-current" />
              </div>
            </button>
            <div className="text-sm text-slate-400 hidden sm:block">
              <span className="text-slate-500">Platform</span>
              <span className="mx-2 text-slate-700">/</span>
              <span className="gradient-text font-medium">SecureLens AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-glow text-green-400" />
              <span className="text-xs text-green-400 font-medium">Engine Online</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
  <Outlet />

        </main>
      </div>
    </div>
  );
}
