import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bug,
  Activity,
  FileText,
  CheckCircle2,
} from 'lucide-react';

import {
  fetchScan,
  fetchVulnsByScan,
} from '@/lib/api';

import {
  PageHeader,
  LoadingSpinner,
  ScoreRing,
  SeverityBadge,
  StatusBadge,
  DemoBanner,
  LifecycleTracker,
} from '@/components/ui';

import type { Vulnerability } from '@/types';

export default function ScanDetail() {
  const { id } = useParams();

  const [scan, setScan] = useState<any>(null);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<
    'overview' | 'findings'
  >('overview');

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const s = await fetchScan(id);

        setScan(s);

        if (s) {
          const vs = await fetchVulnsByScan(id);
          setVulns(vs);
        }
      } catch (error) {
        console.error('Failed to load scan:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <LoadingSpinner label="Loading scan..." />;
  }

  if (!scan) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 mb-4">
          Scan not found or access denied.
        </p>

        <Link
          to="/scans"
          className="btn-secondary"
        >
          Back to Scans
        </Link>
      </div>
    );
  }

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      icon: Activity,
    },
    {
      key: 'findings',
      label: `Findings (${vulns.length})`,
      icon: Bug,
    },
  ];

  return (
    <div className="animate-fade-in">

      <Link
        to="/scans"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4"
      >
        <ArrowLeft size={14} />
        Back to Scans
      </Link>

      <PageHeader
        title={`${scan.applications?.name || 'Application'} — Scan`}
        subtitle={`${new Date(
          scan.created_at
        ).toLocaleString()} · ${scan.status}`}
      >
        {scan.is_demo && <DemoBanner />}
      </PageHeader>

      {/* Lifecycle */}
      <div className="glass-card p-4 mb-4">
        <LifecycleTracker
          currentStage={
            scan.status === 'completed'
              ? 'verify'
              : scan.stage
          }
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-800/40">

        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() =>
              setTab(t.key as 'overview' | 'findings')
            }
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === t.key
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}

      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Score */}
          <div className="glass-card p-5 flex flex-col items-center">

            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">
              Security Score
            </div>

            <ScoreRing
              score={scan.security_score_after ?? 0}
              size={100}
            />

            <div className="flex items-center gap-2 mt-3 text-xs">

              <span className="text-slate-500">
                Before: {scan.security_score_before ?? 100}
              </span>

              <span className="text-slate-600">
                →
              </span>

              <span className="text-green-400 font-medium">
                After: {scan.security_score_after ?? 0}
              </span>

            </div>

          </div>

          {/* Statistics */}
          <div className="glass-card p-5">

            <div className="text-xs text-slate-400 uppercase tracking-wider mb-4">
              Scan Statistics
            </div>

            <div className="space-y-2.5">

              {[
                {
                  label: 'Total Findings',
                  value: scan.total_findings ?? vulns.length,
                  color: 'text-white',
                },
                {
                  label: 'Critical',
                  value: scan.critical_count ?? 0,
                  color: 'text-red-400',
                },
                {
                  label: 'High',
                  value: scan.high_count ?? 0,
                  color: 'text-orange-400',
                },
                {
                  label: 'Medium',
                  value: scan.medium_count ?? 0,
                  color: 'text-yellow-400',
                },
                {
                  label: 'Low',
                  value: scan.low_count ?? 0,
                  color: 'text-blue-400',
                },
                {
                  label: 'Fixed',
                  value: scan.fixed_count ?? 0,
                  color: 'text-green-400',
                },
              ].map((s) => (

                <div
                  key={s.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-slate-400">
                    {s.label}
                  </span>

                  <span
                    className={`text-sm font-bold ${s.color}`}
                  >
                    {s.value}
                  </span>
                </div>

              ))}

            </div>

          </div>

          {/* Details */}
          <div className="glass-card p-5">

            <div className="text-xs text-slate-400 uppercase tracking-wider mb-4">
              Scan Details
            </div>

            <div className="space-y-2.5 text-sm">

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Status
                </span>

                <StatusBadge status={scan.status} />
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Findings
                </span>

                <span className="text-slate-200">
                  {vulns.length}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Test Categories
                </span>

                <span className="text-slate-200">
                  {scan.test_categories?.length || 0}
                </span>
              </div>

              {scan.started_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Started
                  </span>

                  <span className="text-slate-300 text-xs">
                    {new Date(
                      scan.started_at
                    ).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {scan.completed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Completed
                  </span>

                  <span className="text-slate-300 text-xs">
                    {new Date(
                      scan.completed_at
                    ).toLocaleTimeString()}
                  </span>
                </div>
              )}

            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/40">

              <Link
                to={`/vulnerabilities?scan=${scan.id}`}
                className="btn-secondary text-xs flex-1 justify-center py-2"
              >
                <Bug size={14} />
                View Findings
              </Link>

            </div>

          </div>

        </div>
      )}

      {/* FINDINGS */}
      {tab === 'findings' && (

        <div className="glass-card p-5">

          <div className="flex items-center justify-between mb-4">

            <div className="text-sm font-semibold text-white">
              Real Security Findings
            </div>

            <div className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle2 size={14} />
              Real scan
            </div>

          </div>

          {vulns.length === 0 ? (

            <div className="text-center py-8 text-sm text-slate-500">
              No vulnerabilities detected in this scan.
            </div>

          ) : (

            <div className="space-y-2">

              {vulns.map((v: any) => (

                <Link
                  key={v.id}
                  to={`/vulnerabilities/${v.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 hover:bg-slate-800/40 transition-colors"
                >

                  <SeverityBadge
                    severity={v.severity}
                  />

                  <div className="flex-1 min-w-0">

                    <div className="text-sm font-medium text-slate-200">
                      {v.vulnerability_type || v.title}
                    </div>

                    <div className="text-xs text-slate-500 font-mono">
                      {v.endpoint || 'Application root'}
                    </div>

                  </div>

                  <StatusBadge status={v.status} />

                </Link>

              ))}

            </div>

          )}

        </div>

      )}

    </div>
  );
}