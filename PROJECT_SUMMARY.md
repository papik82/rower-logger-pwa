# Rower Logger PWA — podsumowanie projektu i instrukcja startowa

Dokument dla nowego asystenta (model AI lub człowiek), który przejmuje
projekt. Opisuje: co to jest, jak działa, jak jest zbudowane, jakie są
konwencje i pułapki, w jakim stanie jest projekt i co dalej. Stan na
**wersję 1.23 (2026-09-20)**, ostatni commit `036e2e5` w gałęzi `main`.

Szczegółowa historia zmian: `CHANGELOG.md`. Backlog: `TODO.md`. Ten plik
jest przeglądem — po szczegóły sięgaj do kodu i tych dwóch plików.

---

## 0. Gotowy prompt startowy (do wklejenia w nowej rozmowie)

> Przejmujesz projekt „Rower Logger PWA” (repozytorium
> `papik82/rower-logger-pwa`, katalog roboczy
> `D:\Repozytorium\BikeLogger\rower-logger-pwa`). Najpierw przeczytaj
> `PROJECT_SUMMARY.md`, potem `TODO.md` i nagłówki `CHANGELOG.md`.
> Pracujemy po polsku, iteracyjnie, funkcja po funkcji: ja opisuję
> zmianę, Ty ją implementujesz, sprawdzasz w przeglądarce (mobilny
> widok 375/320 px), dopisujesz wpis do `CHANGELOG.md`, podbijasz wersję
> (`APP_VERSION` w `nav.js` i `?v=` w plikach HTML), commitujesz i
> pushujesz — commit i push robisz, gdy o to poproszę lub gdy wynika to
> z naszego zwyczaju („wypchnij”). Nie zapisuj testowych danych do mojego
> prawdziwego arkusza. Komentarze w kodzie piszemy po polsku i w stylu
> otoczenia. Zanim zaczniesz, streść mi w kilku zdaniach, co zrozumiałeś.

---

## 1. Czym jest projekt

Aplikacja **PWA** (Progressive Web App, czysty HTML/CSS/JavaScript, bez
frameworków i bez bibliotek zewnętrznych) do rejestrowania treningów na
rowerku stacjonarnym **Hop-Sport HS-3030X**:

- łączy się z rowerem przez **Web Bluetooth** (profil FTMS — Fitness
  Machine Service, charakterystyka Indoor Bike Data),
- opcjonalnie łączy się z **paskiem pulsu BLE** (standardowy Heart Rate
  Service), który ma priorytet nad czujnikiem w uchwytach roweru,
- co 5 sekund zapisuje próbkę, a po Stop — podsumowanie sesji do
  **Google Sheets** przez **Google Apps Script** (Web App),
- pokazuje dane na żywo (kafle, wykresy, czas w strefach tętna),
- ma strony do przeglądania historii (Wyniki) i analiz (Analizy:
  trendy, rekordy, strefy tętna).

Użytkownik jest jedynym użytkownikiem; aplikacja działa głównie na
telefonie z Androidem (Chrome), zainstalowana jako PWA. Analizy i Wyniki
działają też w zwykłej przeglądarce desktopowej (nie wymagają Bluetooth).

Repozytorium ma też siostrzany katalog `../rower-logger-desktop`
(starsza wersja w Pythonie, GUI + terminal, zapis przez konto usługi
Google). **Jest zamrożony na rzecz PWA** — nie rozwijamy go. Uwaga: leży
tam `credentials.json` (klucz konta usługi) — nigdy go nie commituj, nie
wklejaj, nie wysyłaj nigdzie.

---

## 2. Środowisko i zasady pracy

- System: Windows 10, powłoka PowerShell / Git Bash. Repo git jest w
  `rower-logger-pwa` (katalog nadrzędny `BikeLogger` nie jest repozytorium).
- Remote: `https://github.com/papik82/rower-logger-pwa`, gałąź `main`,
  ~67 commitów. Aplikacja jest serwowana statycznie z repozytorium
  na GitHubie (komentarze w kodzie mówią o „aktualizacjach na GitHubie”;
  dokładna konfiguracja hostingu nie jest udokumentowana w repo —
  zapytaj użytkownika, jeśli będzie potrzebna). Line endings: git zamienia LF→CRLF (ostrzeżenia `LF will be
  replaced by CRLF` są normalne).
- Podgląd lokalny: `python -m http.server 8420 --directory
  rower-logger-pwa`, skonfigurowany w `D:\Repozytorium\BikeLogger\.claude\launch.json`
  jako `rower-logger-pwa` (port 8420). Weryfikacja UI w przeglądarce
  (emulacja 375×812 i 320 px), pomiary przez DOM, bo zrzuty ekranu bywają
  nieaktualne.
- Język: interfejs, komentarze, changelog i rozmowa — **po polsku**.
- Pracujemy **jedna funkcja na raz**. Po każdej: test w przeglądarce →
  wpis w `CHANGELOG.md` → podbicie wersji → commit → push. Użytkownik
  często prosi o „zaproponuj zanim wdrożysz” przy większych pomysłach —
  wtedy najpierw propozycja (czasem z pytaniem o wariant), dopiero po
  akceptacji implementacja.
- Użytkownik zdecydował, że nowe zmiany dokumentujemy **tylko w
  `CHANGELOG.md`**; `TODO.md` aktualizujemy tylko przy zmianach backlogu
  (obecnie brak wpisów o wersjach 1.21–1.23 w TODO — to zamierzone).
- Konwencja commitów: krótki tytuł `vX.Y: opis` (bez polskich znaków w
  tytule, co dotąd wychodziło z PowerShell/Git Bash), pusta linia, lista
  punktów, na końcu linia `Co-Authored-By: …` zgodnie z bieżącymi
  wytycznymi środowiska.
- Bezpieczeństwo: aplikacja nigdy nie ma dostępu do kluczy Google —
  autoryzacja jest po stronie Apps Script. Nie zapisuj testów do prawdziwego
  arkusza; do testów służy tryb „Trening testowy” (Ustawienia) albo
  podmiana `CONFIG.APPS_SCRIPT_URL` / cache w przeglądarce.

### Wersjonowanie

- `APP_VERSION` w `nav.js` (format `MAJOR.MINOR`, od 1.0; wcześniej
  data-numer, np. `2026-08-26.36`). Każda zmiana w plikach PWA podbija
  MINOR (aktualnie **1.23**).
- Ten sam numer wpisany ręcznie w `?v=` w adresach plików w czterech
  stronach HTML (`index.html`, `analiza.html`, `wyniki.html`,
  `ustawienia.html`) oraz w rejestracji service workera w `index.html`
  (`sw.js?v=…`). Wygodne: `sed -i 's/1\.22/1.23/g' nav.js *.html`.
- Numer widać w stopce i na ekranach wczytywania — po to, by od razu
  było wiadomo, czy telefon pobrał nową wersję.
- `sw.js` ma własną stałą `CACHE_NAME` (`rower-logger-v21`), której na
  co dzień nie ruszamy: service worker działa w trybie „najpierw sieć”
  (`cache: "no-store"`), więc aktualizacje z GitHuba są widoczne od razu.
  W ustawieniach jest przycisk „Wymuś aktualizację aplikacji” (czyści
  service workery i cache).

---

## 3. Struktura plików

| Plik | Rola |
|---|---|
| `index.html`, `app.js` | Strona **Trening**: Bluetooth, nagrywanie, kafle live, wykresy, strefy, podsumowanie |
| `analiza.html`, `analiza.js` | Strona **Analizy**: trendy (słupki), rekordy, czas w strefach |
| `wyniki.html`, `wyniki.js` | Strona **Wyniki**: tabela podsumowań z sortowaniem i stronicowaniem |
| `ustawienia.html`, `ustawienia.js` | Strona **Ustawienia**: adres Apps Script, tętno max/spoczynkowe, strefy, próg pokrycia pulsu, tryb testowy |
| `nav.js` | Wspólny kod stron: `APP_VERSION`, menu aktywne, adres Apps Script, cache danych, strefy tętna, pomocnicze formatery |
| `styles.css` | Jeden wspólny arkusz stylów (ciemny motyw, karty, siatki, tabela, wykresy) |
| `apps-script.gs` | Kod do wklejenia w Apps Script arkusza (kopia w repo; **nie jest hostowany**) |
| `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | PWA: service worker, manifest, ikony |
| `CHANGELOG.md` | Historia wersji (najnowsze na górze) |
| `TODO.md` | Roadmapa i backlog |
| `PROJECT_SUMMARY.md` | Ten plik |

Uwaga: w komentarzach kilku plików jest odwołanie do `DEPLOY.md` —
takiego pliku **nie ma** w repozytorium (instrukcja wdrożenia Apps Script
jest w tym dokumencie, sekcja 5).

---

## 4. Model danych (Google Sheets)

Arkusz Google „Rower - Dziennik Treningów” ma dwie zakładki (nazwy w
stałych `DETAIL_SHEET_NAME`, `SUMMARY_SHEET_NAME` w `apps-script.gs`):

### `Trening_Szczegoly` — próbki (co 5 s)

`doPost` dopisuje wiersz **pozycyjnie** (`appendRow`), w kolejności z
`DETAIL_HEADERS_ORDER` w `app.js`: ID sesji, znacznik czasu ISO,
czas od startu (s), prędkość (km/h), kadencja (obr/min), dystans (m),
opór (poziom 1–16), moc (W), puls (bpm), energia całkowita (kcal),
energia/h, energia/min. Analizy czytają wybrane kolumny **po nazwie
nagłówka**, m.in.: `ID sesji`, `Czas od startu (s)`, `Prędkość (km/h)`,
`Puls (bpm)`, `Dystans (m)` (dokładne nagłówki weryfikuj w arkuszu i w
`analiza.js`/`apps-script.gs`).

### `Trening_Podsumowania` — jedna linia na trening (19 kolumn)

Kolejność (i nagłówki) w arkuszu:
`ID sesji`, `Data`, `Start`, `Koniec`, `Czas trwania (HH:MM:SS)`,
`Dystans całkowity (m)`, `Śr. prędkość (km/h)`, `Maks. prędkość (km/h)`,
`Śr. kadencja (obr/min)`, `Maks. kadencja (obr/min)`, `Śr. moc (W)`,
`Maks. moc (W)`, `Śr. opór`, `Śr. puls (bpm)`, `Maks. puls (bpm)`,
`Kalorie łącznie (kcal)`, `Dystans 15 min (m)`, `Dystans 5 min (m)`,
`Dystans 30 min (m)`.

Kolumny najlepszych odcinków w arkuszu są w kolejności **15, 5, 30**
(15 min była pierwsza, potem doszły 5 i 30) — Wyniki wyświetlają je
5/15/30.

### Zasady zapisu i odczytu

- `doPost` przyjmuje JSON `{type: "sample"|"summary", row: [...]}`
  wysłany jako `text/plain` (unika preflight CORS). Komórki bez
  nagłówka są ignorowane przez `doGet`, dopóki nagłówek nie powstanie.
- `doGet` zwraca `{ok, detail: [...], summary: [...]}` — wiersze jako
  obiekty z kluczami z pierwszego wiersza arkusza.
- `ID sesji` = `YYYYMMDDHHMMSS` z czasu **UTC** (stąd różnica względem
  lokalnego `Start`). Arkusz Google potrafi zapisać komórkę daty/godziny
  jako znacznik ISO UTC; Wyniki formatują to do `Europe/Warsaw`
  (`formatDate`/`formatTime`/`formatDuration` w `wyniki.js`).
- Podsumowanie liczone jest z historii **przyciętej na brzegach**
  (`trimIdleEdges`: pomija próbki z prędkością ≤ 0,5 km/h na początku i
  końcu), przez co np. „Czas trwania” bywa krótszy niż `Koniec−Start`.
- **Średni puls** i maks. puls liczone są tylko z odczytów > 0 (rower
  oddaje 0 bez czujnika; wliczone zaniżałyby średnią).
- Historyczna osobliwość: pierwszy wiersz (2026-08-25) ma czas trwania
  `00:16:61` (błąd formatowania z wczesnej wersji) — dane historyczne,
  nie ruszamy.
- Pusta komórka w kolumnach „Dystans N min” = trening krótszy niż okno.

---

## 5. Apps Script — wdrożenie i utrzymanie

1. Arkusz → Rozszerzenia → Apps Script. Wklej **całą** zawartość
   `apps-script.gs` do **jednego** pliku projektu (zamień zawartość, nie
   dodawaj drugiego pliku — inaczej błąd `Identifier
   'DETAIL_SHEET_NAME' has already been declared`).
2. Wdróż jako aplikację internetową (Web App): wykonuj jako „ja”, dostęp
   „każdy”. Adres wdrożenia (`…/exec`) jest wpisany jako
   `APPS_SCRIPT_URL_DEFAULT` w `nav.js` i można go nadpisać w
   Ustawieniach (`rowerLoggerAppsScriptUrl` w localStorage).
3. Zmiany w `doPost/doGet` wymagają **nowego wdrożenia** (nowa wersja).
   Funkcje pomocnicze uruchamiane ręcznie z edytora (poniżej) — nie.

Funkcje w `apps-script.gs`:

- `doPost`, `doGet`, `sheetToObjects`, `jsonResponse` — obsługa PWA.
- `bestDistanceInWindow(samples, windowSeconds)` — kopia algorytmu z
  `app.js` (dwa wskaźniki; zwraca `null`, gdy zakres próbek krótszy niż
  okno). **Dwie kopie muszą być spójne.**
- Jednorazowe migracje (uruchamiane ręcznie, bez nowego wdrożenia,
  idempotentne, z osobną funkcją podglądu):
  - `previewBestEffortsBackfill` / `backfillBestEfforts` — dopisuje
    nagłówki „Dystans 5/30 min (m)” i liczy 5/15/30 min dla archiwum z
    próbek. **Wykonane** przez użytkownika (25 treningów); 30 min puste,
    bo nie było jeszcze treningu ≥ 30 min. Drugi podgląd po backfillu
    zgłosił użytkownikowi błąd, ale arkusz był poprawny; nie
    diagnozowaliśmy go dalej (treść błędu nie została podana).
  - `previewAvgHrBackfill` / `backfillAvgHr` — poprawa średniego pulsu
    (bez zer). **Wykonane.**
  - `backfillDistance15Min` — starsza migracja tylko dla 15 min
    (zastąpiona przez `backfillBestEfforts`).
  - `patchCallGapSession_20260911` — jednorazowa łatka po przerwie w
    zapisie z 2026-09-11 (rozmowa telefoniczna wyciszyła aplikację w
    tle).

---

## 6. Architektura aplikacji

Brak bundlera i frameworków. Każda strona ładuje `nav.js` (wspólne) i
własny skrypt. Wszystko w `"use strict"`, globalne funkcje i `let`.
Wykresy rysowane ręcznie na `<canvas>` (`sparkline` w `app.js`,
`drawTrendChart` w `analiza.js`), bez bibliotek.

### `nav.js` — wspólne

- `APP_VERSION`, `getAppsScriptUrl()`.
- Cache danych z Apps Script: `fetchAppsScriptData(forceRefresh)`,
  `getCachedAppsScriptData`, `setCachedAppsScriptData`,
  `clearAppsScriptDataCache` — sessionStorage `rowerLoggerDataCache`,
  TTL 5 minut; Wyniki i Analizy dzielą ten cache; przycisk odświeżania w
  nagłówku wymusza pobranie. `spinRefreshButton()` — animacja ikony.
- Strefy tętna: `HR_ZONE_DEFS` (5 stref, % HRmax: 50–60, 60–70, 70–80,
  80–90, 90–100; kolory `#4C8BF5, #2FD9C4, #F5C542, #FF9F43, #FF5C5C`),
  `computeHrZones(maxHr, restingHr)` (z tętnem spoczynkowym — metoda
  Karvonena/rezerwa tętna; granice styka­ją się bez luk), `hrZoneIndex`
  (0 = poniżej strefy 1, 1–5, powyżej max → 5), `ZONE_BELOW_COLOR/LABEL`,
  `HR_ZONE_MAX_GAP_S = 15` (maks. czas przypisywany próbce przy luce),
  `getMaxHr`, `getRestingHr`, `formatMinSec`.
- `getMinHrCoveragePct()` — próg pokrycia pulsu (domyślnie 50%).
- `isTestMode()` — tryb testowy (localStorage `rowerLoggerTestMode`).
- Zaznaczanie aktywnej pozycji menu (`data-page`).

### Klucze localStorage / sessionStorage

`rowerLoggerAppsScriptUrl`, `rowerLoggerMaxHr`, `rowerLoggerRestingHr`,
`rowerLoggerMinHrCoverage` (puste = 50, 0 = nie pomijaj),
`rowerLoggerTestMode` (`"1"`), `rowerLoggerResistance` (ostatnio
ustawiony opór), `rowerLoggerOfflineQueue` (kolejka niewysłanych
wpisów), sessionStorage `rowerLoggerDataCache`.

### `app.js` — strona Trening

Sekcje (zobacz nagłówki komentarzy w pliku): konfiguracja `CONFIG`
(`SAMPLE_INTERVAL_S: 5`, `IDLE_SPEED_THRESHOLD_KMH: 0.5`,
`TRIM_IDLE_EDGES`, `BEST_EFFORTS` = 5/15/30 min), dekodowanie FTMS Indoor
Bike Data (0x2AD2) i Heart Rate Measurement (0x2A37), wysyłka do
Sheets, stan aplikacji, Wake Lock, Bluetooth, pasek pulsu, strefy na
żywo, nagrywanie, licznik czasu, podsumowanie, Start/Stop, UI, ręczny
opór.

Kluczowe mechanizmy:

- **Wysyłka**: `sendToSheets(type,row)` — w sesji testowej
  (`sessionIsTest`) zwraca od razu bez wysyłania i bez kolejki; gdy brak
  URL albo błąd sieci — `queueOffline` do `rowerLoggerOfflineQueue`;
  `retryOfflineQueue` przy starcie strony ponawia wysyłkę.
- **Próbkowanie**: `startSampling()` — timer co 5 s; wykrywa luki
  (`SAMPLING_GAP_THRESHOLD_S` = 1,8× interwału) i loguje ostrzeżenie
  (aplikacja w tle/rozłączenie); dokłada próbkę do `history`, wysyła
  wiersz, aktualizuje wykresy i strefy.
- **Puls**: `getEffectiveHeartRate()` — pasek BLE, jeśli połączony,
  inaczej czujnik w uchwytach roweru (może być `undefined`/0).
- **Opór**: rower nie ma elektronicznej regulacji, więc opór (1–16) to
  ręczny licznik w aplikacji (`manualResistance`), zapisywany w kolumnie
  „Opór” próbki.
- **Strefy na żywo**: `createZonesView(container, zones, opts)` —
  widok wielokrotnego użytku (na żywo z plakietką bieżącej strefy
  `showCurrent` oraz w podsumowaniu). Pasek to **oś czasu**
  (`zoneTimeline`: odcinki `{zone, secs}` w kolejności treningu,
  sąsiednie scalane; `zone = -1` = brak odczytu pulsu). Pod paskiem
  legenda: nazwa strefy, dolna granica tętna („od 134”, przy `<Z1`
  górna „<120”) i **skumulowany** czas w strefie (`zoneSecs`).
  `accumulateZoneTime(hr, seconds)`.
- **Najlepszy odcinek**: `bestDistanceInWindow(samples, windowSeconds)`
  (dwa wskaźniki po próbkach `{elapsed_s, distance_m}`), liczone w
  `buildSummary()` dla okien z `CONFIG.BEST_EFFORTS`; wiersz do arkusza
  ma 19 wartości w kolejności 15, 5, 30.
- **Podsumowanie po Stop**: `showSummary()` — statystyki, rozkład stref,
  wiersze „Najlepsze 5/15/30 min” (widoczne tylko gdy trening dość
  długi).
- **Tryb testowy**: `sessionIsTest` ustalane raz przy Start;
  `updateTestBanner()` pokazuje żółty baner „Trening testowy — bez
  zapisu w arkuszu” (także przed Startem, gdy ustawienie włączone) i
  status „Trening testowy w toku”; ukrywa ostrzeżenie o braku URL.
  Nadal wymagane połączenie z rowerem — to nie symulator danych.
- **Układ strony** (zwarty, całość w trakcie treningu mieści się na
  ekranie telefonu, ~812 px): `body.page-training`, `body.recording`
  (po Start górny rząd zwija się do belki Stop i chipów „Rower ●” /
  „Puls ●”), kolejność: opór (pełna szerokość) → kafle live w siatce 6
  kolumn (rząd 1: Czas, Dystans — po 3 kolumny, większa czcionka; rząd
  2: Prędkość, Kadencja, Puls — po 2) → trendy prędkości i pulsu obok
  siebie (`#trendsRow`, sparkline 5 min z krzywą średniej) → karta
  „Czas w strefach tętna” → zwijany dziennik (ostatnia linia).

### `analiza.js` — Analizy

- `METRICS`: Dystans (z nakładką „najlepsze 15 min”), Najl. 5/15/30
  min (`overlay: null`, `minMinutes`), Prędkość, Moc, Puls
  (`requiresHr`), Kadencja — słupki średnia + maksimum (nakładka).
  Presety zakresu (30 dni, 90 dni, Rok, Wszystko) i własne Od–Do.
  Klik/tap na słupek pokazuje etykietę z wartością.
- `buildSessions(rows, metric, from, to, hrOk)`, `drawTrendChart`,
  `drawChartTooltip`.
- `RECORDS`/`buildRecordsCard(rows, hrOk)` — rekordy osobiste (m.in.
  najlepsze 5, 15 i 30 min, najdłuższy dystans, najwyższa średnia moc,
  maks. prędkość…).
- `buildZonesCard` — czas w strefach tętna za wybrany zakres dat, na
  próbkach z `Trening_Szczegoly` (+ słupki skumulowane na trening);
  wymaga ustawionego tętna maksymalnego.
- `buildHrCoverage` — wykluczanie z analiz pulsu (wykres pulsu, strefy,
  rekord maks. pulsu) treningów, w których odczyty pulsu > 0 stanowią
  mniej niż próg (Ustawienia). Dystans, moc itd. zostają.
- Szeroki układ (`body.wide`).

### `wyniki.js` — Wyniki

- `renderTable`: kolumny z nagłówków pierwszego wiersza, bez
  `HIDDEN_COLUMNS = ["ID sesji", "Koniec"]`, kolumny najlepszych
  odcinków na końcu w kolejności 5/15/30; skrócone dwuwierszowe etykiety
  (`COLUMN_LABELS`); formatery daty/godziny/czasu; stronicowanie po 20,
  domyślnie najnowsze na górze.
- **Sortowanie** (v1.22): klik w nagłówek → malejąco → rosnąco →
  domyślnie; strzałka ▲/▼, `aria-sort`; sortuje całość, nie stronę;
  puste komórki zawsze na końcu.

### `ustawienia.js` — Ustawienia

Pola: adres Apps Script, tętno maksymalne i spoczynkowe (obok siebie),
karta „Strefy tętna” (odświeżana przy wpisywaniu, pokazuje użytą
metodę), „Minimalny udział odczytów pulsu (%)” (trening pomijany w
analizach pulsu, jeśli odczyty > 0 to mniej niż tyle % próbek), checkbox
„Trening testowy”, przycisk „Zapisz ustawienia” (walidacja przed
zapisem czegokolwiek), „Wymuś aktualizację aplikacji”.

### Styl (`styles.css`)

Ciemny motyw, zmienne CSS (`--accent: #2FD9C4`, `--surface`,
`--surface-2`, `--text-muted`, `--border`, `--danger`, `--hr-color`),
karty `stat-card`, menu `.nav-menu` z kafelkami i ikonami SVG (Trening,
Analizy, Wyniki, Ustawienia), przycisk odświeżania w nagłówku Analiz i
Wyników, `.stepper-btn` (okrągłe przyciski, też w stronicowaniu).
Ikona aplikacji: okręgi z gradientem i pomarańczowym akcentem na strzałce
(generowana skryptem, PNG 192/512).

---

## 7. Konwencje i pułapki (wnioski z pracy)

- **Wielofragmentowe patche skryptem**: pisz skrypt Pythona przez
  narzędzie zapisu pliku (nie przez heredoc w bashu — polskie znaki i
  `\n` potrafią się zmieniać), używaj funkcji `edit(path, old, new)` z
  asercją `count == 1` na każdym fragmencie, uruchamiaj `node --check`
  po edycjach JS. Skrypt przerwany w połowie zostawia częściowe zmiany —
  sprawdź `git diff` i dokończ tylko brakujące kroki.
- **Cache przy testach**: service worker działa „najpierw sieć”, ale
  przy testach po zmianie wersji warto wyrejestrować SW i wyczyścić
  `caches`. Dane do testów Analiz/Wyniki: wstaw do
  `sessionStorage.rowerLoggerDataCache` obiekt
  `{timestamp, data: {ok: true, summary: [...], detail: []}}` (brak
  `ok: true` daje „Błąd odczytu danych: nieznany błąd”).
- Aby przetestować `buildSummary` bez roweru: ustaw w konsoli `history`,
  `startTime`, `sessionId` (globalne `let` są dostępne) i wywołaj
  `buildSummary()`.
- Po testach sprzątaj: `rowerLoggerOfflineQueue`, `rowerLoggerTestMode`,
  `rowerLoggerMaxHr`, `rowerLoggerAppsScriptUrl`, cache danych.
- **Układ mobilny**: zawsze sprawdzaj 375 px i 320 px (kafle nie mogą
  się rozjeżdżać; jednostki zawijają się pod wartość na 320 px). Nie
  wprowadzaj poziomego przewijania strony (tabela Wyników przewija się w
  swoim kontenerze).
- **Specyficzność CSS**: `.settings-field input` nadaje polom pełną
  szerokość — checkbox wymaga osobnej reguły o wyższej specyficzności.
- **Nazewnictwo w interfejsie**: pole progu pulsu nazywa się „Minimalny
  udział odczytów pulsu (%)” (wcześniejsza nazwa wprowadzała w błąd).
- Wykresy nie mają zewnętrznych bibliotek — nie dodawaj ich bez
  uzgodnienia.
- Wspólne kopie logiki (`bestDistanceInWindow`, `IDLE_SPEED_THRESHOLD_KMH`)
  w `app.js` i `apps-script.gs` — zmieniając jedną, zmień drugą i
  poinformuj użytkownika, że musi wkleić nowy skrypt (zastępując plik).
- Zmiany kolejności/dodawanie kolumn w arkuszu: `doPost` zapisuje
  pozycyjnie, więc nowa kolumna = dopisz nagłówek w arkuszu + dopisz
  wartość na końcu wiersza w `buildSummary()` + (jeśli trzeba) migracja
  archiwum w Apps Script + etykieta w `COLUMN_LABELS`.

---

## 8. Historia wersji w skrócie

(Szczegóły: `CHANGELOG.md`.)

- 2026-08-… → 2026-09-17: wersje datowe `2026-08-26.N` — od prostego
  loggera do PWA z Analizami, Wynikami, Ustawieniami.
- **1.0–1.10** (17–18.09): nowe numerowanie, ikony menu, rekordy
  osobiste, słupkowe wykresy, strefy tętna (Ustawienia + Analizy),
  tętno spoczynkowe (Karvonen), nowa ikona aplikacji.
- **1.11–1.18** (19.09): strefy w Analizach, wskaźnik stref na żywo
  (pasek czasu) i w podsumowaniu, próg pokrycia pulsu, poprawa średniego
  pulsu (archiwum), ikona odświeżania, parametr „Sesja 15 min”.
- **1.19**: zwarty układ Trening (812 px zamiast 1336 px w trakcie).
- **1.20**: najlepsze odcinki 5/15/30 min automatycznie dla każdego
  treningu (usunięty parametr), Analizy i Wyniki, migracja archiwum;
  opór na pełną szerokość, nowa kolejność kafli live.
- **1.21**: pasek stref jako oś czasu; progi tętna w legendzie.
- **1.22**: sortowanie tabeli Wyników.
- **1.23**: tryb „Trening testowy”.

---

## 9. Stan projektu i co dalej

**Ukończone:** cały „moduł analityczny” (Faza 1), rejestrowanie z
roweru i paska pulsu, Wyniki, Analizy, Ustawienia, tryb testowy.

**Backlog (`TODO.md`, żadna faza nie ruszona):**

- **Faza 2 — struktura treningu:** wybór typu (swobodna jazda /
  interwały / wytrzymałościowy / sprint test), sygnały wizualne i
  docelowo dźwiękowe („zmień tempo za 10 s”), konfigurowalny szablon
  interwałów (praca/odpoczynek, powtórzenia).
- **Faza 3 — grywalizacja:** odznaki, wyzwania tygodniowe, ostrzeżenia
  o braku regeneracji.
- **Faza 4 — wirtualne trasy z nachyleniem:** trasy z docelowym
  oporem (1–16), podpowiedzi zmiany oporu (ręczna regulacja), profil
  wysokości.
- **Faza 5 — wyścig z duchem:** wybór poprzedniej sesji jako „ducha”,
  porównanie na żywo.
- **Luźny pomysł:** progresja oparta na trendzie (np. średnia moc z 4
  tygodni).

**Znane braki / uwagi:**

- Kolumny 30 min w Wynikach/Analizach są puste, dopóki nie będzie
  treningu ≥ 30 min.
- Działanie w Firefoksie/Safari nie było testowane (Web Bluetooth i tak
  jest tylko w Chrome/Edge/Samsung Internet; Analizy/Wyniki mają zapasowe
  `roundRect`).
- Nie ma symulatora danych rowerowych — bez roweru nie da się uruchomić
  Startu (tryb testowy tylko wyłącza zapis).
- Brak `DEPLOY.md`, choć jest wspominany w komentarzach (sekcja 5
  zastępuje instrukcję).
- Wartości `sw.js` `CACHE_NAME` nie są podbijane przy zmianach (celowo —
  strategia „najpierw sieć”).

---

## 10. Jak pracować z użytkownikiem

- Odpowiadaj po polsku, zwięźle, konkretnie; na koniec pracy krótkie
  podsumowanie: co zrobione, co przetestowane (i czego **nie** dało się
  przetestować, np. z prawdziwym rowerem), co użytkownik musi zrobić
  ręcznie (np. wkleić skrypt do Apps Script).
- Gdy użytkownik pyta „co zostało do zrobienia” — streść `TODO.md`
  (backlog Faz 2–5 + drobiazgi) i zaproponuj kolejność.
- Zmiany dotyczące danych w arkuszu zawsze opisuj wraz z krokami
  migracji dla archiwum i ostrzeżeniem o wklejeniu skryptu w jednym
  pliku.
- Gdy nie znasz treści błędu z Apps Script, poproś o dokładny komunikat
  (z dziennika wykonywania); nie zgaduj.
- Nie wykonuj destrukcyjnych operacji na arkuszu i nie wysyłaj
  danych testowych do prawdziwego adresu wdrożenia.
