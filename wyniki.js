"use strict";

const HIDDEN_COLUMNS = ["ID sesji", "Koniec"];

// Skrócone, dwuwierszowe etykiety nagłówków — pełne nazwy kolumn z
// arkusza (z jednostką w nawiasie) niepotrzebnie rozszerzały tabelę.
// Kolumny bez wpisu tutaj (np. "Data", "Start") zostają bez zmian.
const COLUMN_LABELS = {
  "Czas trwania (HH:MM:SS)": "Czas\ntrwania",
  "Dystans całkowity (m)": "Dystans\n(m)",
  "Śr. prędkość (km/h)": "Śr. prędkość\n(km/h)",
  "Maks. prędkość (km/h)": "Maks. prędkość\n(km/h)",
  "Śr. kadencja (obr/min)": "Śr. kadencja\n(obr/min)",
  "Maks. kadencja (obr/min)": "Maks. kadencja\n(obr/min)",
  "Śr. moc (W)": "Śr. moc\n(W)",
  "Maks. moc (W)": "Maks. moc\n(W)",
  "Śr. puls (bpm)": "Śr. puls\n(bpm)",
  "Maks. puls (bpm)": "Maks. puls\n(bpm)",
  "Kalorie łącznie (kcal)": "Kalorie\n(kcal)",
};

// Arkusz zapisuje "Data" i "Start" jako pełne znaczniki UTC (komórki
// data/godzina z Arkuszy Google są serializowane jako ISO). Formatujemy
// je z powrotem na czas lokalny (strefa arkusza — Europe/Warsaw), więc
// wynik jest ten sam niezależnie od strefy czasowej ustawionej na
// telefonie, z którego ktoś akurat ogląda stronę.
const COLUMN_FORMATTERS = {
  "Data": (v) => formatDate(v),
  "Start": (v) => formatTime(v),
  "Czas trwania (HH:MM:SS)": (v) => formatDuration(v),
};

function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d)) return value;
  const parts = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatTime(value) {
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleTimeString("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Arkusz czasem zapisuje ten czas trwania jako zwykły tekst "HH:MM:SS"
// (bez zmian), a czasem — gdy Arkusze Google same rozpoznają go jako
// wartość godzinową — jako pełny znacznik UTC, tak samo jak "Start".
// Obsługujemy oba przypadki.
function formatDuration(value) {
  if (typeof value === "string" && /^\d{1,2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleTimeString("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Niektóre starsze próbki prędkości mają błędy zaokrąglenia
// zmiennoprzecinkowego (np. 29.400000000000002) — obcinamy je do
// dwóch miejsc po przecinku przy wyświetlaniu.
function formatNumber(value) {
  if (typeof value !== "number") return value;
  return Math.round(value * 100) / 100;
}

async function loadResults() {
  const container = document.getElementById("resultsContainer");
  const url = getAppsScriptUrl();
  if (!url) {
    container.textContent = 'Nie ustawiono adresu Google Apps Script. Otwórz "Ustawienia" w menu powyżej.';
    return;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) {
      container.textContent = "Błąd odczytu danych: " + (data.error || "nieznany błąd.");
      return;
    }
    renderTable(container, data.summary || []);
  } catch (err) {
    container.textContent = "Błąd połączenia z Google Apps Script: " + err.message;
  }
}

function renderTable(container, rows) {
  if (rows.length === 0) {
    container.textContent = "Brak zapisanych wyników.";
    return;
  }

  const headers = Object.keys(rows[0]).filter((h) => !HIDDEN_COLUMNS.includes(h));
  const newestFirst = rows.slice().reverse();

  const table = document.createElement("table");
  table.className = "data-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = COLUMN_LABELS[h] || h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  newestFirst.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((h) => {
      const td = document.createElement("td");
      const raw = row[h];
      const format = COLUMN_FORMATTERS[h];
      td.textContent = (format && raw ? format(raw) : formatNumber(raw)) ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const wrap = document.createElement("div");
  wrap.className = "data-table-wrap";
  wrap.appendChild(table);

  container.className = "";
  container.replaceChildren(wrap);
}

loadResults();
