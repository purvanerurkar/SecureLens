import { supabase } from './supabase';
import type { Application, Scan, Vulnerability, Evidence, AIAnalysis, Remediation, Retest, FunctionalityTest, SecurityReport, Endpoint } from '@/types';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-engine`;
const SCANNER_URL = 'http://127.0.0.1:8000';

async function callScanEngine(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ---- Applications ----
export async function fetchApplications() {
  const { data, error } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Application[];
}

export async function fetchApplication(id: string) {
  const { data, error } = await supabase.from('applications').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Application | null;
}

export async function createApplication(app: {
  name: string;
  technology: string;
  description: string;
  target_url: string;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!user) {
    throw new Error('You must be signed in to register an application.');
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      ...app,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Application;
}

export async function deleteApplication(id: string) {
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) throw error;
}

// ---- Scans ----
export async function fetchScans() {
  const { data, error } = await supabase.from('scans').select('*, applications(name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchScan(id: string) {
  const { data, error } = await supabase.from('scans').select('*, applications(name, technology)').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchScansByApp(appId: string) {
  const { data, error } = await supabase.from('scans').select('*').eq('application_id', appId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Scan[];
}

export async function createScan(appId: string, testCategories: string[]) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!user) {
    throw new Error('You must be signed in to create a scan.');
  }

  const { data, error } = await supabase
    .from('scans')
    .insert({
      user_id: user.id,
      application_id: appId,
      test_categories: testCategories,
      status: 'pending',
      stage: 'idle',
      progress: 0,
      is_demo: false,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Scan;
}

export async function runScan(
  scanId: string,
  appId: string,
  testCategories: string[]
) {
  // 1. Get target application
  const { data: app, error: appError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', appId)
    .maybeSingle();

  if (appError) throw appError;

  if (!app) {
    throw new Error('Target application not found.');
  }

  const targetUrl =
    (app as any).target_url ||
    (app as any).url ||
    (app as any).base_url;

  if (!targetUrl) {
    throw new Error(
      'This application does not have a target URL.'
    );
  }

  // 2. Mark scan as running
  await supabase
    .from('scans')
    .update({
      status: 'running',
      stage: 'discovering',
      progress: 10,
    })
    .eq('id', scanId);

  // 3. Call REAL Python security scanner
  const response = await fetch(`${SCANNER_URL}/api/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target_url: targetUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    await supabase
      .from('scans')
      .update({
        status: 'failed',
        stage: 'failed',
      })
      .eq('id', scanId);

    throw new Error(
      `Real scanner failed (${response.status}): ${errorText}`
    );
  }

  const result = await response.json();
  console.log("REAL SCANNER RESULT:", result);

  if (!result.success || !result.scan) {
    throw new Error('Scanner returned an invalid response.');
  }

  const scanResult = result.scan;

  if (scanResult.status !== 'COMPLETED') {
    throw new Error(
      scanResult.message || 'Security scan failed.'
    );
  }

  // 4. Remove old vulnerabilities for this scan
  await supabase
    .from('vulnerabilities')
    .delete()
    .eq('scan_id', scanId);

  // 5. Store REAL findings
  const findings = scanResult.findings || [];

  for (const finding of findings) {
    console.log("Saving findings to Supabase:", findings.length);
    const { data: vulnerability, error: vulnError } =
      await supabase
        .from('vulnerabilities')
        .insert({
          scan_id: scanId,
          application_id: appId,
          title: finding.title,
          severity: String(finding.severity || 'LOW').toLowerCase(),
          category: finding.category || 'Security',
          description: finding.description || '',
          evidence: finding.evidence || '',
          remediation: finding.remediation || '',
          status: 'open',
        })
        .select()
        .single();

    if (vulnError) {
      console.error('Failed to save vulnerability:', vulnError);
      continue;
    }

    // 6. Store evidence separately
    if (finding.evidence && vulnerability) {
      const { error: evidenceError } = await supabase
        .from('evidence')
        .insert({
          vulnerability_id: vulnerability.id,
          evidence_type: 'http_response',
          title: finding.title,
          content: finding.evidence,
        });

      if (evidenceError) {
        console.error(
          'Failed to save evidence:',
          evidenceError
        );
      }
    }
    // 6b. Automatically create remediation record
if (vulnerability) {
  const { error: remediationError } = await supabase
    .from('remediations')
    .insert({
      vulnerability_id: vulnerability.id,
      status: 'suggested',
      problem: finding.description || `Security issue detected: ${finding.title}`,
      before_state: finding.evidence || 'Vulnerable state detected by scanner.',
      after_state: finding.remediation || 'Apply the recommended security fix and verify with a retest.',
    });

  if (remediationError) {
    console.error(
      'Failed to create remediation:',
      remediationError
    );
  }
}
  }
  console.log("Finished saving findings");

  // 7. Calculate severity counts
  const critical = findings.filter(
    (f: any) =>
      String(f.severity).toLowerCase() === 'critical'
  ).length;

  const high = findings.filter(
    (f: any) =>
      String(f.severity).toLowerCase() === 'high'
  ).length;

  const medium = findings.filter(
    (f: any) =>
      String(f.severity).toLowerCase() === 'medium'
  ).length;

  const low = findings.filter(
    (f: any) =>
      String(f.severity).toLowerCase() === 'low'
  ).length;

  // 8. Update scan with REAL results
  const { error: scanUpdateError } = await supabase
    .from('scans')
    .update({
      status: 'completed',
      stage: 'generating_report',
      progress: 100,

      total_findings: findings.length,

      critical_count: critical,
      high_count: high,
      medium_count: medium,
      low_count: low,

      security_score_before: 100,
      security_score_after: scanResult.security_score,

      completed_at: new Date().toISOString(),

      // IMPORTANT: this is a real scan
      is_demo: false,
    })
    .eq('id', scanId);

  if (scanUpdateError) {
    throw scanUpdateError;
  }

  // 9. Update application security score
  await supabase
    .from('applications')
    .update({
      security_score: scanResult.security_score,
      last_scan_at: new Date().toISOString(),
    })
    .eq('id', appId);

    // 10. Automatically generate security report
  try {
    await regenerateReport(scanId, appId);
    console.log("✅ Security report generated successfully");
  } catch (reportError) {
    console.error("❌ Report generation failed:", reportError);
    throw reportError;
  }

  return {
    success: true,
    scan: scanResult,
    scan_id: scanId,
    application_id: appId,
    test_categories: testCategories,
    is_demo: false,
  };
}

// ---- Endpoints ----
export async function fetchEndpoints(scanId: string) {
  const { data, error } = await supabase.from('endpoints').select('*').eq('scan_id', scanId).order('created_at');
  if (error) throw error;
  return data as Endpoint[];
}

// ---- Vulnerabilities ----
export async function fetchVulnerabilities() {
  const { data, error } = await supabase
    .from('vulnerabilities')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((v: any) => ({
    ...v,
    vulnerability_type: v.vulnerability_type || v.title,
    endpoint: v.endpoint || 'Application root',
  }));
}

export async function fetchVulnsByScan(scanId: string) {
  const { data, error } = await supabase
    .from('vulnerabilities')
    .select('*')
    .eq('scan_id', scanId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((v: any) => ({
    ...v,
    vulnerability_type: v.vulnerability_type || v.title,
    endpoint: v.endpoint || 'Application root',
  }));
}

export async function fetchVulnsByApp(appId: string) {
  const { data, error } = await supabase
    .from('vulnerabilities')
    .select('*')
    .eq('application_id', appId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((v: any) => ({
    ...v,
    vulnerability_type: v.vulnerability_type || v.title,
    endpoint: v.endpoint || 'Application root',
  }));
}

export async function fetchVulnerability(id: string) {
  const { data, error } = await supabase
    .from('vulnerabilities')
    .select('*, applications(name, technology), scans(id, is_demo, created_at)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---- Evidence ----
export async function fetchEvidence(vulnId: string) {
  const { data, error } = await supabase.from('evidence').select('*').eq('vulnerability_id', vulnId).order('created_at');
  if (error) throw error;
  return data as Evidence[];
}

// ---- AI Analysis ----
export async function fetchAIAnalysis(vulnId: string) {
  const { data, error } = await supabase.from('ai_analyses').select('*').eq('vulnerability_id', vulnId).maybeSingle();
  if (error) throw error;
  return data as AIAnalysis | null;
}

// ---- Remediation ----
export async function fetchRemediation(vulnId: string) {
  const { data, error } = await supabase
    .from('remediations')
    .select('*')
    .eq('vulnerability_id', vulnId)
    .maybeSingle();

  if (error) throw error;
  return data as Remediation | null;
}

export async function fetchAllRemediations() {
  const { data, error } = await supabase
    .from('remediations')
    .select(`
      *,
      vulnerabilities(
        id,
        title,
        severity,
        category,
        status,
        created_at,
        application_id,
        applications(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    ...r,
    vulnerabilities: r.vulnerabilities
      ? {
          ...r.vulnerabilities,
          vulnerability_type: r.vulnerabilities.title,
          endpoint: 'Application root',
        }
      : null,
  }));
}

export async function approveRemediation(remediationId: string) {
  const { data, error } = await supabase
    .from('remediations')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', remediationId)
    .select()
    .single();

  if (error) throw error;
  return data as Remediation;
}

export async function applyRemediation(remediationId: string) {
  // 1. Get remediation + vulnerability + application
  const { data: remediation, error: remediationError } = await supabase
    .from('remediations')
    .select(`
      *,
      vulnerabilities(
        id,
        title,
        severity,
        category,
        status,
        evidence,
        application_id,
        applications(
          id,
          name,
          target_url
        )
      )
    `)
    .eq('id', remediationId)
    .single();

  if (remediationError) throw remediationError;

  if (!remediation) {
    throw new Error('Remediation not found.');
  }

  const vulnerability = remediation.vulnerabilities as any;

  if (!vulnerability) {
    throw new Error('Related vulnerability not found.');
  }

  const app = vulnerability.applications;

  if (!app?.target_url) {
    throw new Error('Target application URL is missing.');
  }

  // 2. Check whether we support automatic remediation
  const title = String(vulnerability.title || '').toLowerCase();
  const category = String(vulnerability.category || '').toLowerCase();

  const isPoweredByIssue =
    title.includes('x-powered-by') ||
    title.includes('information disclosure') ||
    category.includes('information disclosure');

  if (!isPoweredByIssue) {
    throw new Error(
      `Automatic fix is not supported yet for "${vulnerability.title}".`
    );
  }

  // 3. Ask SecureShop to apply the actual security fix
  const fixResponse = await fetch(
    `${app.target_url}/__securelens/fix/x-powered-by`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!fixResponse.ok) {
    const errorText = await fixResponse.text();

    throw new Error(
      `SecureShop fix failed (${fixResponse.status}): ${errorText}`
    );
  }

  const fixResult = await fixResponse.json();

  if (!fixResult.success) {
    throw new Error(
      fixResult.message || 'SecureShop refused the fix.'
    );
  }

  // 4. Mark remediation as applied
  const { data: appliedRemediation, error: updateError } =
    await supabase
      .from('remediations')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        after_state:
          'X-Powered-By protection enabled in SecureShop.',
      })
      .eq('id', remediationId)
      .select()
      .single();

  if (updateError) throw updateError;

  // 5. Automatically retest the vulnerability
  console.log(
    '🔄 Automatically retesting:',
    vulnerability.title
  );

  const retest = await runRetest(vulnerability.id);

  console.log('✅ RETEST RESULT:', retest);

  // 6. Regenerate security report
  try {
    await regenerateReport(
      vulnerability.scan_id,
      vulnerability.application_id
    );

    console.log('✅ Security report updated');
  } catch (reportError) {
    console.warn(
      '⚠️ Report update failed:',
      reportError
    );
  }

  return {
    ...appliedRemediation,
    retest,
  } as Remediation;
}

// ---- Retests ----
export async function fetchRetest(vulnId: string) {
  const { data, error } = await supabase
    .from('retests')
    .select('*')
    .eq('vulnerability_id', vulnId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Retest | null;
}

export async function fetchAllRetests() {
  const { data, error } = await supabase
    .from('retests')
    .select(`
      *,
      vulnerabilities(
        id,
        title,
        severity,
        category,
        status,
        application_id,
        applications(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    ...r,
    vulnerabilities: r.vulnerabilities
      ? {
          ...r.vulnerabilities,
          vulnerability_type: r.vulnerabilities.title,
          endpoint: 'Application root',
        }
      : null,
  }));
}

export async function runRetest(vulnId: string) {
  // Get the vulnerability and its application target
  const { data: vulnerability, error: vulnError } = await supabase
    .from('vulnerabilities')
    .select(`
      id,
      title,
      evidence,
      application_id,
      applications(
        id,
        name,
        target_url
      )
    `)
    .eq('id', vulnId)
    .single();

  if (vulnError) throw vulnError;

  const app = vulnerability.applications as any;

  if (!app?.target_url) {
    throw new Error('No target URL is configured for this application.');
  }

  // Run the REAL SecureLens scanner
  const response = await fetch(`${SCANNER_URL}/api/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target_url: app.target_url,
    }),
  });

  if (!response.ok) {
    throw new Error(`Scanner returned HTTP ${response.status}`);
  }

  const result = await response.json();
  const scan = result.scan;

  // Check whether the original vulnerability still exists
  const stillDetected = scan.findings.some(
    (finding: any) =>
      finding.title.toLowerCase() === vulnerability.title.toLowerCase()
  );

  const finalStatus = stillDetected ? 'Open' : 'Resolved';

  const originalResult =
    vulnerability.evidence || 'Original vulnerability was detected.';

  const retestResult = stillDetected
    ? `The scanner still detects: ${vulnerability.title}`
    : `The scanner no longer detects: ${vulnerability.title}`;

  const difference = stillDetected
    ? 'The vulnerability remains present and requires additional remediation.'
    : 'The vulnerability is no longer detected after remediation.';

  // Store the real retest result
  const { data, error } = await supabase
    .from('retests')
    .insert({
      vulnerability_id: vulnId,
      final_status: finalStatus,
      original_result: originalResult,
      retest_result: retestResult,
      difference,
    })
    .select()
    .single();

  if (error) throw error;

  // Update the vulnerability itself
  await supabase
    .from('vulnerabilities')
    .update({
      status: finalStatus === 'Resolved' ? 'resolved' : 'open',
    })
    .eq('id', vulnId);

  return data;
}

// ---- Functionality Tests ----
export async function fetchFunctionalityTests(scanId: string) {
  // Functionality verification is not persisted yet.
  // Return an empty result so reports can still load.
  console.log(
    'ℹ️ Functionality verification table not configured for scan:',
    scanId
  );

  return [];
}

// ---- Reports ----
export async function fetchReports() {
  const { data, error } = await supabase
    .from('security_reports')
    .select('*, applications(name, technology), scans(id, status, is_demo, created_at)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchReport(id: string) {
  const { data, error } = await supabase
    .from('security_reports')
    .select('*, applications(name, technology), scans(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as SecurityReport & { applications: Application | null; scans: Scan | null };
}

export async function regenerateReport(scanId: string, appId: string) {
  // Fetch all scan data and regenerate report
  const [vulns, funcTests] = await Promise.all([
    supabase.from('vulnerabilities').select('*').eq('scan_id', scanId),
    supabase.from('functionality_tests').select('*').eq('scan_id', scanId),
  ]);

  const v = vulns.data || [];
  const c = v.filter(x => x.severity === 'critical').length;
  const h = v.filter(x => x.severity === 'high').length;
  const m = v.filter(x => x.severity === 'medium').length;
  const l = v.filter(x => x.severity === 'low').length;
  const fixed = v.filter(x => x.status === 'resolved').length;
  const total = v.length;

  let score = 100;
  if (total > 0) {
    const tw = c * 25 + h * 15 + m * 8 + l * 3;
    const fw = Math.min(fixed, total) * 10;
    score = Math.max(0, Math.min(100, Math.round(100 - tw + fw)));
  }

  const funcPassed = (funcTests.data || []).filter(x => x.status === 'passed').length;
  const funcTotal = (funcTests.data || []).length;
  const funcRate = funcTotal > 0 ? Math.round((funcPassed / funcTotal) * 100) : 100;

  const overall = fixed === total && total > 0 ? 'All Issues Resolved' : fixed > 0 ? 'Partially Remediated' : 'Vulnerabilities Detected';
  const summary = `Security scan completed with ${total} findings (${c} critical, ${h} high, ${m} medium, ${l} low). ${fixed} of ${total} vulnerabilities have been remediated. Security score improved to ${score}/100. Functionality verification: ${funcPassed}/${funcTotal} features passed (${funcRate}%).`;

  const { data: existing } = await supabase.from('security_reports').select('id').eq('scan_id', scanId).maybeSingle();

  if (existing) {
    const { data, error } = await supabase.from('security_reports').update({
      security_score: score,
      overall_status: overall,
      executive_summary: summary,
      report_json: { vulnerabilities_count: total, fixed, functionality_passed: funcPassed, functionality_total: funcTotal },
    }).eq('id', existing.id).select().single();
    if (error) throw error;
    return data as SecurityReport;
  } else {
    const { data, error } = await supabase.from('security_reports').insert({
      application_id: appId,
      scan_id: scanId,
      report_type: 'full',
      security_score: score,
      overall_status: overall,
      executive_summary: summary,
      report_json: { vulnerabilities_count: total, fixed, functionality_passed: funcPassed, functionality_total: funcTotal },
    }).select().single();
    if (error) throw error;
    return data as SecurityReport;
  }
}
