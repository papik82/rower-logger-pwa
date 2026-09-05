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
