# Przygotowanie lokalnego repozytorium

## Wymagania na etapie bazowym

Do pobrania repozytorium i rozpoczęcia pracy z Git potrzebujesz:

- Gita;
- dostępu do prywatnego repozytorium GitHub;
- edytora obsługującego UTF-8 i `.editorconfig` (np. Visual Studio Code, Visual Studio lub JetBrains Rider).

Wersje SDK i polecenia budowania konkretnych komponentów zostaną opisane w odpowiednich zadaniach, gdy szkielet tych komponentów będzie realizowany. Na etapie bazowym nie trzeba inicjalizować .NET, Node.js, Pythona ani Dockera dla aplikacji.

## Pierwsze pobranie

Po wypchnięciu bazowych plików na GitHub sklonuj repozytorium:

```powershell
Set-Location "$env:USERPROFILE\Documents\GitHub"
git clone https://github.com/wrobel-radoslaw/system-monitorowania-logow-i-alertow.git
Set-Location .\system-monitorowania-logow-i-alertow
```

Jeżeli repozytorium zostało już sklonowane, nie klonuj go ponownie. Wejdź do istniejącego katalogu i pobierz aktualne zmiany:

```powershell
git checkout main
git pull origin main
```

## Konfiguracja tożsamości Git

Sprawdź lokalną konfigurację:

```powershell
git config user.name
git config user.email
```

Jeżeli brakuje danych, skonfiguruj je dla tego repozytorium:

```powershell
git config user.name "Imię Nazwisko"
git config user.email "adres-powiązany-z-kontem@example.com"
```

Użyj własnych danych. Nie zapisuj tokenów ani haseł w plikach projektu.

## Rozpoczęcie zadania

```powershell
git checkout main
git pull origin main
git checkout -b feat/krotki-opis-zadania
git status
```

Nazwij gałąź zgodnie z zasadami w `CONTRIBUTING.md`. Po zakończeniu sprawdź `git status` i `git diff`, a następnie przygotuj Pull Request powiązany z kartą Trello.

## Katalogi komponentów

`backend/`, `frontend/`, `tools/event-generator/`, `tools/webhook-stub/` i `tests/` są obecnie pustymi katalogami z plikami `.gitkeep`. Zawartość zostanie dodana w ramach przypisanych kart. Nie oznacza to istnienia kodu ani gotowego środowiska uruchomieniowego.
