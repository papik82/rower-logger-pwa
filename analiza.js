"use strict";

async function loadAnalysis() {
  const container = document.getElementById("analysisContent");
  container.textContent = `Wczytywanie danych… (wersja ${APP_VERSION})`;

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
    renderDistanceChart(container, data.summary || []);
  } catch (err) {
    container.textContent = "Błąd połączenia z Google Apps Script: " + err.message;
  }
}

function renderDistanceChart(container, rows) {
  const sessions = rows
    .map((row) => {
      const raw15 = row["Dystans 15 min (m)"];
      return {
        date: row["Data"],
        km: Number(row["Dystans całkowity (m)"]) / 1000,
        km15: raw15 ? Number(raw15) / 1000 : null,
      };
    })
    .filter((s) => s.date && Number.isFinite(s.km));

  if (sessions.length === 0) {
    container.textContent = "Brak zapisanych treningów.";
    return;
  }

  // Chronologicznie, najstarszy trening po lewej — naturalny kierunek
  // odczytu osi czasu.
  sessions.sort((a, b) => new Date(a.date) - new Date(b.date));

  const card = document.createElement("div");
  card.className = "stat-card";

  const header = document.createElement("div");
  header.className = "sparkline-header";

  const label = document.createElement("p");
  label.className = "label";
  label.textContent = "Dystans na trening (km)";
  header.appendChild(label);

  const legend = document.createElement("div");
  legend.className = "sparkline-legend";
  legend.innerHTML =
    '<span class="legend-item"><span class="legend-dot" style="background: var(--accent);"></span>cały trening</span>' +
    '<span class="legend-item"><span class="legend-dot" style="background: var(--hr-color);"></span>najlepsze 15 min</span>';
  header.appendChild(legend);

  card.appendChild(header);

  const chartWrap = document.createElement("div");
  chartWrap.className = "bar-chart-wrap";
  const canvas = document.createElement("canvas");
  canvas.id = "distanceChart";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Wykres słupkowy dystansu w kilometrach dla kolejnych treningów");
  chartWrap.appendChild(canvas);
  card.appendChild(chartWrap);

  container.className = "";
  container.replaceChildren(card);

  const redraw = () => drawBarChart(canvas, sessions);
  redraw();
  window.addEventListener("resize", redraw);
}

function drawBarChart(canvas, sessions) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue("--accent").trim() || "#2FD9C4";
  const hrColor = style.getPropertyValue("--hr-color").trim() || "#FF9F43";
  const muted = style.getPropertyValue("--text-muted").trim() || "#8CA0A6";

  const paddingTop = 16;
  const paddingBottom = 22;
  const chartHeight = h - paddingTop - paddingBottom;
  const maxKm = Math.max(...sessions.map((s) => s.km), 1);

  const step = w / sessions.length;
  const barWidth = Math.max(3, Math.min(28, step - 6));

  ctx.textAlign = "center";
  ctx.font = "10px Roboto, system-ui, sans-serif";

  sessions.forEach((s, i) => {
    const x = i * step + (step - barWidth) / 2;

    const barHeight = maxKm > 0 ? (s.km / maxKm) * chartHeight : 0;
    const y = paddingTop + (chartHeight - barHeight);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Najlepsze 15 min — węższy, nakładany słupek pokazujący, jaka
    // część całego treningu przypadła na najlepszy 15-minutowy odcinek.
    if (s.km15 !== null) {
      const innerWidth = Math.max(2, barWidth * 0.5);
      const innerX = x + (barWidth - innerWidth) / 2;
      const height15 = maxKm > 0 ? (s.km15 / maxKm) * chartHeight : 0;
      const y15 = paddingTop + (chartHeight - height15);
      ctx.fillStyle = hrColor;
      ctx.fillRect(innerX, y15, innerWidth, height15);
    }
  });

  // Etykiety dat pod słupkami — pokazujemy tylko tyle, ile się zmieści
  // bez zlewania się (co N-ty słupek). Ostatni trening zawsze widoczny,
  // ale zastępuje najbliższy regularny znacznik zamiast się z nim zlewać.
  const maxLabels = Math.max(1, Math.floor(w / 48));
  const labelStep = Math.max(1, Math.ceil(sessions.length / maxLabels));
  const shownIndices = [];
  for (let i = 0; i < sessions.length; i += labelStep) shownIndices.push(i);
  const lastIndex = sessions.length - 1;
  const lastShown = shownIndices[shownIndices.length - 1];
  if (lastShown !== lastIndex) {
    if (lastIndex - lastShown < labelStep / 2) {
      shownIndices[shownIndices.length - 1] = lastIndex;
    } else {
      shownIndices.push(lastIndex);
    }
  }

  ctx.fillStyle = muted;
  shownIndices.forEach((i) => {
    const x = i * step + step / 2;
    ctx.fillText(formatShortDate(sessions[i].date), x, h - 8);
  });
}

function formatShortDate(value) {
  const d = new Date(value);
  if (isNaN(d)) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

loadAnalysis();
