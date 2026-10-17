# System monitorowania logów i alertów z maszyn produkcyjnych

Projekt zespołowy realizowany w ramach przedmiotu **Cyfryzacja systemów produkcyjnych**.

## Cel

Budujemy demonstracyjny system, który zbiera syntetyczne zdarzenia z co najmniej trzech symulowanych maszyn, zapisuje je centralnie i udostępnia operatorowi widok do przeglądania zdarzeń, filtrowania, obsługi statusów oraz sprawdzania alertów i powiadomień. Do demonstracji nie są potrzebne rzeczywiste maszyny przemysłowe.

## Role

- **Radosław - PM + DevOps/QA:** koordynacja pracy, generator zdarzeń, środowisko uruchomieniowe, testy i automatyzacja w przypisanych zadaniach.
- **Viktoriia - Frontend:** dashboard, filtry, szczegóły zdarzeń oraz widoki statusów i alertów.
- **Natalia - Backend:** model danych, REST API, trwały zapis i reguły alertów.

Szczegóły realizacji wynikają z kart Trello. Zmiany podziału zakresu należy uzgodnić w zespole przed rozpoczęciem implementacji.

## Harmonogram

- **Prezentacja planu - 21.10.2026:** zadanie organizacyjne na liście `Kalendarz`; nie jest osobnym milestone'em.
- **M1 - 21.10–04.11.2026:** szkielet i podstawowa architektura.
- **M2 - 04.11–18.11.2026:** zbieranie i przegląd zdarzeń oraz obsługa alertów.
- **M3 - 18.11–02.12.2026:** jakość, stabilizacja i wydanie.

## Stan repozytorium

Repozytorium zawiera konfigurację edytora i Gita, dokumentację startową oraz puste katalogi przeznaczone na przyszłe komponenty. Nie oznacza to, że implementacja tych komponentów już istnieje. Kod aplikacji, kontrakt API, generator, konfiguracja uruchomieniowa i testy będą dodawane w ramach odpowiednich kart Trello.

## Struktura

```text
.
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md
├── backend/                 # Kod backendu dodawany w zadaniach
├── docs/
│   ├── PROJECT_OVERVIEW.md
│   └── REPOSITORY_SETUP.md
├── frontend/                # Kod frontendu dodawany w zadaniach
├── tests/                   # Testy dodawane w przypisanych zadaniach
├── tools/
│   ├── event-generator/     # Generator dodawany w odpowiednim zadaniu
│   └── webhook-stub/        # Odbiornik testowy dodawany w odpowiednim zadaniu
├── .editorconfig
├── .gitattributes
├── .gitignore
├── CONTRIBUTING.md
└── README.md
```

## Pierwsze kroki

1. Przeczytaj `docs/PROJECT_OVERVIEW.md` i `docs/REPOSITORY_SETUP.md`.
2. Zapoznaj się z `CONTRIBUTING.md`.
3. Wybierz przypisaną kartę Trello i pracuj w zakresie jej kryteriów akceptacji (AC).
