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

Rzeczywiste porty hosta można sprawdzić poleceniami:

```powershell
docker compose port db 5432
docker compose port api 8080
```

Zmienne `POSTGRES_DB`, `POSTGRES_USER` i `POSTGRES_PASSWORD` są współdzielone przez kontener bazy i konfigurację connection stringa API. Hasło nie jest wpisane na stałe w obrazie ani w plikach Compose.

## Uruchamianie Docker Compose

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

Compose uruchamia PostgreSQL i API. API rozpoczyna start po osiągnięciu stanu `healthy` przez bazę. Healthcheck PostgreSQL używa `pg_isready`; healthcheck API wykonuje rzeczywiste żądanie `GET /api/health` na porcie kontenera `8080`.

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

W aktualnym repozytorium dostępne są serwisy PostgreSQL i API. Serwis frontendowy nie jest dodawany w tej karcie, ponieważ jego implementacja i pliki uruchomieniowe należą do osobnej karty frontendowej. Po dostarczeniu rzeczywistej aplikacji i jej Dockerfile Compose zostanie uzupełniony o frontend; nie jest uruchamiana żadna atrapa.

## Generator zdarzeń

Generator działa offline, używa wyłącznie biblioteki standardowej Pythona i zapisuje JSON na stdout lub do pliku. Nie wysyła żądań HTTP.

```powershell
python tools/event-generator/generate_events.py --count 20
python tools/event-generator/generate_events.py --count 100 --seed 1 --output events.json
python tools/event-generator/generate_events.py --help
```

`--count` ustawia liczbę zdarzeń, `--seed` zapewnia powtarzalne dane, `--start` ustawia początkowy czas ISO 8601 ze strefą, `--with-event-id` dodaje opcjonalne `eventId`, a `--output` wskazuje plik. Timestampy są zapisywane w UTC z końcówką `Z`. Payload nie zawiera pola `status`.

Przykładowe dane są w `fixtures/events.sample.json`. Generator i fixture używają pól zgodnych ze schematem `CreateEventRequest`: wymagane `machineId`, `timestamp`, `severity`, `code` i `message`; opcjonalne `eventId`. Pole `status` nie należy do żądania tworzenia zdarzenia. Timestampy są zapisywane w UTC z końcówką `Z`.

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
- `tools/event-generator/` - generator offline;
- `tools/webhook-stub/` - odbiornik testowy planowany w M2;
- `tests/` - testy automatyczne.

## Harmonogram

- M1: 21.10–04.11.2026, szkielet i podstawowa architektura;
- M2: 04.11–18.11.2026, zbieranie zdarzeń i obsługa alertów;
- M3: 18.11–02.12.2026, stabilizacja i przygotowanie wydania.
