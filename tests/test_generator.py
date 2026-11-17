import ast
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import unittest
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / "tools" / "event-generator" / "generate_events.py"
sys.path.insert(0, str(GENERATOR.parent))
import generate_events as generator

REQUIRED_FIELDS = {"machineId", "timestamp", "severity", "code", "message"}
ALLOWED_FIELDS = REQUIRED_FIELDS | {"eventId"}
START = datetime(2026, 1, 1, 8, 0, 0, tzinfo=timezone.utc)
TIMESTAMP_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def assert_event_contract(test_case, events):
    for event in events:
        test_case.assertTrue(REQUIRED_FIELDS <= set(event) <= ALLOWED_FIELDS, event)
        test_case.assertNotIn("status", event)
        test_case.assertRegex(event["timestamp"], TIMESTAMP_PATTERN)
        timestamp = datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
        test_case.assertEqual(timestamp.utcoffset().total_seconds(), 0)
        test_case.assertIn(event["severity"], generator.SEVERITIES)
        for field in ("machineId", "code", "message"):
            test_case.assertIsInstance(event[field], str)
            test_case.assertTrue(event[field])
        if "eventId" in event:
            test_case.assertIsInstance(event["eventId"], str)
            test_case.assertTrue(event["eventId"])


class FixtureTests(unittest.TestCase):
    def setUp(self):
        self.events = json.loads((ROOT / "fixtures" / "events.sample.json").read_text(encoding="utf-8"))

    def test_contract_fields_and_utc(self):
        assert_event_contract(self, self.events)

    def test_covers_three_machines_and_all_severities(self):
        self.assertGreaterEqual(len({event["machineId"] for event in self.events}), 3)
        self.assertEqual({event["severity"] for event in self.events}, set(generator.SEVERITIES))

    def test_matches_generator(self):
        expected = generator.generate(12, seed=1, start=START, with_event_id=True)
        self.assertEqual(self.events, expected)


class GeneratorTests(unittest.TestCase):
    def test_count(self):
        for count in (1, 4, 50):
            with self.subTest(count=count):
                self.assertEqual(len(generator.generate(count, seed=1, start=START)), count)

    def test_contract_and_coverage(self):
        events = generator.generate(30, seed=7, start=START, with_event_id=True)
        assert_event_contract(self, events)
        self.assertGreaterEqual(len({event["machineId"] for event in events}), 3)
        self.assertEqual({event["severity"] for event in events}, set(generator.SEVERITIES))

    def test_seed_is_reproducible(self):
        first = generator.generate(20, seed=42, start=START, with_event_id=True)
        second = generator.generate(20, seed=42, start=START, with_event_id=True)
        changed = generator.generate(20, seed=43, start=START, with_event_id=True)
        self.assertEqual(first, second)
        self.assertNotEqual(first, changed)

    def test_seed_without_start_is_reproducible(self):
        first = generator.generate(20, seed=42, with_event_id=True)
        second = generator.generate(20, seed=42, with_event_id=True)
        self.assertEqual(first, second)
        self.assertEqual(first[0]["timestamp"][:10], "2026-01-01")

    def test_start_with_offset_is_normalized_to_utc(self):
        start = generator.parse_utc("2026-01-01T10:00:00+02:00")
        events = generator.generate(1, seed=1, start=start)
        self.assertTrue(events[0]["timestamp"].startswith("2026-01-01T08:"))

    def test_cli_seed_without_start_is_reproducible(self):
        def run():
            return subprocess.run(
                [sys.executable, str(GENERATOR), "-n", "15", "--seed", "9", "--with-event-id"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout
        self.assertEqual(run(), run())

    def test_output_file_and_count(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "events.json"
            for count in (3, 25):
                subprocess.run(
                    [sys.executable, str(GENERATOR), "-n", str(count), "--seed", "1", "-o", str(output)],
                    check=True,
                )
                events = json.loads(output.read_text(encoding="utf-8"))
                self.assertEqual(len(events), count)
                assert_event_contract(self, events)

    def test_output_file_uses_lf_line_endings(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "events.json"
            subprocess.run(
                [sys.executable, str(GENERATOR), "-n", "2", "--seed", "1", "-o", str(output)],
                check=True,
            )
            self.assertNotIn(b"\r", output.read_bytes())

    def test_unwritable_output_fails_without_traceback(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "missing" / "events.json"
            result = subprocess.run(
                [sys.executable, str(GENERATOR), "-n", "1", "-o", str(output)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertNotIn("Traceback", result.stderr)
            self.assertIn("nie można zapisać pliku", result.stderr)

    def test_without_seed_uses_current_utc(self):
        events = generator.generate(2)
        timestamp = datetime.fromisoformat(events[0]["timestamp"].replace("Z", "+00:00"))
        self.assertLess(abs((datetime.now(timezone.utc) - timestamp).total_seconds()), 300)

    def test_event_id_is_optional(self):
        events = generator.generate(5, seed=1, start=START)
        self.assertTrue(all("eventId" not in event for event in events))

    def test_cli_writes_requested_count_to_stdout(self):
        result = subprocess.run(
            [sys.executable, str(GENERATOR), "-n", "7", "--seed", "1"],
            capture_output=True,
            text=True,
            check=True,
        )
        self.assertEqual(len(json.loads(result.stdout)), 7)

    def test_cli_rejects_invalid_arguments(self):
        invalid_args = (
            ["-n", "0"],
            ["-n", "abc"],
            ["--start", "2026-01-01T08:00:00"],
            ["--start", "not-a-date"],
        )
        for args in invalid_args:
            with self.subTest(args=args):
                result = subprocess.run(
                    [sys.executable, str(GENERATOR), *args], capture_output=True, text=True
                )
                self.assertEqual(result.returncode, 2)

    def test_generator_imports_only_standard_library(self):
        allowed = {"argparse", "json", "os", "random", "sys", "time", "urllib", "uuid", "datetime"}
        modules = set()
        for node in ast.walk(ast.parse(GENERATOR.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Import):
                modules.update(alias.name.split(".")[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                modules.add((node.module or "").split(".")[0])
        self.assertLessEqual(modules, allowed)
        if hasattr(sys, "stdlib_module_names"):
            self.assertLessEqual(modules, set(sys.stdlib_module_names))

    def test_generator_uses_only_urllib_for_network(self):
        source = GENERATOR.read_text(encoding="utf-8")
        for module in ("http", "socket", "requests", "ssl"):
            self.assertNotRegex(source, r"(?m)^\s*(import|from)\s+" + module + r"\b")
        imported = set(re.findall(r"(?m)^\s*import\s+(urllib\.\w+)", source))
        self.assertEqual(imported, {"urllib.error", "urllib.request"})

    def test_offline_mode_makes_no_network_calls(self):
        def forbidden(*args, **kwargs):
            raise AssertionError("tryb offline nie może wysyłać żądań")

        with tempfile.TemporaryDirectory() as directory, \
                mock.patch.object(generator.urllib.request, "urlopen", forbidden):
            output = Path(directory) / "events.json"
            for args in (
                ["-n", "5", "--seed", "1", "-o", str(output)],
                ["--scenario", "gradual-degradation", "--seed", "1", "-o", str(output)],
                ["--scenario", "critical-once", "--seed", "1", "-o", str(output)],
            ):
                self.assertEqual(generator.main(args), 0)


class FakeApi:
    def __init__(self, status=201, body=b"{}"):
        self.status = status
        self.body = body
        self.requests = []
        api = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                pass

            def do_POST(self):
                length = int(self.headers.get("Content-Length") or 0)
                api.requests.append((self.path, self.headers.get("Content-Type"), json.loads(self.rfile.read(length))))
                self.send_response(api.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(api.body)))
                self.end_headers()
                self.wfile.write(api.body)

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = "http://127.0.0.1:%d" % self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *exc):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)

    @property
    def events(self):
        return [payload for _, _, payload in self.requests]


def run_main(args, env=None):
    out, err = io.StringIO(), io.StringIO()
    with mock.patch.dict(os.environ, env or {}, clear=False), \
            mock.patch("sys.stdout", out), mock.patch("sys.stderr", err):
        code = generator.main(args)
    return code, out.getvalue(), err.getvalue()


class SendTests(unittest.TestCase):
    def test_sends_contract_payloads_to_api_url_from_environment(self):
        with FakeApi() as api:
            code, out, err = run_main(["--send", "-n", "6", "--seed", "3"], env={"API_URL": api.url + "/"})
        self.assertEqual(code, 0, err)
        self.assertEqual(len(api.requests), 6)
        self.assertEqual({path for path, _, _ in api.requests}, {"/api/events"})
        self.assertTrue(all(ctype == "application/json" for _, ctype, _ in api.requests))
        assert_event_contract(self, api.events)
        self.assertEqual(out.count("HTTP 201"), 6)
        self.assertIn("wysłano 6, błędy 0", err)

    def test_live_random_mode_uses_current_time_and_many_machines(self):
        with FakeApi() as api:
            code, _, err = run_main(["--send", "-n", "40", "--seed", "5", "--api-url", api.url])
        self.assertEqual(code, 0, err)
        self.assertGreaterEqual(len({event["machineId"] for event in api.events}), 3)
        self.assertGreater(len({event["severity"] for event in api.events}), 2)
        newest = datetime.fromisoformat(api.events[-1]["timestamp"].replace("Z", "+00:00"))
        self.assertLess(abs((datetime.now(timezone.utc) - newest).total_seconds()), 60)

    def test_interval_waits_between_events(self):
        sleeps = []
        with FakeApi() as api:
            endpoint = generator.events_endpoint(api.url)
            sent, failed = generator.send_events(
                generator.generate(3, seed=1, start=START), endpoint, 2.5,
                out=io.StringIO(), err=io.StringIO(), sleep=sleeps.append,
            )
        self.assertEqual((sent, failed), (3, 0))
        self.assertEqual(sleeps, [2.5, 2.5])

    def test_forever_streams_until_interrupted(self):
        stream = generator.random_stream(seed=1, count=None, with_event_id=False)
        events = [next(stream) for _ in range(25)]
        assert_event_contract(self, events)

    def test_http_errors_are_reported_with_status_code(self):
        body = json.dumps({"title": "Conflict", "detail": "Zdarzenie już istnieje."}).encode("utf-8")
        for status in (400, 409, 503):
            with self.subTest(status=status), FakeApi(status=status, body=body) as api:
                code, _, err = run_main(["--send", "-n", "2", "--seed", "1", "--api-url", api.url])
                self.assertEqual(code, 1)
                self.assertIn("Błąd HTTP %d" % status, err)
                self.assertIn("Zdarzenie już istnieje.", err)
                self.assertIn("wysłano 0, błędy 2", err)

    def test_connection_error_is_readable(self):
        with FakeApi() as api:
            port = api.server.server_address[1]
        code, _, err = run_main(["--send", "-n", "1", "--seed", "1", "--api-url", "http://127.0.0.1:%d" % port])
        self.assertEqual(code, 3)
        self.assertIn("brak połączenia z API http://127.0.0.1:%d/api/events" % port, err)
        self.assertNotIn("Traceback", err)

    def test_api_url_with_credentials_is_rejected_without_echoing_it(self):
        url = "http://user:hidden-value@127.0.0.1:5136"
        for args, env in ((["--api-url", url], {}), ([], {"API_URL": url})):
            with self.subTest(source="env" if env else "flag"), FakeApi() as api:
                err = io.StringIO()
                with mock.patch.dict(os.environ, env), mock.patch("sys.stderr", err), \
                        self.assertRaises(SystemExit) as ctx:
                    generator.main(["--send", "-n", "1", *args])
                self.assertEqual(ctx.exception.code, 2)
                self.assertIn("API_URL nie może zawierać danych logowania", err.getvalue())
                self.assertNotIn("hidden-value", err.getvalue())
                self.assertNotIn("user", err.getvalue().split("error:")[-1])
                self.assertEqual(api.requests, [])

    def test_invalid_api_url_is_rejected(self):
        result = subprocess.run(
            [sys.executable, str(GENERATOR), "--send", "--api-url", "ftp://example"],
            capture_output=True, text=True, encoding="utf-8", env=dict(os.environ, PYTHONIOENCODING="utf-8"),
        )
        self.assertEqual(result.returncode, 2)

    def test_forever_requires_send_and_random(self):
        for args in (["--forever"], ["--send", "--forever", "--scenario", "normal"]):
            with self.subTest(args=args), mock.patch("sys.stderr", io.StringIO()), self.assertRaises(SystemExit) as ctx:
                generator.main(args)
            self.assertEqual(ctx.exception.code, 2)

    def test_critical_once_sends_exactly_one_critical_event(self):
        with FakeApi() as api:
            code, _, err = run_main(
                ["--send", "--scenario", "critical-once", "-n", "50", "--seed", "1", "--with-event-id", "--api-url", api.url]
            )
        self.assertEqual(code, 0, err)
        self.assertEqual(len(api.events), 1)
        self.assertEqual(api.events[0]["severity"], "CRITICAL")
        assert_event_contract(self, api.events)

    def test_scenario_send_matches_offline_sequence_and_omits_ground_truth(self):
        expected, truth = generator.scenario("warn-spike", seed=4, start=START)
        with tempfile.TemporaryDirectory() as directory, FakeApi() as api:
            truth_path = Path(directory) / "truth.json"
            code, _, err = run_main([
                "--send", "--scenario", "warn-spike", "--seed", "4", "--start", "2026-01-01T08:00:00Z",
                "--ground-truth", str(truth_path), "--api-url", api.url,
            ])
            self.assertEqual(code, 0, err)
            self.assertEqual(json.loads(truth_path.read_text(encoding="utf-8")), truth)
        self.assertEqual(api.events, expected)
        for event in api.events:
            self.assertTrue(set(event) <= ALLOWED_FIELDS)


class ScenarioTests(unittest.TestCase):
    def counts_per_window(self, events, truth):
        start = datetime.fromisoformat(truth["start"].replace("Z", "+00:00"))
        counts = [0] * truth["parameters"]["windowCount"]
        for event in events:
            if event["machineId"] == truth["machineId"] and event["severity"] == "WARN" and event["code"] == truth["warnCode"]:
                timestamp = datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
                counts[int((timestamp - start).total_seconds() // 60)] += 1
        return counts

    @staticmethod
    def m3_episode_window(counts):
        baseline = sum(counts[:5]) / 5
        threshold = max(baseline + 2, baseline * 1.5)
        streak = 0
        for window in range(5, len(counts)):
            streak = streak + 1 if counts[window] > threshold else 0
            if streak == 2:
                return window
        return None

    def test_minimal_gradual_degradation_opens_m3_episode_before_error_window(self):
        for seed in range(20):
            with self.subTest(seed=seed):
                events, truth = generator.scenario(
                    "gradual-degradation", seed=seed, start=START,
                    baseline_windows=generator.MIN_BASELINE_WINDOWS,
                    degradation_windows=generator.MIN_DEGRADATION_WINDOWS,
                )
                error_at = datetime.fromisoformat(truth["firstError"]["timestamp"].replace("Z", "+00:00"))
                error_window = int((error_at - START).total_seconds() // 60)
                episode = self.m3_episode_window(self.counts_per_window(events, truth))
                self.assertIsNotNone(episode)
                self.assertLess(episode, error_window)

    def test_normal_and_warn_spike_never_open_m3_episode(self):
        for name in ("normal", "warn-spike"):
            for seed in range(20):
                with self.subTest(name=name, seed=seed):
                    events, truth = generator.scenario(name, seed=seed, start=START)
                    self.assertIsNone(self.m3_episode_window(self.counts_per_window(events, truth)))

    def test_scenarios_follow_contract(self):
        for name in ("normal", "warn-spike", "gradual-degradation"):
            with self.subTest(name=name):
                events, _ = generator.scenario(name, seed=1, start=START)
                assert_event_contract(self, events)
                self.assertTrue(all("eventId" in event for event in events))
                self.assertEqual(len({event["eventId"] for event in events}), len(events))
                self.assertEqual(len({event["machineId"] for event in events}), len(generator.MACHINES))
                timestamps = [event["timestamp"] for event in events]
                self.assertEqual(timestamps, sorted(timestamps))

    def test_same_seed_and_start_give_same_sequence(self):
        for name in ("normal", "warn-spike", "gradual-degradation"):
            with self.subTest(name=name):
                self.assertEqual(generator.scenario(name, 11, START), generator.scenario(name, 11, START))
                self.assertNotEqual(generator.scenario(name, 11, START)[0], generator.scenario(name, 12, START)[0])

    def test_relative_times_do_not_depend_on_start(self):
        later = START + timedelta(days=3)
        first, _ = generator.scenario("gradual-degradation", 5, START)
        second, _ = generator.scenario("gradual-degradation", 5, later)

        def relative(events, base):
            return [
                (datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00")) - base, e["machineId"], e["severity"], e["code"])
                for e in events
            ]

        self.assertEqual(relative(first, START), relative(second, later))
        self.assertNotEqual(first[0]["eventId"], second[0]["eventId"])

    def test_normal_scenario_has_no_errors_or_spike(self):
        events, truth = generator.scenario("normal", seed=2, start=START)
        self.assertEqual({event["severity"] for event in events}, {"INFO", "WARN"})
        self.assertLessEqual(max(self.counts_per_window(events, truth)), 1)
        self.assertIsNone(truth["degradationStart"])
        self.assertIsNone(truth["firstError"])

    def test_warn_spike_is_single_short_window(self):
        events, truth = generator.scenario("warn-spike", seed=2, start=START)
        counts = self.counts_per_window(events, truth)
        spike = [index for index, count in enumerate(counts) if count >= 5]
        self.assertEqual(len(spike), 1)
        self.assertGreaterEqual(spike[0], generator.MIN_BASELINE_WINDOWS)
        self.assertNotIn("ERROR", {event["severity"] for event in events})
        self.assertIsNotNone(truth["warnSpikeWindowStart"])
        self.assertIsNone(truth["firstError"])

    def test_gradual_degradation_grows_after_full_baseline_and_ends_with_error(self):
        for seed in range(5):
            with self.subTest(seed=seed):
                events, truth = generator.scenario("gradual-degradation", seed=seed, start=START)
                baseline = truth["parameters"]["baselineWindows"]
                self.assertGreaterEqual(baseline, 5)
                counts = self.counts_per_window(events, truth)
                self.assertLessEqual(max(counts[:baseline]), 1)
                degradation = counts[baseline:]
                self.assertTrue(all(b > a for a, b in zip(degradation, degradation[1:])), counts)
                self.assertGreaterEqual(degradation[-1], max(counts[:baseline]) + 2 * len(degradation) - 1)

                errors = [event for event in events if event["severity"] == "ERROR"]
                self.assertEqual(len(errors), 1)
                self.assertEqual(errors[0]["machineId"], truth["machineId"])
                self.assertEqual(errors[0]["eventId"], truth["firstError"]["eventId"])
                self.assertEqual(errors[0]["timestamp"], truth["firstError"]["timestamp"])
                self.assertEqual(events[-1]["timestamp"] <= truth["firstError"]["timestamp"], True)
                degradation_start = START + timedelta(minutes=baseline)
                self.assertEqual(truth["degradationStart"], generator.format_utc(degradation_start))

    def test_ground_truth_fields(self):
        _, truth = generator.scenario("gradual-degradation", seed=8, start=START, machine="cnc-03", warn_code="VIBRATION_ELEVATED")
        for key in ("seed", "scenario", "parameters", "machineId", "warnCode", "degradationStart", "firstError"):
            self.assertIn(key, truth)
        self.assertEqual((truth["seed"], truth["machineId"], truth["warnCode"]), (8, "cnc-03", "VIBRATION_ELEVATED"))

    def test_ground_truth_never_leaks_into_payloads(self):
        events, truth = generator.scenario("gradual-degradation", seed=3, start=START)
        for event in events:
            self.assertTrue(set(event) <= ALLOWED_FIELDS)
            for key in ("scenario", "seed", "groundTruth", "degradationStart", "warnCode"):
                self.assertNotIn(key, event)

    def test_cli_writes_ground_truth_separately(self):
        with tempfile.TemporaryDirectory() as directory:
            events_path = Path(directory) / "events.json"
            truth_path = Path(directory) / "truth.json"
            subprocess.run(
                [sys.executable, str(GENERATOR), "--scenario", "gradual-degradation", "--seed", "6",
                 "-o", str(events_path), "--ground-truth", str(truth_path)],
                check=True,
            )
            events = json.loads(events_path.read_text(encoding="utf-8"))
            truth = json.loads(truth_path.read_text(encoding="utf-8"))
        self.assertEqual((events, truth), generator.scenario("gradual-degradation", 6))
        assert_event_contract(self, events)

    def test_invalid_scenario_parameters_are_rejected(self):
        for args in (
            ["--scenario", "gradual-degradation", "--baseline-windows", "4"],
            ["--scenario", "gradual-degradation", "--degradation-windows", "3"],
            ["--scenario", "gradual-degradation", "--degradation-windows", "21"],
            ["--scenario", "random", "--ground-truth", "truth.json"],
            ["--interval", "-1"],
        ):
            with self.subTest(args=args), mock.patch("sys.stderr", io.StringIO()), self.assertRaises(SystemExit) as ctx:
                generator.main(args)
            self.assertEqual(ctx.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
