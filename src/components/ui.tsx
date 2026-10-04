import { AlertTriangle } from 'lucide-react';

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = `badge-${severity.toLowerCase()} px-2.5 py-1 rounded-md text-xs font-semibold capitalize`;
  return <span className={cls}>{severity}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    detected: 'badge-detected',
    resolved: 'badge-resolved',
    suggested: 'badge-suggested',
    approved: 'badge-approved',
    applied: 'badge-applied',
    pending: 'badge-info',
    'still_vulnerable': 'badge-detected',
    passed: 'badge-resolved',
    failed: 'badge-critical',
  };
  const cls = `${map[status] || 'badge-info'} px-2.5 py-1 rounded-md text-xs font-semibold capitalize`;
  return <span className={cls}>{status.replace(/_/g, ' ')}</span>;
}

export function DemoBanner() {
  return (
    <span className="demo-banner">
      <AlertTriangle size={14} />
      DEMO DATA — NOT A REAL SECURITY SCAN
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 90 ? '#f87171' : value >= 75 ? '#fb923c' : value >= 50 ? '#facc15' : '#60a5fa';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-slate-400">{value}%</span>
    </div>
  );
}

export function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : score >= 30 ? '#f97316' : '#ef4444';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export function LifecycleTracker({ currentStage }: { currentStage: string }) {
  const stages = ['find', 'prove', 'explain', 'fix', 'retest', 'verify'];
  const stageMap: Record<string, string> = {
    find: 'Find', prove: 'Prove', explain: 'Explain', fix: 'Fix', retest: 'Retest', verify: 'Verify',
  };
  const currentIndex = stages.indexOf(currentStage.toLowerCase());
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((stage, i) => {
        const isDone = currentIndex > i || currentIndex === stages.length - 1;
        const isCurrent = currentIndex === i;
        return (
          <div key={stage} className="flex items-center gap-1">
            <div
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                isDone ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                isCurrent ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse-glow' :
                'bg-slate-800/40 text-slate-500 border border-slate-700/30'
              }`}
            >
              {isDone && '✓ '}{stageMap[stage]}
            </div>
            {i < stages.length - 1 && <div className={`w-4 h-px ${isDone ? 'bg-green-500/30' : 'bg-slate-700/30'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3 flex-wrap">{children}</div>}
    </div>
  );
}

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        {label && <span className="text-sm">{label}</span>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; message: string }) {
  return (
    <div className="glass-card p-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/40 mb-4">
        <Icon size={28} className="text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{message}</p>
    </div>
  );
}
