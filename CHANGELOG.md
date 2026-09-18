# Rower Logger PWA — historia wersji

Numer wersji (`APP_VERSION` w `nav.js`, widoczny w stopce i na ekranach
wczytywania danych) rośnie przy każdej zmianie w plikach PWA — patrz
komentarz przy stałej. Ten plik opisuje, co się kryje pod kolejnymi
numerami. Najnowsze na górze.

Wpisy do wersji `.9` (przed 2026-09-01) odtworzone z historii git,
opisowo — powstały zanim zacząłem pracować nad tym repozytorium.
Wpisy od `.10` pochodzą z bieżącej pracy nad projektem.

---

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
