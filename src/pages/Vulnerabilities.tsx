import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bug, Search, Filter } from 'lucide-react';
import { fetchVulnerabilities } from '@/lib/api';
import { PageHeader, LoadingSpinner, SeverityBadge, StatusBadge, ConfidenceBar, EmptyState } from '@/components/ui';

export default function Vulnerabilities() {
  const [vulns, setVulns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchParams] = useSearchParams();
  const scanFilter = searchParams.get('scan');

  useEffect(() => {
  const loadVulnerabilities = async () => {
    try {
      const data = await fetchVulnerabilities();

      // If a specific scan is requested, keep all findings
      // so the existing ?scan= filter continues to work.
      if (scanFilter) {
        setVulns(data);
        return;
      }

      // Group findings by scan and show only the latest scan.
      if (data.length > 0) {
        const latestScanId = data.reduce((latest: any, current: any) => {
          if (!latest) return current;

          return new Date(current.created_at).getTime() >
            new Date(latest.created_at).getTime()
            ? current
            : latest;
        }, null)?.scan_id;

        setVulns(
          latestScanId
            ? data.filter((v: any) => v.scan_id === latestScanId)
            : data
        );
      } else {
        setVulns([]);
      }
    } catch (error) {
      console.error('Failed to load vulnerabilities:', error);
      setVulns([]);
    } finally {
      setLoading(false);
    }
  };

  loadVulnerabilities();
}, [scanFilter]);

  if (loading) return <LoadingSpinner label="Loading vulnerabilities..." />;

  let filtered = vulns;
  if (scanFilter) filtered = filtered.filter(v => v.scan_id === scanFilter);
  if (search) filtered = filtered.filter(v =>
    v.vulnerability_type.toLowerCase().includes(search.toLowerCase()) ||
    v.endpoint.toLowerCase().includes(search.toLowerCase()) ||
    v.parameter.toLowerCase().includes(search.toLowerCase())
  );
  if (sevFilter !== 'all') filtered = filtered.filter(v => v.severity === sevFilter);
  if (statusFilter !== 'all') filtered = filtered.filter(v => v.status === statusFilter);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Vulnerabilities" subtitle={`${filtered.length} of ${vulns.length} findings`}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input-field pl-8 py-2 text-xs w-40" />
          </div>
          <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="input-field py-2 text-xs w-32">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field py-2 text-xs w-32">
            <option value="all">All Status</option>
            <option value="open">Detected</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState icon={Bug} title="No vulnerabilities found" message="Run a security scan to detect vulnerabilities in your applications." />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800/40 bg-slate-900/30">
                  <th className="text-left py-3 px-4 font-medium">Vulnerability</th>
                  <th className="text-left py-3 px-4 font-medium">Severity</th>
                  <th className="text-left py-3 px-4 font-medium">Confidence</th>
                  <th className="text-left py-3 px-4 font-medium">Application</th>
                  <th className="text-left py-3 px-4 font-medium">Endpoint</th>
                  <th className="text-left py-3 px-4 font-medium">Parameter</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Retest</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-slate-800/20 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/vulnerabilities/${v.id}`} className="text-slate-200 hover:text-blue-400 font-medium">
                        {v.vulnerability_type}
                      </Link>
                    </td>
                    <td className="py-3 px-4"><SeverityBadge severity={v.severity} /></td>
                    <td className="py-3 px-4"><ConfidenceBar value={v.confidence} /></td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{v.applications?.name || '—'}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">{v.endpoint}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">{v.parameter}</td>
                    <td className="py-3 px-4"><StatusBadge status={v.status} /></td>
                    <td className="py-3 px-4">
                      {v.retest_status === 'resolved' ? <span className="text-green-400 text-xs">✓ Resolved</span> :
                       v.retest_status === 'still_vulnerable' ? <span className="text-red-400 text-xs">✗ Still Vulnerable</span> :
                       <span className="text-slate-500 text-xs">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
