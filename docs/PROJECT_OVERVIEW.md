# Opis projektu

## Temat

**System monitorowania logów i alertów z maszyn produkcyjnych** — centralny widok zdarzeń z symulowanych maszyn, z filtrowaniem, obsługą statusów i powiadomieniami.

## Problem i cel

Operator powinien mieć jedno miejsce, w którym może sprawdzić zdarzenia pochodzące z kilku maszyn, znaleźć interesujące logi i zobaczyć, które zdarzenia wymagają obsługi. System będzie korzystał z danych syntetycznych, dlatego projekt można uruchomić i zademonstrować bez dostępu do hali produkcyjnej.

## Zakres funkcjonalny

- generowanie zdarzeń dla co najmniej trzech symulowanych maszyn;
- centralny zapis zdarzeń;
- lista zdarzeń, filtry i podgląd szczegółów;
- statusy zdarzeń/alertów i reguły generowania alertów;
- powiadomienia webhook w zakresie określonym w planie;
- lokalne uruchomienie i demonstracja kompletnego przepływu.

Szczegóły techniczne i kryteria odbioru są określone w kartach Trello oraz uzgadnianym kontrakcie. Ten dokument nie zastępuje kart i nie stwierdza, że wymienione funkcje zostały już zaimplementowane.

## Odpowiedzialności

| Osoba | Rola | Główny zakres |
|---|---|---|
| Radosław | PM + DevOps/QA | organizacja pracy, środowisko, generator, testy i automatyzacja w przypisanych zadaniach |
| Viktoriia | Frontend | interfejs dashboardu, filtry i widoki zdarzeń/alertów |
| Natalia | Backend | model danych, API, zapis i reguły alertów |

Zadania powinny pozostać w obrębie przypisanych ról. Współpraca jest wymagana przy uzgadnianiu kontraktów oraz odbiorze przepływu end-to-end, nie oznacza jednak przenoszenia odpowiedzialności za implementację między rolami.

## Harmonogram

| Etap | Termin | Oczekiwany rezultat |
|---|---|---|
| Prezentacja planu | 21.10.2026 | przedstawienie tematu, zakresu, ról i harmonogramu; osobna karta na liście `Kalendarz` |
| M1 | 21.10–04.11.2026 | szkielet i podstawowa architektura |
| M2 | 04.11–18.11.2026 | zbieranie i przegląd zdarzeń oraz obsługa alertów |
| M3 | 18.11–02.12.2026 | jakość, stabilizacja i przygotowanie wydania |

Prezentacja nie jest czwartym milestone'em. Szczegółowy porządek zadań i kryteria zamknięcia znajdują się w Trello.

## Granice

Projekt jest demonstratorem akademickim. Nie zakłada podłączania prawdziwych maszyn ani budowania infrastruktury klasy produkcyjnej. Funkcje opcjonalne nie mogą opóźniać ukończenia podstawowego przepływu.
