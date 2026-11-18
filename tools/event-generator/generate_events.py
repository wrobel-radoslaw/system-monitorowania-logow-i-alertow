#!/usr/bin/env python3
"""Generator zdarzeń CreateEventRequest: zapis offline, wysyłka HTTP do API i powtarzalne scenariusze."""

import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, urlunsplit

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

SCENARIOS = ("random", "critical-once", "normal", "warn-spike", "gradual-degradation")
WINDOW_SECONDS = 60
MIN_BASELINE_WINDOWS = 5
MIN_DEGRADATION_WINDOWS = 4
MAX_DEGRADATION_WINDOWS = 20
DEFAULT_API_URL = "http://127.0.0.1:5136"
EVENTS_PATH = "/api/events"
HTTP_TIMEOUT_SECONDS = 10
EVENT_ID_NAMESPACE = uuid.UUID("6f1c2d4e-8a3b-4c5d-9e7f-102030405060")
WARN_MESSAGES = dict(CATALOG["WARN"])
ERROR_MESSAGES = dict(CATALOG["ERROR"])


class SendError(Exception):
    pass


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


def format_utc(timestamp):
    return timestamp.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


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


def random_event(rng, timestamp, with_event_id=False):
    severity = rng.choices(SEVERITIES, WEIGHTS)[0]
    code, message = rng.choice(CATALOG[severity])
    event = {
        "machineId": rng.choice(MACHINES),
        "timestamp": format_utc(timestamp),
        "severity": severity,
        "code": code,
        "message": message,
    }
    if with_event_id:
        event["eventId"] = str(uuid.UUID(int=rng.getrandbits(128), version=4))
    return event


def critical_once(seed=None, start=None, machine=MACHINES[0], with_event_id=False):
    rng = random.Random(seed)
    timestamp = (start or datetime.now(timezone.utc)).replace(microsecond=0)
    code, message = rng.choice(CATALOG["CRITICAL"])
    event = {
        "machineId": machine,
        "timestamp": format_utc(timestamp),
        "severity": "CRITICAL",
        "code": code,
        "message": message,
    }
    if with_event_id:
        event["eventId"] = str(uuid.UUID(int=rng.getrandbits(128), version=4))
    return [event]


def scenario_event(machine, timestamp, severity, code, message):
    return {
        "machineId": machine,
        "timestamp": format_utc(timestamp),
        "severity": severity,
        "code": code,
        "message": message,
    }


def window_events(rng, machine, window_start, warn_count, warn_code):
    info_count = rng.randint(3, 5)
    entries = []
    for _ in range(info_count):
        code, message = rng.choice(CATALOG["INFO"])
        entries.append(("INFO", code, message))
    for _ in range(warn_count):
        entries.append(("WARN", warn_code, WARN_MESSAGES[warn_code]))
    # Ostatnia sekunda okna jest zarezerwowana na zdarzenie ERROR kończące degradację.
    offsets = sorted(rng.sample(range(WINDOW_SECONDS - 1), len(entries)))
    rng.shuffle(entries)
    timed = []
    for offset, entry in zip(offsets, entries):
        timestamp = window_start + timedelta(seconds=offset)
        timed.append((timestamp, scenario_event(machine, timestamp, *entry)))
    return timed


def scenario(name, seed=0, start=None, machine=MACHINES[0], warn_code="TEMP_HIGH",
             baseline_windows=6, degradation_windows=5, error_code="SENSOR_FAILURE"):
    """Zwraca (events, ground_truth) dla scenariuszy normal, warn-spike i gradual-degradation."""
    if name not in ("normal", "warn-spike", "gradual-degradation"):
        raise ValueError("nieznany scenariusz: " + name)
    if baseline_windows < MIN_BASELINE_WINDOWS:
        raise ValueError("baseline wymaga co najmniej %d pełnych okien" % MIN_BASELINE_WINDOWS)
    if name == "gradual-degradation" and not MIN_DEGRADATION_WINDOWS <= degradation_windows <= MAX_DEGRADATION_WINDOWS:
        raise ValueError(
            "--degradation-windows musi być z zakresu %d-%d" % (MIN_DEGRADATION_WINDOWS, MAX_DEGRADATION_WINDOWS)
        )

    rng = random.Random(seed)
    start = (start or DEFAULT_SEED_START).astimezone(timezone.utc).replace(microsecond=0)
    start = start - timedelta(seconds=start.second)
    extra_windows = degradation_windows if name != "warn-spike" else 3
    total_windows = baseline_windows + extra_windows
    spike_window = baseline_windows + 1 if name == "warn-spike" else None

    timed = []
    first_error = None
    for window in range(total_windows):
        window_start = start + timedelta(seconds=window * WINDOW_SECONDS)
        for current in MACHINES:
            base_warn = rng.randint(0, 1)
            if current != machine:
                timed.extend(window_events(rng, current, window_start, base_warn, "VIBRATION_ELEVATED"))
                continue
            warn_count = base_warn
            if name == "gradual-degradation" and window >= baseline_windows:
                warn_count = base_warn + 2 * (window - baseline_windows + 1)
            elif window == spike_window:
                warn_count = base_warn + 5
            timed.extend(window_events(rng, current, window_start, warn_count, warn_code))
            if name == "gradual-degradation" and window == total_windows - 1:
                error_at = window_start + timedelta(seconds=WINDOW_SECONDS - 1)
                first_error = scenario_event(current, error_at, "ERROR", error_code, ERROR_MESSAGES[error_code])
                timed.append((error_at, first_error))

    timed.sort(key=lambda item: (item[0], MACHINES.index(item[1]["machineId"])))
    events = [event for _, event in timed]
    for index, event in enumerate(events):
        event["eventId"] = str(uuid.uuid5(EVENT_ID_NAMESPACE, "%s:%s:%s:%d" % (name, seed, format_utc(start), index)))

    degradation_start = start + timedelta(seconds=baseline_windows * WINDOW_SECONDS)
    ground_truth = {
        "scenario": name,
        "seed": seed,
        "start": format_utc(start),
        "parameters": {
            "windowSeconds": WINDOW_SECONDS,
            "baselineWindows": baseline_windows,
            "degradationWindows": degradation_windows if name == "gradual-degradation" else 0,
            "windowCount": total_windows,
            "machines": list(MACHINES),
            "eventCount": len(events),
        },
        "machineId": machine,
        "warnCode": warn_code,
        "degradationStart": format_utc(degradation_start) if name == "gradual-degradation" else None,
        "warnSpikeWindowStart": (
            format_utc(start + timedelta(seconds=spike_window * WINDOW_SECONDS)) if spike_window is not None else None
        ),
        "firstError": (
            {"timestamp": first_error["timestamp"], "eventId": first_error["eventId"], "code": error_code}
            if first_error else None
        ),
    }
    return events, ground_truth


def safe_url(url):
    parts = urlsplit(url)
    host = parts.hostname or ""
    if parts.port:
        host = "%s:%s" % (host, parts.port)
    return urlunsplit((parts.scheme, host, parts.path, "", ""))


def events_endpoint(api_url):
    parts = urlsplit(api_url)
    if parts.username is not None or parts.password is not None:
        raise ValueError("API_URL nie może zawierać danych logowania")
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError("API_URL musi być adresem http(s)://host[:port], podano: %s" % safe_url(api_url))
    return api_url.rstrip("/") + EVENTS_PATH


def error_detail(body):
    try:
        data = json.loads(body)
    except ValueError:
        return ""
    if not isinstance(data, dict):
        return ""
    parts = [str(data[key]) for key in ("title", "detail") if data.get(key)]
    return ": " + " - ".join(parts)[:200] if parts else ""


def post_event(endpoint, event, timeout=HTTP_TIMEOUT_SECONDS):
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(event).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, ""
    except urllib.error.HTTPError as exc:
        with exc:
            body = exc.read(4096).decode("utf-8", errors="replace")
        return exc.code, error_detail(body)
    except (urllib.error.URLError, OSError) as exc:
        reason = getattr(exc, "reason", exc)
        raise SendError("brak połączenia z API %s: %s" % (safe_url(endpoint), reason)) from None


def send_events(events, endpoint, interval=0.0, out=None, err=None, sleep=time.sleep):
    out = out or sys.stdout
    err = err or sys.stderr
    sent = failed = 0
    for index, event in enumerate(events):
        if index and interval:
            sleep(interval)
        status, detail = post_event(endpoint, event)
        label = "%s %s %s %s" % (event["machineId"], event["severity"], event["code"], event.get("eventId", "-"))
        if 200 <= status < 300:
            sent += 1
            out.write("HTTP %d %s\n" % (status, label))
        else:
            failed += 1
            err.write("Błąd HTTP %d dla zdarzenia #%d (%s)%s\n" % (status, index + 1, label, detail))
        out.flush()
    return sent, failed


def random_stream(seed, count, with_event_id):
    rng = random.Random(seed)
    produced = 0
    while count is None or produced < count:
        yield random_event(rng, datetime.now(timezone.utc), with_event_id)
        produced += 1


def write_json(path, data):
    with open(path, "w", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(data, indent=2) + "\n")


def build_parser():
    parser = argparse.ArgumentParser(
        description="Generator CreateEventRequest: offline (JSON) lub wysyłka HTTP do POST /api/events."
    )
    parser.add_argument("-n", "--count", type=int, default=10, help="liczba zdarzeń (>=1, domyślnie 10)")
    parser.add_argument("--seed", type=int, help="seed zapewniający powtarzalny wynik")
    parser.add_argument(
        "--start",
        type=parse_utc,
        help="czas początkowy ISO 8601 ze strefą (domyślnie: stały przy --seed, teraz UTC bez --seed)",
    )
    parser.add_argument("--with-event-id", action="store_true", help="dodaj opcjonalne pole eventId (UUID)")
    parser.add_argument("-o", "--output", help="plik wyjściowy z wygenerowanymi zdarzeniami (domyślnie stdout)")
    parser.add_argument("--scenario", choices=SCENARIOS, default="random", help="tryb generowania (domyślnie random)")
    parser.add_argument("--machine", choices=MACHINES, default=MACHINES[0], help="maszyna scenariusza")
    parser.add_argument("--warn-code", choices=sorted(WARN_MESSAGES), default="TEMP_HIGH", help="kod WARN scenariusza")
    parser.add_argument("--baseline-windows", type=int, default=6, help="pełne okna 60 s normalnej pracy (>=5)")
    parser.add_argument("--degradation-windows", type=int, default=5, help="okna narastającej degradacji (%d-%d, domyślnie 5)" % (MIN_DEGRADATION_WINDOWS, MAX_DEGRADATION_WINDOWS))
    parser.add_argument("--ground-truth", help="plik JSON z ground truth scenariusza (nie trafia do API)")
    parser.add_argument("--send", action="store_true", help="wyślij zdarzenia do POST {API_URL}/api/events")
    parser.add_argument("--api-url", default=None, help="adres API (domyślnie zmienna API_URL lub %s)" % DEFAULT_API_URL)
    parser.add_argument("--interval", type=float, default=0.0, help="odstęp w sekundach między wysyłkami")
    parser.add_argument("--forever", action="store_true", help="tryb okresowy random bez limitu liczby zdarzeń")
    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.count < 1:
        parser.error("--count musi być >= 1")
    if args.interval < 0:
        parser.error("--interval musi być >= 0")
    if args.forever and not (args.send and args.scenario == "random"):
        parser.error("--forever działa tylko z --send i --scenario random")
    if args.ground_truth and args.scenario not in ("normal", "warn-spike", "gradual-degradation"):
        parser.error("--ground-truth wymaga scenariusza normal, warn-spike lub gradual-degradation")

    endpoint = None
    if args.send:
        try:
            endpoint = events_endpoint(args.api_url or os.environ.get("API_URL") or DEFAULT_API_URL)
        except ValueError as exc:
            parser.error(str(exc))

    ground_truth = None
    if args.scenario == "random":
        if args.send and args.start is None:
            events = random_stream(args.seed, None if args.forever else args.count, args.with_event_id)
        else:
            events = generate(args.count, args.seed, args.start, args.with_event_id)
    elif args.scenario == "critical-once":
        events = critical_once(args.seed, args.start, args.machine, args.with_event_id)
    else:
        seed = args.seed if args.seed is not None else 0
        try:
            events, ground_truth = scenario(
                args.scenario, seed, args.start, args.machine, args.warn_code,
                args.baseline_windows, args.degradation_windows,
            )
        except ValueError as exc:
            parser.error(str(exc))

    try:
        if ground_truth is not None and args.ground_truth:
            write_json(args.ground_truth, ground_truth)
        if not args.send:
            output = json.dumps(events, indent=2) + "\n"
            if args.output:
                with open(args.output, "w", encoding="utf-8", newline="\n") as stream:
                    stream.write(output)
            else:
                sys.stdout.write(output)
            return 0
        if args.output and isinstance(events, list):
            write_json(args.output, events)
    except OSError as exc:
        print("generate_events.py: nie można zapisać pliku: %s" % exc.strerror, file=sys.stderr)
        return 1

    try:
        sent, failed = send_events(events, endpoint, args.interval)
    except SendError as exc:
        print("generate_events.py: %s" % exc, file=sys.stderr)
        return 3
    except KeyboardInterrupt:
        print("generate_events.py: przerwano", file=sys.stderr)
        return 130
    print("generate_events.py: wysłano %d, błędy %d (%s)" % (sent, failed, safe_url(endpoint)), file=sys.stderr)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
