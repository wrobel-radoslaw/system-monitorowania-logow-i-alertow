import ast
import http.client
import io
import json
import os
import subprocess
import sys
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
STUB = ROOT / "tools" / "webhook-stub" / "webhook_stub.py"
sys.path.insert(0, str(STUB.parent))
import webhook_stub as stub

VALID_PAYLOAD = {
    "alertId": "alert-0001",
    "eventId": "evt-0001",
    "machineId": "press-01",
    "ruleName": "ERROR_CRITICAL",
    "severity": "CRITICAL",
    "triggeredAt": "2026-11-17T08:00:00.1234567+00:00",
}


class ValidationTests(unittest.TestCase):
    def test_valid_payload_has_no_errors(self):
        self.assertEqual(stub.validate_payload(VALID_PAYLOAD), [])
        self.assertEqual(stub.validate_payload(dict(VALID_PAYLOAD, triggeredAt="2026-11-17T08:00:00Z")), [])

    def test_required_fields_match_openapi_contract(self):
        contract = (ROOT / "docs" / "openapi.yaml").read_text(encoding="utf-8")
        section = contract.split("    WebhookPayload:", 1)[1].split("\n    HealthDto:", 1)[0]
        required = section.split("required:", 1)[1].split("properties:", 1)[0]
        listed = [line.strip()[2:] for line in required.splitlines() if line.strip().startswith("- ")]
        self.assertEqual(set(listed), set(stub.REQUIRED_FIELDS))
        self.assertIn("additionalProperties: false", section)
        for rule in stub.RULE_NAMES:
            self.assertIn("- " + rule, section)

    def test_missing_field_is_reported(self):
        payload = dict(VALID_PAYLOAD)
        del payload["alertId"]
        self.assertEqual(stub.validate_payload(payload), ["brak wymaganego pola: alertId"])

    def test_unknown_field_is_rejected(self):
        errors = stub.validate_payload(dict(VALID_PAYLOAD, deliveryStatus="SENT"))
        self.assertEqual(errors, ["nieznane pole: deliveryStatus"])

    def test_enum_values_are_checked(self):
        errors = stub.validate_payload(dict(VALID_PAYLOAD, severity="FATAL", ruleName="OTHER"))
        self.assertIn("niedozwolona wartość severity: FATAL", errors)
        self.assertIn("niedozwolona wartość ruleName: OTHER", errors)

    def test_triggered_at_requires_timezone(self):
        for value in ("2026-11-17T08:00:00", "17.11.2026 08:00", "2026-13-40T08:00:00Z"):
            with self.subTest(value=value):
                errors = stub.validate_payload(dict(VALID_PAYLOAD, triggeredAt=value))
                self.assertEqual(errors, ["triggeredAt musi być datą ISO 8601 ze strefą czasową"])

    def test_non_object_and_wrong_types(self):
        self.assertEqual(stub.validate_payload([]), ["payload musi być obiektem JSON"])
        errors = stub.validate_payload(dict(VALID_PAYLOAD, eventId=12, machineId=" "))
        self.assertIn("pole musi być niepustym tekstem: eventId", errors)
        self.assertIn("pole musi być niepustym tekstem: machineId", errors)

    def test_parse_status_accepts_only_allowed_codes(self):
        for value in ("200", "400", " 503 ", 503):
            self.assertIn(stub.parse_status(value), stub.ALLOWED_STATUSES)
        for value in ("500", "abc", "", 201):
            with self.subTest(value=value), self.assertRaises(ValueError):
                stub.parse_status(value)


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.log = io.StringIO()
        self.state = stub.StubState(200, log_stream=self.log)
        self.server = stub.create_server("127.0.0.1", 0, self.state)
        self.base_url = "http://127.0.0.1:%d" % self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)

    def request(self, method, path, body=None, raw=None):
        data = raw if raw is not None else (json.dumps(body).encode("utf-8") if body is not None else None)
        req = urllib.request.Request(self.base_url + path, data=data, method=method)
        if data is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            with error:
                return error.code, json.loads(error.read().decode("utf-8"))

    def log_lines(self):
        return [json.loads(line) for line in self.log.getvalue().splitlines()]

    def test_health(self):
        self.assertEqual(self.request("GET", "/health"), (200, {"status": "ok"}))

    def test_valid_payload_returns_200_and_is_logged(self):
        status, body = self.request("POST", "/webhook", VALID_PAYLOAD)
        self.assertEqual((status, body), (200, {"accepted": True}))
        lines = self.log_lines()
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["payload"], VALID_PAYLOAD)
        self.assertEqual(lines[0]["responseStatus"], 200)
        self.assertTrue(lines[0]["valid"])
        self.assertTrue(lines[0]["receivedAt"].endswith("Z"))

    def test_configured_status_is_returned_for_valid_payload(self):
        for code in (503, 400):
            with self.subTest(code=code):
                self.state.response_status = code
                status, body = self.request("POST", "/webhook", VALID_PAYLOAD)
                self.assertEqual((status, body), (code, {"accepted": False}))
        self.assertEqual([line["responseStatus"] for line in self.log_lines()], [503, 400])

    def test_invalid_payload_returns_400_even_when_200_configured(self):
        status, body = self.request("POST", "/webhook", {"alertId": "a"})
        self.assertEqual(status, 400)
        self.assertFalse(body["accepted"])
        self.assertIn("brak wymaganego pola: eventId", body["errors"])
        self.assertFalse(self.log_lines()[0]["valid"])

    def test_malformed_json_returns_400(self):
        status, body = self.request("POST", "/webhook", raw=b"{not json")
        self.assertEqual(status, 400)
        self.assertEqual(body["errors"], ["treść żądania nie jest poprawnym JSON w UTF-8"])
        self.assertIsNone(self.log_lines()[0]["payload"])

    def chunked_post(self, chunks):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_address[1], timeout=5)
        try:
            connection.request(
                "POST", "/webhook", body=iter(chunks),
                headers={"Content-Type": "application/json"}, encode_chunked=True,
            )
            response = connection.getresponse()
            return response.status, json.loads(response.read().decode("utf-8"))
        finally:
            connection.close()

    def test_chunked_body_like_dotnet_http_client_is_accepted(self):
        data = json.dumps(VALID_PAYLOAD).encode("utf-8")
        status, body = self.chunked_post([data[:20], data[20:]])
        self.assertEqual((status, body), (200, {"accepted": True}))
        self.assertEqual(self.log_lines()[0]["payload"], VALID_PAYLOAD)

    def test_oversized_chunked_body_returns_413(self):
        status, body = self.chunked_post([b"x" * 40000, b"x" * 40000])
        self.assertEqual(status, 413)
        self.assertFalse(body["accepted"])

    def test_oversized_body_returns_413(self):
        status, body = self.request("POST", "/webhook", raw=b"x" * (stub.MAX_BODY_BYTES + 1))
        self.assertEqual(status, 413)
        self.assertFalse(body["accepted"])

    def test_unknown_path_returns_404(self):
        self.assertEqual(self.request("POST", "/other", VALID_PAYLOAD)[0], 404)
        self.assertEqual(self.request("GET", "/other")[0], 404)
        self.assertEqual(self.log_lines(), [])

    def test_received_requests_can_be_listed_and_cleared(self):
        self.request("POST", "/webhook", VALID_PAYLOAD)
        self.request("POST", "/webhook?source=test", dict(VALID_PAYLOAD, alertId="alert-0002"))
        status, body = self.request("GET", "/requests")
        self.assertEqual(status, 200)
        self.assertEqual([item["payload"]["alertId"] for item in body["requests"]], ["alert-0001", "alert-0002"])
        self.assertEqual(self.request("DELETE", "/requests"), (200, {"cleared": True}))
        self.assertEqual(self.request("GET", "/requests"), (200, {"requests": []}))

    def test_response_status_can_be_changed_at_runtime(self):
        self.assertEqual(self.request("PUT", "/config/response-status", {"status": 503}), (200, {"status": 503}))
        self.assertEqual(self.request("POST", "/webhook", VALID_PAYLOAD)[0], 503)
        status, _ = self.request("PUT", "/config/response-status", {"status": 500})
        self.assertEqual(status, 400)
        self.assertEqual(self.state.response_status, 503)
        self.assertEqual(self.request("PUT", "/config/response-status", raw=b"[]")[0], 400)

    def test_concurrent_requests_are_all_recorded(self):
        threads = [
            threading.Thread(target=self.request, args=("POST", "/webhook", dict(VALID_PAYLOAD, alertId="a%d" % i)))
            for i in range(20)
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=10)
        self.assertEqual(len(self.state.received()), 20)
        self.assertEqual(len(self.log_lines()), 20)


class CliTests(unittest.TestCase):
    def run_cli(self, *args, env=None):
        env = dict(env if env is not None else os.environ, PYTHONIOENCODING="utf-8")
        return subprocess.run(
            [sys.executable, str(STUB), *args],
            capture_output=True, text=True, encoding="utf-8", timeout=30, env=env, check=False,
        )

    def test_help(self):
        result = self.run_cli("--help")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--status", result.stdout)

    def test_invalid_status_is_rejected_without_traceback(self):
        result = self.run_cli("--status", "500")
        self.assertEqual(result.returncode, 2)
        self.assertIn("dozwolone kody odpowiedzi", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_invalid_status_from_environment_is_rejected(self):
        env = dict(os.environ, **{stub.STATUS_ENV: "418"})
        result = self.run_cli(env=env)
        self.assertEqual(result.returncode, 2)
        self.assertNotIn("Traceback", result.stderr)

    def test_status_is_read_from_environment(self):
        captured = {}

        def fake_create_server(host, port, state):
            captured.update(host=host, port=port, status=state.response_status)
            raise OSError("test")

        with mock.patch.dict(os.environ, {stub.STATUS_ENV: "503"}), \
                mock.patch.object(stub, "create_server", fake_create_server), \
                mock.patch("sys.stderr", io.StringIO()):
            self.assertEqual(stub.main([]), 1)
        self.assertEqual(captured, {"host": "127.0.0.1", "port": stub.DEFAULT_PORT, "status": 503})

    def test_cli_flag_overrides_environment(self):
        captured = {}

        def fake_create_server(host, port, state):
            captured["status"] = state.response_status
            raise OSError("test")

        with mock.patch.dict(os.environ, {stub.STATUS_ENV: "503"}), \
                mock.patch.object(stub, "create_server", fake_create_server), \
                mock.patch("sys.stderr", io.StringIO()):
            stub.main(["--status", "400"])
        self.assertEqual(captured["status"], 400)


class DependencyTests(unittest.TestCase):
    def imported_modules(self):
        tree = ast.parse(STUB.read_text(encoding="utf-8"))
        names = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                names.update(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                names.add(node.module)
        return names

    def test_stub_imports_only_standard_library(self):
        for name in self.imported_modules():
            self.assertIn(name.split(".")[0], sys.stdlib_module_names, name)

    def test_stub_does_not_import_client_network_modules(self):
        forbidden = {"urllib.request", "http.client", "socket", "ssl", "ftplib", "smtplib", "requests"}
        self.assertEqual(self.imported_modules() & forbidden, set())

    def test_dockerfile_uses_python_312_and_non_root_user(self):
        dockerfile = (STUB.parent / "Dockerfile").read_text(encoding="utf-8")
        self.assertIn("FROM python:3.12-", dockerfile)
        self.assertIn("USER nobody", dockerfile)
        self.assertIn('"--host", "0.0.0.0", "--port", "8080"', dockerfile)
        self.assertNotIn("pip install", dockerfile)


if __name__ == "__main__":
    unittest.main()
