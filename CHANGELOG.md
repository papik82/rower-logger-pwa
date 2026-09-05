# Rower Logger PWA — historia wersji

Numer wersji (`APP_VERSION` w `nav.js`, widoczny w stopce i na ekranach
wczytywania danych) rośnie przy każdej zmianie w plikach PWA — patrz
komentarz przy stałej. Ten plik opisuje, co się kryje pod kolejnymi
numerami. Najnowsze na górze.

Wpisy do wersji `.9` (przed 2026-09-01) odtworzone z historii git,
opisowo — powstały zanim zacząłem pracować nad tym repozytorium.
Wpisy od `.10` pochodzą z bieżącej pracy nad projektem.

---

## 2026-08-26.28 — 2026-09-05
Nowy parametr „Dystans 15 min” — najlepszy 15-minutowy odcinek treningu
pod względem przejechanego dystansu (jak „best effort” w aplikacjach
kolarskich).
- `app.js`: `bestDistanceInWindow()` liczy go z próbek bieżącego
  treningu (dwuwskaźnikowo, O(n)) i dopisuje do podsumowania wysyłanego
  do arkusza — dla treningów dłuższych niż 15 minut
- `apps-script.gs`: ta sama logika + jednorazowa funkcja
  `backfillDistance15Min()` do uzupełnienia już zapisanych treningów
  (do uruchomienia ręcznie z edytora Apps Script, bez potrzeby
  ponownego wdrożenia)
- Widoczny jako nowa kolumna w tabeli Wyników i jako nakładany słupek
  (inny kolor) na wykresie dystansu w Analizach

## 2026-08-26.27 — 2026-09-04
Pierwszy wykres w Analizach i wersja na ekranach wczytywania.
- `analiza.js`: wykres słupkowy (canvas, bez zewnętrznej biblioteki) —
  dystans (km) na kolejne treningi, chronologicznie, z przerzedzanymi
  etykietami dat, żeby się nie zlewały przy większej liczbie słupków
- `APP_VERSION` przeniesiony z `app.js` do współdzielonego `nav.js`;
  ekrany „Wczytywanie danych…” w `wyniki.js` i `analiza.js` pokazują
  teraz numer wersji

## 2026-08-26.25 — 2026-09-04
„Ustawienia” jako osobna podstrona.
- Nowa `ustawienia.html` + `ustawienia.js`: formularz (adres Apps
  Script, tętno maksymalne) z przyciskiem Zapisz i komunikatem statusu
  zamiast okienek `prompt()`/`alert()`
- Przycisk „Wymuś aktualizację aplikacji” przeniesiony tu z `index.html`
- Kafelek „Ustawienia” w menu to teraz zwykły link, tak jak pozostałe

## 2026-08-26.24 — 2026-09-04
Stronicowanie w tabeli Wyników — 20 wierszy na stronę, przyciski
poprzednia/następna, pasek widoczny tylko gdy jest więcej niż jedna
strona.

## 2026-08-26.23 — 2026-09-04
Pole „Tętno maksymalne” w Ustawieniach (na razie tylko zapisywane w
`localStorage`, docelowo do wyliczania stref tętna).

## 2026-08-26.22 — 2026-09-02
Naprawione zaokrąglanie liczb w tabeli Wyników (błędy zmiennoprzecinkowe
w rodzaju `29.400000000000002` obcinane do 2 miejsc po przecinku);
poprawiono też źródło problemu w `buildSummary()` dla nowych treningów.

## 2026-08-26.21 — 2026-09-02
Skrócone, dwuwierszowe nagłówki w tabeli Wyników — kolumny nie są już
sztucznie rozciągane przez długi tekst nagłówka z jednostką w nawiasie.

## 2026-08-26.20 — 2026-09-02
Czytelniejszy format daty i czasu w Wynikach — „Data” jako `RRRR-MM-DD`,
naprawione formatowanie „Czasu trwania” (Arkusze czasem same rozpoznają
tekst `HH:MM:SS` jako wartość godzinową i zapisują jako znacznik UTC).

## 2026-08-26.19 — 2026-09-02
Blok Start + przyciski łączenia podzielony na dwie równe kolumny (grid
1fr 1fr) zamiast przycisku Start zajmującego tylko tyle miejsca, ile
potrzebował.

## 2026-08-26.18 — 2026-09-02
Kolumny „Data” i „Start” w Wynikach sformatowane na czytelny czas
lokalny (wcześniej pokazywały surowe znaczniki UTC z Arkuszy).

## 2026-08-26.17 — 2026-09-02
Wyniki pokazują teraz podsumowania sesji (`Trening_Podsumowania`)
zamiast surowych próbek — bez kolumn „ID sesji” i „Koniec”.

## 2026-08-26.16 — 2026-09-02
Przyciski łączenia z rowerem/paskiem pulsu przeniesione obok przycisku
Start (pionowy stos w drugiej kolumnie) — mniej przewijania na głównym
ekranie.

## 2026-08-26.15 — 2026-09-02
Jednolite menu nawigacyjne (ikony: Trening / Analizy / Wyniki /
Ustawienia) wspólne dla wszystkich podstron, plus nowa strona Wyniki
(wtedy jeszcze surowa tabela próbek z `Trening_Szczegoly`).

## 2026-08-26.14 — 2026-09-01
Wydzielony wspólny `styles.css` z dotychczasowego CSS w `index.html`;
szkielet nowej strony `analiza.html`.

## 2026-08-26.13 — 2026-09-01
Puls dodany do wykresu trendu prędkości na żywo — druga linia w innym
kolorze, z własną skalą min/maks.

## 2026-08-26.12 — 2026-09-01
Bloki łączenia z rowerem i paskiem pulsu ustawione obok siebie (zamiast
jeden pod drugim) — mniej miejsca w pionie.

## 2026-08-26.11 — 2026-09-01
Test infrastruktury Claude Code (pierwszy commit i push wykonany przez
Claude Code w tym repozytorium) — bez zmian funkcjonalnych.

## 2026-08-26.10 — 2026-09-01
Rower doczekał się własnego, niezależnego przycisku „Połącz”/„Rozłącz”
(wcześniej łączenie z rowerem było wplecione w Start/Stop treningu).

## 2026-08-26.9 — 2026-09-01
Dodane niezależne połączenie BLE z paskiem pulsu (standardowy Heart
Rate Service) — priorytet nad czujnikiem w uchwytach roweru, automatyczny
powrót do uchwytów po rozłączeniu paska.

## 2026-08-26.8 — 2026-08-26
Maksymalny opór na rowerze podniesiony z 10 do 16 poziomów.

## 2026-08-26.7 — 2026-08-26
Drobna poprawka porządkowa (sam bump wersji, bez innych zmian w
zapisanej historii).

## 2026-08-26.6 — 2026-08-26
Wprowadzony mechanizm `?v=` w adresach `app.js`/`sw.js` — wymusza
pobranie świeżej wersji plików zamiast korzystania z pamięci podręcznej
przeglądarki.

## 2026-08-26.5 — 2026-08-26
## 2026-08-26.4 — 2026-08-26
## 2026-08-26.3 — 2026-08-26
Drobne poprawki porządkowe (same bumpy wersji, bez innych zmian w
zapisanej historii).

## 2026-08-26.2 — 2026-08-26
Domyślny adres wdrożenia Google Apps Script zaszyty na stałe w kodzie
jako fallback — nie trzeba go wpisywać ręcznie po każdym wyczyszczeniu
danych przeglądarki.

## 2026-08-26.1 — 2026-08-26
Pierwsza wersjonowana wersja aplikacji — wprowadzony sam mechanizm
`APP_VERSION` (numer widoczny w stopce) oraz przycisk „Wymuś
aktualizację aplikacji” (czyści cache i service worker, przeładowuje
od zera).

---

## Przed wprowadzeniem numeracji wersji — 25–26 sierpnia 2026
Wczesne prace nad aplikacją, zanim istniał `APP_VERSION`:
- Pierwsza działająca wersja PWA: rejestrowanie treningu przez Web
  Bluetooth (FTMS), zapis próbek do Google Sheets, ikony i manifest
- Poprawka ścieżek do ikon (`icons/icon-192.png` → `icon-192.png`)
- Licznik czasu treningu na żywo, aktualizowany co sekundę niezależnie
  od interwału próbkowania danych z roweru
- Service Worker przestawiony ze strategii "cache-first" na
  "najpierw sieć" — aktualizacje na GitHubie widoczne od razu, bez
  ręcznego czyszczenia pamięci podręcznej
- Mini-wykres (sparkline) prędkości na żywo w trakcie treningu, z osią
  min/maks
- Ręczny opór na rowerze (rower nie ma elektronicznej regulacji) —
  suwak zapisywany do tej samej kolumny „Opór”, którą wcześniej rower
  zawsze raportował jako 0

---

## Jak aktualizować ten plik
Przy każdej zmianie w PWA, obok podbicia `APP_VERSION` w `nav.js` i
`?v=` w plikach HTML, dopisz na górze tej listy nowy wpis: numer
wersji, data, krótki opis zmiany (1–3 punkty).
