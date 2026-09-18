"use strict";

// Metryki dostępne na wykresie trendów. `main` to wartość rysowana jako
// słupek/linia w kolorze akcentu, `overlay` — druga seria w kolorze
// pulsu (najlepsze 15 min dla dystansu, wartość maksymalna dla reszty).
// `col` to nagłówek kolumny w arkuszu `Trening_Podsumowania`, `scale`
// przelicza jednostkę arkusza na wyświetlaną (np. m → km).
// Dystans zostaje słupkowy (suma za trening, oś od zera), reszta jest
// liniowa z automatycznym zakresem osi — przy słupkach od zera różnice
// rzędu 130 vs 140 bpm byłyby praktycznie niewidoczne.
const METRICS = [
  {
    id: "distance", label: "Dystans", unit: "km", decimals: 2, type: "bars",
    main: { col: "Dystans całkowity (m)", scale: 0.001, name: "Dystans", legend: "cały trening" },
    overlay: { col: "Dystans 15 min (m)", scale: 0.001, name: "Najlepsze 15 min", legend: "najlepsze 15 min" },
  },
  {
    id: "speed", label: "Prędkość", unit: "km/h", decimals: 1, type: "line",
    main: { col: "Śr. prędkość (km/h)", scale: 1, name: "Śr. prędkość", legend: "średnia" },
    overlay: { col: "Maks. prędkość (km/h)", scale: 1, name: "Maks. prędkość", legend: "maksymalna" },
  },
  {
    id: "power", label: "Moc", unit: "W", decimals: 1, type: "line",
    main: { col: "Śr. moc (W)", scale: 1, name: "Śr. moc", legend: "średnia" },
    overlay: { col: "Maks. moc (W)", scale: 1, name: "Maks. moc", legend: "maksymalna" },
  },
  {
    id: "hr", label: "Puls", unit: "bpm", decimals: 1, type: "line",
    main: { col: "Śr. puls (bpm)", scale: 1, name: "Śr. puls", legend: "średni" },
    overlay: { col: "Maks. puls (bpm)", scale: 1, name: "Maks. puls", legend: "maksymalny" },
  },
  {
    id: "cadence", label: "Kadencja", unit: "obr/min", decimals: 1, type: "line",
    main: { col: "Śr. kadencja (obr/min)", scale: 1, name: "Śr. kadencja", legend: "średnia" },
    overlay: { col: "Maks. kadencja (obr/min)", scale: 1, name: "Maks. kadencja", legend: "maksymalna" },
  },
];

const RANGE_PRESETS = [
  { id: "30", label: "30 dni", days: 30 },
  { id: "90", label: "90 dni", days: 90 },
  { id: "365", label: "Rok", days: 365 },
  { id: "all", label: "Wszystko", days: null },
];

// Wybór metryki i zakresu przeżywa odświeżenie danych (przycisk 🔄),
// bo renderAnalysis() buduje kartę od nowa.
const analysisState = { metricId: "distance", presetId: "all", from: "", to: "" };

const LINE_CHART_LEFT_PADDING = 34;

let activeChartCanvas = null;
let activeChartSessions = null;
let activeChartSelectedIndex = null;
let activeChartMetric = null;
window.addEventListener("resize", () => {
  if (activeChartCanvas && activeChartSessions && activeChartSessions.length > 0) {
    drawTrendChart(activeChartCanvas, activeChartSessions, activeChartSelectedIndex, activeChartMetric);
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
    renderAnalysis(container, data.summary || []);
  } catch (err) {
    container.textContent = "Błąd połączenia z Google Apps Script: " + err.message;
  }
}

document.getElementById("refreshBtn").addEventListener("click", () => {
  spinRefreshButton();
  loadAnalysis(true);
});

// Puste komórki i zera to "brak danych", nie wartość: sesja bez
// odczytu pulsu (rower oddaje 0, gdy nie trzymamy uchwytów i nie ma
// paska) ma średnią 0 i rozciągnęłaby oś Y do zera, zniekształcając
// trend. Żadna z metryk nie ma sensownej wartości ≤ 0 w trendzie.
function toNumber(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Arkusz zapisuje "Data" jako pełny znacznik UTC — do porównań z polami
// zakresu dat bierzemy dzień w strefie arkusza (Europe/Warsaw), tak samo
// jak w Wynikach ("sv-SE" daje format RRRR-MM-DD).
function warsawDay(value) {
  const d = new Date(value);
  if (isNaN(d)) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(d);
}

function daysAgo(days) {
  const d = new Date(warsawDay(new Date()) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Treningi z niepustą wartością wybranej metryki, w podanym zakresie
// dat, chronologicznie (najstarszy po lewej — naturalny kierunek osi
// czasu). Starsze sesje bez np. mocy są po prostu pomijane.
function buildSessions(rows, metric, from, to) {
  return rows
    .map((row) => {
      const main = toNumber(row[metric.main.col]);
      const overlay = toNumber(row[metric.overlay.col]);
      return {
        date: row["Data"],
        day: warsawDay(row["Data"]),
        value: main === null ? null : main * metric.main.scale,
        overlay: overlay === null ? null : overlay * metric.overlay.scale,
      };
    })
    .filter((s) => s.day && s.value !== null)
    .filter((s) => (!from || s.day >= from) && (!to || s.day <= to))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderAnalysis(container, rows) {
  if (rows.length === 0) {
    container.textContent = "Brak zapisanych treningów.";
    return;
  }

  const card = el("div", "stat-card");

  const header = el("div", "sparkline-header");
  const title = el("p", "label");
  const legend = el("div", "sparkline-legend");
  header.append(title, legend);
  card.appendChild(header);

  const metricRow = el("div", "chip-row");
  const metricButtons = METRICS.map((metric) => {
    const btn = el("button", "chip", metric.label);
    btn.type = "button";
    btn.addEventListener("click", () => {
      analysisState.metricId = metric.id;
      update();
    });
    metricRow.appendChild(btn);
    return { btn, id: metric.id };
  });
  card.appendChild(metricRow);

  const presetRow = el("div", "chip-row");
  const presetButtons = RANGE_PRESETS.map((preset) => {
    const btn = el("button", "chip", preset.label);
    btn.type = "button";
    btn.addEventListener("click", () => {
      analysisState.presetId = preset.id;
      analysisState.from = preset.days === null ? "" : daysAgo(preset.days);
      analysisState.to = "";
      update();
    });
    presetRow.appendChild(btn);
    return { btn, id: preset.id };
  });
  card.appendChild(presetRow);

  const dateRow = el("div", "range-dates");
  const fromInput = el("input");
  fromInput.type = "date";
  const toInput = el("input");
  toInput.type = "date";
  const fromField = el("label", "range-field", "Od");
  fromField.appendChild(fromInput);
  const toField = el("label", "range-field", "Do");
  toField.appendChild(toInput);
  dateRow.append(fromField, toField);
  card.appendChild(dateRow);

  const onCustomRange = () => {
    analysisState.presetId = "custom";
    analysisState.from = fromInput.value;
    analysisState.to = toInput.value;
    update();
  };
  fromInput.addEventListener("change", onCustomRange);
  toInput.addEventListener("change", onCustomRange);

  const chartWrap = el("div", "bar-chart-wrap");
  const canvas = el("canvas");
  canvas.id = "trendChart";
  canvas.setAttribute("role", "img");
  const emptyMsg = el("p", "chart-empty");
  chartWrap.append(canvas, emptyMsg);
  card.appendChild(chartWrap);

  // Jeden listener na płótnie czyta bieżący stan z `activeChart*` —
  // płótno jest to samo przy zmianie metryki/zakresu, zmieniają się
  // tylko dane, więc nie ma listenerów do sprzątania.
  canvas.addEventListener("click", (event) => {
    if (!activeChartSessions || activeChartSessions.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const { left, step } = chartLayout(canvas.clientWidth, activeChartSessions.length, activeChartMetric);
    const index = Math.max(0, Math.min(activeChartSessions.length - 1, Math.floor((x - left) / step)));
    // Ponowny klik na tym samym punkcie chowa etykietę zamiast trzymać
    // ją przyklejoną na stałe.
    activeChartSelectedIndex = activeChartSelectedIndex === index ? null : index;
    drawTrendChart(canvas, activeChartSessions, activeChartSelectedIndex, activeChartMetric);
  });

  function update() {
    const metric = METRICS.find((m) => m.id === analysisState.metricId);

    title.textContent = `${metric.label} na trening (${metric.unit})`;
    legend.innerHTML =
      `<span class="legend-item"><span class="legend-dot" style="background: var(--accent);"></span>${metric.main.legend}</span>` +
      `<span class="legend-item"><span class="legend-dot" style="background: var(--hr-color);"></span>${metric.overlay.legend}</span>`;

    metricButtons.forEach(({ btn, id }) => btn.classList.toggle("active", id === metric.id));
    presetButtons.forEach(({ btn, id }) => btn.classList.toggle("active", id === analysisState.presetId));
    fromInput.value = analysisState.from;
    toInput.value = analysisState.to;

    const sessions = buildSessions(rows, metric, analysisState.from, analysisState.to);
    activeChartCanvas = canvas;
    activeChartSessions = sessions;
    activeChartSelectedIndex = null;
    activeChartMetric = metric;

    if (sessions.length === 0) {
      canvas.style.display = "none";
      emptyMsg.style.display = "";
      emptyMsg.textContent = `Brak treningów z danymi „${metric.label}” w wybranym zakresie dat.`;
      return;
    }
    emptyMsg.style.display = "none";
    canvas.style.display = "";
    canvas.setAttribute(
      "aria-label",
      `Wykres ${metric.type === "bars" ? "słupkowy" : "liniowy"}: ${metric.label.toLowerCase()} (${metric.unit}) dla kolejnych treningów`
    );
    drawTrendChart(canvas, sessions, null, metric);
  }

  container.className = "";
  container.replaceChildren(card);
  const recordsCard = buildRecordsCard(rows);
  if (recordsCard) container.appendChild(recordsCard);
  update();
}

// Czas trwania bywa w arkuszu zwykłym tekstem "HH:MM:SS" albo pełnym
// znacznikiem UTC (Arkusze same rozpoznają go jako godzinę) — ta sama
// obsługa obu wariantów co formatDuration() w wyniki.js.
function durationSeconds(value) {
  if (typeof value === "string" && /^\d{1,2}:\d{2}:\d{2}$/.test(value)) {
    const [h, m, s] = value.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  }
  const d = new Date(value);
  if (isNaN(d)) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const total = get("hour") * 3600 + get("minute") * 60 + get("second");
  return total > 0 ? total : null;
}

function formatDurationHms(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}

// Rekordy osobiste — "więcej = lepiej" dla każdej pozycji. Puls
// pokazujemy tylko jako maksimum (wysoka średnia to nie osiągnięcie).
const RECORDS = [
  { label: "Najdłuższy dystans", unit: "km", get: (r) => scaled(r["Dystans całkowity (m)"], 0.001), fmt: (v) => v.toFixed(2) },
  { label: "Najdłuższy trening", unit: "", get: (r) => durationSeconds(r["Czas trwania (HH:MM:SS)"]), fmt: formatDurationHms },
  { label: "Najlepsze 15 min", unit: "km", get: (r) => scaled(r["Dystans 15 min (m)"], 0.001), fmt: (v) => v.toFixed(2) },
  { label: "Najwyższa śr. prędkość", unit: "km/h", get: (r) => scaled(r["Śr. prędkość (km/h)"], 1), fmt: (v) => v.toFixed(1) },
  { label: "Najwyższa maks. prędkość", unit: "km/h", get: (r) => scaled(r["Maks. prędkość (km/h)"], 1), fmt: (v) => v.toFixed(1) },
  { label: "Najwyższa śr. moc", unit: "W", get: (r) => scaled(r["Śr. moc (W)"], 1), fmt: (v) => v.toFixed(1) },
  { label: "Najwyższa maks. moc", unit: "W", get: (r) => scaled(r["Maks. moc (W)"], 1), fmt: (v) => v.toFixed(0) },
  { label: "Najwyższa maks. kadencja", unit: "obr/min", get: (r) => scaled(r["Maks. kadencja (obr/min)"], 1), fmt: (v) => v.toFixed(0) },
  { label: "Najwyższy maks. puls", unit: "bpm", get: (r) => scaled(r["Maks. puls (bpm)"], 1), fmt: (v) => v.toFixed(0) },
  { label: "Najwięcej kalorii", unit: "kcal", get: (r) => scaled(r["Kalorie łącznie (kcal)"], 1), fmt: (v) => v.toFixed(0) },
];

function scaled(raw, scale) {
  const n = toNumber(raw);
  return n === null ? null : n * scale;
}

// Karta z rekordami: dla każdej pozycji najlepsza wartość z całej
// historii i data pierwszego jej osiągnięcia (przy remisie wygrywa
// wcześniejszy trening). Rekord ustanowiony w ostatnim treningu jest
// wyróżniony.
function buildRecordsCard(rows) {
  const chronological = rows
    .filter((r) => r["Data"])
    .slice()
    .sort((a, b) => new Date(a["Data"]) - new Date(b["Data"]));
  if (chronological.length === 0) return null;
  const lastDay = warsawDay(chronological[chronological.length - 1]["Data"]);

  const tiles = [];
  RECORDS.forEach((record) => {
    let best = null;
    chronological.forEach((row) => {
      const value = record.get(row);
      if (value !== null && (best === null || value > best.value)) {
        best = { value, date: row["Data"] };
      }
    });
    if (best) tiles.push({ record, best, isLatest: warsawDay(best.date) === lastDay });
  });
  if (tiles.length === 0) return null;

  const card = el("div", "stat-card records-card");
  card.appendChild(el("p", "label", "Rekordy osobiste"));

  const grid = el("div", "records-grid");
  tiles.forEach(({ record, best, isLatest }) => {
    const tile = el("div", isLatest ? "record-tile latest" : "record-tile");
    tile.appendChild(el("p", "record-label", record.label));

    const value = el("p", "record-value", record.fmt(best.value));
    if (record.unit) value.appendChild(el("span", "record-unit", record.unit));
    tile.appendChild(value);

    const date = el("p", "record-date", formatFullDate(best.date));
    if (isLatest) date.appendChild(el("span", "record-new", " · ostatni trening"));
    tile.appendChild(date);

    grid.appendChild(tile);
  });
  card.appendChild(grid);
  return card;
}

// Wspólny układ poziomy dla rysowania i obsługi kliknięć. Wykres
// liniowy zostawia po lewej miejsce na etykiety osi Y.
function chartLayout(width, count, metric) {
  const left = metric.type === "line" ? LINE_CHART_LEFT_PADDING : 0;
  return { left, step: (width - left) / count };
}

function drawTrendChart(canvas, sessions, selectedIndex, metric) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const style = getComputedStyle(document.documentElement);
  const colors = {
    accent: style.getPropertyValue("--accent").trim() || "#2FD9C4",
    hr: style.getPropertyValue("--hr-color").trim() || "#FF9F43",
    muted: style.getPropertyValue("--text-muted").trim() || "#8CA0A6",
    text: style.getPropertyValue("--text").trim() || "#F2F5F4",
    border: style.getPropertyValue("--border").trim() || "#2A353A",
  };

  const paddingTop = 16;
  const paddingBottom = 22;
  const chartHeight = h - paddingTop - paddingBottom;
  const { left, step } = chartLayout(w, sessions.length, metric);
  const geom = { left, step, paddingTop, chartHeight };

  const selected =
    metric.type === "bars"
      ? drawBars(ctx, sessions, geom, colors, selectedIndex)
      : drawLines(ctx, sessions, geom, colors, selectedIndex);

  if (selected) {
    if (metric.type === "bars") {
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(selected.x - 1.5, selected.y - 1.5, selected.barWidth + 3, selected.barHeight + 3);
    } else {
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(selected.barCenterX, paddingTop);
      ctx.lineTo(selected.barCenterX, paddingTop + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(selected.barCenterX, selected.y, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawChartTooltip(ctx, w, selected, style, metric);
  }

  // Etykiety dat pod wykresem — pokazujemy tylko tyle, ile się zmieści
  // bez zlewania się (co N-ty punkt). Ostatni trening zawsze widoczny,
  // ale zastępuje najbliższy regularny znacznik zamiast się z nim zlewać.
  const maxLabels = Math.max(1, Math.floor((w - left) / 48));
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

  ctx.font = "10px Roboto, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = colors.muted;
  // Etykieta przy skrajnym punkcie nie może wychodzić poza płótno, a
  // przesunięcie mogło ją zbliżyć do sąsiedniej — idąc od końca,
  // pomijamy etykiety nachodzące na już zaplanowaną następną.
  const labels = shownIndices.map((i) => {
    const text = formatShortDate(sessions[i].date);
    const half = ctx.measureText(text).width / 2;
    const x = Math.max(half, Math.min(w - half, left + i * step + step / 2));
    return { text, x, half };
  });
  let nextStart = Infinity;
  for (let k = labels.length - 1; k >= 0; k--) {
    const { text, x, half } = labels[k];
    if (x + half + 4 > nextStart) continue;
    ctx.fillText(text, x, h - 8);
    nextStart = x - half;
  }
}

// Słupki od zera; `overlay` to węższy słupek na wierzchu (dla dystansu:
// jaka część treningu przypadła na najlepszy 15-minutowy odcinek).
function drawBars(ctx, sessions, geom, colors, selectedIndex) {
  const { left, step, paddingTop, chartHeight } = geom;
  const overlays = sessions.map((s) => s.overlay).filter((v) => v !== null);
  const maxValue = Math.max(...sessions.map((s) => s.value), ...overlays, 1);
  const barWidth = Math.max(3, Math.min(28, step - 6));

  let selected = null;
  sessions.forEach((s, i) => {
    const x = left + i * step + (step - barWidth) / 2;

    const barHeight = (s.value / maxValue) * chartHeight;
    const y = paddingTop + (chartHeight - barHeight);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(x, y, barWidth, barHeight);

    if (s.overlay !== null) {
      const innerWidth = Math.max(2, barWidth * 0.5);
      const innerX = x + (barWidth - innerWidth) / 2;
      const overlayHeight = (s.overlay / maxValue) * chartHeight;
      ctx.fillStyle = colors.hr;
      ctx.fillRect(innerX, paddingTop + (chartHeight - overlayHeight), innerWidth, overlayHeight);
    }

    if (i === selectedIndex) {
      // Zapamiętane do narysowania obwódki i etykiety na wierzchu,
      // dopiero po wszystkich słupkach — inaczej sąsiedni słupek
      // mógłby ją częściowo zasłonić.
      selected = { session: s, x, y, barWidth, barHeight, barCenterX: x + barWidth / 2 };
    }
  });
  return selected;
}

// Dwie linie (średnia + maksimum) na wspólnej osi Y dobranej do danych,
// z trzema poziomicami i etykietami po lewej.
function drawLines(ctx, sessions, geom, colors, selectedIndex) {
  const { left, step, paddingTop, chartHeight } = geom;

  const all = [];
  sessions.forEach((s) => {
    all.push(s.value);
    if (s.overlay !== null) all.push(s.overlay);
  });
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (hi === lo) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.1;
  lo = Math.max(0, lo - pad);
  hi += pad;

  const yFor = (v) => paddingTop + (1 - (v - lo) / (hi - lo)) * chartHeight;
  const xFor = (i) => left + (i + 0.5) * step;

  ctx.font = "10px Roboto, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 0.5;
  [hi, (hi + lo) / 2, lo].forEach((v) => {
    const y = yFor(v);
    ctx.strokeStyle = colors.border;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + sessions.length * step, y);
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.fillText((hi - lo) >= 10 ? v.toFixed(0) : v.toFixed(1), 0, y);
  });

  const dotRadius = Math.max(1.5, Math.min(3, step / 3));
  const drawSeries = (getValue, color, lineWidth, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let penDown = false;
    sessions.forEach((s, i) => {
      const v = getValue(s);
      if (v === null) {
        penDown = false;
        return;
      }
      if (penDown) ctx.lineTo(xFor(i), yFor(v));
      else ctx.moveTo(xFor(i), yFor(v));
      penDown = true;
    });
    ctx.stroke();
    sessions.forEach((s, i) => {
      const v = getValue(s);
      if (v === null) return;
      ctx.beginPath();
      ctx.arc(xFor(i), yFor(v), dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  drawSeries((s) => s.overlay, colors.hr, 1.5, 0.8);
  drawSeries((s) => s.value, colors.accent, 2, 1);

  if (selectedIndex === null || selectedIndex === undefined) return null;
  const s = sessions[selectedIndex];
  return { session: s, y: yFor(s.value), barCenterX: xFor(selectedIndex) };
}

// Dymek z dokładnymi wartościami dla klikniętego/tapniętego punktu —
// rysowany na płótnie (jak reszta wykresu), nad punktem, przesunięty
// tak, żeby zmieścić się w szerokości płótna przy skrajnych punktach.
function drawChartTooltip(ctx, canvasWidth, selected, style, metric) {
  const surface2 = style.getPropertyValue("--surface-2").trim() || "#232E33";
  const border = style.getPropertyValue("--border").trim() || "#2A353A";
  const text = style.getPropertyValue("--text").trim() || "#F2F5F4";

  const s = selected.session;
  const fmt = (v) => `${v.toFixed(metric.decimals)} ${metric.unit}`;
  const lines = [formatFullDate(s.date), `${metric.main.name}: ${fmt(s.value)}`];
  if (s.overlay !== null) {
    lines.push(`${metric.overlay.name}: ${fmt(s.overlay)}`);
  }

  ctx.font = "11px Roboto, system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  const lineHeight = 14;
  const paddingX = 8;
  const paddingY = 6;
  const boxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width)) + paddingX * 2;
  const boxHeight = lines.length * lineHeight + paddingY * 2 - 4;

  let boxX = selected.barCenterX - boxWidth / 2;
  boxX = Math.max(2, Math.min(canvasWidth - boxWidth - 2, boxX));
  let boxY = selected.y - boxHeight - 8;
  // Gdy punkt jest blisko górnej krawędzi płótna, dymek nad nim by
  // się nie zmieścił — pokazujemy go wtedy pod punktem.
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
