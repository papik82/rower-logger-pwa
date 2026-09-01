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
