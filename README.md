# System monitorowania logów i alertów z maszyn produkcyjnych

Projekt zespołowy realizowany w ramach przedmiotu **Cyfryzacja systemów produkcyjnych**. Demo korzysta z syntetycznych zdarzeń z symulowanych maszyn.

## Zakres i role

- **Radosław, DevOps/QA:** środowisko uruchomieniowe, generator zdarzeń, testy i CI w zakresie przypisanych kart.
- **Viktoriia, Frontend:** dashboard i obsługa widoków.
- **Natalia, Backend:** API, zapis danych i reguły alertów.

Wspólny kontrakt API jest utrzymywany pod ścieżką `docs/openapi.yaml`; generator i fixture wykorzystują pola schematu `CreateEventRequest`.

## Wymagania

- Docker Desktop z Docker Compose v2;
- Python 3.12 lub nowszy.

## Lokalna konfiguracja

W katalogu głównym repozytorium utwórz lokalny plik `.env`:

```powershell
Copy-Item .env.example .env
```

`.env.example` zawiera ustawienia wyłącznie do lokalnego developmentu. Zmień `POSTGRES_PASSWORD` w lokalnym `.env`, nie używaj tych wartości na produkcji i nie commituj `.env`.

### Porty i połączenia

- PostgreSQL słucha wewnątrz sieci Compose na `db:5432`. Port hosta jest przydzielany z zakresu `POSTGRES_PORT` (domyślnie `5432-5500`) i publikowany wyłącznie na `127.0.0.1`.
- API słucha wewnątrz Compose na `api:8080`. Port hosta określa `API_PORT` (domyślnie `5136`) i również jest publikowany wyłącznie na `127.0.0.1`.
- API łączy się z PostgreSQL przez nazwę serwisu `db`, a nie przez `localhost`.
- Frontend działa w kontenerze Nginx na porcie `80` i przekazuje żądania `/api/` do `api:8080`. Port hosta określa `FRONTEND_PORT` (domyślnie `5173`), publikowany lokalnie na `127.0.0.1`.
- Stub webhooków słucha wewnątrz Compose na `webhook-stub:8080`. API wysyła do niego alerty pod adres `http://webhook-stub:8080/webhook` (zmienna `Webhook__Url`). Port hosta określa `WEBHOOK_STUB_PORT` (domyślnie `8090`), publikowany wyłącznie na `127.0.0.1`.

Rzeczywiste porty hosta można sprawdzić poleceniami:

```powershell
docker compose port db 5432
docker compose port api 8080
docker compose port webhook-stub 8080
```

Zmienne `POSTGRES_DB`, `POSTGRES_USER` i `POSTGRES_PASSWORD` są współdzielone przez kontener bazy i konfigurację connection stringa API. Hasło nie jest wpisane na stałe w obrazie ani w plikach Compose.

## Uruchamianie Docker Compose

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

Compose uruchamia PostgreSQL, API, frontend i stub webhooków. API rozpoczyna start po osiągnięciu stanu `healthy` przez bazę, a frontend po osiągnięciu stanu `healthy` przez API. API celowo nie czeka na stub webhooków: gdy stub jest niedostępny, zdarzenie i alert są zapisywane, a dostawa webhooka dostaje status `FAILED`. Healthcheck PostgreSQL używa `pg_isready`; healthcheck API wykonuje rzeczywiste żądanie `GET /api/health` na porcie kontenera `8080`.

Stan i logi usług:

```powershell
docker compose ps
docker compose logs -f db api
```

API zwraca `200` z informacją o połączeniu z bazą, gdy PostgreSQL jest dostępny. Gdy baza jest niedostępna, `GET /api/health` zwraca `503` i kontener API przechodzi w stan `unhealthy`. Po przywróceniu bazy endpoint ponownie powinien zwracać `200`.

Test endpointu z hosta:

```powershell
Invoke-RestMethod http://localhost:5136/api/health
```

Jeżeli `API_PORT` ma inną wartość, użyj jej zamiast `5136`.

### Zatrzymywanie

Zatrzymanie i usunięcie kontenerów bez kasowania danych PostgreSQL:

```powershell
docker compose down
```

Usunięcie również wolumenu i danych bazy:

```powershell
docker compose down -v
```

`down -v` trwale usuwa lokalny wolumen `csp_postgres_data`. Używaj go wyłącznie wtedy, gdy dane mają zostać skasowane.

### Zakres usług

W aktualnym repozytorium dostępne są cztery usługi: PostgreSQL (`db`), backend (`api`), aplikacja webowa (`frontend`) oraz lokalny odbiornik webhooków (`webhook-stub`). Generator zdarzeń (`event-generator`) jest w profilu `generator` i uruchamia się tylko na żądanie.

## Generator zdarzeń

Generator używa wyłącznie biblioteki standardowej Pythona. Domyślnie działa offline i zapisuje JSON na stdout lub do pliku; z flagą `--send` wysyła zdarzenia do `POST {API_URL}/api/events`.

```powershell
python tools/event-generator/generate_events.py --count 20
python tools/event-generator/generate_events.py --count 100 --seed 1 --output events.json
python tools/event-generator/generate_events.py --help
```

`--count` ustawia liczbę zdarzeń, `--seed` zapewnia powtarzalne dane, `--start` ustawia początkowy czas ISO 8601 ze strefą, `--with-event-id` dodaje opcjonalne `eventId`, a `--output` wskazuje plik. Timestampy są zapisywane w UTC z końcówką `Z`. Payload nie zawiera pola `status`.

Przykładowe dane są w `fixtures/events.sample.json`. Generator i fixture używają pól zgodnych ze schematem `CreateEventRequest`: wymagane `machineId`, `timestamp`, `severity`, `code` i `message`; opcjonalne `eventId`. Pole `status` nie należy do żądania tworzenia zdarzenia. Timestampy są zapisywane w UTC z końcówką `Z`.

### Wysyłka do API

Adres API pochodzi z `--api-url`, zmiennej `API_URL` albo domyślnie `http://127.0.0.1:5136`. Każde zdarzenie jest wysyłane osobnym żądaniem; odpowiedzi `2xx` są wypisywane na stdout, a błędy HTTP na stderr z kodem odpowiedzi i komunikatem `ProblemDetails` (bez nagłówków i danych logowania z adresu).

```powershell
$env:API_URL = "http://127.0.0.1:5136"
python tools/event-generator/generate_events.py --send --count 20 --interval 1
python tools/event-generator/generate_events.py --send --forever --interval 5
python tools/event-generator/generate_events.py --send --scenario critical-once
```

- Tryb zwykły (`--scenario random`) losuje zdarzenia z co najmniej 3 maszyn i wszystkich poziomów `severity`; przy wysyłce bez `--start` timestamp to bieżący czas UTC.
- `--interval` ustawia odstęp w sekundach, `--count` liczbę zdarzeń, a `--forever` wysyła bez limitu do przerwania (Ctrl+C).
- `critical-once` wysyła dokładnie jedno kontrolowane zdarzenie `CRITICAL` (domyślnie dla `press-01`, zmiana przez `--machine`).
- Adres API nie może zawierać danych logowania (`user:pass@`); taki adres jest odrzucany z kodem `2`.
- Kod wyjścia: `0` gdy wszystkie zdarzenia przyjęto, `1` gdy wystąpił błąd HTTP, `2` przy złych argumentach, `3` gdy nie ma połączenia z API.

### Scenariusze do wczesnego ostrzegania

Scenariusze `normal`, `warn-spike` i `gradual-degradation` generują zdarzenia dla wszystkich czterech maszyn w pełnych oknach 60 s. Ten sam `--seed` i `--start` daje identyczną sekwencję, a sam `--seed` przy innym `--start` daje te same czasy względne (inne `eventId`).

- `normal` - tylko normalna praca (`INFO` i pojedyncze `WARN`).
- `warn-spike` - normalna praca z jednym krótkim pikiem `WARN` w jednym oknie, bez `ERROR`.
- `gradual-degradation` - co najmniej 5 pełnych okien normalnej pracy (`--baseline-windows`, domyślnie 6), potem liczba `WARN` z jednym kodem (`--warn-code`) rośnie w kolejnych oknach (`--degradation-windows`, od 4 do 20, domyślnie 5; minimum 4 gwarantuje otwarcie epizodu wczesnego ostrzegania przed `ERROR`), a na końcu pojawia się jedno `ERROR`.

`--ground-truth` zapisuje osobny plik JSON z seedem, scenariuszem i parametrami, maszyną, kodem `WARN`, początkiem degradacji oraz czasem i `eventId` pierwszego `ERROR`. Ground truth nigdy nie trafia do payloadów API.

```powershell
python tools/event-generator/generate_events.py --scenario gradual-degradation --seed 7 --output events.json --ground-truth ground-truth.json
python tools/event-generator/generate_events.py --send --scenario gradual-degradation --seed 7 --start 2026-11-17T08:00:00Z --ground-truth ground-truth.json
```

Ponowne wysłanie tego samego scenariusza z tym samym `--seed` i `--start` daje te same `eventId`, więc API odpowie `409`; do kolejnego przebiegu użyj innego `--start`.

### Generator w Docker Compose

Usługa `event-generator` jest w profilu `generator`, nie publikuje portów i wysyła zdarzenia do `http://api:8080` w sieci Compose po osiągnięciu stanu `healthy` przez API. Bez argumentów wysyła losowe zdarzenia co 5 sekund do przerwania.

```powershell
docker compose --profile generator run --rm event-generator --send --scenario critical-once
docker compose --profile generator run --rm event-generator --send --count 10 --interval 1
docker compose --profile generator run --rm event-generator --send --scenario gradual-degradation --seed 7 --start 2026-11-17T08:00:00Z
```

## Stub odbiornika webhooków

`tools/webhook-stub/webhook_stub.py` to lokalny odbiornik alertów napisany wyłącznie w bibliotece standardowej Pythona. Przyjmuje `POST /webhook` z payloadem `WebhookPayload` z `docs/openapi.yaml`, sprawdza wymagane pola, brak dodatkowych pól, wartości `ruleName` i `severity` oraz format `triggeredAt`, a każde żądanie zapisuje jako jedną linię JSON na stdout. Nie nawiązuje połączeń wychodzących.

- Poprawny payload dostaje kod ustawiony w `WEBHOOK_STUB_RESPONSE_STATUS` (`200`, `400` lub `503`, domyślnie `200`).
- Niepoprawny JSON lub payload niezgodny z kontraktem zawsze dostaje `400` z listą błędów.
- `GET /health` zwraca `200` i jest używany przez healthcheck Compose.
- `GET /requests` zwraca ostatnie 200 odebranych żądań, a `DELETE /requests` czyści tę listę.
- `PUT /config/response-status` z treścią `{"status": 503}` zmienia kod odpowiedzi bez restartu kontenera.

Uruchomienie poza Dockerem (domyślnie `127.0.0.1:8090`):

```powershell
python tools/webhook-stub/webhook_stub.py
python tools/webhook-stub/webhook_stub.py --port 8090 --status 503
```

W Compose kod odpowiedzi ustawia się w lokalnym `.env` (np. `WEBHOOK_STUB_RESPONSE_STATUS=503`) i stosuje poleceniem `docker compose up -d webhook-stub`. Podgląd odebranych alertów:

```powershell
docker compose logs -f webhook-stub
Invoke-RestMethod http://localhost:8090/requests
Invoke-RestMethod -Method Put -ContentType application/json -Body '{"status": 503}' http://localhost:8090/config/response-status
```

Jeżeli `WEBHOOK_STUB_PORT` ma inną wartość, użyj jej zamiast `8090`.

## Testy i CI

```powershell
python -m unittest discover -s tests -v
docker compose config --quiet
```

GitHub Actions uruchamia się dla Pull Requestów oraz pushy do `main`. Sprawdza testy generatora i konfigurację Compose. Buduje frontend, gdy istnieją `frontend/package.json` i `frontend/package-lock.json`, oraz backend, gdy znajdzie projekt lub rozwiązanie .NET. Jeśli kodu nie ma, podsumowanie jasno oznacza build jako `SKIPPED`; nie jest to dowód udanego builda.

Workflow nie publikuje obrazów ani nie wdraża aplikacji. Ma tylko uprawnienie `contents: read`, nie wymaga sekretów produkcyjnych, a zewnętrzne akcje są przypięte do pełnych SHA commitów.

## Struktura

- `backend/` - API .NET 10;
- `frontend/` - aplikacja webowa, dodawana w kartach frontendowych;
- `docs/` - dokumentacja projektu i wspólny kontrakt API OpenAPI (`openapi.yaml`);
- `fixtures/` - przykładowe payloady zdarzeń;
- `tools/event-generator/` - generator zdarzeń (offline, wysyłka HTTP i scenariusze);
- `tools/webhook-stub/` - lokalny odbiornik webhooków alertów;
- `tests/` - testy automatyczne.

## Harmonogram

- M1: 21.10–04.11.2026, szkielet i podstawowa architektura;
- M2: 04.11–18.11.2026, zbieranie zdarzeń i obsługa alertów;
- M3: 18.11–02.12.2026, stabilizacja i przygotowanie wydania.
