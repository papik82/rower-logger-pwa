/**
 * Rower Logger — most między aplikacją PWA a Google Sheets.
 *
 * NIE hostuj tego pliku nigdzie — wklej całość do edytora Apps Script
 * (Rozszerzenia → Apps Script) w Twoim arkuszu "Rower - Dziennik
 * Treningów", a następnie wdróż jako aplikację internetową (Web App).
 * Pełna instrukcja krok po kroku: patrz DEPLOY.md.
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
