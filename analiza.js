"use strict";

let activeChartCanvas = null;
let activeChartSessions = null;
let activeChartSelectedIndex = null;
window.addEventListener("resize", () => {
  if (activeChartCanvas && activeChartSessions) {
    drawBarChart(activeChartCanvas, activeChartSessions, activeChartSelectedIndex);
  }
});

async function loadAnalysis(forceRefresh) {
  const container = document.getElementById("analysisContent");
  const url = getAppsScriptUrl();
  if (!url) {
    container.textContent = 'Nie ustawiono adresu Google Apps Script. Otwórz "Ustawienia" w menu powyżej.';
    return;
  }

  if (!forceRefresh && !getCachedAppsScriptData()) {
    container.textContent = `Wczytywanie danych… (wersja ${APP_VERSION})`;
  }

  try {
    const { data } = await fetchAppsScriptData(forceRefresh);
    if (!data.ok) {
      container.textContent = "Błąd odczytu danych: " + (data.error || "nieznany błąd.");
      return;
    }
    renderDistanceChart(container, data.summary || []);
  } catch (err) {
    container.textContent = "Błąd połączenia z Google Apps Script: " + err.message;
  }
}

document.getElementById("refreshBtn").addEventListener("click", () => {
  spinRefreshButton();
  loadAnalysis(true);
});

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

  // `activeChart*` zamiast dodawania nowego listenera przy każdym
  // wywołaniu — inaczej kolejne odświeżenia (przycisk, powrót na
  // stronę) nagromadziłyby listenery ze starych, już usuniętych płócien.
  activeChartCanvas = canvas;
  activeChartSessions = sessions;
  activeChartSelectedIndex = null;
  drawBarChart(canvas, sessions, null);

  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const step = canvas.clientWidth / sessions.length;
    const index = Math.max(0, Math.min(sessions.length - 1, Math.floor(x / step)));
    // Ponowny klik na tym samym słupku chowa etykietę zamiast trzymać
    // ją przyklejoną na stałe.
    activeChartSelectedIndex = activeChartSelectedIndex === index ? null : index;
    drawBarChart(canvas, sessions, activeChartSelectedIndex);
  });
}

function drawBarChart(canvas, sessions, selectedIndex) {
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
  const text = style.getPropertyValue("--text").trim() || "#F2F5F4";

  const paddingTop = 16;
  const paddingBottom = 22;
  const chartHeight = h - paddingTop - paddingBottom;
  const maxKm = Math.max(...sessions.map((s) => s.km), 1);

  const step = w / sessions.length;
  const barWidth = Math.max(3, Math.min(28, step - 6));

  ctx.textAlign = "center";
  ctx.font = "10px Roboto, system-ui, sans-serif";

  let selected = null;

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

    if (i === selectedIndex) {
      // Zapamiętane do narysowania obwódki i etykiety na wierzchu,
      // dopiero po wszystkich słupkach — inaczej sąsiedni słupek
      // mógłby ją częściowo zasłonić.
      selected = { session: s, x, y, barWidth, barHeight, barCenterX: x + barWidth / 2 };
    }
  });

  if (selected) {
    ctx.strokeStyle = text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(selected.x - 1.5, selected.y - 1.5, selected.barWidth + 3, selected.barHeight + 3);
    drawChartTooltip(ctx, w, selected, style);
  }

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

  ctx.textAlign = "center";
  ctx.fillStyle = muted;
  shownIndices.forEach((i) => {
    const x = i * step + step / 2;
    ctx.fillText(formatShortDate(sessions[i].date), x, h - 8);
  });
}

// Dymek z dokładnymi wartościami dla klikniętego/tapniętego słupka —
// rysowany na płótnie (jak reszta wykresu), nad słupkiem, przesunięty
// tak, żeby zmieścić się w szerokości płótna przy skrajnych słupkach.
function drawChartTooltip(ctx, canvasWidth, selected, style) {
  const surface2 = style.getPropertyValue("--surface-2").trim() || "#232E33";
  const border = style.getPropertyValue("--border").trim() || "#2A353A";
  const text = style.getPropertyValue("--text").trim() || "#F2F5F4";

  const lines = [formatFullDate(selected.session.date), `Dystans: ${selected.session.km.toFixed(2)} km`];
  if (selected.session.km15 !== null) {
    lines.push(`Najlepsze 15 min: ${selected.session.km15.toFixed(2)} km`);
  }

  ctx.font = "11px Roboto, system-ui, sans-serif";
  const lineHeight = 14;
  const paddingX = 8;
  const paddingY = 6;
  const boxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width)) + paddingX * 2;
  const boxHeight = lines.length * lineHeight + paddingY * 2 - 4;

  let boxX = selected.barCenterX - boxWidth / 2;
  boxX = Math.max(2, Math.min(canvasWidth - boxWidth - 2, boxX));
  let boxY = selected.y - boxHeight - 8;
  // Gdy słupek sięga blisko górnej krawędzi płótna, dymek nad nim by
  // się nie zmieścił — pokazujemy go wtedy pod szczytem słupka.
  if (boxY < 2) boxY = selected.y + 8;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
  ctx.fillStyle = surface2;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = text;
  lines.forEach((line, i) => {
    ctx.fillText(line, boxX + paddingX, boxY + paddingY + lineHeight * i + 9);
  });
}

function formatFullDate(value) {
  const d = new Date(value);
  if (isNaN(d)) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
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
