import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_KEYS = {
    "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_PORT", "API_PORT", "FRONTEND_PORT",
    "WEBHOOK_STUB_PORT", "WEBHOOK_STUB_RESPONSE_STATUS",
}
IGNORED_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".venv", "venv", "node_modules",
    "bin", "obj", "dist", "coverage", "TestResults",
}
PLACEHOLDERS = {"change-me-dev-only", "ci-validation-only"}
SECRET_ASSIGNMENT = re.compile(
    r"(?i)\b(password|passwd|secret|token|api[_-]?key|private[_-]?key)\b\s*[:=]\s*['\"]?([^\s,'\";]+)"
)
SECRET_PATTERNS = (
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{30,}\b"),
)


def read_text(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


def git(*args):
    return subprocess.run(
        ["git", "-C", str(ROOT), *args], capture_output=True, text=True, check=False
    )


def is_git_repo():
    result = git("rev-parse", "--is-inside-work-tree")
    return result.returncode == 0 and result.stdout.strip() == "true"


def repository_files():
    if is_git_repo():
        result = git("ls-files", "-co", "--exclude-standard", "-z")
        if result.returncode == 0:
            names = [name for name in result.stdout.split("\0") if name]
        else:
            names = []
    else:
        names = [path.relative_to(ROOT).as_posix() for path in ROOT.rglob("*") if path.is_file()]

    for name in sorted(set(names)):
        path = ROOT / name
        parts = set(path.relative_to(ROOT).parts)
        if not path.is_file() or parts & IGNORED_DIRS or path.suffix in {".pyc", ".pyo"}:
            continue
        if path.name == ".env" or (path.name.startswith(".env.") and path.name != ".env.example"):
            continue
        yield path


def find_secret(path):
    content = path.read_text(encoding="utf-8", errors="ignore")
    for pattern in SECRET_PATTERNS:
        match = pattern.search(content)
        if match:
            return "wartość przypominająca klucz lub token"

    if path.name == "test_repo_hygiene.py":
        return None

    for line_number, line in enumerate(content.splitlines(), 1):
        stripped = line.lstrip()
        if not stripped or stripped.startswith(("#", "<!--", "//")):
            continue
        line = re.sub(r"\$\{[^}]*\}", "${VARIABLE}", line)
        match = SECRET_ASSIGNMENT.search(line)
        if match:
            value = match.group(2).strip("'\"` ")
            if not value or value in PLACEHOLDERS or value.startswith("${"):
                continue
            return "wiersz %s: podejrzana wartość dla %s" % (line_number, match.group(1))
    return None


class HygieneTests(unittest.TestCase):
    def test_gitignore_rules_for_local_environment(self):
        gitignore = read_text(".gitignore")
        self.assertRegex(gitignore, r"(?m)^\.env$")
        self.assertRegex(gitignore, r"(?m)^\.env\.\*")
        self.assertRegex(gitignore, r"(?m)^!\.env\.example$")

    def test_git_ignores_env_but_keeps_example_trackable(self):
        if not is_git_repo():
            self.skipTest("sprawdzenie Git wymaga sklonowanego repozytorium")
        for name in (".env", ".env.local"):
            result = git("check-ignore", "--no-index", "-q", "--", name)
            self.assertEqual(result.returncode, 0, name)
        result = git("check-ignore", "--no-index", "-q", "--", ".env.example")
        self.assertNotEqual(result.returncode, 0, ".env.example nie może być ignorowany")

    def test_git_does_not_track_env_or_build_artifacts(self):
        if not is_git_repo():
            self.skipTest("sprawdzenie indeksu Git wymaga sklonowanego repozytorium")
        result = git("ls-files", "-z")
        self.assertEqual(result.returncode, 0, result.stderr)
        tracked = [name.replace("\\", "/") for name in result.stdout.split("\0") if name]
        for name in tracked:
            normalized = name.replace("\\", "/")
            self.assertNotEqual(normalized, ".env", "śledzony plik .env")
            self.assertFalse(
                normalized.startswith(".env.") and normalized != ".env.example",
                "śledzony plik środowiskowy: " + name,
            )
            self.assertNotIn("/__pycache__/", "/" + normalized, name)
            self.assertFalse(normalized.endswith((".pyc", ".pyo")), name)
            self.assertNotIn("node_modules/", normalized, name)
            self.assertNotIn("/bin/", "/" + normalized, name)
            self.assertNotIn("/obj/", "/" + normalized, name)

    def test_tracked_and_unignored_files_have_no_literal_secrets(self):
        findings = []
        for path in repository_files():
            reason = find_secret(path)
            if reason:
                findings.append("%s: %s" % (path.relative_to(ROOT), reason))
        self.assertEqual(findings, [])


class ComposeTests(unittest.TestCase):
    def setUp(self):
        self.compose = read_text("docker-compose.yml")
        self.env = {
            line.split("=", 1)[0]: line.split("=", 1)[1]
            for line in read_text(".env.example").splitlines()
            if "=" in line and not line.lstrip().startswith("#")
        }

    def test_postgres_service_has_healthcheck_and_persistent_volume(self):
        self.assertRegex(self.compose, r"(?m)^  db:$")
        self.assertIn("pg_isready", self.compose)
        self.assertIn('$${POSTGRES_USER}', self.compose)
        self.assertIn('$${POSTGRES_DB}', self.compose)
        self.assertIn("csp_postgres_data:/var/lib/postgresql/data", self.compose)
        self.assertRegex(self.compose, r"(?m)^volumes:\n  csp_postgres_data:")
        self.assertIn("restart: unless-stopped", self.compose)
        self.assertIn("retries: 12", self.compose)

    def test_database_port_uses_loopback_range_starting_at_5432(self):
        self.assertIn('published: "${POSTGRES_PORT:-5432-5500}"', self.compose)
        self.assertIn("host_ip: 127.0.0.1", self.compose)
        self.assertIn("target: 5432", self.compose)
        self.assertEqual(self.env["POSTGRES_PORT"], "5432-5500")

    def test_password_must_be_supplied_and_example_is_development_only(self):
        self.assertIn("${POSTGRES_PASSWORD:?", self.compose)
        self.assertEqual(self.env["POSTGRES_PASSWORD"], "change-me-dev-only")
        self.assertIn("nie na produkcję", read_text(".env.example"))

    def test_env_example_matches_compose(self):
        self.assertEqual(set(self.env), ENV_KEYS)
        for variable in self.env:
            self.assertIn("${" + variable, self.compose, variable)
        for name in ("POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PORT", "API_PORT", "FRONTEND_PORT", "WEBHOOK_STUB_PORT"):
            self.assertIn(self.env[name], self.compose)

    def test_compose_only_builds_components_that_exist(self):
        for service, component_dir in (
            ("api", "backend"), ("frontend", "frontend"), ("webhook-stub", "tools/webhook-stub"),
            ("event-generator", "tools/event-generator"),
        ):
            defined = re.search(r"(?m)^  " + re.escape(service) + r":$", self.compose) is not None
            dockerfile = ROOT / component_dir / "Dockerfile"
            if defined:
                self.assertTrue(dockerfile.is_file(), f"{service} requires {dockerfile.relative_to(ROOT)}")
                block = re.search(r"(?ms)^  " + re.escape(service) + r":\r?\n(.*?)(?=^  \S|^\S|\Z)", self.compose).group(1)
                own_context = re.search(r"(?m)^\s+context:\s*\./" + re.escape(component_dir) + r"\s*$", block) is not None
                root_context = (
                    re.search(r"(?m)^\s+context:\s*\.\s*$", block) is not None
                    and re.search(r"(?m)^\s+dockerfile:\s*" + re.escape(component_dir) + r"/Dockerfile\s*$", block) is not None
                )
                self.assertTrue(
                    own_context or root_context,
                    f"{service} must build {component_dir}/Dockerfile (context ./{component_dir}, or context . with dockerfile: {component_dir}/Dockerfile)",
                )
            elif dockerfile.is_file():
                self.fail(f"{dockerfile.relative_to(ROOT)} exists but Compose has no {service} service")

    def service_block(self, service):
        match = re.search(r"(?ms)^  " + re.escape(service) + r":\r?\n(.*?)(?=^  \S|^\S|\Z)", self.compose)
        self.assertIsNotNone(match, service)
        return match.group(1)

    def test_all_published_ports_are_bound_to_loopback(self):
        published = re.findall(r"(?m)^\s+published:", self.compose)
        self.assertTrue(published)
        self.assertEqual(len(published), len(re.findall(r"(?m)^\s+host_ip: 127\.0\.0\.1$", self.compose)))
        self.assertNotRegex(self.compose, r'(?m)^\s+- "?\d')

    def test_webhook_stub_service_is_wired_to_api(self):
        stub = self.service_block("webhook-stub")
        self.assertIn('published: "${WEBHOOK_STUB_PORT:-8090}"', stub)
        self.assertIn("target: 8080", stub)
        self.assertIn("host_ip: 127.0.0.1", stub)
        self.assertIn("WEBHOOK_STUB_RESPONSE_STATUS: ${WEBHOOK_STUB_RESPONSE_STATUS:-200}", stub)
        self.assertIn("healthcheck:", stub)
        self.assertIn("http://127.0.0.1:8080/health", stub)
        self.assertEqual(self.env["WEBHOOK_STUB_RESPONSE_STATUS"], "200")

        api = self.service_block("api")
        self.assertIn("Webhook__Url: http://webhook-stub:8080/webhook", api)
        depends_on = re.search(r"(?ms)^    depends_on:\r?\n(.*?)(?=^    \S|\Z)", api)
        self.assertIsNotNone(depends_on, "api musi zależeć od db")
        self.assertRegex(depends_on.group(1), r"(?m)^      db:\r?\n        condition: service_healthy")
        self.assertNotIn("webhook-stub", depends_on.group(1), "niedostępny stub nie może blokować startu API")

    def test_event_generator_runs_only_on_demand_inside_compose_network(self):
        generator = self.service_block("event-generator")
        self.assertIn('profiles: ["generator"]', generator)
        self.assertIn("API_URL: http://api:8080", generator)
        self.assertRegex(generator, r"(?m)^      api:\r?\n        condition: service_healthy$")
        self.assertNotIn("ports:", generator)
        self.assertIn('restart: "no"', generator)

class CiTests(unittest.TestCase):
    def setUp(self):
        self.workflow = read_text(".github/workflows/ci.yml")

    def test_pull_request_and_main_push_triggers(self):
        self.assertRegex(self.workflow, r"(?m)^  pull_request:$")
        self.assertRegex(self.workflow, r"(?m)^  push:\n    branches: \[main\]")

    def test_required_build_commands_are_present(self):
        for command in (
            "docker compose config --quiet",
            "python -m unittest discover -s tests -v",
            "npm ci",
            "npm run build",
            "dotnet build",
        ):
            self.assertIn(command, self.workflow)

    def test_actions_are_pinned_to_full_commit_shas(self):
        references = re.findall(r"(?m)^\s*-?\s*uses:\s*(\S+)", self.workflow)
        self.assertTrue(references)
        for reference in references:
            self.assertRegex(reference, r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[0-9a-f]{40}$", reference)

    def test_checkout_does_not_persist_credentials(self):
        self.assertEqual(self.workflow.count("actions/checkout@"), self.workflow.count("persist-credentials: false"))

    def test_minimal_token_permissions(self):
        self.assertRegex(self.workflow, r"(?m)^permissions:\n  contents: read$")
        self.assertNotRegex(self.workflow, r"(?m)^\s+[A-Za-z_-]+: write$")

    def test_no_deployment_or_image_publishing(self):
        for forbidden in ("secrets.", "docker push", "docker/login-action", "pull_request_target", "ssh "):
            self.assertNotIn(forbidden, self.workflow)

    def test_missing_components_are_explicitly_skipped(self):
        self.assertIn("frontend SKIPPED", self.workflow)
        self.assertIn("backend SKIPPED", self.workflow)
        self.assertIn("GITHUB_STEP_SUMMARY", self.workflow)
        self.assertIn("package-lock.json is required for npm ci", self.workflow)
        self.assertIn("components:", self.workflow)
        self.assertIn("needs: components", self.workflow)
        self.assertIn("if: needs.components.outputs.frontend == 'true'", self.workflow)
        self.assertIn("if: needs.components.outputs.backend == 'true'", self.workflow)


class DocumentationTests(unittest.TestCase):
    def test_generator_flags_are_documented(self):
        readme = read_text("README.md")
        source = read_text("tools/event-generator/generate_events.py")
        for flag in ("--count", "--seed", "--start", "--with-event-id", "--output"):
            self.assertIn(flag, source)
            self.assertIn(flag, readme)
        self.assertIn("fixtures/events.sample.json", readme)

    def test_openapi_status_is_documented(self):
        readme = read_text("README.md")
        contract = ROOT / "docs" / "openapi.yaml"
        self.assertIn("docs/openapi.yaml", readme)
        if contract.exists():
            self.assertNotIn("pozostaje niepotwierdzona", readme)
    def test_compose_stage_and_api_dependency_are_documented(self):
        readme = read_text("README.md")
        self.assertIn("Compose uruchamia PostgreSQL, API, frontend i stub webhooków", readme)
        self.assertIn("GET /api/health", readme)
        self.assertIn("503", readme)

    def test_generator_http_mode_and_scenarios_are_documented(self):
        readme = read_text("README.md")
        for phrase in (
            "--send", "API_URL", "--interval", "--forever", "--scenario", "critical-once", "normal", "warn-spike",
            "gradual-degradation", "--ground-truth", "docker compose --profile generator run --rm event-generator",
        ):
            self.assertIn(phrase, readme)

    def test_webhook_stub_usage_is_documented(self):
        readme = read_text("README.md")
        for phrase in (
            "tools/webhook-stub/webhook_stub.py", "POST /webhook", "WEBHOOK_STUB_RESPONSE_STATUS",
            "WEBHOOK_STUB_PORT", "GET /requests", "/config/response-status", "docker compose logs -f webhook-stub",
        ):
            self.assertIn(phrase, readme)

    def test_branch_pr_review_and_branch_protection_are_documented(self):
        contributing = read_text("CONTRIBUTING.md")
        for phrase in ("Pull Request", "review", "main", "co najmniej jedno zatwierdzenie"):
            self.assertIn(phrase, contributing)
        self.assertIn("nie jest weryfikowana przez lokalne testy", contributing)


if __name__ == "__main__":
    unittest.main()
