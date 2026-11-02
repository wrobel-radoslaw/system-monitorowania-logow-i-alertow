# Zasady współpracy

Każda zmiana powinna dotyczyć jednej karty Trello i jej kryteriów akceptacji. Nie zmieniaj wspólnego kontraktu ani zakresu innej osoby bez uzgodnienia.

## Branch, PR, review

1. Utwórz gałąź od aktualnego `main`, np. `feat/nazwa`, `fix/nazwa`, `test/nazwa` albo `chore/nazwa`.
2. Zrób małe commity i wypchnij gałąź.
3. Otwórz Pull Request do `main`. Opisz kartę, zakres i wykonane testy.
4. Poproś o review innej osoby. Nie scalaj zmian bezpośrednio do `main`.

Ochrona `main` wymaga ustawienia w GitHubie i nie jest weryfikowana przez lokalne testy. Włącz wymagany Pull Request, co najmniej jedno zatwierdzenie oraz kontrole `ci / components`, `ci / compose` i `ci / generator`. GitHub może pokazywać nazwę workflow przed nazwą joba, więc wybierz kontrole odpowiadające tym jobom. Joby `frontend` i `backend` pozostaw niewymagane, dopóki ich kod nie istnieje; wtedy są rzeczywiście pomijane, a nie zaliczane jako wykonane buildy. Po dodaniu kodu uruchom CI i dodaj odpowiednie kontrole do ochrony gałęzi.

## Przed PR

Dla generatora i higieny repozytorium:

```powershell
python -m unittest discover -s tests -v
```

Dla konfiguracji Compose po przygotowaniu `.env`:

```powershell
docker compose config --quiet
```

W opisie PR podaj rzeczywiste wyniki. Nie oznaczaj pominiętego builda jako zaliczonego. Sprawdź `git diff` i `git status` przed commitem.

## Konfiguracja lokalna

Nie commituj `.env`, haseł, tokenów ani kluczy. Użyj `.env.example` jako wzoru. Zmienne testowe w CI nie są sekretami produkcyjnymi. Nie wpisuj rzeczywistych danych uwierzytelniających w plikach repozytorium ani logach.
