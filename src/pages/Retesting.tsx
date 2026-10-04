import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { fetchAllRetests, runRetest } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { PageHeader, LoadingSpinner, SeverityBadge, StatusBadge, EmptyState, DemoBanner } from '@/components/ui';

export default function Retesting() {
  const [retests, setRetests] = useState<any[]>([]);
  const [vulns, setVulns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [rtData, vData] = await Promise.all([
      fetchAllRetests(),
      (async () => {
        const { data } = await supabase
          .from('vulnerabilities')
          .select('*, remediations(status), applications(name)')
          .order('created_at', { ascending: false });
        return data || [];
      })(),
    ]);
    setRetests(rtData || []);
    setVulns(vData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRetest = async (vulnId: string) => {
    setActionLoading(vulnId);
    await runRetest(vulnId);
    await load();
    setActionLoading(null);
  };

  if (loading) return <LoadingSpinner label="Loading retests..." />;

  const retestMap = new Map(retests.map(r => [r.vulnerability_id, r]));
  const readyForRetest = vulns.filter(v => v.remediations?.[0]?.status === 'applied' && !retestMap.has(v.id));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Retesting" subtitle="Re-run security tests after remediation to verify vulnerabilities are resolved">
        
      </PageHeader>

      {retests.length === 0 && readyForRetest.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No retests yet"
          message="Apply a remediation fix to a vulnerability, then run a retest to verify it's resolved. The full lifecycle is: Fix → Retest → Verify."
        />
      ) : (
        <div className="space-y-6">
          {/* Ready for retest */}
          {readyForRetest.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Ready for Retest ({readyForRetest.length})
              </div>
              <div className="space-y-2">
                {readyForRetest.map(v => (
                  <div key={v.id} className="glass-card p-4 flex items-center gap-4 border-l-2 border-l-blue-500/30">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <RefreshCw size={16} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200">{v.vulnerability_type}</div>
                      <div className="text-xs text-slate-500">{v.applications?.name} · {v.endpoint}</div>
                    </div>
                    <SeverityBadge severity={v.severity} />
                    <button onClick={() => handleRetest(v.id)} disabled={actionLoading === v.id} className="btn-primary text-xs py-2">
                      {actionLoading === v.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Run Retest
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed retests */}
          {retests.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-white mb-3">Retest Results</div>
              <div className="space-y-3">
                {retests.map(rt => {
                  const v = rt.vulnerabilities;
                  const isResolved = rt.final_status === 'Resolved';
                  return (
                    <Link key={rt.id} to={`/vulnerabilities/${rt.vulnerability_id}`} className="glass-card p-5 hover:glow-border transition-all block">
                      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isResolved ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {isResolved ? <CheckCircle2 size={20} className="text-green-400" /> : <XCircle size={20} className="text-red-400" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{v?.vulnerability_type}</div>
                            <div className="text-xs text-slate-500">{v?.applications?.name} · {v?.endpoint}</div>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${isResolved ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {rt.final_status}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-xs text-red-400 font-semibold">BEFORE</span>
                          </div>
                          <div className="text-sm text-slate-300">{rt.original_result}</div>
                        </div>
                        <div className={`rounded-lg border p-3 ${isResolved ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${isResolved ? 'bg-green-400' : 'bg-red-400'}`} />
                            <span className={`text-xs font-semibold ${isResolved ? 'text-green-400' : 'text-red-400'}`}>AFTER</span>
                          </div>
                          <div className="text-sm text-slate-300">{rt.retest_result}</div>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-900/40 p-3">
                        <div className="text-xs text-slate-500 mb-1">Difference</div>
                        <div className="text-sm text-slate-300">{rt.difference}</div>
                      </div>

                      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <span>{new Date(rt.created_at).toLocaleString()}</span>
                        <span className="text-blue-400 flex items-center gap-1">View Details <ArrowRight size={12} /></span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
