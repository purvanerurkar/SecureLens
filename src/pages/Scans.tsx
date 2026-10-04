import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ScanLine, Play, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { fetchScans, fetchApplications, createScan, runScan } from '@/lib/api';
import { PageHeader, LoadingSpinner, ScoreRing, StatusBadge, DemoBanner, EmptyState } from '@/components/ui';
import type { Scan, Application } from '@/types';

const TEST_CATEGORIES = [
  { id: 'auth', label: 'Authentication Testing', desc: 'Test login, session, and credential handling' },
  { id: 'input', label: 'Input Inspection', desc: 'Check for injection and input validation issues' },
  { id: 'authorization', label: 'Authorization Testing', desc: 'Test object-level and role-based access control' },
  { id: 'api', label: 'API Testing', desc: 'Test API endpoints for security weaknesses' },
  { id: 'file_upload', label: 'File Upload Testing', desc: 'Test file upload handling and validation' },
  { id: 'config', label: 'Security Configuration Testing', desc: 'Check security headers, data exposure, and configuration' },
];

const SCAN_STAGES = [
  { key: 'discovering', label: 'Discovering endpoints' },
  { key: 'analyzing_inputs', label: 'Analyzing inputs' },
  { key: 'testing', label: 'Running controlled security tests' },
  { key: 'collecting_evidence', label: 'Collecting evidence' },
  { key: 'correlating', label: 'Correlating findings' },
  { key: 'ai_analysis', label: 'AI security analysis' },
  { key: 'generating_report', label: 'Generating report' },
];

export default function Scans() {
  const [scans, setScans] = useState<any[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const preselectedApp = searchParams.get('app');
  const [showConfig, setShowConfig] = useState(!!preselectedApp);

  const load = async () => {
    setLoading(true);
    const [s, a] = await Promise.all([fetchScans(), fetchApplications()]);
    setScans(s);
    setApps(a);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSpinner label="Loading scans..." />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Scans" subtitle="Configure and monitor security scans">
        {apps.length > 0 && (
          <button onClick={() => setShowConfig(true)} className="btn-primary">
            <Play size={16} /> New Scan
          </button>
        )}
      </PageHeader>

      {scans.length === 0 && !showConfig ? (
        <EmptyState
          icon={ScanLine}
          title="No scans yet"
          message="Register an application and start your first security scan to see results here."
        />
      ) : (
        <div className="space-y-3">
          {scans.map(scan => {
            const app = apps.find(a => a.id === scan.application_id);
            const stageIndex = SCAN_STAGES.findIndex(s => s.key === scan.stage);
            return (
              <Link key={scan.id} to={`/scans/${scan.id}`} className="glass-card p-4 hover:glow-border transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <ScanLine size={18} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{app?.name || 'Unknown'}</span>
                    <StatusBadge status={scan.status} />
                    {scan.is_demo && <DemoBanner />}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(scan.created_at).toLocaleString()} · {scan.total_findings} findings
                    {scan.completed_at && ` · Score: ${scan.security_score_after}/100`}
                  </div>
                  {scan.status === 'running' && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all" style={{ width: `${scan.progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{scan.progress}%</span>
                    </div>
                  )}
                </div>
                {scan.status === 'completed' && <ScoreRing score={scan.security_score_after} size={48} />}
              </Link>
            );
          })}
        </div>
      )}

      {showConfig && (
        <ScanConfigModal
          apps={apps}
          preselectedApp={preselectedApp}
          onClose={() => setShowConfig(false)}
          onStarted={() => { setShowConfig(false); load(); }}
        />
      )}
    </div>
  );
}

function ScanConfigModal({ apps, preselectedApp, onClose, onStarted }: {
  apps: Application[];
  preselectedApp: string | null;
  onClose: () => void;
  onStarted: () => void;
}) {
  const [appId, setAppId] = useState(preselectedApp || apps[0]?.id || '');
  const [categories, setCategories] = useState<string[]>(['auth', 'input', 'authorization', 'api', 'file_upload', 'config']);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleCat = (id: string) => {
    setCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleStart = async () => {
    if (!appId || categories.length === 0) return;
    setRunning(true);
    setError(null);
    setProgress(5);
    setCurrentStage('Initializing...');

    try {
      const scan = await createScan(appId, categories);

      // Simulate progress while the edge function runs
      let p = 10;
      const interval = setInterval(() => {
        p = Math.min(p + Math.random() * 15, 90);
        setProgress(Math.round(p));
        const stageIdx = Math.floor((p / 100) * SCAN_STAGES.length);
        setCurrentStage(SCAN_STAGES[Math.min(stageIdx, SCAN_STAGES.length - 1)].label);
      }, 800);

      await runScan(scan.id, appId, categories);

      clearInterval(interval);
      setProgress(100);
      setCurrentStage('Completed');
      setTimeout(() => onStarted(), 800);
    } catch (err: any) {
      setError(err.message);
      setRunning(false);
    }
  };

  if (running) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card p-8 w-full max-w-md glow-border text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 mb-4 relative overflow-hidden">
            <ScanLine size={28} className="text-blue-400" />
            <div className="absolute inset-0 scan-sweep bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Security Scan In Progress</h2>
          <p className="text-xs text-slate-400 mb-6">{currentStage}</p>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-slate-500">{progress}% complete</div>

          <div className="mt-6 space-y-1.5 text-left">
            {SCAN_STAGES.map((stage, i) => {
              const stageProgress = (progress / 100) * SCAN_STAGES.length;
              const isDone = i < stageProgress;
              const isCurrent = Math.floor(stageProgress) === i;
              return (
                <div key={stage.key} className="flex items-center gap-2 text-xs">
                  {isDone ? <CheckCircle2 size={14} className="text-green-400" /> :
                   isCurrent ? <div className="w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /> :
                   <Clock size={14} className="text-slate-600" />}
                  <span className={isDone ? 'text-slate-400' : isCurrent ? 'text-blue-400' : 'text-slate-600'}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4"><DemoBanner /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg glow-border max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-1">Configure Security Scan</h2>
        <p className="text-xs text-slate-500 mb-5">Select a target application and test categories</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Application</label>
            <select value={appId} onChange={e => setAppId(e.target.value)} className="input-field">
              {apps.map(a => <option key={a.id} value={a.id}>{a.name} ({a.technology})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Security Test Categories</label>
            <div className="space-y-2">
              {TEST_CATEGORIES.map(cat => (
                <label key={cat.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 hover:bg-slate-800/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={categories.includes(cat.id)}
                    onChange={() => toggleCat(cat.id)}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <div className="text-sm text-slate-200 font-medium">{cat.label}</div>
                    <div className="text-xs text-slate-500">{cat.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-400/80">Controlled test environment — non-destructive security checks only</span>
          </div>

          {error && <div className="text-xs text-red-400 p-2 rounded-lg bg-red-500/10">{error}</div>}

          <button onClick={handleStart} disabled={!appId || categories.length === 0} className="btn-primary w-full justify-center text-base py-3">
            <Play size={18} /> START SECURITY SCAN
          </button>
        </div>
      </div>
    </div>
  );
}
