export interface Application {
  id: string;
  user_id: string;
  name: string;
  technology: string;
  description: string;
  target_url: string | null;
  status: string;
  security_score: number;
  last_scan_at: string | null;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  application_id: string;
  status: string;
  test_categories: string[];
  stage: string;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  security_score_before: number;
  security_score_after: number;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  informational_count: number;
  fixed_count: number;
  is_demo: boolean;
  created_at: string;
}

export interface Endpoint {
  id: string;
  user_id: string;
  scan_id: string;
  application_id: string;
  path: string;
  method: string;
  param_name: string | null;
  description: string;
  created_at: string;
}

export interface Vulnerability {
  id: string;
  user_id: string;
  scan_id: string;
  application_id: string;
  vulnerability_type: string;
  severity: string;
  confidence: number;
  endpoint: string;
  http_method: string;
  parameter: string;
  status: string;
  retest_status: string;
  root_cause: string;
  potential_impact: string;
  why_vulnerable: string;
  detected_at: string;
  created_at: string;
}

export interface Evidence {
  id: string;
  user_id: string;
  vulnerability_id: string;
  scan_id: string;
  test_type: string;
  expected_behavior: string;
  observed_behavior: string;
  request_method: string;
  request_endpoint: string;
  request_parameter: string;
  request_headers: Record<string, string>;
  request_body: string;
  response_status: number;
  response_headers: Record<string, string>;
  response_body: string;
  timing_ms: number;
  test_result: string;
  evidence_type: string;
  created_at: string;
}

export interface AIAnalysis {
  id: string;
  user_id: string;
  vulnerability_id: string;
  scan_id: string;
  finding_summary: string;
  why_vulnerable: string;
  root_cause: string;
  potential_impact: string;
  confidence_assessment: string;
  recommended_remediation: string;
  retest_recommendation: string;
  analysis_json: Record<string, unknown>;
  created_at: string;
}

export interface Remediation {
  id: string;
  user_id: string;
  vulnerability_id: string;
  before_state: string;
  problem: string;
  recommended_fix: string;
  after_state: string;
  status: string;
  approved_at: string | null;
  applied_at: string | null;
  reviewer: string;
  created_at: string;
}

export interface Retest {
  id: string;
  user_id: string;
  vulnerability_id: string;
  original_result: string;
  retest_result: string;
  final_status: string;
  difference: string;
  original_evidence_id: string | null;
  retest_evidence_id: string | null;
  created_at: string;
}

export interface FunctionalityTest {
  id: string;
  user_id: string;
  application_id: string;
  scan_id: string | null;
  feature_name: string;
  expected_behavior: string;
  actual_behavior: string;
  status: string;
  is_regression: boolean;
  created_at: string;
}

export interface SecurityReport {
  id: string;
  user_id: string;
  application_id: string;
  scan_id: string;
  report_type: string;
  security_score: number;
  overall_status: string;
  executive_summary: string;
  report_json: Record<string, unknown>;
  created_at: string;
}
