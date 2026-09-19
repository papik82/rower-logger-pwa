# Rower Logger PWA — historia wersji

Numer wersji (`APP_VERSION` w `nav.js`, widoczny w stopce i na ekranach
wczytywania danych) rośnie przy każdej zmianie w plikach PWA — patrz
komentarz przy stałej. Ten plik opisuje, co się kryje pod kolejnymi
numerami. Najnowsze na górze.

Wpisy do wersji `.9` (przed 2026-09-01) odtworzone z historii git,
opisowo — powstały zanim zacząłem pracować nad tym repozytorium.
Wpisy od `.10` pochodzą z bieżącej pracy nad projektem.

---

## 1.19 — 2026-09-19
Zwarty układ strony Trening — całość w trakcie treningu mieści się na
jednym ekranie telefonu (812 px zamiast 1336 px), przed startem 913 px.
Zmierzone na 375 px.
- **Pasek treningu** (`body.recording`, ustawiane w `setRecordButton`):
  po Start duży okrągły przycisk i karty połączeń zwijają się do belki
  Stop (52 px) i chipów „Rower ●" / „Puls ●" (kropka `.status-dot`,
  klasa `connected` na kartach). Chip pulsu ma przycisk „Połącz", gdy
  pasek jest rozłączony, żeby dało się go podłączyć w trakcie. 204 → 52 px
- **Kafle live w 3 kolumnach**: Czas, Prędkość, Kadencja / Dystans i
  szerszy Puls z plakietką bieżącej strefy (`#zoneBadge`). Czas w
  formacie `m:ss` (`formatMinSec`) zamiast `00:15:40`, kadencja bez
  miejsc po przecinku — inaczej nie mieszczą się w 1/3 szerokości.
  275 → 140 px. Na 320 px jednostki zawijają się pod wartość
- **Trendy prędkości i pulsu obok siebie** (`#trendsRow`), tytuły
  „Prędkość · 5 min" / „Puls · 5 min", bez legendy (wyjaśnienie w
  `title`). 196 + odstęp → 87 px
- **Strefy kompaktowo**: bez nagłówka karty i osi 0:00, wiersz meta z
  tytułem i sumą czasu, kafelki Z1–Z5 w dwóch liniach (kropka + nazwa /
  czas). Plakietka strefy przeniesiona do kafla Puls, więc nagłówek z
  bpm zniknął. `createZonesView(container, zones, opts)` przyjmuje teraz
  `{ title, badge }`. 193 → 102 px
- **Dziennik zwinięty** do jednej linii z ostatnim wpisem
  (`#logLast`), dotknięcie rozwija pełną treść (`#logFull`,
  `initLogToggle`). 64 → 36 px
- **Odstępy między kartami 20 → 12 px** tylko na stronie Trening
  (`body.page-training`), pozostałe strony bez zmian

## 1.18 — 2026-09-19
Niższe kafle „Sesja 15 min" i „Opór" (137 → 118 px na telefonie).
- `#paramsCard`: układ poziomy — tytuł po lewej, checkbox po prawej,
  mniejszy padding; wysokość wyznacza kafel oporu
- `#resistanceCard` w rzędzie: padding 12/14, wartość 22 px, przyciski
  34 px zamiast 40 px

## 1.17 — 2026-09-19
Krótszy opis parametru na karcie Trening: „Sesja 15 min" zamiast „Licz
dystans 15 min dla tej sesji" (mieści się w jednej linii w połowie
szerokości). Pełne wyjaśnienie zostaje w dymku `title` kafla; wpis w
logu przy zmianie w trakcie treningu bez zmian.
- `index.html`: `.param-title` i `title` kafla `#paramsCard`

## 1.16 — 2026-09-19
Układ karty Trening: kafel parametru „Licz dystans 15 min" i kafel
oporu obok siebie w jednym rzędzie zamiast jeden pod drugim.
- `index.html`: oba kafle w `#controlsRow` (siatka dwóch kolumn); w
  obu opis u góry, element sterujący na dole (checkbox / przyciski −
  i +), równa wysokość
- `styles.css`: w rzędzie przyciski oporu są rozciągniętymi „pigułkami"
  (40 px) zamiast okrągłych 52 px — inaczej nie mieszczą się w połowie
  szerokości; poza tym rzędem `.stepper-btn` bez zmian (np. paginacja)
- Długa podpowiedź z karty parametru przeniesiona do dymka `title`
  (na telefonie nie ma hovera — treść i tak jest w CHANGELOG 1.15 i
  w logu przy zmianie w trakcie treningu); usunięte `.param-hint`
- Sprawdzone na 375 px i 320 px: kafle 134 px, bez przewijania
  poziomego; opór i checkbox działają jak wcześniej

## 1.15 — 2026-09-19
Parametry treningu — pierwszy: „Licz dystans 15 min dla tej sesji".
Domyka Fazę 1.
- `index.html`, `app.js`: karta z checkboxem nad oporem. Bez
  zaznaczenia `buildSummary()` zapisuje pustą komórkę „Dystans 15 min
  (m)" (`isBest15Enabled()`); Wyniki i Analizy już obsługują puste
  wartości, więc nic więcej nie trzeba było zmieniać. Schemat wiersza
  (17 kolumn) bez zmian — **bez zmian w arkuszu i w Apps Script**
- Wybór pamiętany w `localStorage` (`rowerLoggerParamBest15`),
  domyślnie zaznaczony, żeby zachować dotychczasowe zachowanie (liczone
  dla każdego treningu ≥ 15 min). Można go zmienić przed startem i w
  trakcie — do kliknięcia Stop, bo podsumowanie idzie do arkusza od razu
  po zakończeniu (zmiana w trakcie zostawia wpis w logu)
- Podsumowanie treningu pokazuje wiersz „Najlepsze 15 min", gdy wartość
  została policzona
- Archiwum bez zmian: dotychczasowe treningi zachowują wartość
  policzoną automatycznie (nie ma jak retroaktywnie wybrać parametru)
- Nie zrobione: zmiana parametru *po* Stop (wymagałaby aktualizacji
  już zapisanego wiersza w arkuszu)

## 1.14 — 2026-09-19
Doprecyzowana nazwa i opis progu z wersji 1.12 — poprzednia nazwa
(„Minimalny pomiar tętna w treningu") sugerowała, że próg dotyczy zer,
a dotyczy udziału odczytów: wyższa liczba = bardziej restrykcyjny próg.
- `ustawienia.html`: pole „Minimalny udział odczytów pulsu (%)" z
  opisem i przykładem („25 = pomiń treningi, w których ponad 75%
  odczytów to zera"). Komunikat walidacji w `ustawienia.js` z nową
  nazwą
- `analiza.js`: notatka pod wykresem pulsu i strefami mówi teraz
  „odczyty pulsu w mniej niż X% próbek treningu" (`coverageReason`)
- Logika bez zmian: trening zostaje, gdy udział próbek z pulsem > 0
  wynosi co najmniej X%

## 1.13 — 2026-09-19
Średni puls bez zerowych odczytów — nowe treningi liczone poprawnie,
archiwum do poprawienia jednorazowym skryptem.
- `app.js`: `buildSummary()` liczy średni i maks. puls tylko z odczytów
  > 0 (rower oddaje 0 bez uchwytów i paska, a to nie wartość). Trening
  bez żadnego odczytu zapisuje pustą komórkę zamiast 0, a podsumowanie
  pokazuje „— / — bpm". Krzywa średniego pulsu na wykresie na żywo też
  pomija zera (`hrRunningSum`)
- `apps-script.gs`: `previewAvgHrBackfill()` (podgląd, nic nie
  zapisuje) i `backfillAvgHr()` (zapis) poprawiają kolumnę „Śr. puls
  (bpm)" w `Trening_Podsumowania` dla starych treningów. Zmieniane są
  tylko treningi z zerowymi odczytami w oknie jazdy; stare wartości
  trafiają do dziennika wykonania. Czysta funkcja `avgHrFromSamples_`
  odtwarza logikę przycinania postoju z `app.js`
- Sprawdzone na Twoich danych, z atrapą arkusza zbudowaną z prawdziwych
  próbek: 16 z 24 treningów daje wartość identyczną co do 0,1 bpm z
  zapisaną (potwierdza zgodność logiki), do zmiany 7 wierszy, m.in.
  18,1 → 94,9 i 23,9 → 112,8; trening bez odczytów 0 → puste. Sesja z
  załataną luką (2026-09-11) i sesja z aplikacji desktopowej bez dziur
  zostają nietknięte
- **Do wykonania ręcznie:** wkleić zaktualizowany `apps-script.gs` do
  edytora Apps Script, uruchomić `previewAvgHrBackfill`, obejrzeć
  dziennik, potem `backfillAvgHr`. Bez nowego wdrożenia

## 1.12 — 2026-09-19
Próg minimalnego pomiaru tętna w treningu — treningi z zerowymi
odczytami pulsu przestają zniekształcać analizy tętna.
- `ustawienia.html`/`ustawienia.js`: nowe pole „Minimalny pomiar
  tętna w treningu (%)" (klucz `rowerLoggerMinHrCoverage`, walidacja
  0–100, puste = 50%, 0 = nie pomijaj żadnych). `nav.js`:
  `getMinHrCoveragePct()`
- `analiza.js`: `buildHrCoverage()` liczy z `Trening_Szczegoly` udział
  próbek z pulsem > 0 w każdym treningu. Trening poniżej progu (albo
  bez próbek) jest pomijany w analizach pulsu: wykres pulsu (metryka
  `requiresHr`), czas w strefach i rekord „Najwyższy maks. puls"
  (`needsHr`). Dystans, moc, prędkość, kadencja i pozostałe rekordy
  bez zmian
- Pod wykresem pulsu i pod strefami notatka ile treningów pominięto i
  dlaczego (`coverageReason`), z odesłaniem do Ustawień. Wcześniej
  strefy miały ten próg na stałe (50%, `MIN_HR_COVERAGE`) i tylko one
- W arkuszu pokrycie pulsu jest „zero-jedynkowe" (treningi mają ok.
  100% albo poniżej ~21%), więc każdy próg 25–95% daje dziś ten sam
  wynik: 3 z 24 treningów pominięte

## 1.11 — 2026-09-19
Wskaźnik czasu w strefach tętna podczas treningu (strona Trening).
Wariant „pasek czasu" wybrany spośród trzech propozycji (pasek /
zegar z igłą / korektor).
- `index.html`, `app.js`: karta „Czas w strefach tętna" pod wykresami
  pulsu — kolorowa plakietka bieżącej strefy z tętnem (albo „Brak
  odczytu pulsu"), poziomy pasek proporcji czasu i sześć kafelków
  z czasem (<Z1, Z1–Z5), bieżąca strefa obwiedziona. Odświeżana przy
  każdej zmianie tętna (`refreshHrDisplay`) i co tik próbkowania.
  `createZonesView()`, `initLiveZones()`, `accumulateZoneTime()`
- Czas próbki = rzeczywisty odstęp od poprzedniego tiku, ograniczony
  do `HR_ZONE_MAX_GAP_S` (15 s); próbki bez odczytu pulsu się nie
  liczą. Licznik zerowany przy Start; po Stop karta zostaje z
  końcowym rozkładem
- „Podsumowanie treningu" dostaje ten sam widok jako końcowy rozkład
  czasu w strefach (bez plakietki bieżącej strefy)
- Bez tętna maksymalnego w Ustawieniach karta pokazuje link do
  Ustawień; granice stref jak w podglądzie w Ustawieniach (Karvonen,
  gdy podano tętno spoczynkowe)
- Nic nowego nie trafia do arkusza — próbki z pulsem już tam są
- `nav.js`: wspólne `hrZoneIndex()`, `formatMinSec()`, `ZONE_BELOW_*`,
  `HR_ZONE_MAX_GAP_S`, używane też w Analizach (usunięte duplikaty z
  `analiza.js`, wynik bez zmian)

## 1.10 — 2026-09-18
Ikonka odświeżania w nagłówku Wyników i Analiz dopasowana do reszty
interfejsu — zamiast kolorowego emoji 🔄 (renderowanego jako niebieski
kwadrat, różnie zależnie od systemu) liniowy SVG w stylu ikon menu.
- `analiza.html`, `wyniki.html`: `#refreshBtn` z inline `<svg>` (okrąg
  ze strzałką, `stroke="currentColor"`, grubość linii 1.8) zamiast emoji
- `styles.css`: `.refresh-btn` bez `font-size` (już niepotrzebny),
  `padding: 0`, nowy stan `:hover` (jaśniejszy kolor); animacja obrotu
  i `:active` w kolorze akcentu bez zmian

## 1.9 — 2026-09-18
Aplikacja w zwykłej przeglądarce desktopowej (Chrome / Firefox / Safari).
Analizy, Wyniki i Ustawienia od początku nie używały Web Bluetooth —
poprawione zostało to, co przeszkadzało na dużym ekranie i w
przeglądarkach bez Bluetooth.
- Szeroki układ (`body.wide`, od 900 px do 960 px zamiast wąskiej
  kolumny 480 px) dla Analiz i Wyników: tabela Wyników mieści wszystkie
  kolumny bez przewijania poziomego, wykresy są wyższe. Na telefonie bez
  zmian. Trening i Ustawienia zostają wąskie
- `.records-grid`: kolumny `auto-fill` zamiast stałych dwóch — na
  szerokim ekranie 5–6 kafelków rekordów w rzędzie, na telefonie nadal 2
- Trening: żółty baner „Ta przeglądarka nie obsługuje Web Bluetooth…"
  (`#bluetoothNotice`), gdy `navigator.bluetooth` nie istnieje
  (Firefox, Safari) — zamiast samych okienek `alert()` po kliknięciu.
  Wskazuje, że reszta aplikacji działa normalnie
- `ctx.roundRect` (dymki wykresów) z zapasowym prostokątem dla
  starszych Safari/Firefoksów
- Przegląd zgodności: reszta użytych API (`Intl` z `sv-SE`/`hourCycle`,
  `<input type=date>`, `color-scheme`, Service Worker) jest wspierana
  przez aktualne Chrome, Firefox i Safari. Nie testowane w Firefoksie
  i Safari (środowisko dev ma tylko silnik Chromium)

## 1.8 — 2026-09-18
Czas w strefach tętna — nowa karta w Analizach, pod wykresem trendów.
- `analiza.js`: `buildZonesCard()` liczy z próbek `Trening_Szczegoly`
  (`detail` zwracane już przez `doGet` — bez zmian w Apps Script), ile
  czasu każdy trening spędził w strefach 1–5 oraz poniżej strefy 1.
  Granice stref z Ustawień (`computeHrZones`: tętno maksymalne,
  opcjonalnie spoczynkowe → Karvonen); bez tętna maksymalnego karta
  pokazuje link do Ustawień
- Podsumowanie za wybrany zakres dat (ten sam, co wykres trendów —
  odświeża się razem z nim): czas, % i pasek dla każdej strefy, oraz
  słupki skumulowane 100% na trening z dymkiem (procent + czas w
  każdej strefie). Wspólne helpery wykresów (`prepareCanvas`,
  `barGeometry`, `drawDateLabels`, `drawChartTooltip` z listą linii)
- `sessionZoneTimes()`: czas próbki = odstęp do następnej, ograniczony
  do 15 s (luka po rozmowie telefonicznej nie zawyża strefy); próbki
  bez odczytu pulsu (0/puste) nie liczą się do procentów
- Treningi z pomiarem pulsu krótszym niż połowa czasu są pomijane,
  a karta informuje ile (`MIN_HR_COVERAGE`) — inaczej dają mylące
  procenty; w Twoich danych to 3 z 23 treningów
- Dymek przycięty do wysokości płótna (nie zachodzi na etykiety dat)
- `styles.css`: `.zone-row`, `.zone-bar`, `#zonesChart`, `.zones-note`

## 1.7 — 2026-09-18
Wszystkie wykresy trendów w Analizach jednolicie słupkowe, na wzór
dystansu — prędkość, moc, puls i kadencja przestały być liniowe.
- `analiza.js`: usunięty wariant liniowy (`drawLines`, pole `type` w
  `METRICS`, lewy margines na oś Y). Jedna ścieżka rysowania w
  `drawTrendChart`: szeroki słupek średniej (kolor akcentu) + węższy
  słupek drugiej serii (kolor pulsu) na wierzchu — dla metryk innych
  niż dystans jest to maksimum, więc wystaje ponad średnią
- Obwódka zaznaczenia i dymek liczone od wyższego z dwóch słupków
- Uwaga: oś od zera oznacza, że małe różnice (np. średni puls 130 vs
  140 bpm) są słabo widoczne na wykresie — dokładne wartości daje dymek
- `chartLayout()` usunięte, klik i etykiety dat liczą pozycję wprost
  z szerokości płótna

## 1.6 — 2026-09-18
Rekordy osobiste w Analizach — karta pod wykresem trendów.
- `analiza.js`: `buildRecordsCard()` liczy z `Trening_Podsumowania`
  najlepszą wartość z całej historii dla 10 pozycji (`RECORDS`):
  najdłuższy dystans i trening, najlepsze 15 min, najwyższa śr. i
  maks. prędkość, śr. i maks. moc, maks. kadencja, maks. puls,
  najwięcej kalorii. Kafelek pokazuje wartość i datę pierwszego jej
  osiągnięcia (remis wygrywa wcześniejszy trening); rekord ustanowiony
  w ostatnim treningu ma akcent i dopisek „ostatni trening"
- Zera i puste komórki pomijane jak na wykresach (brak danych, nie
  wartość); pozycje bez żadnych danych nie dostają kafelka
- `durationSeconds()` — parsowanie czasu trwania z obu wariantów
  zapisu w arkuszu (tekst `HH:MM:SS` i znacznik UTC), spójne z
  `formatDuration()` w Wynikach
- `styles.css`: `.records-grid`, `.record-tile`, odstęp między kartami
  w `#analysisContent`

## 1.5 — 2026-09-18
Wykresy trendów w Analizach — prędkość, moc, puls i kadencja obok
dystansu, z wyborem zakresu dat.
- `analiza.js`: karta wykresu ma teraz przyciski metryk (Dystans /
  Prędkość / Moc / Puls / Kadencja) i zakresu dat (30 dni / 90 dni /
  Rok / Wszystko + własne pola Od–Do). Dane z `Trening_Podsumowania`
  (średnia + maksimum na trening), definicje metryk w `METRICS`
- Dystans zostaje wykresem słupkowym (oś od zera, nakładka „najlepsze
  15 min"); pozostałe metryki są liniowe (średnia + maksimum) z osią Y
  dobraną do danych i trzema poziomicami — przy słupkach od zera różnice
  rzędu 130 vs 140 bpm byłyby niewidoczne. Klik/tap w punkt pokazuje
  dymek z wartościami, jak wcześniej przy słupkach
- Zera i puste komórki to „brak danych", nie wartość — sesja bez
  odczytu pulsu ma średnią 0 i rozciągała oś do zera. Takie sesje są
  pomijane na wykresie danej metryki
- Wybór metryki i zakresu przeżywa odświeżenie danych (🔄)
- Etykiety dat przy skrajnych punktach nie wychodzą poza płótno i nie
  nachodzą na siebie
- `drawBarChart` → `drawTrendChart` (`drawBars` / `drawLines`),
  płótno `#distanceChart` → `#trendChart`; `styles.css`: `.chip`,
  `.range-dates`, `.range-field`, `.chart-empty`

## 1.4 — 2026-09-18
Przywrócony pomarańczowy akcent na igle/piaście loga (`--hr-color`) —
sam pierścień zostaje biały, ale igła i piasta wyróżniają się kolorem
zamiast być jednolicie białe jak reszta glifu.
- `icon-192.png`, `icon-512.png`: needle + hub dot z powrotem w
  kolorze `#FF9F43` (jak w poprzedniej, dwukolorowej wersji sprzed
  przejścia na gradientowe tło), pierścień bez zmian (biały)

## 1.3 — 2026-09-18
Logo poprawione na pełne, gradientowe tło zamiast ciemnego kwadratu na
środku — dopasowane do stylu sąsiednich ikon na ekranie głównym
(Android dokładał białe tło, bo poprzednia wersja nie wypełniała
całego kafelka i nie była oznaczona jako adaptacyjna).
- `icon-192.png`, `icon-512.png`: pełne, przekątne tło gradientowe
  (jasny → ciemny teal, ta sama rodzina barw co `--accent`) zamiast
  ciemnego tła aplikacji (`--bg`) wewnątrz kwadratu; glif (pierścień +
  igła + piasta) teraz jednolicie biały zamiast dwukolorowy
  teal/pomarańcz — spójniej z płaskim, jednokolorowym stylem glifów
  na sąsiednich ikonach; powiększony (mniejszy margines), mieści się
  w bezpiecznej strefie ~66% dla przycięcia do koła/maski
- `manifest.webmanifest`: `"purpose": "any maskable"` na obu wpisach
  ikon — Android traktuje je jako adaptacyjne (własna maska zamiast
  doklejania białego tła za nieprzezroczystą ikoną)

## 1.2 — 2026-09-18
Nowe logo aplikacji — otwarty pierścień (wskaźnik/gauge) z pomarańczową
igłą i piastą zamiast dwóch koncentrycznych okręgów. Zachowuje ten sam
motyw (okręgi na ciemnym tle), ale jest bardziej wyrazisty i czytelny
w małych rozmiarach (favicon), a przy okazji wykorzystuje dwukolorową
paletę (teal/pomarańcz), która już oznacza prędkość/puls w reszcie
aplikacji.
- `icon-192.png`, `icon-512.png` podmienione — wygenerowane skryptem
  Python (`numpy` + ręczny zapis PNG, bez zewnętrznych bibliotek
  graficznych), z 4× nadpróbkowaniem dla gładkich krawędzi
- Nazwy plików bez zmian, więc `manifest.webmanifest` i tagi
  `<link rel="icon">`/`<link rel="apple-touch-icon">` w HTML nie
  wymagały edycji

## 1.1 — 2026-09-17
Zmiana schematu wersjonowania — klasyczny, czytelniejszy `MAJOR.MINOR`
zamiast dotychczasowego "z datą" (`RRRR-MM-DD.NN`, np. poprzednie
`2026-08-26.36`). Cały dotychczasowy stan aplikacji to punkt
odniesienia **1.0** — wpisy poniżej pod starymi numerami zostają bez
zmian, tylko numeracja od tego wpisu w górę jest już nowa. `?v=` w
adresach plików teraz wprost równe `APP_VERSION` (np. `?v=1.1`)
zamiast samej końcówki starego numeru.

Pola "Tętno maksymalne" i "Tętno spoczynkowe" w Ustawieniach obok
siebie (dwie kolumny) zamiast jedno pod drugim — są ze sobą
powiązane (razem wyznaczają strefy tętna), więc grupowanie ich
wizualnie ma sens i oszczędza miejsca na ekranie.
- `ustawienia.html`: oba pola owinięte w `.settings-field-row`
- `styles.css`: `.settings-field-row` — grid 1fr 1fr, `min-width: 0`
  na polach w środku, żeby węższa kolumna nie ścisnęła inputu

## 2026-08-26.36 — 2026-09-17
Opcjonalne pole "Tętno spoczynkowe" w Ustawieniach — dokładniejsze
strefy tętna metodą rezerwy tętna (Karvonena), zamiast samego %HRmax.
- `nav.js`: `getRestingHr()`; `computeHrZones(maxHr, restingHr)`
  przyjmuje teraz drugi argument — gdy tętno spoczynkowe jest podane
  i sensowne (dodatnie, niższe niż maksymalne), granice liczone są
  jako `restingHr + (maxHr − restingHr) × %` (Karvonen/HRR) zamiast
  samego `maxHr × %`. Bez tętna spoczynkowego zachowanie identyczne
  jak wcześniej
- `ustawienia.html`/`ustawienia.js`: nowe, opcjonalne pole "Tętno
  spoczynkowe (bpm)" pod polem tętna maksymalnego. Karta "Strefy
  tętna" pokazuje na dole, która metoda jest aktualnie użyta
  (%HRmax / Karvonena), oraz ostrzeżenie na czerwono, gdy wpisana
  wartość jest nieprawidłowa (spoczynkowe ≥ maksymalne) — w takim
  wypadku pole jest pomijane w wyliczeniach, a zapis obu pól tętna
  jest blokowany do czasu poprawienia

## 2026-08-26.35 — 2026-09-17
Strefy tętna wyliczane z tętna maksymalnego — podgląd w Ustawieniach,
bez wzoru z wieku (użytkownik wpisuje własne, znane tętno maksymalne).
- `nav.js`: `HR_ZONE_DEFS` (standardowy 5-strefowy model %HRmax: 50–60
  / 60–70 / 70–80 / 80–90 / 90–100%, bez tętna spoczynkowego) i
  `computeHrZones(maxHr)` — granice sąsiednich stref stykają się bez
  przerwy ani nakładania (dół = góra poprzedniej + 1 bpm)
- `ustawienia.html`/`ustawienia.js`: nowa karta "Strefy tętna" pod
  polem tętna maksymalnego — lista 5 stref (nazwa, zakres bpm, kolorowy
  znacznik od niebieskiego do czerwonego), odświeżana na bieżąco przy
  wpisywaniu wartości (`input` na `#maxHr`), nie tylko po zapisie
- Na razie tylko podgląd granic stref, nie podział czasu treningu na
  strefy (to wymaga przejścia po próbkach sesji — patrz TODO.md)

## 2026-08-26.34 — 2026-09-17
Interaktywne słupki na wykresie dystansu (podstrona Analizy) — klik/tap
pokazuje dokładne wartości dla danego treningu, zamiast trzeba było je
szacować "na oko" z wysokości słupka.
- `analiza.js`: `drawBarChart()` przyjmuje teraz `selectedIndex`;
  wybrany słupek dostaje białą obwódkę, a nad nim (lub pod, gdy słupek
  sięga blisko górnej krawędzi płótna) rysowany jest dymek z datą,
  dystansem całkowitym i — jeśli policzony — najlepszym 15-minutowym
  odcinkiem (`drawChartTooltip`, `formatFullDate`)
- Listener kliknięcia na `#distanceChart` liczy indeks słupka z
  pozycji X kliknięcia; ponowny klik na tym samym słupku chowa dymek
  (`activeChartSelectedIndex`, zachowywany też przy przerysowaniu po
  zmianie rozmiaru okna)
- `styles.css`: `cursor: pointer` na `#distanceChart`, sygnalizujący
  że słupki są klikalne

## 2026-08-26.33 — 2026-09-17
Nowe ikonki w menu nawigacyjnym — emoji (🚴📊📋⚙️, różnie renderowane
zależnie od systemu/przeglądarki, stały kolor) zastąpione spójnymi,
liniowymi piktogramami SVG (rower, wykres słupkowy, schowek z listą,
tryb ustawień).
- `index.html`, `analiza.html`, `wyniki.html`, `ustawienia.html`:
  zawartość `.nav-icon` w każdej z 4 kafelek `.nav-menu` zamieniona
  z emoji na inline `<svg>` (`stroke="currentColor"`, bez wypełnienia)
- `styles.css`: `.nav-icon` teraz stylizuje rozmiar `svg` (22×22px)
  zamiast `font-size` dla emoji
- Efekt uboczny (dzięki `currentColor`): aktywna zakładka podświetla
  teraz też samą ikonę na kolor `--accent`, nie tylko obramowanie i
  etykietę — poprzednio emoji miały stały kolor niezależny od stanu

## 2026-08-26.32 — 2026-09-17
Rozdzielony wykres prędkości/pulsu na żywo na dwa osobne wykresy, jeden
pod drugim, każdy z krzywą średniej kroczącej obok krzywej wartości
bieżącej.
- `index.html`: `#sparklineWrap` zastąpiony dwiema kartami,
  `#speedSparklineWrap` i `#hrSparklineWrap`, każda z własnym canvasem
  (`#sparklineSpeed` / `#sparklineHr`) i własnymi etykietami min/maks.
  (`#speedSparkMax`/`#speedSparkMin`, `#hrSparkMax`/`#hrSparkMin`)
- `styles.css`: selektory ID przepisane na klasy współdzielone przez
  oba wykresy (`.sparkline-chart-wrap`, `.sparkline-canvas`), dodana
  `.legend-dot-avg` (przyciemniona kropka legendy średniej)
- `app.js`: nowe `sparklineAvgData` / `hrSparklineAvgData` — średnia
  narastająca od początku treningu (nie tylko z widocznego okna ~5
  min), aktualizowana co próbkę obok surowych danych. `drawSparkline()`
  rysuje teraz dwa canvasy przez `drawSparklineChart()`, każdy z krzywą
  bieżącą (pełna barwa, grubsza) i krzywą średnią (40% przezroczystości,
  cieńsza) na wspólnej skali osi Y

## 2026-08-26.31 — 2026-09-11
Wykrywanie przerw w zapisie treningu na żywo — bezpośrednia reakcja na
to, co spowodowało dziurę w treningu 2026-09-11 (odebrana rozmowa
telefoniczna zeszła aplikację w tło na ~91s, bez żadnego śladu w
interfejsie, że coś się nie zapisało).
- `app.js`: `startSampling()` mierzy realny (zegar ścienny) odstęp
  między kolejnymi tikami próbkowania — jeśli wyraźnie przekracza
  zakładany interwał (>1.8×), to znak że karta/aplikacja przez chwilę
  nie działała. Zapisywane do `dataGaps`, natychmiast widoczne jako
  wpis w logu i 4-sekundowe ostrzeżenie w pigułce statusu
- Po zakończeniu treningu: jeśli wystąpiły luki, w karcie
  „Podsumowanie treningu” pojawia się czerwony baner z liczbą przerw
  i łącznym czasem bez danych (`index.html`: `#summaryGapWarning`,
  `styles.css`)
- Nie naprawia samych danych (to wciąż ręczna sprawa, patrz
  `patchCallGapSession_20260911` w `apps-script.gs`) — tylko od razu
  informuje, żeby dziura nie została niezauważona do czasu przeglądania
  Wyników kilka dni później

## 2026-08-26.30 — 2026-09-11
Kafelek „Dystans” na ekranie treningu zamiast „Moc” — pokazuje na
żywo przejechany dystans (km, z bieżącej próbki roweru), zamiast
chwilowej mocy.
- `index.html`: kafelek `#statPower` w `#liveStats` zastąpiony
  kafelkiem `#statDistance`
- `app.js`: `updateLiveStats()` liczy dystans z `sample.distance_m`
  (metry → km, 2 miejsca po przecinku) zamiast wypisywać moc
- Podsumowanie treningu po zakończeniu (`Moc śr. / maks.`) bez zmian —
  moc nadal jest zbierana i zapisywana, zniknęła tylko z widoku na
  żywo

## 2026-08-26.29 — 2026-09-05
Cache danych z Apps Script dla Wyników i Analiz — obie strony czytają
ten sam endpoint, więc jedno pobranie starcza teraz na obie, dopóki
cache (5 minut, `sessionStorage`) nie wygaśnie.
- `nav.js`: `fetchAppsScriptData()` — pobiera z cache, jeśli świeży,
  inaczej odpytuje Apps Script i zapisuje wynik; `clearAppsScriptDataCache()`
  czyszczona po zapisaniu nowego treningu, po udanym wysłaniu zaległej
  kolejki offline i po zmianie adresu w Ustawieniach
- Przycisk 🔄 w nagłówku Wyników i Analiz wymusza świeże pobranie
  (pomija cache), z krótkim obrotem ikony jako feedbackiem
- Poprawiony przy okazji drobny wyciek: `analiza.js` dodawał nowy
  listener `resize` przy każdym odświeżeniu zamiast go podmieniać

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
