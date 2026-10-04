import urllib.request
import urllib.error
from urllib.parse import urljoin, urlparse


class SecurityScanner:
    """
    Safe security scanner for controlled/local applications.

    It performs non-destructive checks only:
    - Target availability
    - Security headers
    - HTTPS usage
    - Information disclosure
    - Common security configuration issues
    """

    def __init__(self, target_url: str):
        self.target_url = target_url.rstrip("/")
        self.findings = []

    def add_finding(
        self,
        title,
        severity,
        category,
        description,
        evidence,
        remediation
    ):
        self.findings.append({
            "title": title,
            "severity": severity,
            "category": category,
            "description": description,
            "evidence": evidence,
            "remediation": remediation,
            "status": "OPEN"
        })

    def fetch_target(self):
        request = urllib.request.Request(
            self.target_url,
            headers={
                "User-Agent": "SecureLens-Security-Scanner/1.0"
            }
        )

        try:
            response = urllib.request.urlopen(
                request,
                timeout=5
            )

            body = response.read(100000).decode(
                "utf-8",
                errors="ignore"
            )

            return {
                "status": response.status,
                "headers": dict(response.headers),
                "body": body
            }

        except urllib.error.HTTPError as error:
            body = error.read(100000).decode(
                "utf-8",
                errors="ignore"
            )

            return {
                "status": error.code,
                "headers": dict(error.headers),
                "body": body
            }

        except Exception as error:
            return {
                "error": str(error)
            }

    def check_https(self):
        parsed = urlparse(self.target_url)

        if parsed.scheme.lower() != "https":
            self.add_finding(
                title="HTTPS Not Enabled",
                severity="MEDIUM",
                category="Security Configuration",
                description=(
                    "The target application is accessible without HTTPS. "
                    "Data transmitted between the client and server may be "
                    "exposed to interception."
                ),
                evidence=f"Target URL uses: {parsed.scheme.upper()}",
                remediation=(
                    "Enable HTTPS/TLS for production deployments and "
                    "redirect HTTP traffic to HTTPS."
                )
            )

    def check_security_headers(self, headers):
        required_headers = {
            "X-Content-Type-Options": (
                "Prevents browsers from MIME-sniffing responses."
            ),
            "X-Frame-Options": (
                "Helps prevent clickjacking attacks."
            ),
            "Content-Security-Policy": (
                "Restricts potentially dangerous content execution."
            ),
            "Strict-Transport-Security": (
                "Enforces HTTPS connections."
            )
        }

        for header, explanation in required_headers.items():

            if header.lower() not in {
                key.lower() for key in headers.keys()
            }:

                self.add_finding(
                    title=f"Missing Security Header: {header}",
                    severity="LOW",
                    category="Security Headers",
                    description=explanation,
                    evidence=(
                        f"The response from {self.target_url} "
                        f"does not contain the {header} header."
                    ),
                    remediation=(
                        f"Configure the application/server to send "
                        f"a valid {header} response header."
                    )
                )

    def check_information_disclosure(self, headers, body):

        server_header = headers.get("Server")

        if server_header:
            self.add_finding(
                title="Server Information Disclosure",
                severity="LOW",
                category="Information Disclosure",
                description=(
                    "The server response exposes technology information "
                    "through the Server response header."
                ),
                evidence=f"Server header: {server_header}",
                remediation=(
                    "Remove or minimize server technology/version "
                    "information from HTTP response headers."
                )
            )

        powered_by = headers.get("X-Powered-By")

        if powered_by:
            self.add_finding(
                title="Technology Information Disclosure",
                severity="LOW",
                category="Information Disclosure",
                description=(
                    "The application exposes technology information "
                    "through the X-Powered-By header."
                ),
                evidence=f"X-Powered-By: {powered_by}",
                remediation=(
                    "Remove the X-Powered-By header from production responses."
                )
            )

        error_keywords = [
            "traceback",
            "stack trace",
            "internal server error",
            "sql syntax",
            "exception"
        ]

        body_lower = body.lower()

        detected = [
            keyword
            for keyword in error_keywords
            if keyword in body_lower
        ]

        if detected:
            self.add_finding(
                title="Potential Error Information Disclosure",
                severity="MEDIUM",
                category="Information Disclosure",
                description=(
                    "The response appears to expose internal error "
                    "information."
                ),
                evidence=(
                    "Detected response indicators: "
                    + ", ".join(detected)
                ),
                remediation=(
                    "Return generic error messages to users and keep "
                    "detailed diagnostics in server-side logs."
                )
            )

    def calculate_score(self):

        deductions = {
            "CRITICAL": 30,
            "HIGH": 20,
            "MEDIUM": 10,
            "LOW": 5,
            "INFO": 0
        }

        score = 100

        for finding in self.findings:
            score -= deductions.get(
                finding["severity"],
                0
            )

        return max(0, score)

    def scan(self):

        parsed = urlparse(self.target_url)

        if parsed.scheme not in ["http", "https"]:
            return {
                "target": self.target_url,
                "status": "FAILED",
                "message": (
                    "Target URL must start with "
                    "http:// or https://"
                ),
                "findings": []
            }

        result = self.fetch_target()

        if "error" in result:
            return {
                "target": self.target_url,
                "status": "FAILED",
                "message": result["error"],
                "findings": []
            }

        headers = result["headers"]
        body = result["body"]

        self.check_https()
        self.check_security_headers(headers)
        self.check_information_disclosure(
            headers,
            body
        )

        score = self.calculate_score()

        return {
            "target": self.target_url,
            "status": "COMPLETED",
            "http_status": result["status"],
            "security_score": score,
            "findings_count": len(self.findings),
            "findings": self.findings,
            "summary": {
                "critical": sum(
                    1 for f in self.findings
                    if f["severity"] == "CRITICAL"
                ),
                "high": sum(
                    1 for f in self.findings
                    if f["severity"] == "HIGH"
                ),
                "medium": sum(
                    1 for f in self.findings
                    if f["severity"] == "MEDIUM"
                ),
                "low": sum(
                    1 for f in self.findings
                    if f["severity"] == "LOW"
                )
            },
            "note": (
                "Results are based only on non-destructive "
                "observations collected during this scan."
            )
        }