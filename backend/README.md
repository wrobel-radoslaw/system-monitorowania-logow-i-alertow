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
- `TWOJE_HASLO` – hasłem użytkownika PostgreSQL.

**Ważne:** zmienna ustawiona w ten sposób obowiązuje tylko w aktualnym oknie PowerShell. Backend należy uruchamiać w tym samym oknie terminala.

## 4. Uruchomienie backendu

Otwórz drugie okno PowerShell lub przejdź do katalogu `backend`:

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

## 5. Sprawdzenie działania API

```text
http://localhost:5136/api/health
```

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

## 6. Rozwiązywanie problemów

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

## 7. Zatrzymanie usług

Aby zatrzymać kontener PostgreSQL:

```powershell
docker compose stop db
```

Aby ponownie go uruchomić:

```powershell
docker compose start db
```

Zatrzymanie kontenera nie usuwa danych zapisanych w wolumenie.