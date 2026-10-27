# System monitorowania logów i alertów z maszyn produkcyjnych

Projekt zespołowy realizowany w ramach przedmiotu **Cyfryzacja systemów produkcyjnych**. Demo korzysta z syntetycznych zdarzeń z symulowanych maszyn.

## Zakres i role

- **Radosław, DevOps/QA:** środowisko uruchomieniowe, generator zdarzeń, testy i CI w zakresie przypisanych kart.
- **Viktoriia, Frontend:** dashboard i obsługa widoków.
- **Natalia, Backend:** API, zapis danych i reguły alertów.

Szczegółowy zakres i kryteria akceptacji są zapisane w Trello. Wspólny kontrakt API musi odpowiadać pracy Natalii i być uzgodniony przed walidacją fixture'ów względem OpenAPI.

## Wymagania

- Docker Desktop z Docker Compose v2;
- Python 3.12 lub nowszy.

## Lokalna konfiguracja

W katalogu głównym repozytorium utwórz lokalny plik `.env`:

```powershell
Copy-Item .env.example .env
```

Docker przydziela wolny port hosta z zakresu zaczynającego się od `5432`; publikacja jest ograniczona do `127.0.0.1`. Rzeczywisty port sprawdzisz poleceniem `docker compose port db 5432`. W `.env` możesz ustawić `POSTGRES_PORT` na pojedynczy port lub inny zakres. Wewnątrz sieci Compose PostgreSQL słucha na porcie `5432`. Nie zatrzymuj innych baz ani kontenerów.

`.env.example` zawiera ustawienia wyłącznie do lokalnego developmentu. Nie używaj tych wartości na produkcji i nie commituj `.env`.

## PostgreSQL

Na obecnym etapie Compose uruchamia bazę danych. Serwisy API i frontend zostaną dodane po dostarczeniu kodu i Dockerfile przez właścicieli tych kart. Nie tworzymy atrap aplikacji, które udają gotową integrację.

```powershell
docker compose config --quiet
docker compose up -d db
docker compose ps
docker compose exec db pg_isready -U csp -d csp
```

Poczekaj, aż stan bazy w `docker compose ps` będzie `healthy`. Healthcheck `pg_isready` potwierdza gotowość serwera do przyjmowania połączeń; nie sprawdza poprawności hasła aplikacji.

Zatrzymanie usług bez usuwania danych:

```powershell
docker compose down
```

Usunięcie również wolumenu i danych bazy:

```powershell
docker compose down -v
```

`down -v` trwale usuwa lokalny wolumen bazy. Używaj go tylko wtedy, gdy chcesz skasować te dane.

Po dostarczeniu kodu API i frontendu do Compose dołączymy oba serwisy. API musi udostępniać `GET /api/health` zwracający 200 przy sprawnym połączeniu z bazą oraz status 503 (lub inny spoza zakresu 2xx), gdy baza jest niedostępna. Kontener API nie będzie oznaczany jako zdrowy, dopóki ten warunek nie zostanie sprawdzony na rzeczywistym obrazie.

## Generator zdarzeń

Generator działa offline, używa wyłącznie biblioteki standardowej Pythona i zapisuje JSON na stdout lub do pliku. Nie wysyła żądań HTTP.

```powershell
python tools/event-generator/generate_events.py --count 20
python tools/event-generator/generate_events.py --count 100 --seed 1 --output events.json
python tools/event-generator/generate_events.py --help
```

`--count` ustawia liczbę zdarzeń, `--seed` zapewnia powtarzalne dane, `--start` ustawia początkowy czas ISO 8601 ze strefą, `--with-event-id` dodaje opcjonalne `eventId`, a `--output` wskazuje plik. Timestampy są zapisywane w UTC z końcówką `Z`. Payload nie zawiera pola `status`.

Przykładowe dane są w `fixtures/events.sample.json`. Fixture pokrywa kryteria karty dotyczące pól, maszyn, severity i czasu. Zgodność z `docs/openapi.yaml` pozostaje niepotwierdzona, dopóki kontrakt nie zostanie dostarczony i zamrożony.

## Testy i CI

```powershell
python -m unittest discover -s tests -v
docker compose config --quiet
```

GitHub Actions uruchamia się dla Pull Requestów oraz pushy do `main`. Sprawdza testy generatora i konfigurację Compose. Buduje frontend, gdy istnieją `frontend/package.json` i `frontend/package-lock.json`, oraz backend, gdy znajdzie projekt lub rozwiązanie .NET. Jeśli kodu nie ma, podsumowanie jasno oznacza build jako `SKIPPED`; nie jest to dowód udanego builda.

Workflow nie publikuje obrazów ani nie wdraża aplikacji. Ma tylko uprawnienie `contents: read`, nie wymaga sekretów produkcyjnych, a zewnętrzne akcje są przypięte do pełnych SHA commitów.

## Struktura

- `backend/` - API, które zostanie dodane w karcie backendowej;
- `frontend/` - aplikacja webowa, która zostanie dodana w kartach frontendowych;
- `docs/` - dokumentacja projektu i, po uzgodnieniu, kontrakt API;
- `fixtures/` - przykładowe payloady zdarzeń;
- `tools/event-generator/` - generator offline;
- `tools/webhook-stub/` - odbiornik testowy planowany w M2;
- `tests/` - testy automatyczne.

## Harmonogram

- M1: 21.10–04.11.2026, szkielet i podstawowa architektura;
- M2: 04.11–18.11.2026, zbieranie zdarzeń i obsługa alertów;
- M3: 18.11–02.12.2026, stabilizacja i przygotowanie wydania.
