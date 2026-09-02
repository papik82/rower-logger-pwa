"use strict";

const HIDDEN_COLUMNS = ["ID sesji", "Koniec"];

// Arkusz zapisuje "Data" i "Start" jako pełne znaczniki UTC (komórki
// data/godzina z Arkuszy Google są serializowane jako ISO). Formatujemy
// je z powrotem na czas lokalny (strefa arkusza — Europe/Warsaw), więc
// wynik jest ten sam niezależnie od strefy czasowej ustawionej na
// telefonie, z którego ktoś akurat ogląda stronę.
const COLUMN_FORMATTERS = {
  "Data": (v) => formatDate(v),
  "Start": (v) => formatTime(v),
};

function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" });
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
    th.textContent = h;
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
      td.textContent = raw && format ? format(raw) : raw ?? "";
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
