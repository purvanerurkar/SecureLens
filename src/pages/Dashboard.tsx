import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes, ScanLine, Bug, ShieldCheck, AlertTriangle, TrendingUp,
  Brain, RefreshCw, CheckCircle2, Activity, ArrowRight, Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { supabase } from '@/lib/supabase';
import { PageHeader, ScoreRing, LoadingSpinner, SeverityBadge } from '@/components/ui';
import type { Application, Scan, Vulnerability } from '@/types';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);

useEffect(() => {
  async function load() {
    const [a, s, v] = await Promise.all([
      supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('vulnerabilities')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    const applications = a.data || [];
    const allScans = s.data || [];
    const allVulns = v.data || [];

    // Keep scan history, but dashboard findings represent
    // only the latest completed scan.
    const latestScan = allScans.find(
      (scan: any) => scan.status === 'completed'
    );

    const latestVulns = latestScan
      ? allVulns.filter(
          (vuln: any) => vuln.scan_id === latestScan.id
        )
      : [];

    setApps(applications);
    setScans(allScans);
    setVulns(latestVulns);
    setLoading(false);
  }

  load();
}, []);

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;

  const critical = vulns.filter(v => v.severity === 'critical').length;
  const high = vulns.filter(v => v.severity === 'high').length;
  const medium = vulns.filter(v => v.severity === 'medium').length;
  const low = vulns.filter(v => v.severity === 'low').length;
  const fixed = vulns.filter(v => v.status === 'resolved').length;
  const completedScans = scans.filter(s => s.status === 'completed');
  const avgScore = apps.length > 0 ? Math.round(apps.reduce((sum, a) => sum + (a.security_score || 0), 0) / apps.length) : 0;

  const retests = vulns.filter(v => v.retest_status === 'resolved').length;
  const retestTotal = vulns.filter(v => v.retest_status !== 'pending').length;
  const retestRate = retestTotal > 0 ? Math.round((retests / retestTotal) * 100) : 0;

  const sevData = [
    { name: 'Critical', count: critical, fill: '#ef4444' },
    { name: 'High', count: high, fill: '#f97316' },
    { name: 'Medium', count: medium, fill: '#eab308' },
    { name: 'Low', count: low, fill: '#3b82f6' },
    { name: 'Fixed', count: fixed, fill: '#22c55e' },
  ];

  const stats = [
    { label: 'Applications', value: apps.length, icon: Boxes, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Scans', value: scans.length, icon: ScanLine, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Vulnerabilities', value: vulns.length, icon: Bug, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Critical', value: critical, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'High', value: high, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Fixed', value: fixed, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Retest Rate', value: `${retestRate}%`, icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'AI Findings', value: vulns.length, icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ];

  const recentVulns = vulns.slice(0, 5);
  const recentScans = completedScans.slice(0, 3);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Security Operations Dashboard" subtitle="Real-time overview of your security testing posture">
        <Link to="/applications" className="btn-primary">
          <ScanLine size={16} /> New Scan
        </Link>
      </PageHeader>

      {/* Lifecycle banner */}
      <div className="glass-card p-4 mb-6 glow-border">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/20 to-violet-600/20 flex items-center justify-center">
              <ShieldCheck size={16} className="text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">SecureLens Lifecycle</div>
              <div className="text-xs text-slate-500">FIND → PROVE → EXPLAIN → FIX → RETEST → VERIFY</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity size={14} className="text-green-400" />
            <span>Engine operational — Live scanner active</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-4 hover:border-blue-500/20 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={18} className={stat.color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Security Score */}
        <div className="glass-card p-5 flex flex-col items-center justify-center">
          <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider">Security Score</div>
          <ScoreRing score={avgScore} size={120} />
          <div className="text-xs text-slate-500 mt-3">Average across all applications</div>
          
        </div>

        {/* Severity chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Vulnerability Distribution</div>
            <TrendingUp size={16} className="text-slate-500" />
          </div>
          {vulns.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-slate-500">
              No vulnerabilities detected yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sevData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#11162200', border: '1px solid rgba(55,73,100,0.4)', borderRadius: '8px', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent findings + scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent vulnerabilities */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-white">Recent Findings</div>
            <Link to="/vulnerabilities" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentVulns.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No vulnerabilities detected. Run a scan to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {recentVulns.map(v => (
                <Link key={v.id} to={`/vulnerabilities/${v.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/40 transition-colors">
                  <SeverityBadge severity={v.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">{v.vulnerability_type}</div>
                    <div className="text-xs text-slate-500 truncate">{v.endpoint} · {v.parameter}</div>
                  </div>
                  <span className={`text-xs ${v.status === 'resolved' ? 'text-green-400' : 'text-red-400'}`}>
                    {v.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent scans */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-white">Recent Scans</div>
            <Link to="/scans" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentScans.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No scans completed yet. Register an application and start scanning.
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map(s => {
                const app = apps.find(a => a.id === s.application_id);
                return (
                  <Link key={s.id} to={`/scans/${s.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/40 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <ScanLine size={16} className="text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">{app?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{s.total_findings} findings · {s.status}</div>
                    </div>
                    <ScoreRing score={s.security_score_after} size={36} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
