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
    .map((row) => ({
      date: row["Data"],
      km: Number(row["Dystans całkowity (m)"]) / 1000,
    }))
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

  const label = document.createElement("p");
  label.className = "label";
  label.textContent = "Dystans na trening (km)";
  card.appendChild(label);

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
    const barHeight = maxKm > 0 ? (s.km / maxKm) * chartHeight : 0;
    const x = i * step + (step - barWidth) / 2;
    const y = paddingTop + (chartHeight - barHeight);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, barWidth, barHeight);
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
