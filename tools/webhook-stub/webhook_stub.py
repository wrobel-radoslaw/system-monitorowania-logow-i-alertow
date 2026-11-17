"""Lokalny odbiornik webhooków alertów do testów.

Przyjmuje POST z payloadem WebhookPayload (docs/openapi.yaml), loguje każde
żądanie jako jedną linię JSON na stdout i odpowiada skonfigurowanym kodem
(200, 400 lub 503). Używa wyłącznie biblioteki standardowej i nie nawiązuje
żadnych połączeń wychodzących.
"""

import argparse
import json
import os
import re
import sys
import threading
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

WEBHOOK_PATH = "/webhook"
HEALTH_PATH = "/health"
REQUESTS_PATH = "/requests"
CONFIG_PATH = "/config/response-status"

ALLOWED_STATUSES = (200, 400, 503)
DEFAULT_STATUS = 200
STATUS_ENV = "WEBHOOK_STUB_RESPONSE_STATUS"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8090

REQUIRED_FIELDS = ("alertId", "eventId", "machineId", "ruleName", "severity", "triggeredAt")
RULE_NAMES = ("ERROR_CRITICAL", "WARN_BURST")
SEVERITIES = ("INFO", "WARN", "ERROR", "CRITICAL")
MAX_BODY_BYTES = 64 * 1024
HISTORY_LIMIT = 200

ISO_DATETIME = re.compile(
    r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$"
)


def parse_datetime(value):
    match = ISO_DATETIME.match(value)
    if not match:
        return None
    base, fraction, offset = match.groups()
    # .NET serializuje do 7 cyfr ułamka sekundy, datetime przyjmuje maksymalnie 6.
    text = base + ("." + fraction[:6].ljust(6, "0") if fraction else "")
    text += "+00:00" if offset == "Z" else offset
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def validate_payload(payload):
    if not isinstance(payload, dict):
        return ["payload musi być obiektem JSON"]

    errors = []
    for field in REQUIRED_FIELDS:
        if field not in payload:
            errors.append("brak wymaganego pola: " + field)
        elif not isinstance(payload[field], str) or not payload[field].strip():
            errors.append("pole musi być niepustym tekstem: " + field)

    for field in sorted(set(payload) - set(REQUIRED_FIELDS)):
        errors.append("nieznane pole: " + field)

    if isinstance(payload.get("ruleName"), str) and payload["ruleName"] and payload["ruleName"] not in RULE_NAMES:
        errors.append("niedozwolona wartość ruleName: " + payload["ruleName"])
    if isinstance(payload.get("severity"), str) and payload["severity"] and payload["severity"] not in SEVERITIES:
        errors.append("niedozwolona wartość severity: " + payload["severity"])
    if isinstance(payload.get("triggeredAt"), str) and payload["triggeredAt"]:
        if parse_datetime(payload["triggeredAt"]) is None:
            errors.append("triggeredAt musi być datą ISO 8601 ze strefą czasową")
    return errors


def parse_status(value):
    try:
        status = int(str(value).strip())
    except ValueError:
        raise ValueError("kod odpowiedzi musi być liczbą: %r" % (value,)) from None
    if status not in ALLOWED_STATUSES:
        allowed = ", ".join(str(code) for code in ALLOWED_STATUSES)
        raise ValueError("dozwolone kody odpowiedzi: %s (podano %s)" % (allowed, status))
    return status


class StubState:
    def __init__(self, response_status=DEFAULT_STATUS, log_stream=None):
        self._lock = threading.Lock()
        self._response_status = parse_status(response_status)
        self._received = deque(maxlen=HISTORY_LIMIT)
        self.log_stream = log_stream if log_stream is not None else sys.stdout

    @property
    def response_status(self):
        with self._lock:
            return self._response_status

    @response_status.setter
    def response_status(self, value):
        status = parse_status(value)
        with self._lock:
            self._response_status = status

    def record(self, entry):
        with self._lock:
            self._received.append(entry)
            self.log_stream.write(json.dumps(entry, ensure_ascii=False) + "\n")
            self.log_stream.flush()

    def received(self):
        with self._lock:
            return list(self._received)

    def clear(self):
        with self._lock:
            self._received.clear()


class WebhookStubHandler(BaseHTTPRequestHandler):
    server_version = "WebhookStub/1.0"
    sys_version = ""

    @property
    def state(self):
        return self.server.state

    @property
    def path_only(self):
        return urlsplit(self.path).path

    def log_message(self, format, *args):
        pass

    def send_json(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_body(self):
        if "chunked" in self.headers.get("Transfer-Encoding", "").lower():
            return self.read_chunked_body()
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return None, "nieprawidłowy nagłówek Content-Length"
        if length < 0:
            return None, "nieprawidłowy nagłówek Content-Length"
        if length > MAX_BODY_BYTES:
            return None, "payload przekracza %d bajtów" % MAX_BODY_BYTES
        return self.rfile.read(length), None

    # HttpClient w .NET (PostAsJsonAsync) wysyła body bez Content-Length, w kawałkach.
    def read_chunked_body(self):
        body = bytearray()
        while True:
            size_line = self.rfile.readline(1024)
            try:
                size = int(size_line.split(b";", 1)[0].strip(), 16)
            except ValueError:
                self.close_connection = True
                return None, "nieprawidłowe kodowanie chunked"
            if size == 0:
                while self.rfile.readline(1024) not in (b"\r\n", b"\n", b""):
                    pass
                return bytes(body), None
            if len(body) + size > MAX_BODY_BYTES:
                self.close_connection = True
                return None, "payload przekracza %d bajtów" % MAX_BODY_BYTES
            body += self.rfile.read(size)
            self.rfile.readline(1024)

    def do_GET(self):
        if self.path_only == HEALTH_PATH:
            self.send_json(200, {"status": "ok"})
        elif self.path_only == REQUESTS_PATH:
            self.send_json(200, {"requests": self.state.received()})
        else:
            self.send_json(404, {"error": "nie znaleziono"})

    def do_DELETE(self):
        if self.path_only == REQUESTS_PATH:
            self.state.clear()
            self.send_json(200, {"cleared": True})
        else:
            self.send_json(404, {"error": "nie znaleziono"})

    def do_PUT(self):
        if self.path_only != CONFIG_PATH:
            self.send_json(404, {"error": "nie znaleziono"})
            return
        body, error = self.read_body()
        if error:
            self.send_json(413 if "przekracza" in error else 400, {"error": error})
            return
        try:
            data = json.loads(body.decode("utf-8"))
            self.state.response_status = data["status"]
        except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            self.send_json(400, {"error": "oczekiwano {\"status\": 200|400|503}: %s" % exc})
            return
        self.send_json(200, {"status": self.state.response_status})

    def do_POST(self):
        if self.path_only != WEBHOOK_PATH:
            self.send_json(404, {"error": "nie znaleziono"})
            return

        body, error = self.read_body()
        if error:
            status = 413 if "przekracza" in error else 400
            self.state.record(self.log_entry(status, None, [error]))
            self.send_json(status, {"accepted": False, "errors": [error]})
            return

        try:
            payload = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            payload, errors = None, ["treść żądania nie jest poprawnym JSON w UTF-8"]
        else:
            errors = validate_payload(payload)

        status = 400 if errors else self.state.response_status
        self.state.record(self.log_entry(status, payload, errors))
        response = {"accepted": status == 200}
        if errors:
            response["errors"] = errors
        self.send_json(status, response)

    def log_entry(self, status, payload, errors):
        return {
            "receivedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "method": self.command,
            "path": self.path_only,
            "responseStatus": status,
            "valid": not errors,
            "errors": errors,
            "payload": payload,
        }


def create_server(host, port, state):
    server = ThreadingHTTPServer((host, port), WebhookStubHandler)
    server.daemon_threads = True
    server.state = state
    return server


def build_parser():
    parser = argparse.ArgumentParser(
        description="Lokalny odbiornik webhooków alertów (POST %s)." % WEBHOOK_PATH
    )
    parser.add_argument("--host", default=DEFAULT_HOST, help="adres nasłuchu (domyślnie %(default)s)")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="port nasłuchu (domyślnie %(default)s)")
    parser.add_argument(
        "--status",
        default=None,
        help="kod odpowiedzi dla poprawnego payloadu: 200, 400 lub 503 "
        "(domyślnie wartość %s lub 200)" % STATUS_ENV,
    )
    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    raw_status = args.status if args.status is not None else os.environ.get(STATUS_ENV, str(DEFAULT_STATUS))
    try:
        state = StubState(raw_status)
    except ValueError as exc:
        parser.error(str(exc))
    if not 0 <= args.port <= 65535:
        parser.error("port musi być z zakresu 0-65535")

    try:
        server = create_server(args.host, args.port, state)
    except OSError as exc:
        print("Nie można uruchomić serwera na %s:%s: %s" % (args.host, args.port, exc.strerror or exc), file=sys.stderr)
        return 1

    host, port = server.server_address[:2]
    print(
        "webhook-stub nasłuchuje na http://%s:%s%s, kod odpowiedzi: %s"
        % (host, port, WEBHOOK_PATH, state.response_status),
        file=sys.stderr,
        flush=True,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
