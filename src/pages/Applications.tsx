import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Plus, Trash2, ScanLine, Shield, AlertTriangle, Upload, X } from 'lucide-react';
import { fetchApplications, createApplication, deleteApplication, fetchVulnsByApp, fetchScansByApp } from '@/lib/api';
import { PageHeader, LoadingSpinner, EmptyState, ScoreRing, SeverityBadge, DemoBanner } from '@/components/ui';
import type { Application, Vulnerability, Scan } from '@/types';

export default function Applications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [vulnCounts, setVulnCounts] = useState<Record<string, { critical: number; high: number; total: number }>>({});
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});
  

  const load = async () => {
    setLoading(true);
    const data = await fetchApplications();
    setApps(data);
    const counts: Record<string, { critical: number; high: number; total: number }> = {};
    const sc: Record<string, number> = {};
    for (const app of data) {
      const [vulns, scans] = await Promise.all([fetchVulnsByApp(app.id), fetchScansByApp(app.id)]);
      counts[app.id] = {
        critical: vulns.filter(v => v.severity === 'critical').length,
        high: vulns.filter(v => v.severity === 'high').length,
        total: vulns.length,
      };
      sc[app.id] = scans.length;
    }
    setVulnCounts(counts);
    setScanCounts(sc);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSpinner label="Loading applications..." />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Applications" subtitle="Register and manage target applications for security testing">
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Add Application
        </button>
      </PageHeader>

      {apps.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No applications registered"
          message="Register your first target application to start running security scans."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map(app => {
            const vc = vulnCounts[app.id] || { critical: 0, high: 0, total: 0 };
            return (
              <div key={app.id} className="glass-card p-5 hover:glow-border transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-violet-600/20 flex items-center justify-center">
                      <Shield size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <Link to={`/applications/${app.id}`} className="text-sm font-bold text-white hover:text-blue-400 transition-colors">
                        {app.name}
                      </Link>
                      <div className="text-xs text-slate-500">{app.technology}</div>
                    </div>
                  </div>
                  <ScoreRing score={app.security_score || 0} size={48} />
                </div>

                {app.description && <p className="text-xs text-slate-400 mb-4 line-clamp-2">{app.description}</p>}

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-lg bg-slate-900/40">
                    <div className="text-lg font-bold text-white">{scanCounts[app.id] || 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Scans</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-red-500/5">
                    <div className="text-lg font-bold text-red-400">{vc.critical}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Critical</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-orange-500/5">
                    <div className="text-lg font-bold text-orange-400">{vc.high}</div>
                    <div className="text-[10px] text-slate-500 uppercase">High</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md font-medium ${app.status === 'ready' ? 'bg-slate-700/40 text-slate-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {app.status}
                    </span>
                    <span className="text-slate-500">
                      {app.last_scan_at ? `Scanned ${new Date(app.last_scan_at).toLocaleDateString()}` : 'Never scanned'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800/40">
                  <Link to={`/applications/${app.id}`} className="btn-secondary flex-1 justify-center text-xs py-2">
                    View Details
                  </Link>
                  <Link to={`/scans?app=${app.id}`} className="btn-primary flex-1 justify-center text-xs py-2">
                    <ScanLine size={14} /> Scan
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <RegisterModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function RegisterModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [technology, setTechnology] = useState('Web Application');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('http://localhost:3000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const app = await createApplication({name,technology,description,target_url: targetUrl,});
      onCreated();
      navigate(`/applications/${app.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-md glow-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Register Application</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Application Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required className="input-field" placeholder="SecureShop" />
          </div>
                    <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Technology Stack
            </label>
            <select
              value={technology}
              onChange={e => setTechnology(e.target.value)}
              className="input-field"
            >
              <option>Web Application</option>
              <option>React / Node.js</option>
              <option>Python / Django</option>
              <option>Java / Spring</option>
              <option>PHP / Laravel</option>
              <option>Mobile App</option>
              <option>Microservices</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Target URL
            </label>
            <input
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              required
              type="url"
              className="input-field"
              placeholder="http://localhost:3000"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Authorized application URL that SecureLens will scan.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input-field resize-none" placeholder="E-commerce application with user authentication and product catalog" />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-400/80">Only register applications you own or have explicit authorization to test.</span>
          </div>

          {error && <div className="text-xs text-red-400 p-2 rounded-lg bg-red-500/10">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Register Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
