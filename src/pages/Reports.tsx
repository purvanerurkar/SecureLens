import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FileText, ArrowLeft, RefreshCw, Download, Brain, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { fetchReports, fetchReport, regenerateReport, fetchVulnsByScan, fetchFunctionalityTests } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { PageHeader, LoadingSpinner, ScoreRing, SeverityBadge, StatusBadge, DemoBanner, EmptyState } from '@/components/ui';
import type { Vulnerability, FunctionalityTest } from '@/types';

export default function Reports() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const scanFilter = searchParams.get('scan');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  (async () => {
    try {
      const data = await fetchReports();
      console.log('📄 REPORTS:', data);
      setReports(data || []);
    } catch (error) {
      console.error('❌ FAILED TO LOAD REPORTS:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  if (loading) return <LoadingSpinner label="Loading reports..." />;

  if (id) return <ReportDetail id={id} />;

  let filtered = reports;
  if (scanFilter) filtered = filtered.filter(r => r.scan_id === scanFilter);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Security Reports" subtitle="Complete security assessment reports for your scans" />

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports generated"
          message="Security reports are created automatically when a scan completes. Run a scan to generate your first report."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Link key={r.id} to={`/reports/${r.id}`} className="glass-card p-5 hover:glow-border transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 flex items-center justify-center flex-shrink-0">
                <FileText size={22} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">{r.applications?.name || 'Unknown App'}</span>
                  {r.scans?.is_demo && <DemoBanner />}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleString()} · {r.overall_status}
                </div>
              </div>
              <ScoreRing score={r.security_score} size={48} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportDetail({ id }: { id: string }) {
  const [report, setReport] = useState<any>(null);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [funcTests, setFuncTests] = useState<FunctionalityTest[]>([]);
  const [aiAnalyses, setAiAnalyses] = useState<any[]>([]);
  const [remediations, setRemediations] = useState<any[]>([]);
  const [retests, setRetests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
  (async () => {
    try {
      const r = await fetchReport(id);

      console.log('📄 REPORT:', r);

      setReport(r);

      if (r?.scan_id) {
        const [v, ft] = await Promise.all([
          fetchVulnsByScan(r.scan_id),
          fetchFunctionalityTests(r.scan_id),
        ]);

        console.log('🔍 VULNERABILITIES:', v);
        console.log('🧪 FUNCTIONALITY TESTS:', ft);

        setVulns(v);
        setFuncTests(ft);

        // Load remediations for the vulnerabilities in this scan
        const vulnerabilityIds = v.map(vv => vv.id);

        if (vulnerabilityIds.length > 0) {
          const { data: remData, error: remError } = await supabase
            .from('remediations')
            .select('*')
            .in('vulnerability_id', vulnerabilityIds);

          if (remError) {
            console.error('❌ Remediation load failed:', remError);
          }

          const { data: rtData, error: rtError } = await supabase
            .from('retests')
            .select('*')
            .in('vulnerability_id', vulnerabilityIds);

          if (rtError) {
            console.error('❌ Retest load failed:', rtError);
          }

          setRemediations(remData || []);
          setRetests(rtData || []);
        } else {
          setRemediations([]);
          setRetests([]);
        }

        // AI analyses are optional.
        // Do not let a missing AI table break the report.
        try {
          const { data: aiData, error: aiError } = await supabase
            .from('ai_analyses')
            .select('*')
            .eq('scan_id', r.scan_id);

          if (aiError) {
            console.warn('⚠️ AI analysis unavailable:', aiError.message);
            setAiAnalyses([]);
          } else {
            setAiAnalyses(aiData || []);
          }
        } catch (error) {
          console.warn('⚠️ AI analysis query failed:', error);
          setAiAnalyses([]);
        }
      }
    } catch (error) {
      console.error('❌ REPORT LOAD FAILED:', error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  })();
}, [id]);
  const handleRegenerate = async () => {
  if (!report) return;

  setRegenerating(true);

  try {
    const regenerated = await regenerateReport(
      report.scan_id,
      report.application_id
    );

    console.log('✅ REPORT REGENERATED:', regenerated);

    const r = await fetchReport(id);
    setReport(r);
  } catch (error) {
    console.error('❌ REPORT REGENERATION FAILED:', error);
    alert('Report generation failed. Check the browser console.');
  } finally {
    setRegenerating(false);
  }
};

  if (loading) return <LoadingSpinner label="Loading report..." />;
  if (!report) return (
    <div className="text-center py-20">
      <p className="text-slate-400 mb-4">Report not found or access denied.</p>
      <Link to="/reports" className="btn-secondary">Back to Reports</Link>
    </div>
  );

  const critical = vulns.filter(v => v.severity === 'critical').length;
  const high = vulns.filter(v => v.severity === 'high').length;
  const medium = vulns.filter(v => v.severity === 'medium').length;
  const low = vulns.filter(v => v.severity === 'low').length;
  const fixed = vulns.filter(v => v.status === 'resolved').length;
  const funcPassed = funcTests.filter(f => f.status === 'passed').length;
  const funcFailed = funcTests.filter(f => f.status !== 'passed').length;

  return (
    <div className="animate-fade-in">
      <Link to="/reports" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4">
        <ArrowLeft size={14} /> Back to Reports
      </Link>

      {/* Report header */}
      <div className="glass-card p-6 mb-4 glow-border">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">SECURELENS AI SECURITY REPORT</h1>
            <p className="text-xs text-slate-500 mt-1">Find it. Prove it. Fix it. Verify it.</p>
          </div>
          <div className="flex items-center gap-3">
            {report.scans?.is_demo && <DemoBanner />}
            <button onClick={handleRegenerate} disabled={regenerating} className="btn-secondary text-xs py-2">
              <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} /> Regenerate
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div><div className="text-xs text-slate-500">Application</div><div className="text-sm text-slate-200">{report.applications?.name}</div></div>
          <div><div className="text-xs text-slate-500">Scan ID</div><div className="text-sm text-slate-200 font-mono">{report.scan_id?.slice(0, 8)}...</div></div>
          <div><div className="text-xs text-slate-500">Report ID</div><div className="text-sm text-slate-200 font-mono">{report.id?.slice(0, 8)}...</div></div>
          <div><div className="text-xs text-slate-500">Scan Date</div><div className="text-sm text-slate-200">{report.scans ? new Date(report.scans.created_at).toLocaleString() : '—'}</div></div>
        </div>

        <div className="flex items-center gap-6 pt-4 border-t border-slate-800/40">
          <ScoreRing score={report.security_score} size={80} />
          <div>
            <div className="text-xs text-slate-500">Overall Status</div>
            <div className={`text-lg font-bold ${report.overall_status === 'All Issues Resolved' ? 'text-green-400' : 'text-orange-400'}`}>
              {report.overall_status}
            </div>
            {report.scans && (
              <div className="text-xs text-slate-500 mt-1">
                Score: {report.scans.security_score_before} → {report.scans.security_score_after}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="glass-card p-5 mb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Executive Summary</h2>
        <p className="text-sm text-slate-300 leading-relaxed">{report.executive_summary}</p>
      </div>

      {/* Vulnerability Summary */}
      <div className="glass-card p-5 mb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Vulnerability Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Critical', count: critical, cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
            { label: 'High', count: high, cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
            { label: 'Medium', count: medium, cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
            { label: 'Low', count: low, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
            { label: 'Fixed', count: fixed, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
          ].map(s => (
            <div key={s.label} className={`text-center p-4 rounded-lg border ${s.cls}`}>
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Findings */}
      {/* Complete Findings */}
<div className="glass-card p-5 mb-4">
  <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
    Complete Findings
  </h2>

  {vulns.length === 0 ? (
    <p className="text-sm text-slate-500">
      No vulnerabilities detected.
    </p>
  ) : (
    <div className="space-y-4">
      {vulns.map((v, i) => (
        <div
          key={v.id}
          className="rounded-lg bg-slate-900/40 border border-slate-800/40 p-4"
        >
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-slate-500 font-mono">
              #{i + 1}
            </span>

            <Link
              to={`/vulnerabilities/${v.id}`}
              className="text-sm font-bold text-white hover:text-blue-400"
            >
              {v.title}
            </Link>

            <SeverityBadge severity={v.severity} />
            <StatusBadge status={v.status} />
          </div>

          <div className="mb-3">
            <div className="text-xs text-slate-500 mb-1">
              Category
            </div>
            <div className="text-sm text-slate-300">
              {v.category || 'Security'}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-slate-500 mb-1">
                Description
              </div>
              <div className="text-slate-300 leading-relaxed">
                {v.description || 'No description available.'}
              </div>
            </div>

            <div>
              <div className="text-slate-500 mb-1">
                Evidence
              </div>
              <div className="text-slate-300 font-mono whitespace-pre-wrap bg-slate-950/50 rounded-lg p-3">
                {v.evidence || 'No evidence recorded.'}
              </div>
            </div>

            <div>
              <div className="text-slate-500 mb-1">
                Recommended Remediation
              </div>
              <div className="text-green-300 leading-relaxed">
                {v.remediation || 'No remediation recorded.'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

      {/* BUG → FIX → VERIFY History */}
      {/* BUG → FIX → VERIFY History */}
<div className="glass-card p-5 mb-4 border-l-2 border-l-cyan-500/30">
  <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
    Bug → Fix → Verify History
  </h2>

  {vulns.length === 0 ? (
    <p className="text-sm text-slate-500">
      No bug history available.
    </p>
  ) : (
    <div className="space-y-4">
      {vulns.map(v => (
        <div
          key={v.id}
          className="rounded-lg bg-slate-900/40 p-4"
        >
          <div className="text-sm font-bold text-white mb-3">
            {v.title}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-red-400 font-semibold mb-1">
                BUG
              </div>
              <div className="text-slate-300">
                {v.description || 'No description available.'}
              </div>
            </div>

            <div>
              <div className="text-blue-400 font-semibold mb-1">
                EVIDENCE
              </div>
              <div className="text-slate-300 font-mono whitespace-pre-wrap">
                {v.evidence || 'No evidence recorded.'}
              </div>
            </div>

            <div>
              <div className="text-green-400 font-semibold mb-1">
                FIX
              </div>
              <div className="text-slate-300">
                {v.remediation || 'Not yet remediated.'}
              </div>
            </div>

            <div>
              <div className="text-cyan-400 font-semibold mb-1">
                RETEST
              </div>
              <div className="text-slate-300">
                {v.status === 'resolved'
                  ? 'Resolved — vulnerability is no longer detected.'
                  : 'Open — vulnerability still requires remediation.'}
              </div>
            </div>
          </div>

          <div
            className={`mt-3 pt-3 border-t border-slate-800/40 flex items-center gap-2 text-sm font-bold ${
              v.status === 'resolved'
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {v.status === 'resolved' ? (
              <CheckCircle2 size={16} />
            ) : (
              <XCircle size={16} />
            )}

            FINAL RESULT:{' '}
            {v.status === 'resolved'
              ? 'Resolved'
              : 'Still Vulnerable'}
          </div>
        </div>
      ))}
    </div>
  )}
</div>

      {/* Functionality Verification */}
      <div className="glass-card p-5 mb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Functionality Verification</h2>
        {funcTests.length === 0 ? (
          <p className="text-sm text-slate-500">No functionality tests recorded.</p>
        ) : (
          <>
            {funcFailed > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-4">
                <AlertTriangle size={16} className="text-yellow-400" />
                <span className="text-sm text-yellow-400 font-semibold">REGRESSION DETECTED — {funcFailed} feature(s) failed</span>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {funcTests.map(ft => (
                <div key={ft.id} className={`flex items-center gap-2 p-3 rounded-lg ${ft.status === 'passed' ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                  {ft.status === 'passed' ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200">{ft.feature_name}</div>
                    {ft.is_regression && <div className="text-xs text-red-400">Regression</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* AI Security Analyst Report link */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3">
          <Brain size={20} className="text-violet-400" />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">AI Security Analyst Report</div>
            <div className="text-xs text-slate-500">Per-vulnerability AI interpretation with evidence-based analysis</div>
          </div>
          <Link to="/ai-analyst" className="btn-secondary text-xs py-2">View AI Reports</Link>
        </div>
      </div>
    </div>
  );
}
