#!/usr/bin/env python3
"""Generate offline CreateEventRequest examples for the M1 acceptance criteria."""

import argparse
import json
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone

MACHINES = ("press-01", "lathe-02", "cnc-03", "conveyor-04")
SEVERITIES = ("INFO", "WARN", "ERROR", "CRITICAL")
WEIGHTS = (50, 25, 18, 7)
DEFAULT_SEED_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
CATALOG = {
    "INFO": (
        ("MACHINE_STARTED", "Machine started"),
        ("CYCLE_COMPLETED", "Production cycle completed"),
    ),
    "WARN": (
        ("TEMP_HIGH", "Temperature above nominal range"),
        ("VIBRATION_ELEVATED", "Vibration level elevated"),
    ),
    "ERROR": (
        ("SENSOR_FAILURE", "Sensor reading unavailable"),
        ("FEED_JAM", "Material feed jammed"),
    ),
    "CRITICAL": (
        ("OVERHEAT_SHUTDOWN", "Emergency shutdown: overheating"),
        ("EMERGENCY_STOP", "Emergency stop triggered"),
    ),
}


def parse_utc(value):
    """Parse an ISO 8601 timestamp that includes a time zone."""
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    try:
        timestamp = datetime.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("niepoprawny czas ISO 8601: " + str(exc))
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        raise argparse.ArgumentTypeError("--start wymaga strefy czasowej, np. 2026-01-01T08:00:00Z")
    return timestamp.astimezone(timezone.utc)


def generate(count, seed=None, start=None, with_event_id=False):
    rng = random.Random(seed)
    if start is None:
        start = DEFAULT_SEED_START if seed is not None else datetime.now(timezone.utc)
    timestamp = start.astimezone(timezone.utc).replace(microsecond=0)
    events = []

    for index in range(count):
        severity = SEVERITIES[index] if index < len(SEVERITIES) else rng.choices(SEVERITIES, WEIGHTS)[0]
        machine = MACHINES[index % len(MACHINES)] if index < len(MACHINES) else rng.choice(MACHINES)
        code, message = rng.choice(CATALOG[severity])
        timestamp += timedelta(seconds=rng.randint(1, 120))
        event = {
            "machineId": machine,
            "timestamp": timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "severity": severity,
            "code": code,
            "message": message,
        }
        if with_event_id:
            event["eventId"] = str(uuid.UUID(int=rng.getrandbits(128), version=4))
        events.append(event)

    return events


def main(argv=None):
    parser = argparse.ArgumentParser(description="Offline generator CreateEventRequest (bez wysyłki HTTP).")
    parser.add_argument("-n", "--count", type=int, default=10, help="liczba zdarzeń (>=1, domyślnie 10)")
    parser.add_argument("--seed", type=int, help="seed zapewniający powtarzalny wynik")
    parser.add_argument(
        "--start",
        type=parse_utc,
        help="czas początkowy ISO 8601 ze strefą (domyślnie: stały przy --seed, teraz UTC bez --seed)",
    )
    parser.add_argument("--with-event-id", action="store_true", help="dodaj opcjonalne pole eventId (UUID)")
    parser.add_argument("-o", "--output", help="plik wyjściowy (domyślnie stdout)")
    args = parser.parse_args(argv)

    if args.count < 1:
        parser.error("--count musi być >= 1")

    output = json.dumps(generate(args.count, args.seed, args.start, args.with_event_id), indent=2) + "\n"
    if not args.output:
        sys.stdout.write(output)
        return 0

    try:
        with open(args.output, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(output)
    except OSError as exc:
        print("generate_events.py: nie można zapisać pliku: %s" % exc.strerror, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
