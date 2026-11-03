# Backend – System monitorowania logów i alertów

Minimalne API REST utworzone w technologii **ASP.NET Core Web API (.NET 10)**. Projekt wykorzystuje **Entity Framework Core** oraz **Npgsql** do komunikacji z bazą danych PostgreSQL.

## 1. Wymagania

Przed uruchomieniem projektu należy zainstalować:

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git (jeśli projekt jest pobierany z repozytorium)

Wymagane jest również uruchomienie usługi PostgreSQL z konfiguracji Docker Compose projektu (M1-DEV).

## 2. Uruchomienie bazy danych

Przejdź do głównego katalogu repozytorium, w którym znajduje się plik `compose.yaml` lub `docker-compose.yml`.

Uruchom usługę PostgreSQL:

```powershell
docker compose up -d db
```

Sprawdź status kontenera:

```powershell
docker compose ps
```

Baza danych powinna mieć status `healthy`.

Sprawdź port udostępniony przez Dockera:

```powershell
docker compose port db 5432
```

Przykładowy wynik:

```text
127.0.0.1:5433
```

## 3. Konfiguracja połączenia z bazą danych

Backend pobiera connection string ze zmiennej środowiskowej:

`ConnectionStrings__DefaultConnection`

Nie należy umieszczać hasła do bazy danych bezpośrednio w kodzie źródłowym ani przesyłać go do repozytorium.

W PowerShell ustaw zmienną środowiskową:

```powershell
$dbPassword = Read-Host "Podaj hasło PostgreSQL"

$connectionString = "Host=127.0.0.1;Port=5433;Database=csp;Username=csp;Pass" +
    "word=$dbPassword"

$env:ConnectionStrings__DefaultConnection = $connectionString
```

Należy zastąpić:

- `5433` – portem zwróconym przez `docker compose port db 5432`,
- `csp` – nazwą bazy danych i użytkownika zgodną z konfiguracją PostgreSQL,
- hasło – hasłem użytkownika PostgreSQL.

**Ważne:** zmienna ustawiona w ten sposób obowiązuje tylko w aktualnym oknie PowerShell. Backend należy uruchamiać w tym samym oknie terminala.

## 4. Tworzenie i aktualizowanie migracji bazy danych

Projekt wykorzystuje Entity Framework Core do zarządzania schematem bazy danych.

Przed utworzeniem migracji należy upewnić się, że:

- kontener PostgreSQL jest uruchomiony,
- zmienna `ConnectionStrings__DefaultConnection` jest ustawiona,
- polecenia są wykonywane w katalogu `backend`.

### Instalacja narzędzia EF Core

Jeśli narzędzie `dotnet-ef` nie jest jeszcze zainstalowane, wykonaj:

```powershell
dotnet tool install --global dotnet-ef
```

Jeżeli narzędzie jest już zainstalowane, można sprawdzić jego wersję:

```powershell
dotnet ef --version
```

W projekcie musi być również dostępny pakiet `Microsoft.EntityFrameworkCore.Design`. Jeśli nie został wcześniej dodany:

```powershell
dotnet add package Microsoft.EntityFrameworkCore.Design
```

### Utworzenie migracji

Przejdź do katalogu `backend`:

```powershell
cd backend
```

Utwórz nową migrację, np. dla encji `Event`:

```powershell
dotnet ef migrations add CreateEvents
```

Migracja opisuje zmiany w strukturze bazy danych wynikające z konfiguracji encji i `AppDbContext`.

Pliki migracji zostaną zapisane w katalogu `Migrations`.

### Zastosowanie migracji

Aby utworzyć lub zaktualizować tabele w bazie PostgreSQL, wykonaj:

```powershell
dotnet ef database update
```

Po poprawnym wykonaniu polecenia tabela `events` powinna być dostępna w bazie danych.

### Przydatne polecenia

Wyświetlenie listy migracji:

```powershell
dotnet ef migrations list
```

Utworzenie kolejnej migracji po zmianie encji:

```powershell
dotnet ef migrations add NazwaMigracji
```

Zastosowanie wszystkich oczekujących migracji:

```powershell
dotnet ef database update
```

**Ważne:** migracji nie należy tworzyć ponownie przy każdym uruchomieniu aplikacji. Nową migrację tworzy się dopiero po zmianie modelu danych lub konfiguracji encji. W przypadku zwykłego uruchamiania projektu wystarczy zastosować istniejące migracje poleceniem `dotnet ef database update`.

## 5. Uruchomienie backendu

Otwórz katalog `backend` (jeśli nie jesteś już w nim):

```powershell
cd backend
```

Przywróć zależności:

```powershell
dotnet restore
```

Zbuduj projekt:

```powershell
dotnet build
```

Uruchom aplikację:

```powershell
dotnet run
```

Przy aktualnej konfiguracji `launchSettings.json` API jest dostępne pod adresem:

```text
http://localhost:5136
```

**Uwaga:** backend należy uruchomić w tej samej sesji PowerShell, w której ustawiono zmienną środowiskową z connection stringiem.

## 6. Sprawdzenie działania API

### Endpoint Health

Otwórz adres:

[http://localhost:5136/api/health](http://localhost:5136/api/health)

Endpoint sprawdza możliwość nawiązania połączenia z PostgreSQL.

Przykładowa odpowiedź przy poprawnym połączeniu:

**HTTP 200 OK**

```json
{
  "status": "healthy",
  "database": "connected"
}
```

W przypadku braku połączenia z bazą:

**HTTP 503 Service Unavailable**

```json
{
  "status": "unhealthy",
  "database": "disconnected"
}
```

### Dokumentacja Swagger

Po uruchomieniu backendu otwórz w przeglądarce:

[http://localhost:5136/swagger](http://localhost:5136/swagger)

Endpointy są podzielone na grupy:

- **Health** – sprawdzanie dostępności API i bazy danych.
- **Events** – tworzenie nowych zdarzeń.

### Testowanie POST /api/events

Przykładowe zapytania testowe znajdują się w katalogu:

```text
backend/
└── examples/
    ├── ...
```

Pliki zawierają przykłady poprawnych i niepoprawnych żądań, które pozwalają sprawdzić działanie walidacji oraz obsługę identyfikatorów zdarzeń.

### Oczekiwane odpowiedzi

| Kod HTTP | Znaczenie | Przypadek testowy |
|---|---|---|
| `201 Created` | Zdarzenie zostało utworzone | Poprawny payload |
| `400 Bad Request` | Niepoprawne żądanie | Brak wymaganego pola, niepoprawny timestamp, pusty eventId lub niedozwolone dodatkowe pole |
| `409 Conflict` | Konflikt identyfikatora | Ponowne wysłanie zdarzenia z istniejącym eventId |

W przypadku poprawnego żądania odpowiedź powinna zawierać utworzony obiekt `EventDto`, w tym:

- `eventId` – identyfikator podany przez klienta lub wygenerowany automatycznie,
- `machineId` – identyfikator urządzenia,
- `timestamp` – czas zdarzenia w formacie UTC,
- `severity` – poziom ważności zdarzenia,
- `code` – kod zdarzenia,
- `message` – opis zdarzenia,
- `status` – zawsze `NEW` dla nowo utworzonego zdarzenia.

## 7. Rozwiązywanie problemów

### Błąd połączenia z PostgreSQL

Jeśli endpoint zwraca `503`, sprawdź kolejno:

1. Czy kontener PostgreSQL działa i ma status `healthy`:

   ```powershell
   docker compose ps
   ```

2. Czy port PostgreSQL jest dostępny:

   ```powershell
   Test-NetConnection 127.0.0.1 -Port 5433
   ```

3. Czy zmienna środowiskowa zawiera prawidłowy adres, port, nazwę bazy, użytkownika i hasło:

   ```powershell
   $env:ConnectionStrings__DefaultConnection -replace ('Pass' + 'word=[^;]*'), ('Pass' + 'word=***')
   ```

### Błąd uwierzytelniania – 28P01

Jeżeli PostgreSQL zwraca:

```text
password authentication failed for user "csp"
```

oznacza to, że hasło podane w connection stringu nie zgadza się z hasłem użytkownika w bazie.

Można ustawić nowe hasło bez usuwania wolumenu i danych:

```powershell
docker compose exec db psql -U csp -d csp
```

Następnie w konsoli PostgreSQL:

```sql
ALTER USER csp WITH PASSWORD 'NOWE_HASLO';
```

Wyjdź z konsoli:

```text
\q
```

Ustaw takie samo hasło w zmiennej środowiskowej backendu.

**Uwaga:** zmiana `POSTGRES_PASSWORD` w pliku `.env` nie zmienia automatycznie hasła użytkownika w już zainicjalizowanej bazie danych. Dane PostgreSQL są przechowywane w wolumenie Dockera.

### Błąd związany z migracjami

Jeśli aplikacja zgłasza problem z brakującą tabelą `events`, sprawdź, czy migracja została zastosowana:

```powershell
dotnet ef migrations list
```

Następnie wykonaj:

```powershell
dotnet ef database update
```

Jeśli polecenie `dotnet ef` nie jest rozpoznawane, sprawdź instalację narzędzia `dotnet-ef`.

## 8. Zatrzymanie usług

Aby zatrzymać kontener PostgreSQL:

```powershell
docker compose stop db
```

Aby ponownie go uruchomić:

```powershell
docker compose start db
```

Zatrzymanie kontenera nie usuwa danych zapisanych w wolumenie.