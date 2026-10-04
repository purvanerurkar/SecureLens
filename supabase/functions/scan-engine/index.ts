import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_VULNERABILITIES = [
  {
    type: "SQL Injection",
    severity: "critical",
    confidence: 97,
    endpoint: "/login",
    http_method: "POST",
    parameter: "username",
    root_cause: "Unsafe query construction",
    why_vulnerable: "User-controlled input reaches database query construction without adequate parameterization. This can allow the input to influence the database operation rather than being handled strictly as data.",
    potential_impact: "An attacker could bypass authentication, extract sensitive data from the database, modify or delete records, and potentially gain administrative access to the application.",
    expected_behavior: "User input should be treated as data, not as executable SQL. The login query should use parameterized statements.",
    observed_behavior: "Unexpected database-related response detected when special characters were injected into the username field. The application returned a database error revealing query structure.",
    test_type: "Controlled Input Inspection",
    before_state: "Unsafe query construction — string concatenation of user input into SQL query",
    problem: "User input is incorporated into a database query without parameterization, allowing input to alter query structure.",
    recommended_fix: "Use parameterized queries (prepared statements) for all database interactions. Never concatenate user input into SQL strings.",
    after_state: "Parameterized query — user input is handled as data rather than query structure",
    remediation_detail: "Replace string concatenation with prepared statements using bound parameters. Ensure ORM parameterized queries are used consistently.",
  },
  {
    type: "IDOR / Broken Object-Level Authorization",
    severity: "critical",
    confidence: 94,
    endpoint: "/api/orders/{id}",
    http_method: "GET",
    parameter: "id",
    root_cause: "Missing object-level authorization",
    why_vulnerable: "The endpoint retrieves a resource by ID without verifying that the requesting user owns or is authorized to access that resource. An attacker can enumerate IDs to access other users' data.",
    potential_impact: "Any authenticated user could access other users' orders, personal data, and potentially modify resources they do not own. This is a direct violation of data confidentiality.",
    expected_behavior: "The API should verify that the requesting user is the owner of the requested resource before returning it.",
    observed_behavior: "Changing the order ID in the URL returned order data belonging to another user without any authorization check.",
    test_type: "Authorization Testing",
    before_state: "Missing object-level authorization — resource fetched by ID without ownership check",
    problem: "The endpoint trusts the object ID without verifying the requesting user's authorization to access that specific resource.",
    recommended_fix: "Implement object-level authorization checks. Before returning or modifying a resource, verify the requesting user owns it or has explicit permission.",
    after_state: "Object-level authorization enforced — each request is verified against resource ownership",
    remediation_detail: "Add ownership checks in every API handler that retrieves or modifies resources by ID. Use middleware to enforce consistent authorization.",
  },
  {
    type: "Stored XSS",
    severity: "high",
    confidence: 91,
    endpoint: "/profile",
    http_method: "POST",
    parameter: "bio",
    root_cause: "Missing output encoding",
    why_vulnerable: "User-supplied input is stored and later rendered in the browser without proper output encoding or sanitization. This allows malicious scripts to execute in other users' browsers.",
    potential_impact: "An attacker could inject scripts that steal session tokens, perform actions on behalf of the victim, deface the application, or redirect users to malicious sites.",
    expected_behavior: "All user-supplied content should be properly encoded before being rendered in the browser. Special HTML characters should be escaped.",
    observed_behavior: "Script tags submitted in the profile bio field were stored and executed when the profile was viewed, without any encoding or sanitization.",
    test_type: "Input Inspection",
    before_state: "Missing output encoding — user input rendered as raw HTML",
    problem: "User input is stored and displayed without HTML entity encoding, allowing script injection.",
    recommended_fix: "Apply context-appropriate output encoding. Use HTML entity encoding for content rendered in HTML context. Consider Content Security Policy headers.",
    after_state: "Output encoding enforced — user input is escaped before rendering",
    remediation_detail: "Implement output encoding in all view templates. Use a modern framework's automatic escaping. Add Content-Security-Policy headers as defense in depth.",
  },
  {
    type: "Unsafe File Upload",
    severity: "high",
    confidence: 88,
    endpoint: "/api/upload",
    http_method: "POST",
    parameter: "file",
    root_cause: "Insufficient file type validation",
    why_vulnerable: "The file upload endpoint accepts files without validating their type, content, or extension. This could allow uploading executable files that may be served or executed by the server.",
    potential_impact: "An attacker could upload malicious files that lead to remote code execution, stored XSS, or denial of service. Uploaded files could bypass security controls.",
    expected_behavior: "The application should validate file types using both extension and content-type checks, store files outside the web root, and serve them with appropriate headers.",
    observed_behavior: "A file with a server-side executable extension was accepted and stored without any validation of its content or type.",
    test_type: "File Upload Testing",
    before_state: "Insufficient file type validation — no validation of uploaded file content or extension",
    problem: "The upload endpoint accepts any file type without checking content, extension, or MIME type.",
    recommended_fix: "Validate file types using content sniffing, enforce allowlists for extensions, store uploads outside the web root, and serve with non-executable Content-Type headers.",
    after_state: "File type validation enforced — only allowlisted file types accepted",
    remediation_detail: "Implement server-side file type validation using both extension allowlists and content-type verification. Store uploaded files with non-predictable names.",
  },
  {
    type: "Sensitive Data Exposure",
    severity: "medium",
    confidence: 85,
    endpoint: "/api/user",
    http_method: "GET",
    parameter: "response",
    root_cause: "Insufficient data filtering in API responses",
    why_vulnerable: "The API endpoint returns more data than necessary, including sensitive fields that should not be exposed to the client. This violates the principle of least privilege in data exposure.",
    potential_impact: "Sensitive information such as password hashes, internal IDs, or configuration data could be exposed to attackers, aiding further attacks.",
    expected_behavior: "API responses should include only the fields necessary for the client. Sensitive fields should be filtered out before serialization.",
    observed_behavior: "The user API response included sensitive internal fields such as password hash and internal flags that should not be exposed.",
    test_type: "Security Configuration Testing",
    before_state: "Insufficient data filtering — API returns all database fields including sensitive ones",
    problem: "The API serializes all database columns without filtering out sensitive fields.",
    recommended_fix: "Implement response DTOs that explicitly define which fields are returned. Never serialize sensitive fields like password hashes or internal flags.",
    after_state: "Data filtering enforced — API responses contain only necessary, non-sensitive fields",
    remediation_detail: "Create explicit response schemas that exclude sensitive fields. Review all API endpoints for unnecessary data exposure.",
  },
];

const DEMO_ENDPOINTS = [
  { path: "/", method: "GET", description: "Home page" },
  { path: "/login", method: "POST", description: "Login form handler", param_name: "username" },
  { path: "/register", method: "POST", description: "Registration handler", param_name: "email" },
  { path: "/products", method: "GET", description: "Product listing" },
  { path: "/products/{id}", method: "GET", description: "Product detail", param_name: "id" },
  { path: "/cart", method: "GET", description: "Shopping cart" },
  { path: "/cart/add", method: "POST", description: "Add to cart", param_name: "product_id" },
  { path: "/checkout", method: "POST", description: "Checkout handler", param_name: "payment_token" },
  { path: "/profile", method: "GET", description: "User profile" },
  { path: "/profile", method: "POST", description: "Update profile", param_name: "bio" },
  { path: "/api/orders", method: "GET", description: "List user orders" },
  { path: "/api/orders/{id}", method: "GET", description: "Order detail", param_name: "id" },
  { path: "/api/user", method: "GET", description: "User info API" },
  { path: "/api/upload", method: "POST", description: "File upload", param_name: "file" },
  { path: "/api/health", method: "GET", description: "Health check" },
  { path: "/logout", method: "POST", description: "Logout handler" },
];

const FUNCTIONALITY_TESTS = [
  { feature_name: "Login", expected_behavior: "User can log in with valid credentials" },
  { feature_name: "Logout", expected_behavior: "User can log out and session is cleared" },
  { feature_name: "Search", expected_behavior: "User can search for products" },
  { feature_name: "Product Browsing", expected_behavior: "User can browse product catalog" },
  { feature_name: "Product Details", expected_behavior: "User can view individual product details" },
  { feature_name: "Cart", expected_behavior: "User can add items to cart and view cart" },
  { feature_name: "Checkout", expected_behavior: "User can complete checkout flow" },
  { feature_name: "Profile", expected_behavior: "User can view and update their profile" },
  { feature_name: "API Health", expected_behavior: "API health endpoint returns 200 OK" },
];

function calculateScore(critical: number, high: number, medium: number, low: number, fixed: number, total: number): number {
  if (total === 0) return 100;
  const weights = { critical: 25, high: 15, medium: 8, low: 3 };
  const totalWeight = critical * weights.critical + high * weights.high + medium * weights.medium + low * weights.low;
  const fixedWeight = Math.min(fixed, total) * 10;
  const raw = 100 - totalWeight + fixedWeight;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { action, scan_id, application_id, test_categories } = body;

    // ---- RUN SCAN ----
    if (action === "run_scan") {
      if (!application_id || !scan_id) {
        return new Response(JSON.stringify({ error: "Missing application_id or scan_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify ownership
      const { data: app } = await supabase
        .from("applications")
        .select("id, user_id, name, technology")
        .eq("id", application_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!app) {
        return new Response(JSON.stringify({ error: "Application not found or access denied" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update scan to running
      await supabase.from("scans").update({
        status: "running",
        stage: "discovering",
        progress: 5,
        started_at: new Date().toISOString(),
      }).eq("id", scan_id).eq("user_id", userId);

      // Clear previous scan data
      await supabase.from("vulnerabilities").delete().eq("scan_id", scan_id).eq("user_id", userId);
      await supabase.from("endpoints").delete().eq("scan_id", scan_id).eq("user_id", userId);
      await supabase.from("functionality_tests").delete().eq("scan_id", scan_id).eq("user_id", userId);

      // Stage 1: Discover endpoints
      await supabase.from("scans").update({ stage: "discovering", progress: 15 }).eq("id", scan_id);

      const endpointRows = DEMO_ENDPOINTS.map((e) => ({
        user_id: userId,
        scan_id,
        application_id,
        path: e.path,
        method: e.method,
        param_name: e.param_name || null,
        description: e.description,
      }));
      const { error: epErr } = await supabase.from("endpoints").insert(endpointRows);
      if (epErr) console.error("endpoint insert error:", epErr);

      // Stage 2: Analyzing inputs
      await supabase.from("scans").update({ stage: "analyzing_inputs", progress: 30 }).eq("id", scan_id);

      // Stage 3: Running controlled security tests + collecting evidence
      await supabase.from("scans").update({ stage: "testing", progress: 45 }).eq("id", scan_id);

      const selectedCats = test_categories || ["auth", "input", "authorization", "api", "file_upload", "config"];
      // Filter vulnerabilities by selected test categories
      const catMap: Record<string, string[]> = {
        auth: ["SQL Injection"],
        input: ["SQL Injection", "Stored XSS"],
        authorization: ["IDOR / Broken Object-Level Authorization"],
        api: ["IDOR / Broken Object-Level Authorization", "Sensitive Data Exposure"],
        file_upload: ["Unsafe File Upload"],
        config: ["Sensitive Data Exposure"],
      };
      const allowedTypes = new Set<string>();
      for (const cat of selectedCats) {
        (catMap[cat] || []).forEach((t) => allowedTypes.add(t));
      }
      const vulnsToCreate = allowedTypes.size > 0
        ? DEMO_VULNERABILITIES.filter((v) => allowedTypes.has(v.type))
        : DEMO_VULNERABILITIES;

      // Stage 4: Collect evidence + create vulnerabilities
      await supabase.from("scans").update({ stage: "collecting_evidence", progress: 60 }).eq("id", scan_id);

      for (const vuln of vulnsToCreate) {
        // Create vulnerability
        const { data: vulnRow, error: vulnErr } = await supabase.from("vulnerabilities").insert({
          user_id: userId,
          scan_id,
          application_id,
          vulnerability_type: vuln.type,
          severity: vuln.severity,
          confidence: vuln.confidence,
          endpoint: vuln.endpoint,
          http_method: vuln.http_method,
          parameter: vuln.parameter,
          status: "detected",
          retest_status: "pending",
          root_cause: vuln.root_cause,
          potential_impact: vuln.potential_impact,
          why_vulnerable: vuln.why_vulnerable,
        }).select().single();

        if (vulnErr || !vulnRow) {
          console.error("vuln insert error:", vulnErr);
          continue;
        }

        // Create evidence
        await supabase.from("evidence").insert({
          user_id: userId,
          vulnerability_id: vulnRow.id,
          scan_id,
          test_type: vuln.test_type,
          expected_behavior: vuln.expected_behavior,
          observed_behavior: vuln.observed_behavior,
          request_method: vuln.http_method,
          request_endpoint: vuln.endpoint,
          request_parameter: vuln.parameter,
          request_headers: { "Content-Type": "application/json", "User-Agent": "SecureLens/1.0" },
          request_body: vuln.parameter === "username" ? `{"username":"admin' OR '1'='1","password":"test"}` : `{"${vuln.parameter}":"<test_payload>"}`,
          response_status: vuln.type === "SQL Injection" ? 200 : vuln.type === "IDOR / Broken Object-Level Authorization" ? 200 : vuln.type === "Stored XSS" ? 200 : vuln.type === "Unsafe File Upload" ? 201 : 200,
          response_headers: { "Content-Type": "application/json" },
          response_body: vuln.type === "SQL Injection" ? '{"error":"SQLSTATE: syntax error near \'OR 1=1\'"}' : vuln.type === "IDOR / Broken Object-Level Authorization" ? '{"order_id":1234,"user_id":"other_user","total":99.99}' : vuln.type === "Stored XSS" ? '{"bio":"<script>alert(1)</script>","status":"updated"}' : vuln.type === "Unsafe File Upload" ? '{"url":"/uploads/shell.php","status":"uploaded"}' : '{"id":"usr_123","email":"user@example.com","password_hash":"$2b$10$...","role":"admin","internal_flag":true}',
          timing_ms: Math.floor(50 + Math.random() * 200),
          test_result: "Potentially Vulnerable",
          evidence_type: "original",
        });

        // Create AI analysis
        await supabase.from("ai_analyses").insert({
          user_id: userId,
          vulnerability_id: vulnRow.id,
          scan_id,
          finding_summary: `${vuln.type} detected at ${vuln.endpoint} via ${vuln.http_method} request to the "${vuln.parameter}" parameter. Confidence: ${vuln.confidence}%.`,
          why_vulnerable: vuln.why_vulnerable,
          root_cause: vuln.root_cause,
          potential_impact: vuln.potential_impact,
          confidence_assessment: `Based on the observed response behavior and test indicators, the confidence level is ${vuln.confidence}%. The evidence strongly suggests this vulnerability is present. ${vuln.confidence < 90 ? "Additional testing could further confirm this finding." : "The evidence is consistent and reproducible."}`,
          recommended_remediation: vuln.recommended_fix,
          retest_recommendation: `After applying the recommended fix, re-run the ${vuln.test_type.toLowerCase()} against ${vuln.endpoint} with the same test vectors to confirm the vulnerability is resolved. Then verify that legitimate application functionality still works correctly.`,
          analysis_json: {
            evidence_based: true,
            test_vectors_used: [vuln.parameter],
            response_indicators: ["unexpected_behavior", "data_exposure"],
            ai_confidence: vuln.confidence,
          },
        });

        // Create remediation record
        await supabase.from("remediations").insert({
          user_id: userId,
          vulnerability_id: vulnRow.id,
          before_state: vuln.before_state,
          problem: vuln.problem,
          recommended_fix: vuln.recommended_fix,
          after_state: vuln.after_state,
          status: "suggested",
        });
      }

      // Stage 5: Correlating findings
      await supabase.from("scans").update({ stage: "correlating", progress: 75 }).eq("id", scan_id);

      const counts = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
      for (const v of vulnsToCreate) {
        counts[v.severity as keyof typeof counts]++;
      }
      const totalFindings = vulnsToCreate.length;
      const scoreBefore = calculateScore(counts.critical, counts.high, counts.medium, counts.low, 0, totalFindings);

      // Stage 6: AI analysis
      await supabase.from("scans").update({ stage: "ai_analysis", progress: 85 }).eq("id", scan_id);

      // Create functionality tests
      const funcRows = FUNCTIONALITY_TESTS.map((f) => ({
        user_id: userId,
        application_id,
        scan_id,
        feature_name: f.feature_name,
        expected_behavior: f.expected_behavior,
        actual_behavior: f.expected_behavior,
        status: "passed",
        is_regression: false,
      }));
      await supabase.from("functionality_tests").insert(funcRows);

      // Stage 7: Generate report
      await supabase.from("scans").update({ stage: "generating_report", progress: 95 }).eq("id", scan_id);

      const execSummary = `A controlled security scan was performed against ${app.name} (${app.technology}). The scan discovered ${DEMO_ENDPOINTS.length} endpoints and identified ${totalFindings} security findings: ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, and ${counts.low} low severity. No vulnerabilities have been remediated yet. The current security score is ${scoreBefore}/100. Functionality verification indicates all core features are operational.`;

      await supabase.from("security_reports").insert({
        user_id: userId,
        application_id,
        scan_id,
        report_type: "full",
        security_score: scoreBefore,
        overall_status: "Vulnerabilities Detected",
        executive_summary: execSummary,
        report_json: {
          scan_type: "DEMO",
          endpoints_discovered: DEMO_ENDPOINTS.length,
          vulnerabilities: vulnsToCreate.map((v) => v.type),
          functionality_tests: FUNCTIONALITY_TESTS.length,
          functionality_passed: FUNCTIONALITY_TESTS.length,
        },
      });

      // Complete the scan
      await supabase.from("scans").update({
        status: "completed",
        stage: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
        total_findings: totalFindings,
        critical_count: counts.critical,
        high_count: counts.high,
        medium_count: counts.medium,
        low_count: counts.low,
        informational_count: counts.informational,
        fixed_count: 0,
        security_score_before: scoreBefore,
        security_score_after: scoreBefore,
        is_demo: true,
      }).eq("id", scan_id);

      // Update application
      await supabase.from("applications").update({
        status: "scanned",
        security_score: scoreBefore,
        last_scan_at: new Date().toISOString(),
      }).eq("id", application_id);

      return new Response(JSON.stringify({
        success: true,
        scan_id,
        endpoints_discovered: DEMO_ENDPOINTS.length,
        vulnerabilities_found: totalFindings,
        security_score: scoreBefore,
        is_demo: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- RETEST VULNERABILITY ----
    if (action === "retest") {
      const { vulnerability_id } = body;
      if (!vulnerability_id) {
        return new Response(JSON.stringify({ error: "Missing vulnerability_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: vuln } = await supabase
        .from("vulnerabilities")
        .select("*")
        .eq("id", vulnerability_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!vuln) {
        return new Response(JSON.stringify({ error: "Vulnerability not found or access denied" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the remediation
      const { data: remediation } = await supabase
        .from("remediations")
        .select("*")
        .eq("vulnerability_id", vulnerability_id)
        .eq("user_id", userId)
        .maybeSingle();

      const isFixed = remediation && remediation.status === "applied";

      // Create retest evidence
      const { data: retestEvidence } = await supabase.from("evidence").insert({
        user_id: userId,
        vulnerability_id,
        scan_id: vuln.scan_id,
        test_type: "Controlled Retest",
        expected_behavior: isFixed ? "Input is safely handled; vulnerability is no longer reproducible." : "Vulnerability is still present.",
        observed_behavior: isFixed ? "The previously vulnerable endpoint now safely handles input. No unexpected behavior detected." : "The vulnerability is still reproducible with the same test vector.",
        request_method: vuln.http_method,
        request_endpoint: vuln.endpoint,
        request_parameter: vuln.parameter,
        request_headers: { "Content-Type": "application/json", "User-Agent": "SecureLens/1.0" },
        request_body: `{"${vuln.parameter}":"<retest_payload>"}`,
        response_status: isFixed ? 200 : 200,
        response_headers: { "Content-Type": "application/json" },
        response_body: isFixed ? '{"status":"ok","message":"Request handled safely"}' : '{"error":"vulnerability still present"}',
        timing_ms: Math.floor(50 + Math.random() * 100),
        test_result: isFixed ? "Not Vulnerable" : "Still Vulnerable",
        evidence_type: "retest",
      }).select().single();

      // Create retest record
      await supabase.from("retests").insert({
        user_id: userId,
        vulnerability_id,
        original_result: "Vulnerable",
        retest_result: isFixed ? "Not Vulnerable" : "Still Vulnerable",
        final_status: isFixed ? "Resolved" : "Still Vulnerable",
        difference: isFixed ? "The endpoint now safely handles the previously exploitable input. The vulnerability is no longer reproducible." : "No change detected. The vulnerability remains exploitable.",
        retest_evidence_id: retestEvidence?.id || null,
      });

      // Update vulnerability status
      await supabase.from("vulnerabilities").update({
        retest_status: isFixed ? "resolved" : "still_vulnerable",
        status: isFixed ? "resolved" : "detected",
      }).eq("id", vulnerability_id);

      // Recalculate app score
      const { data: allVulns } = await supabase
        .from("vulnerabilities")
        .select("severity, status")
        .eq("scan_id", vuln.scan_id)
        .eq("user_id", userId);

      const v = allVulns || [];
      const c = v.filter((x: any) => x.severity === "critical").length;
      const h = v.filter((x: any) => x.severity === "high").length;
      const m = v.filter((x: any) => x.severity === "medium").length;
      const l = v.filter((x: any) => x.severity === "low").length;
      const fixed = v.filter((x: any) => x.status === "resolved").length;
      const newScore = calculateScore(c, h, m, l, fixed, v.length);

      await supabase.from("scans").update({
        security_score_after: newScore,
        fixed_count: fixed,
      }).eq("id", vuln.scan_id);

      await supabase.from("applications").update({ security_score: newScore }).eq("id", vuln.application_id);

      // Run functionality tests
      const { data: funcTests } = await supabase
        .from("functionality_tests")
        .select("*")
        .eq("scan_id", vuln.scan_id)
        .eq("user_id", userId);

      if (funcTests && funcTests.length > 0) {
        for (const ft of funcTests) {
          await supabase.from("functionality_tests").update({
            status: "passed",
            actual_behavior: ft.expected_behavior,
            is_regression: false,
          }).eq("id", ft.id);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        result: isFixed ? "resolved" : "still_vulnerable",
        security_score: newScore,
        is_demo: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- RUN FUNCTIONALITY TESTS ----
    if (action === "functionality_test") {
      const { scan_id: sid, application_id: aid } = body;
      const { data: tests } = await supabase
        .from("functionality_tests")
        .select("*")
        .eq("scan_id", sid)
        .eq("user_id", userId);

      if (!tests || tests.length === 0) {
        // Create them
        const rows = FUNCTIONALITY_TESTS.map((f) => ({
          user_id: userId,
          application_id: aid,
          scan_id: sid,
          feature_name: f.feature_name,
          expected_behavior: f.expected_behavior,
          actual_behavior: f.expected_behavior,
          status: "passed" as const,
          is_regression: false,
        }));
        await supabase.from("functionality_tests").insert(rows);
      }

      return new Response(JSON.stringify({
        success: true,
        tests_run: FUNCTIONALITY_TESTS.length,
        all_passed: true,
        is_demo: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
