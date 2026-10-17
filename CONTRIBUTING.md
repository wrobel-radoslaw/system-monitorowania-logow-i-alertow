# Zasady współpracy

Krótki opis wspólnego workflow w trzyosobowym zespole. Zasady mają ułatwiać integrację prac, nie tworzyć dodatkowej biurokracji.

## Podstawowe reguły

1. Każda zmiana realizuje zakres konkretnej karty Trello i jej kryteria akceptacji (AC).
2. Nie rozszerzamy samodzielnie zakresu zadania ani nie zmieniamy wspólnego kontraktu bez uzgodnienia z osobami, których to dotyczy.
3. Nie umieszczamy w repozytorium haseł, tokenów, kluczy, prywatnych danych ani lokalnych plików `.env`.
4. Nie scalaj zmian bezpośrednio do `main`. Przekazuj je przez Pull Request, aby druga osoba mogła sprawdzić zakres i rezultat.
5. Jeśli zmiana wpływa na sposób uruchamiania, kontrakt albo zachowanie widoczne dla innych modułów, zaktualizuj właściwą dokumentację.

## Gałęzie i commity

Twórz krótką gałąź dla jednego zadania, zaczynając od aktualnego `main`. Stosuj czytelne prefiksy, np.:

- `feat/` — nowa funkcja,
- `fix/` — poprawka błędu,
- `docs/` — dokumentacja,
- `test/` — testy,
- `chore/` — konfiguracja i prace pomocnicze.

Przykładowe commity:

```text
docs: opisz strukturę repozytorium
feat: dodaj filtrowanie zdarzeń
fix: popraw walidację statusu
```

Commit powinien dotyczyć jednej logicznej zmiany. Przed zatwierdzeniem sprawdź `git status` oraz `git diff`.

## Pull Request i przegląd

W opisie PR podaj kartę Trello, krótki zakres zmian, sposób weryfikacji i stan AC. Nie wpisuj testów, których faktycznie nie uruchomiono. Poproś o przegląd inną osobę z zespołu przed scaleniem. Jeżeli przegląd wykryje problem, popraw go w tej samej gałęzi.

Po scaleniu zaktualizuj lokalny `main` przed rozpoczęciem kolejnej pracy. Jeżeli zadanie jest zablokowane przez brak rezultatu z innego obszaru, opisz blokadę w karcie Trello i skontaktuj się z właścicielem zależności.

## Zakres

Nie dodawaj do zadania funkcji, plików ani infrastruktury, których nie wymagają jego AC. Jeżeli potrzebna zmiana wykracza poza kartę, uzgodnij ją i popraw plan przed implementacją.
