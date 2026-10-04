import { useState } from 'react';
import { Settings, Shield, Mail, LogOut, Monitor, Smartphone, Globe } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  const deviceInfo = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone/.test(deviceInfo);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" subtitle="Account and platform configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Profile</h2>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xl font-bold text-white">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{user?.email}</div>
              <div className="text-xs text-slate-500">Authenticated User</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Mail size={14} /> {user?.email}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Shield size={14} /> User ID: {user?.id?.slice(0, 12)}...
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Monitor size={18} className="text-violet-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Device Information</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {isMobile ? <Smartphone size={16} className="text-slate-400" /> : <Monitor size={16} className="text-slate-400" />}
              <div>
                <div className="text-xs text-slate-500">Device Type</div>
                <div className="text-slate-200">{isMobile ? 'Mobile Device' : 'Desktop / Laptop'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe size={16} className="text-slate-400" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">Browser / OS</div>
                <div className="text-slate-200 text-xs truncate">{deviceInfo}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/40">
            <p className="text-xs text-slate-500">
              Device information is for display purposes only. Authorization is based on your authenticated account, not your device.
            </p>
          </div>
        </div>

        {/* Security */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-green-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Security</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40">
              <div>
                <div className="text-sm text-slate-200">Row Level Security</div>
                <div className="text-xs text-slate-500">Server-side ownership isolation</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-400">Active</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40">
              <div>
                <div className="text-sm text-slate-200">Password Hashing</div>
                <div className="text-xs text-slate-500">Secure bcrypt hashing via Supabase Auth</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-400">Active</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40">
              <div>
                <div className="text-sm text-slate-200">Protected Routes</div>
                <div className="text-xs text-slate-500">All API endpoints require authentication</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-400">Active</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40">
              <div>
                <div className="text-sm text-slate-200">Object-Level Authorization</div>
                <div className="text-xs text-slate-500">Every resource verified against owner</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-400">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Session */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <LogOut size={18} className="text-red-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Session</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            You are currently signed in. Your session is managed securely via Supabase Auth with automatic token refresh.
          </p>
          <button onClick={handleSignOut} disabled={signingOut} className="btn-secondary text-red-400 hover:text-red-300 w-full justify-center">
            {signingOut ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <LogOut size={16} />}
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
