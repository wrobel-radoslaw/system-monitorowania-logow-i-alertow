import ast
import json
import re
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

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
        allowed = {"argparse", "json", "random", "sys", "uuid", "datetime"}
        modules = set()
        for node in ast.walk(ast.parse(GENERATOR.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Import):
                modules.update(alias.name.split(".")[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                modules.add((node.module or "").split(".")[0])
        self.assertLessEqual(modules, allowed)
        if hasattr(sys, "stdlib_module_names"):
            self.assertLessEqual(modules, set(sys.stdlib_module_names))

    def test_generator_does_not_import_network_modules(self):
        source = GENERATOR.read_text(encoding="utf-8")
        for module in ("http", "urllib", "socket", "requests"):
            self.assertNotRegex(source, r"(?m)^\s*(import|from)\s+" + module + r"\b")


if __name__ == "__main__":
    unittest.main()
