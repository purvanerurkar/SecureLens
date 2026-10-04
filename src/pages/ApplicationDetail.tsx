import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ScanLine, Bug, Trash2, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import { fetchApplication, fetchVulnsByApp, fetchScansByApp, deleteApplication } from '@/lib/api';
import { PageHeader, LoadingSpinner, ScoreRing, SeverityBadge, StatusBadge, DemoBanner, EmptyState } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Application, Vulnerability, Scan } from '@/types';

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [a, v, s] = await Promise.all([
        fetchApplication(id),
        fetchVulnsByApp(id),
        fetchScansByApp(id),
      ]);
      setApp(a);
      setVulns(v);
      setScans(s);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingSpinner label="Loading application..." />;
  if (!app) return (
    <div className="text-center py-20">
      <p className="text-slate-400 mb-4">Application not found or access denied.</p>
      <Link to="/applications" className="btn-secondary">Back to Applications</Link>
    </div>
  );

  const critical = vulns.filter(v => v.severity === 'critical').length;
  const high = vulns.filter(v => v.severity === 'high').length;
  const medium = vulns.filter(v => v.severity === 'medium').length;
  const low = vulns.filter(v => v.severity === 'low').length;
  const fixed = vulns.filter(v => v.status === 'resolved').length;

  const chartData = [
    { name: 'Critical', count: critical, fill: '#ef4444' },
    { name: 'High', count: high, fill: '#f97316' },
    { name: 'Medium', count: medium, fill: '#eab308' },
    { name: 'Low', count: low, fill: '#3b82f6' },
    { name: 'Fixed', count: fixed, fill: '#22c55e' },
  ];

  const handleDelete = async () => {
    if (!confirm(`Delete "${app.name}"? This will remove all scans, vulnerabilities, and evidence for this application.`)) return;
    await deleteApplication(app.id);
    navigate('/applications');
  };

  return (
    <div className="animate-fade-in">
      <Link to="/applications" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4">
        <ArrowLeft size={14} /> Back to Applications
      </Link>

      <PageHeader title={app.name} subtitle={`${app.technology} · Registered ${new Date(app.created_at).toLocaleDateString()}`}>
        <Link to={`/scans?app=${app.id}`} className="btn-primary">
          <ScanLine size={16} /> Start Scan
        </Link>
        <button onClick={handleDelete} className="btn-secondary text-red-400 hover:text-red-300">
          <Trash2 size={16} /> Delete
        </button>
      </PageHeader>

      {app.last_scan_at && <div className="mb-4"><DemoBanner /></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5 flex flex-col items-center justify-center">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Security Score</div>
          <ScoreRing score={app.security_score || 0} size={120} />
          <div className="text-xs text-slate-500 mt-3">
            {app.last_scan_at ? `Last scan: ${new Date(app.last_scan_at).toLocaleString()}` : 'No scans yet'}
          </div>
        </div>

        <div className="glass-card p-5 lg:col-span-2">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-4">Vulnerability Summary</div>
          {vulns.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-slate-500">
              No vulnerabilities — run a scan to detect findings
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0c0f1a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {app.description && (
        <div className="glass-card p-5 mb-6">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Description</div>
          <p className="text-sm text-slate-300">{app.description}</p>
        </div>
      )}

      {/* Scan history */}
      <div className="glass-card p-5 mb-6">
        <div className="text-sm font-semibold text-white mb-4">Scan History</div>
        {scans.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            No scans run yet. <Link to={`/scans?app=${app.id}`} className="text-blue-400 hover:text-blue-300">Start your first scan</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {scans.map(scan => (
              <Link key={scan.id} to={`/scans/${scan.id}`} className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/40 hover:bg-slate-800/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <ScanLine size={16} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">{new Date(scan.created_at).toLocaleString()}</div>
                  <div className="text-xs text-slate-500">{scan.total_findings} findings · {scan.status}</div>
                </div>
                <ScoreRing score={scan.security_score_after} size={40} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-white">Findings ({vulns.length})</div>
          <Bug size={16} className="text-slate-500" />
        </div>
        {vulns.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">No vulnerabilities detected.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800/40">
                  <th className="text-left py-2 px-3 font-medium">Vulnerability</th>
                  <th className="text-left py-2 px-3 font-medium">Severity</th>
                  <th className="text-left py-2 px-3 font-medium">Endpoint</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vulns.map(v => (
                  <tr key={v.id} className="border-b border-slate-800/20 hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 px-3">
                      <Link to={`/vulnerabilities/${v.id}`} className="text-slate-200 hover:text-blue-400 font-medium">{v.vulnerability_type}</Link>
                    </td>
                    <td className="py-2.5 px-3"><SeverityBadge severity={v.severity} /></td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-xs">{v.endpoint}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={v.status} /></td>
                    <td className="py-2.5 px-3">
                      <Link to={`/vulnerabilities/${v.id}`} className="text-blue-400 hover:text-blue-300 text-xs">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
