import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Brain,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from 'lucide-react';

import { fetchVulnerability, fetchEvidence } from '@/lib/api';

import {
  PageHeader,
  LoadingSpinner,
  SeverityBadge,
  StatusBadge,
  LifecycleTracker,
} from '@/components/ui';

export default function AIAnalyst() {
  const [searchParams] = useSearchParams();
  const vulnerabilityId = searchParams.get('vulnerability');

  const [vulnerability, setVulnerability] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!vulnerabilityId) {
        setLoading(false);
        return;
      }

      try {
        const vuln = await fetchVulnerability(vulnerabilityId);
        setVulnerability(vuln);

        if (vuln) {
          const ev = await fetchEvidence(vulnerabilityId);
          setEvidence(ev || []);
        }
      } catch (error) {
        console.error('Failed to load AI Analyst data:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [vulnerabilityId]);

  if (loading) {
    return <LoadingSpinner label="Loading security evidence..." />;
  }

  if (!vulnerabilityId || !vulnerability) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="AI Security Analyst"
          subtitle="Evidence-based security analysis"
        />

        <div className="glass-card p-8 text-center">
          <Brain
            size={40}
            className="mx-auto mb-4 text-violet-400"
          />

          <h2 className="text-lg font-bold text-white mb-2">
            No vulnerability selected
          </h2>

          <p className="text-sm text-slate-400 mb-5">
            Open AI Analyst from a specific vulnerability to analyze
            its real scanner evidence.
          </p>

          <Link
            to="/vulnerabilities"
            className="btn-secondary inline-flex"
          >
            <ArrowLeft size={16} />
            Back to Vulnerabilities
          </Link>
        </div>
      </div>
    );
  }

  const title =
    vulnerability.vulnerability_type ||
    vulnerability.title ||
    'Security Finding';

  const applicationName =
    vulnerability.applications?.name ||
    'Application';

  return (
    <div className="animate-fade-in">

      <Link
        to={`/vulnerabilities/${vulnerability.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4"
      >
        <ArrowLeft size={14} />
        Back to Finding
      </Link>

      <PageHeader
        title="AI Security Analyst"
        subtitle={`${applicationName} · ${title}`}
      >
        <SeverityBadge severity={vulnerability.severity} />
        <StatusBadge status={vulnerability.status} />
      </PageHeader>

      <div className="glass-card p-4 mb-6">
        <LifecycleTracker currentStage="explain" />
      </div>

      {/* ANALYSIS INPUT */}
      <div className="glass-card p-5 mb-4">

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Brain size={22} className="text-violet-400" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Evidence-Based Analysis
            </h2>

            <p className="text-xs text-slate-500">
              Analysis target: {title}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-4">

          <div className="text-xs text-slate-500 mb-2">
            Scanner Finding
          </div>

          <div className="text-sm font-semibold text-white mb-3">
            {title}
          </div>

          <div className="text-xs text-slate-400 mb-1">
            Description
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {vulnerability.description ||
              'The security scanner identified a security weakness based on observable target behavior.'}
          </p>

        </div>
      </div>

      {/* REAL EVIDENCE */}
      <div className="glass-card p-5 mb-4">

        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-blue-400" />

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Evidence Supplied to Analyst
          </h2>

          <span className="text-xs text-slate-500 ml-auto">
            {evidence.length} record{evidence.length !== 1 ? 's' : ''}
          </span>
        </div>

        {evidence.length > 0 ? (
          <div className="space-y-3">
            {evidence.map((ev: any) => (
              <div
                key={ev.id}
                className="rounded-lg bg-black/40 border border-slate-800 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2
                    size={14}
                    className="text-green-400"
                  />

                  <span className="text-xs text-green-400">
                    Captured scanner evidence
                  </span>
                </div>

                <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap overflow-x-auto">
                  {ev.content || 'No evidence content available.'}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-slate-900/40 p-4">
            <p className="text-sm text-slate-400">
              No separate evidence record is stored.
            </p>

            {vulnerability.evidence && (
              <pre className="mt-3 text-xs text-green-300 font-mono whitespace-pre-wrap">
                {vulnerability.evidence}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* CURRENT ANALYSIS */}
      <div className="glass-card p-5 mb-4 border-l-2 border-l-violet-500/40">

        <div className="flex items-center gap-2 mb-4">
          <Brain size={18} className="text-violet-400" />

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Security Interpretation
          </h2>
        </div>

        <div className="rounded-lg bg-violet-500/5 border border-violet-500/15 p-4">

          <p className="text-sm text-slate-300 leading-relaxed">
            The finding was generated from observable evidence
            collected by the SecureLens security scanner. The analyst
            should interpret this evidence, explain the security impact,
            identify the likely root cause, and recommend a remediation.
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle size={14} />
            AI interpretation will be generated from this evidence.
          </div>

        </div>
      </div>

      {/* WORKFLOW */}
      <div className="glass-card p-5">

        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Continue Security Workflow
        </h2>

        <div className="flex flex-wrap gap-2">

          <Link
            to={`/vulnerabilities/${vulnerability.id}`}
            className="btn-secondary"
          >
            <ArrowLeft size={16} />
            Finding
          </Link>

          <Link
            to={`/remediation?vulnerability=${vulnerability.id}`}
            className="btn-secondary"
          >
            Fix →
          </Link>

          <Link
            to={`/retesting?vulnerability=${vulnerability.id}`}
            className="btn-secondary"
          >
            Retest →
          </Link>

          <Link
            to={`/reports?scan=${vulnerability.scan_id}&vulnerability=${vulnerability.id}`}
            className="btn-secondary"
          >
            Report →
          </Link>

        </div>
      </div>

    </div>
  );
}