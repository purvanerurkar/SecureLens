/*
# SecureLens AI — Core Schema

## Purpose
Full-stack cybersecurity testing platform. Multi-user with strict ownership isolation.
Every entity is owner-scoped to the authenticated user via user_id uuid DEFAULT auth.uid().

## New Tables
1. applications — registered target apps (owner_id)
2. scans — scan runs against an application (owner_id, application_id)
3. endpoints — discovered endpoints from a scan (owner_id, scan_id, application_id)
4. vulnerabilities — findings from a scan (owner_id, scan_id, application_id)
5. evidence — technical evidence per vulnerability (owner_id, vulnerability_id, scan_id)
6. ai_analyses — AI interpretation per vulnerability (owner_id, vulnerability_id, scan_id)
7. remediations — fix workflow per vulnerability (owner_id, vulnerability_id)
8. retests — retest results per vulnerability (owner_id, vulnerability_id)
9. functionality_tests — functional verification per application/scan (owner_id, application_id, scan_id)
10. security_reports — generated reports (owner_id, application_id, scan_id)

## Security
- RLS enabled on ALL tables.
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE), all TO authenticated, all checking auth.uid() = user_id.
- Owner column defaults to auth.uid() so inserts from the client work without passing user_id.

## Important Notes
1. All child tables reference applications via FK with ON DELETE CASCADE.
2. user_id columns are NOT null and default to auth.uid().
3. Future vulnerability types are supported via the generic vulnerability_type text column.
*/

-- ============ APPLICATIONS ============
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  technology text NOT NULL DEFAULT 'Unknown',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'ready',
  security_score int DEFAULT 0,
  last_scan_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_applications" ON applications;
CREATE POLICY "select_own_applications" ON applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_applications" ON applications;
CREATE POLICY "insert_own_applications" ON applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_applications" ON applications;
CREATE POLICY "update_own_applications" ON applications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_applications" ON applications;
CREATE POLICY "delete_own_applications" ON applications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SCANS ============
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  test_categories text[] DEFAULT '{}',
  stage text DEFAULT 'idle',
  progress int DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  security_score_before int DEFAULT 0,
  security_score_after int DEFAULT 0,
  total_findings int DEFAULT 0,
  critical_count int DEFAULT 0,
  high_count int DEFAULT 0,
  medium_count int DEFAULT 0,
  low_count int DEFAULT 0,
  informational_count int DEFAULT 0,
  fixed_count int DEFAULT 0,
  is_demo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scans" ON scans;
CREATE POLICY "select_own_scans" ON scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_scans" ON scans;
CREATE POLICY "insert_own_scans" ON scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_scans" ON scans;
CREATE POLICY "update_own_scans" ON scans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_scans" ON scans;
CREATE POLICY "delete_own_scans" ON scans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ ENDPOINTS ============
CREATE TABLE IF NOT EXISTS endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  path text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  param_name text,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_endpoints" ON endpoints;
CREATE POLICY "select_own_endpoints" ON endpoints FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_endpoints" ON endpoints;
CREATE POLICY "insert_own_endpoints" ON endpoints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_endpoints" ON endpoints;
CREATE POLICY "update_own_endpoints" ON endpoints FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_endpoints" ON endpoints;
CREATE POLICY "delete_own_endpoints" ON endpoints FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ VULNERABILITIES ============
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  vulnerability_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  confidence int DEFAULT 0,
  endpoint text NOT NULL DEFAULT '',
  http_method text DEFAULT 'GET',
  parameter text DEFAULT '',
  status text NOT NULL DEFAULT 'detected',
  retest_status text DEFAULT 'pending',
  root_cause text DEFAULT '',
  potential_impact text DEFAULT '',
  why_vulnerable text DEFAULT '',
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_vulnerabilities" ON vulnerabilities;
CREATE POLICY "select_own_vulnerabilities" ON vulnerabilities FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_vulnerabilities" ON vulnerabilities;
CREATE POLICY "insert_own_vulnerabilities" ON vulnerabilities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_vulnerabilities" ON vulnerabilities;
CREATE POLICY "update_own_vulnerabilities" ON vulnerabilities FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_vulnerabilities" ON vulnerabilities;
CREATE POLICY "delete_own_vulnerabilities" ON vulnerabilities FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ EVIDENCE ============
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  vulnerability_id uuid NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  test_type text NOT NULL DEFAULT 'Controlled Input Inspection',
  expected_behavior text NOT NULL DEFAULT '',
  observed_behavior text NOT NULL DEFAULT '',
  request_method text DEFAULT '',
  request_endpoint text DEFAULT '',
  request_parameter text DEFAULT '',
  request_headers jsonb DEFAULT '{}',
  request_body text DEFAULT '',
  response_status int DEFAULT 0,
  response_headers jsonb DEFAULT '{}',
  response_body text DEFAULT '',
  timing_ms int DEFAULT 0,
  test_result text DEFAULT 'Potentially Vulnerable',
  evidence_type text DEFAULT 'original',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_evidence" ON evidence;
CREATE POLICY "select_own_evidence" ON evidence FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_evidence" ON evidence;
CREATE POLICY "insert_own_evidence" ON evidence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_evidence" ON evidence;
CREATE POLICY "update_own_evidence" ON evidence FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_evidence" ON evidence;
CREATE POLICY "delete_own_evidence" ON evidence FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ AI ANALYSES ============
CREATE TABLE IF NOT EXISTS ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  vulnerability_id uuid NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  finding_summary text DEFAULT '',
  why_vulnerable text DEFAULT '',
  root_cause text DEFAULT '',
  potential_impact text DEFAULT '',
  confidence_assessment text DEFAULT '',
  recommended_remediation text DEFAULT '',
  retest_recommendation text DEFAULT '',
  analysis_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_analyses" ON ai_analyses;
CREATE POLICY "select_own_ai_analyses" ON ai_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_ai_analyses" ON ai_analyses;
CREATE POLICY "insert_own_ai_analyses" ON ai_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_ai_analyses" ON ai_analyses;
CREATE POLICY "update_own_ai_analyses" ON ai_analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_ai_analyses" ON ai_analyses;
CREATE POLICY "delete_own_ai_analyses" ON ai_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REMEDIATIONS ============
CREATE TABLE IF NOT EXISTS remediations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  vulnerability_id uuid NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  before_state text DEFAULT '',
  problem text DEFAULT '',
  recommended_fix text DEFAULT '',
  after_state text DEFAULT '',
  status text NOT NULL DEFAULT 'suggested',
  approved_at timestamptz,
  applied_at timestamptz,
  reviewer text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE remediations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_remediations" ON remediations;
CREATE POLICY "select_own_remediations" ON remediations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_remediations" ON remediations;
CREATE POLICY "insert_own_remediations" ON remediations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_remediations" ON remediations;
CREATE POLICY "update_own_remediations" ON remediations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_remediations" ON remediations;
CREATE POLICY "delete_own_remediations" ON remediations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ RETESTS ============
CREATE TABLE IF NOT EXISTS retests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  vulnerability_id uuid NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  original_result text DEFAULT 'Vulnerable',
  retest_result text DEFAULT 'Pending',
  final_status text DEFAULT 'Pending',
  difference text DEFAULT '',
  original_evidence_id uuid,
  retest_evidence_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE retests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_retests" ON retests;
CREATE POLICY "select_own_retests" ON retests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_retests" ON retests;
CREATE POLICY "insert_own_retests" ON retests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_retests" ON retests;
CREATE POLICY "update_own_retests" ON retests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_retests" ON retests;
CREATE POLICY "delete_own_retests" ON retests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ FUNCTIONALITY TESTS ============
CREATE TABLE IF NOT EXISTS functionality_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scan_id uuid REFERENCES scans(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  expected_behavior text NOT NULL DEFAULT '',
  actual_behavior text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  is_regression boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE functionality_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_functionality_tests" ON functionality_tests;
CREATE POLICY "select_own_functionality_tests" ON functionality_tests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_functionality_tests" ON functionality_tests;
CREATE POLICY "insert_own_functionality_tests" ON functionality_tests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_functionality_tests" ON functionality_tests;
CREATE POLICY "update_own_functionality_tests" ON functionality_tests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_functionality_tests" ON functionality_tests;
CREATE POLICY "delete_own_functionality_tests" ON functionality_tests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SECURITY REPORTS ============
CREATE TABLE IF NOT EXISTS security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'full',
  security_score int DEFAULT 0,
  overall_status text DEFAULT 'In Progress',
  executive_summary text DEFAULT '',
  report_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_security_reports" ON security_reports;
CREATE POLICY "select_own_security_reports" ON security_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_security_reports" ON security_reports;
CREATE POLICY "insert_own_security_reports" ON security_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_security_reports" ON security_reports;
CREATE POLICY "update_own_security_reports" ON security_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_security_reports" ON security_reports;
CREATE POLICY "delete_own_security_reports" ON security_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_app ON scans(application_id);
CREATE INDEX IF NOT EXISTS idx_vulns_user ON vulnerabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_vulns_scan ON vulnerabilities(scan_id);
CREATE INDEX IF NOT EXISTS idx_evidence_vuln ON evidence(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_ai_vuln ON ai_analyses(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_remediation_vuln ON remediations(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_retests_vuln ON retests(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_func_app ON functionality_tests(application_id);
CREATE INDEX IF NOT EXISTS idx_reports_scan ON security_reports(scan_id);
