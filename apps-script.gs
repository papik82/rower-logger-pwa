/**
 * Rower Logger — most między aplikacją PWA a Google Sheets.
 *
 * NIE hostuj tego pliku nigdzie — wklej całość do edytora Apps Script
 * (Rozszerzenia → Apps Script) w Twoim arkuszu "Rower - Dziennik
 * Treningów", a następnie wdróż jako aplikację internetową (Web App).
 * Pełna instrukcja krok po kroku: patrz DEPLOY.md.
 *
 * Aktualizując kod, ZASTĄP zawartość istniejącego pliku w projekcie
 * (Ctrl+A, wklej) — nie dodawaj drugiego pliku obok. Wszystkie pliki
 * projektu Apps Script dzielą jeden zakres, więc dwie kopie tego kodu
 * kończą się błędem "Identifier 'DETAIL_SHEET_NAME' has already been
 * declared".
 *
 * Zaleta tego podejścia: PWA nigdy nie ma dostępu do żadnego klucza czy
 * hasła do Twojego konta Google — cała autoryzacja dzieje się po stronie
 * Apps Script, uruchamianego z Twoimi uprawnieniami.
 */

// ID arkusza jest wykrywane automatycznie, bo skrypt jest "powiązany"
// (bound) z konkretnym arkuszem — nie trzeba go wpisywać ręcznie.
const DETAIL_SHEET_NAME = "Trening_Szczegoly";
const SUMMARY_SHEET_NAME = "Trening_Podsumowania";

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let sheet;
    if (payload.type === "sample") {
      sheet = ss.getSheetByName(DETAIL_SHEET_NAME);
    } else if (payload.type === "summary") {
      sheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
    } else {
      return jsonResponse({ ok: false, error: "Nieznany typ wpisu: " + payload.type });
    }

    if (!sheet) {
      return jsonResponse({ ok: false, error: "Nie znaleziono zakładki: " + payload.type });
    }

    sheet.appendRow(payload.row);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

// Odczyt danych (GET) — zwraca obie zakładki jako JSON, każdy wiersz
// jako obiekt z kluczami wziętymi z nagłówków (pierwszy wiersz arkusza).
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const detailSheet = ss.getSheetByName(DETAIL_SHEET_NAME);
    if (!detailSheet) {
      return jsonResponse({ ok: false, error: "Nie znaleziono zakładki: " + DETAIL_SHEET_NAME });
    }

    const summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
    if (!summarySheet) {
      return jsonResponse({ ok: false, error: "Nie znaleziono zakładki: " + SUMMARY_SHEET_NAME });
    }

    return jsonResponse({
      ok: true,
      detail: sheetToObjects(detailSheet),
      summary: sheetToObjects(summarySheet),
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

// Zamienia wiersze arkusza na tablicę obiektów, używając pierwszego
// wiersza (nagłówków) jako kluczy.
function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   Dystans 15 min — jednorazowe uzupełnienie starych treningów
   ============================================================
   Uruchom RĘCZNIE raz z tego edytora: wybierz z listy funkcji u góry
   "backfillDistance15Min", kliknij Uruchom. To NIE wymaga nowego
   wdrożenia (Wdróż → Zarządzaj wdrożeniami) — dotyczy tylko doGet/
   doPost, a to zwykłe uruchomienie funkcji.

   Dodaje kolumnę "Dystans 15 min (m)" w Trening_Podsumowania (jeśli
   jeszcze jej nie ma) i liczy wartość dla każdego istniejącego
   treningu na podstawie próbek z Trening_Szczegoly. Nowe treningi
   zapisane z PWA od teraz same wysyłają tę wartość — to tylko
   uzupełnienie historii sprzed tej zmiany.
   ============================================================ */
const BEST_EFFORT_WINDOW_S = 900; // 15 minut — patrz CONFIG w app.js

function backfillDistance15Min() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const detailSheet = ss.getSheetByName(DETAIL_SHEET_NAME);
  const summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!detailSheet || !summarySheet) {
    throw new Error("Nie znaleziono jednej z zakładek.");
  }

  const detailValues = detailSheet.getDataRange().getValues();
  const detailHeaders = detailValues[0];
  const sessionIdx = detailHeaders.indexOf("ID sesji");
  const elapsedIdx = detailHeaders.indexOf("Czas od startu (s)");
  const distanceIdx = detailHeaders.indexOf("Dystans (m)");
  if (sessionIdx === -1 || elapsedIdx === -1 || distanceIdx === -1) {
    throw new Error("Brak oczekiwanych kolumn w " + DETAIL_SHEET_NAME);
  }

  // Grupuj próbki po ID sesji, posortowane rosnąco wg czasu.
  const bySession = {};
  for (let i = 1; i < detailValues.length; i++) {
    const row = detailValues[i];
    const id = row[sessionIdx];
    if (!id) continue;
    if (!bySession[id]) bySession[id] = [];
    bySession[id].push({
      elapsed_s: Number(row[elapsedIdx]),
      distance_m: Number(row[distanceIdx]),
    });
  }
  Object.keys(bySession).forEach((id) => {
    bySession[id].sort((a, b) => a.elapsed_s - b.elapsed_s);
  });

  const summaryValues = summarySheet.getDataRange().getValues();
  const summaryHeaders = summaryValues[0];
  const idIdx = summaryHeaders.indexOf("ID sesji");
  if (idIdx === -1) throw new Error("Brak kolumny ID sesji w " + SUMMARY_SHEET_NAME);

  let colIdx = summaryHeaders.indexOf("Dystans 15 min (m)");
  if (colIdx === -1) {
    colIdx = summaryHeaders.length;
    summarySheet.getRange(1, colIdx + 1).setValue("Dystans 15 min (m)");
  }

  let updated = 0;
  for (let i = 1; i < summaryValues.length; i++) {
    const id = summaryValues[i][idIdx];
    const samples = bySession[id];
    const value = samples ? bestDistanceInWindow(samples, BEST_EFFORT_WINDOW_S) : null;
    summarySheet.getRange(i + 1, colIdx + 1).setValue(value === null ? "" : value);
    updated++;
  }

  Logger.log("Zaktualizowano " + updated + " wierszy w " + SUMMARY_SHEET_NAME + ".");
}

// Ta sama logika co bestDistanceInWindow w app.js — patrz komentarz
// tam. Dwa różne środowiska (przeglądarka i Apps Script), więc kod
// jest zduplikowany zamiast współdzielony.
function bestDistanceInWindow(samples, windowSeconds) {
  if (samples.length < 2) return null;
  const totalSpan = samples[samples.length - 1].elapsed_s - samples[0].elapsed_s;
  if (totalSpan < windowSeconds) return null;

  let best = -Infinity;
  let j = 0;
  for (let i = 0; i < samples.length; i++) {
    if (j < i) j = i;
    while (j < samples.length - 1 && samples[j].elapsed_s - samples[i].elapsed_s < windowSeconds) {
      j++;
    }
    if (samples[j].elapsed_s - samples[i].elapsed_s >= windowSeconds) {
      const dist = samples[j].distance_m - samples[i].distance_m;
      if (dist > best) best = dist;
    }
  }
  return best === -Infinity ? null : Math.round(best);
}

/* ============================================================
   Średni puls — usunięcie zerowych odczytów z archiwum
   ============================================================
   Rower oddaje puls 0, gdy nie trzymamy uchwytów i nie ma paska, a
   utrata kontaktu paska daje serie zer. Dawniej PWA wliczała te zera
   do średniego pulsu w Trening_Podsumowania, więc średnia była
   zaniżona (nawet do kilkudziesięciu bpm). Od wersji 1.13 nowe
   treningi liczą średnią tylko z odczytów > 0 — ta funkcja poprawia
   historię sprzed tej zmiany.

   Uruchamiasz RĘCZNIE z tego edytora (bez nowego wdrożenia, jak przy
   "backfillDistance15Min"). Dwa kroki:
   1. "previewAvgHrBackfill" — tylko wypisuje w dzienniku wykonania,
      które wiersze i jak się zmienią (stara → nowa wartość). Niczego
      nie zapisuje.
   2. "backfillAvgHr" — to samo, ale zapisuje nowe wartości w kolumnie
      "Śr. puls (bpm)". Stare wartości zostają w dzienniku, gdyby trzeba
      było coś cofnąć.
   Zmienia wyłącznie kolumnę "Śr. puls (bpm)" i tylko w treningach, w
   których w oknie jazdy są zerowe odczyty pulsu; maksimum pulsu zera
   nie zaniżały. Trening bez ani jednego odczytu > 0 dostaje pustą
   komórkę zamiast 0. Idempotentne — po zapisie kolejny podgląd pokaże
   0 wierszy do zmiany, bo zapisane wartości zgadzają się już z próbkami.
   ============================================================ */
const IDLE_SPEED_THRESHOLD_KMH = 0.5; // patrz CONFIG w app.js

// Średni puls z odczytów > 0 w oknie aktywnej jazdy (bez postoju na
// brzegach) — ta sama logika co buildSummary()/trimIdleEdges() w app.js.
// Dwa różne środowiska, więc kod jest zduplikowany zamiast współdzielony.
// Zwraca { avg, holes }: `holes` to liczba próbek w oknie bez odczytu
// pulsu (0/puste) — tylko treningi z dziurami są poprawiane.
function avgHrFromSamples_(samples) {
  const sorted = samples.slice().sort((a, b) => a.elapsed_s - b.elapsed_s);
  let first = -1;
  let last = -1;
  sorted.forEach((s, i) => {
    if ((s.speed_kmh || 0) > IDLE_SPEED_THRESHOLD_KMH) {
      if (first === -1) first = i;
      last = i;
    }
  });
  const active = first === -1 ? sorted : sorted.slice(first, last + 1);
  const hrs = active.map((s) => s.heart_rate_bpm).filter((v) => v > 0);
  return {
    avg: hrs.length === 0 ? "" : Math.round((hrs.reduce((a, b) => a + b, 0) / hrs.length) * 10) / 10,
    holes: active.length - hrs.length,
  };
}

function computeAvgHrUpdates_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const detailSheet = ss.getSheetByName(DETAIL_SHEET_NAME);
  const summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!detailSheet || !summarySheet) {
    throw new Error("Nie znaleziono jednej z zakładek.");
  }

  const detailValues = detailSheet.getDataRange().getValues();
  const detailHeaders = detailValues[0];
  const sessionIdx = detailHeaders.indexOf("ID sesji");
  const elapsedIdx = detailHeaders.indexOf("Czas od startu (s)");
  const speedIdx = detailHeaders.indexOf("Prędkość (km/h)");
  const hrIdx = detailHeaders.indexOf("Puls (bpm)");
  if (sessionIdx === -1 || elapsedIdx === -1 || speedIdx === -1 || hrIdx === -1) {
    throw new Error("Brak oczekiwanych kolumn w " + DETAIL_SHEET_NAME);
  }

  const bySession = {};
  for (let i = 1; i < detailValues.length; i++) {
    const row = detailValues[i];
    const id = row[sessionIdx];
    if (!id) continue;
    if (!bySession[id]) bySession[id] = [];
    bySession[id].push({
      elapsed_s: Number(row[elapsedIdx]),
      speed_kmh: Number(row[speedIdx]),
      heart_rate_bpm: Number(row[hrIdx]),
    });
  }

  const summaryValues = summarySheet.getDataRange().getValues();
  const summaryHeaders = summaryValues[0];
  const idIdx = summaryHeaders.indexOf("ID sesji");
  const avgIdx = summaryHeaders.indexOf("Śr. puls (bpm)");
  if (idIdx === -1 || avgIdx === -1) {
    throw new Error("Brak kolumny ID sesji lub Śr. puls (bpm) w " + SUMMARY_SHEET_NAME);
  }

  const updates = [];
  for (let i = 1; i < summaryValues.length; i++) {
    const id = summaryValues[i][idIdx];
    const samples = bySession[id];
    if (!samples) continue;
    const result = avgHrFromSamples_(samples);
    // Trening bez zerowych odczytów zostaje nietknięty — jego średnia
    // jest dobra, a ewentualne drobne różnice wynikają z dawnego
    // sposobu liczenia (np. sesja z aplikacji desktopowej albo załatana
    // luka), nie z dziur w pulsie.
    if (result.holes === 0) continue;
    const next = result.avg;
    const old = summaryValues[i][avgIdx];
    const same = next === "" ? old === "" : Number(old) === next;
    if (!same) updates.push({ row: i + 1, col: avgIdx + 1, id: id, old: old, next: next });
  }
  return updates;
}

function previewAvgHrBackfill() {
  const updates = computeAvgHrUpdates_();
  updates.forEach((u) => Logger.log(u.id + ": " + u.old + " → " + (u.next === "" ? "(puste)" : u.next)));
  Logger.log("PODGLĄD (nic nie zapisano): do zmiany " + updates.length + " wierszy w " + SUMMARY_SHEET_NAME + ".");
}

function backfillAvgHr() {
  const summarySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SUMMARY_SHEET_NAME);
  const updates = computeAvgHrUpdates_();
  updates.forEach((u) => {
    summarySheet.getRange(u.row, u.col).setValue(u.next);
    Logger.log(u.id + ": " + u.old + " → " + (u.next === "" ? "(puste)" : u.next));
  });
  Logger.log("Zaktualizowano " + updates.length + " wierszy w " + SUMMARY_SHEET_NAME + ".");
}

/* ============================================================
   Uzupełnienie luki w treningu 2026-09-11 (sesja 20260911115447.)
   ============================================================
   Podczas tego treningu przez ~91 sekund pod koniec (odebrany
   telefon) rower/aplikacja nie zapisały żadnych próbek — po
   rozmowie jazda była kontynuowana w tym samym tempie, ale w
   arkuszu zostaje z tego powodu "dziura": czas trwania wychodzi
   14:33 zamiast realnych ~16:08, a "Dystans 15 min" jest pusty
   (bo 14:33 < progu 15 minut).

   Ta funkcja jest jednorazowa i dotyczy WYŁĄCZNIE tej jednej sesji:
   - dopisuje kolumnę "Źródło" w Trening_Szczegoly (stare wiersze
     zostają puste = dane realne z czujnika)
   - dopisuje próbki na czas luki, kontynuując ostatnie znane
     wartości (prędkość/kadencja/moc/puls/opór — użytkownik
     potwierdził, że jechał dalej w tym samym tempie), z narastającym
     dystansem i kaloriami — oznaczone Źródło = "szacowane"
   - przelicza i NADPISUJE wiersz podsumowania tej sesji (czas
     trwania, dystans, średnie/maks., Dystans 15 min) na podstawie
     pełnego zbioru próbek (realne + szacowane)

   Uruchom RĘCZNIE raz z tego edytora (jak backfillDistance15Min) —
   nie wymaga nowego wdrożenia.
   ============================================================ */
function patchCallGapSession_20260911() {
  const TARGET_SESSION_ID = "20260911115447.";
  const GAP_TOTAL_S = 91; // różnica między realnym czasem zegarowym a licznikiem roweru
  const SAMPLE_INTERVAL_S = 5; // patrz CONFIG.SAMPLE_INTERVAL_S w app.js
  const SOURCE_COLUMN = "Źródło";
  const ESTIMATED_LABEL = "szacowane";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const detailSheet = ss.getSheetByName(DETAIL_SHEET_NAME);
  const summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!detailSheet || !summarySheet) throw new Error("Nie znaleziono jednej z zakładek.");

  // --- 1. Kolumna "Źródło" w Trening_Szczegoly (dodaj, jeśli brak) ---
  let detailHeaders = detailSheet.getRange(1, 1, 1, detailSheet.getLastColumn()).getValues()[0];
  let sourceColIdx = detailHeaders.indexOf(SOURCE_COLUMN);
  if (sourceColIdx === -1) {
    sourceColIdx = detailHeaders.length;
    detailSheet.getRange(1, sourceColIdx + 1).setValue(SOURCE_COLUMN);
    detailHeaders = detailHeaders.concat([SOURCE_COLUMN]);
  }

  const idIdx = detailHeaders.indexOf("ID sesji");
  const tsIdx = detailHeaders.indexOf("Znacznik czasu");
  const elapsedIdx = detailHeaders.indexOf("Czas od startu (s)");
  const speedIdx = detailHeaders.indexOf("Prędkość (km/h)");
  const cadenceIdx = detailHeaders.indexOf("Kadencja (obr/min)");
  const distanceIdx = detailHeaders.indexOf("Dystans (m)");
  const resistanceIdx = detailHeaders.indexOf("Opór");
  const powerIdx = detailHeaders.indexOf("Moc (W)");
  const hrIdx = detailHeaders.indexOf("Puls (bpm)");
  const kcalTotalIdx = detailHeaders.indexOf("Kalorie łącznie (kcal)");
  const kcalHourIdx = detailHeaders.indexOf("Kalorie/h (kcal)");
  const kcalMinIdx = detailHeaders.indexOf("Kalorie/min (kcal)");

  const detailValues = detailSheet.getDataRange().getValues();
  const sessionRows = [];
  for (let i = 1; i < detailValues.length; i++) {
    if (detailValues[i][idIdx] === TARGET_SESSION_ID) sessionRows.push(detailValues[i]);
  }
  if (sessionRows.length === 0) throw new Error("Nie znaleziono próbek dla sesji " + TARGET_SESSION_ID);

  const alreadyPatched = sessionRows.some((r) => r[sourceColIdx] === ESTIMATED_LABEL);
  if (alreadyPatched) {
    Logger.log("Sesja " + TARGET_SESSION_ID + " ma już dopisane szacowane próbki — nic nie robię.");
    return;
  }

  sessionRows.sort((a, b) => a[elapsedIdx] - b[elapsedIdx]);
  const last = sessionRows[sessionRows.length - 1];

  const lastElapsed = last[elapsedIdx];
  const lastSpeed = last[speedIdx];
  const lastCadence = last[cadenceIdx];
  const lastDistance = last[distanceIdx];
  const lastResistance = last[resistanceIdx];
  const lastPower = last[powerIdx];
  const lastHr = last[hrIdx];
  const lastKcalTotal = last[kcalTotalIdx];
  const lastKcalHour = last[kcalHourIdx];
  const lastKcalMin = last[kcalMinIdx];
  const lastTimestamp = new Date(last[tsIdx]);
  const speedMs = lastSpeed / 3.6;

  const newRows = [];
  for (let dt = SAMPLE_INTERVAL_S; dt <= GAP_TOTAL_S; dt += SAMPLE_INTERVAL_S) {
    const row = new Array(detailHeaders.length).fill("");
    row[idIdx] = TARGET_SESSION_ID;
    row[tsIdx] = new Date(lastTimestamp.getTime() + dt * 1000);
    row[elapsedIdx] = lastElapsed + dt;
    row[speedIdx] = lastSpeed;
    row[cadenceIdx] = lastCadence;
    row[distanceIdx] = Math.round(lastDistance + speedMs * dt);
    row[resistanceIdx] = lastResistance;
    row[powerIdx] = lastPower;
    row[hrIdx] = lastHr;
    row[kcalTotalIdx] = Math.round(lastKcalTotal + (lastKcalMin / 60) * dt);
    row[kcalHourIdx] = lastKcalHour;
    row[kcalMinIdx] = lastKcalMin;
    row[sourceColIdx] = ESTIMATED_LABEL;
    newRows.push(row);
  }

  detailSheet.getRange(detailSheet.getLastRow() + 1, 1, newRows.length, detailHeaders.length).setValues(newRows);

  // --- 2. Przelicz i nadpisz wiersz podsumowania tej sesji ---
  const allSamples = sessionRows
    .map((r) => ({
      elapsed_s: r[elapsedIdx], speed_kmh: r[speedIdx], cadence_rpm: r[cadenceIdx],
      distance_m: r[distanceIdx], resistance_level: r[resistanceIdx], power_w: r[powerIdx],
      heart_rate_bpm: r[hrIdx], kcal_total: r[kcalTotalIdx],
    }))
    .concat(newRows.map((r) => ({
      elapsed_s: r[elapsedIdx], speed_kmh: r[speedIdx], cadence_rpm: r[cadenceIdx],
      distance_m: r[distanceIdx], resistance_level: r[resistanceIdx], power_w: r[powerIdx],
      heart_rate_bpm: r[hrIdx], kcal_total: r[kcalTotalIdx],
    })))
    .sort((a, b) => a.elapsed_s - b.elapsed_s);

  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const speeds = allSamples.map((s) => s.speed_kmh);
  const cadences = allSamples.map((s) => s.cadence_rpm);
  const powers = allSamples.map((s) => s.power_w);
  const resistances = allSamples.map((s) => s.resistance_level);
  const hrs = allSamples.map((s) => s.heart_rate_bpm);
  const elapsedVals = allSamples.map((s) => s.elapsed_s);
  const durationS = Math.max(...elapsedVals) - Math.min(...elapsedVals);
  const pad = (n) => String(n).padStart(2, "0");
  const durationStr =
    pad(Math.floor(durationS / 3600)) + ":" +
    pad(Math.floor((durationS % 3600) / 60)) + ":" +
    pad(Math.floor(durationS % 60));
  const distance15min = bestDistanceInWindow(
    allSamples.map((s) => ({ elapsed_s: s.elapsed_s, distance_m: s.distance_m })),
    BEST_EFFORT_WINDOW_S
  );

  const summaryHeaders = summarySheet.getRange(1, 1, 1, summarySheet.getLastColumn()).getValues()[0];
  const summaryValues = summarySheet.getDataRange().getValues();
  const summaryIdIdx = summaryHeaders.indexOf("ID sesji");
  let summaryRowNum = -1;
  for (let i = 1; i < summaryValues.length; i++) {
    if (summaryValues[i][summaryIdIdx] === TARGET_SESSION_ID) { summaryRowNum = i + 1; break; }
  }
  if (summaryRowNum === -1) throw new Error("Nie znaleziono wiersza podsumowania dla sesji " + TARGET_SESSION_ID);

  const setCell = (headerName, value) => {
    const idx = summaryHeaders.indexOf(headerName);
    if (idx === -1) return;
    summarySheet.getRange(summaryRowNum, idx + 1).setValue(value);
  };

  setCell("Czas trwania (HH:MM:SS)", durationStr);
  setCell("Dystans całkowity (m)", Math.max(...allSamples.map((s) => s.distance_m)));
  setCell("Śr. prędkość (km/h)", Math.round(mean(speeds) * 100) / 100);
  setCell("Maks. prędkość (km/h)", Math.round(Math.max(...speeds) * 100) / 100);
  setCell("Śr. kadencja (obr/min)", Math.round(mean(cadences) * 10) / 10);
  setCell("Maks. kadencja (obr/min)", Math.max(...cadences));
  setCell("Śr. moc (W)", Math.round(mean(powers) * 10) / 10);
  setCell("Maks. moc (W)", Math.max(...powers));
  setCell("Śr. opór", Math.round(mean(resistances) * 10) / 10);
  setCell("Śr. puls (bpm)", Math.round(mean(hrs) * 10) / 10);
  setCell("Maks. puls (bpm)", Math.max(...hrs));
  setCell("Kalorie łącznie (kcal)", Math.max(...allSamples.map((s) => s.kcal_total)));
  setCell("Dystans 15 min (m)", distance15min !== null ? distance15min : "");

  Logger.log(
    "Sesja " + TARGET_SESSION_ID + ": dopisano " + newRows.length + " szacowanych próbek, " +
    "nowy czas trwania " + durationStr + ", Dystans 15 min = " + distance15min
  );
}
