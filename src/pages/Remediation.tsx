import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { fetchAllRemediations, approveRemediation, applyRemediation } from '@/lib/api';
import { PageHeader, LoadingSpinner, SeverityBadge, StatusBadge, EmptyState } from '@/components/ui';

export default function Remediation() {
  const [remediations, setRemediations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchAllRemediations();
    setRemediations(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    await approveRemediation(id);
    await load();
    setActionLoading(null);
  };

  const handleApply = async (id: string) => {
  setActionLoading(id);

  try {
    console.log("🔧 Applying remediation:", id);

    const result = await applyRemediation(id);

    console.log("✅ Remediation applied:", result);

    await load();

    alert("✅ Fix applied successfully!");
  } catch (error: any) {
    console.error("❌ Apply Fix failed:", error);

    alert(
      `❌ Apply Fix failed:\n\n${
        error?.message || "Unknown error"
      }`
    );
  } finally {
    setActionLoading(null);
  }
};

  if (loading) return <LoadingSpinner label="Loading remediations..." />;

  const stats = {
    suggested: remediations.filter(r => r.status === 'suggested').length,
    approved: remediations.filter(r => r.status === 'approved').length,
    applied: remediations.filter(r => r.status === 'applied').length,
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Remediation" subtitle="Review, approve, and apply controlled fixes for detected vulnerabilities" />

      {remediations.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No remediation records"
          message="Remediation suggestions are generated automatically when vulnerabilities are detected. Run a scan to get started."
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.suggested}</div>
              <div className="text-xs text-slate-500 mt-1">Pending Review</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.approved}</div>
              <div className="text-xs text-slate-500 mt-1">Approved</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-violet-400">{stats.applied}</div>
              <div className="text-xs text-slate-500 mt-1">Applied</div>
            </div>
          </div>

          <div className="space-y-3">
            {remediations.map((r) => {
              const v = r.vulnerabilities;
              return (
                <div key={r.id} className="glass-card p-5 hover:border-blue-500/20 transition-colors">
                  <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                    <Link to={`/vulnerabilities/${r.vulnerability_id}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Wrench size={18} className="text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{v?.vulnerability_type}</div>
                        <div className="text-xs text-slate-500">{v?.applications?.name} · {v?.endpoint}</div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {v && <SeverityBadge severity={v.severity} />}
                      <StatusBadge status={r.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-3">
                      <div className="text-xs text-red-400 font-semibold mb-1">BEFORE</div>
                      <div className="text-sm text-slate-300">{r.before_state}</div>
                    </div>
                    <div className="rounded-lg bg-green-500/5 border border-green-500/15 p-3">
                      <div className="text-xs text-green-400 font-semibold mb-1">AFTER</div>
                      <div className="text-sm text-slate-300">{r.after_state}</div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-900/40 p-3 mb-3">
                    <div className="text-xs text-slate-500 mb-1">Problem</div>
                    <div className="text-sm text-slate-300">{r.problem}</div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-800/40">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={12} />
                      Suggested: {new Date(r.created_at).toLocaleDateString()}
                      {r.approved_at && <><span className="mx-1">·</span>Approved: {new Date(r.approved_at).toLocaleDateString()}</>}
                      {r.applied_at && <><span className="mx-1">·</span>Applied: {new Date(r.applied_at).toLocaleDateString()}</>}
                    </div>
                    <div className="flex gap-2">
                      {r.status === 'suggested' && (
                        <button onClick={() => handleApprove(r.id)} disabled={actionLoading === r.id} className="btn-primary text-xs py-2">
                          {actionLoading === r.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={14} />}
                          Approve
                        </button>
                      )}
                      {r.status === 'approved' && (
                        <button onClick={() => handleApply(r.id)} disabled={actionLoading === r.id} className="btn-primary text-xs py-2">
                          {actionLoading === r.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Wrench size={14} />}
                          Apply Fix
                        </button>
                      )}
                      <Link to={`/vulnerabilities/${r.vulnerability_id}`} className="btn-secondary text-xs py-2">
                        Details <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
