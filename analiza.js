"use strict";

// Metryki dostępne na wykresie trendów — wszystkie rysowane tak samo
// (słupki od zera). `main` to szeroki słupek w kolorze akcentu,
// `overlay` — węższy słupek na wierzchu w kolorze pulsu (najlepsze
// 15 min dla dystansu, wartość maksymalna dla reszty).
// `col` to nagłówek kolumny w arkuszu `Trening_Podsumowania`, `scale`
// przelicza jednostkę arkusza na wyświetlaną (np. m → km).
const METRICS = [
  {
    id: "distance", label: "Dystans", unit: "km", decimals: 2,
    main: { col: "Dystans całkowity (m)", scale: 0.001, name: "Dystans", legend: "cały trening" },
    overlay: { col: "Dystans 15 min (m)", scale: 0.001, name: "Najlepsze 15 min", legend: "najlepsze 15 min" },
  },
  {
    id: "speed", label: "Prędkość", unit: "km/h", decimals: 1,
    main: { col: "Śr. prędkość (km/h)", scale: 1, name: "Śr. prędkość", legend: "średnia" },
    overlay: { col: "Maks. prędkość (km/h)", scale: 1, name: "Maks. prędkość", legend: "maksymalna" },
  },
  {
    id: "power", label: "Moc", unit: "W", decimals: 1,
    main: { col: "Śr. moc (W)", scale: 1, name: "Śr. moc", legend: "średnia" },
    overlay: { col: "Maks. moc (W)", scale: 1, name: "Maks. moc", legend: "maksymalna" },
  },
  {
    id: "hr", label: "Puls", unit: "bpm", decimals: 1, requiresHr: true,
    main: { col: "Śr. puls (bpm)", scale: 1, name: "Śr. puls", legend: "średni" },
    overlay: { col: "Maks. puls (bpm)", scale: 1, name: "Maks. puls", legend: "maksymalny" },
  },
  {
    id: "cadence", label: "Kadencja", unit: "obr/min", decimals: 1,
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

let activeChartCanvas = null;
let activeChartSessions = null;
let activeChartSelectedIndex = null;
let activeChartMetric = null;
window.addEventListener("resize", () => {
  if (activeChartCanvas && activeChartSessions && activeChartSessions.length > 0) {
    drawTrendChart(activeChartCanvas, activeChartSessions, activeChartSelectedIndex, activeChartMetric);
  }
  if (redrawZonesChart) redrawZonesChart();
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
    renderAnalysis(container, data.summary || [], data.detail || []);
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

// Udział próbek z odczytem pulsu (> 0) w każdym treningu, wg ID sesji.
// Trening bez próbek w `Trening_Szczegoly` nie ma wpisu w mapie.
function buildHrCoverage(detail) {
  const counts = new Map();
  detail.forEach((r) => {
    const id = r["ID sesji"];
    if (!id) return;
    const c = counts.get(id) || { total: 0, hr: 0 };
    c.total += 1;
    if (Number(r["Puls (bpm)"]) > 0) c.hr += 1;
    counts.set(id, c);
  });
  const coverage = new Map();
  counts.forEach((c, id) => coverage.set(id, c.hr / c.total));
  return coverage;
}

// Powód pominięcia treningu w analizach pulsu, do notatek pod wykresami.
// Próg 0% pomija już tylko treningi bez żadnego odczytu pulsu.
function coverageReason(pct) {
  return pct > 0
    ? `odczyty pulsu w mniej niż ${pct}% próbek treningu (próg zmienisz w Ustawieniach)`
    : "brak odczytów pulsu";
}

function trainingsWord(n) {
  const last = n % 10;
  const lastTwo = n % 100;
  if (n === 1) return "trening";
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "treningi" : "treningów";
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
function buildSessions(rows, metric, from, to, hrOk) {
  let excluded = 0;
  const sessions = rows
    .map((row) => {
      const main = toNumber(row[metric.main.col]);
      const overlay = toNumber(row[metric.overlay.col]);
      return {
        id: row["ID sesji"],
        date: row["Data"],
        day: warsawDay(row["Data"]),
        value: main === null ? null : main * metric.main.scale,
        overlay: overlay === null ? null : overlay * metric.overlay.scale,
      };
    })
    .filter((s) => s.day)
    .filter((s) => (!from || s.day >= from) && (!to || s.day <= to))
    .filter((s) => {
      if (!metric.requiresHr || hrOk(s.id)) return true;
      excluded += 1;
      return false;
    })
    .filter((s) => s.value !== null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return { sessions, excluded };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderAnalysis(container, rows, detail) {
  if (rows.length === 0) {
    container.textContent = "Brak zapisanych treningów.";
    return;
  }

  const minCoveragePct = getMinHrCoveragePct();
  const hrCoverage = buildHrCoverage(detail);
  const hrOk = (id) => {
    const c = hrCoverage.get(id);
    return c !== undefined && c * 100 >= minCoveragePct;
  };

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
  const chartNote = el("p", "zones-note");
  chartWrap.append(canvas, emptyMsg, chartNote);
  card.appendChild(chartWrap);

  // Jeden listener na płótnie czyta bieżący stan z `activeChart*` —
  // płótno jest to samo przy zmianie metryki/zakresu, zmieniają się
  // tylko dane, więc nie ma listenerów do sprzątania.
  canvas.addEventListener("click", (event) => {
    if (!activeChartSessions || activeChartSessions.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const step = canvas.clientWidth / activeChartSessions.length;
    const index = Math.max(0, Math.min(activeChartSessions.length - 1, Math.floor(x / step)));
    // Ponowny klik na tym samym słupku chowa etykietę zamiast trzymać
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

    zones.update();

    const { sessions, excluded } = buildSessions(rows, metric, analysisState.from, analysisState.to, hrOk);
    chartNote.style.display = excluded > 0 ? "" : "none";
    chartNote.textContent =
      excluded > 0
        ? `Pominięto ${excluded} ${trainingsWord(excluded)}: ${coverageReason(minCoveragePct)}.`
        : "";
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
      `Wykres słupkowy: ${metric.label.toLowerCase()} (${metric.unit}) dla kolejnych treningów`
    );
    drawTrendChart(canvas, sessions, null, metric);
  }

  const zones = buildZonesCard(rows, detail, hrOk);
  container.className = "";
  container.replaceChildren(card, zones.card);
  const recordsCard = buildRecordsCard(rows, hrOk);
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
  { label: "Najwyższy maks. puls", unit: "bpm", needsHr: true, get: (r) => scaled(r["Maks. puls (bpm)"], 1), fmt: (v) => v.toFixed(0) },
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
function buildRecordsCard(rows, hrOk) {
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
      if (record.needsHr && !hrOk(row["ID sesji"])) return;
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

const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 22;

function prepareCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function chartColors() {
  const style = getComputedStyle(document.documentElement);
  const get = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    accent: get("--accent", "#2FD9C4"),
    hr: get("--hr-color", "#FF9F43"),
    muted: get("--text-muted", "#8CA0A6"),
    text: get("--text", "#F2F5F4"),
    surface2: get("--surface-2", "#232E33"),
    border: get("--border", "#2A353A"),
  };
}

// Układ słupków wspólny dla wszystkich wykresów na tej stronie.
function barGeometry(width, count) {
  const step = width / count;
  return { step, barWidth: Math.max(3, Math.min(28, step - 6)) };
}

function drawTrendChart(canvas, sessions, selectedIndex, metric) {
  const { ctx, w, h } = prepareCanvas(canvas);
  const colors = chartColors();

  const chartHeight = h - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const overlays = sessions.map((s) => s.overlay).filter((v) => v !== null);
  const maxValue = Math.max(...sessions.map((s) => s.value), ...overlays, 1);
  const { step, barWidth } = barGeometry(w, sessions.length);

  let selected = null;

  sessions.forEach((s, i) => {
    const x = i * step + (step - barWidth) / 2;

    const barHeight = (s.value / maxValue) * chartHeight;
    const y = CHART_PADDING_TOP + (chartHeight - barHeight);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Druga seria — węższy słupek na wierzchu (dla dystansu: jaka część
    // treningu przypadła na najlepszy 15-minutowy odcinek; dla reszty
    // metryk: wartość maksymalna, więc wystaje ponad średnią).
    let overlayY = y;
    if (s.overlay !== null) {
      const innerWidth = Math.max(2, barWidth * 0.5);
      const innerX = x + (barWidth - innerWidth) / 2;
      const overlayHeight = (s.overlay / maxValue) * chartHeight;
      overlayY = CHART_PADDING_TOP + (chartHeight - overlayHeight);
      ctx.fillStyle = colors.hr;
      ctx.fillRect(innerX, overlayY, innerWidth, overlayHeight);
    }

    if (i === selectedIndex) {
      // Zapamiętane do narysowania obwódki i etykiety na wierzchu,
      // dopiero po wszystkich słupkach — inaczej sąsiedni słupek
      // mógłby ją częściowo zasłonić. Obwódka i dymek liczone od
      // wyższego z dwóch słupków.
      const top = Math.min(y, overlayY);
      selected = {
        session: s,
        x,
        y: top,
        barWidth,
        barHeight: CHART_PADDING_TOP + chartHeight - top,
        barCenterX: x + barWidth / 2,
      };
    }
  });

  if (selected) {
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(selected.x - 1.5, selected.y - 1.5, selected.barWidth + 3, selected.barHeight + 3);
    const fmt = (v) => `${v.toFixed(metric.decimals)} ${metric.unit}`;
    const s = selected.session;
    const lines = [formatFullDate(s.date), `${metric.main.name}: ${fmt(s.value)}`];
    if (s.overlay !== null) lines.push(`${metric.overlay.name}: ${fmt(s.overlay)}`);
    drawChartTooltip(ctx, w, selected, colors, lines);
  }

  drawDateLabels(ctx, sessions, w, h, step, colors.muted);
}

// Etykiety dat pod słupkami — pokazujemy tylko tyle, ile się zmieści
// bez zlewania się (co N-ty słupek). Ostatni trening zawsze widoczny,
// ale zastępuje najbliższy regularny znacznik zamiast się z nim zlewać.
function drawDateLabels(ctx, sessions, w, h, step, color) {
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

  ctx.font = "10px Roboto, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  // Etykieta przy skrajnym słupku nie może wychodzić poza płótno, a
  // przesunięcie mogło ją zbliżyć do sąsiedniej — idąc od końca,
  // pomijamy etykiety nachodzące na już zaplanowaną następną.
  const labels = shownIndices.map((i) => {
    const label = formatShortDate(sessions[i].date);
    const half = ctx.measureText(label).width / 2;
    const x = Math.max(half, Math.min(w - half, i * step + step / 2));
    return { label, x, half };
  });
  let nextStart = Infinity;
  for (let k = labels.length - 1; k >= 0; k--) {
    const { label, x, half } = labels[k];
    if (x + half + 4 > nextStart) continue;
    ctx.fillText(label, x, h - 8);
    nextStart = x - half;
  }
}

// Dymek z podanymi liniami tekstu dla klikniętego/tapniętego słupka —
// rysowany na płótnie (jak reszta wykresu), nad słupkiem, przesunięty
// tak, żeby zmieścić się w szerokości płótna przy skrajnych słupkach.
function drawChartTooltip(ctx, canvasWidth, selected, colors, lines) {
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
  // Gdy słupek sięga blisko górnej krawędzi płótna, dymek nad nim by
  // się nie zmieścił — pokazujemy go wtedy pod szczytem słupka.
  if (boxY < 2) boxY = selected.y + 8;
  // Wysoki dymek (wykres stref) nie może zachodzić na etykiety dat.
  boxY = Math.max(2, Math.min(boxY, ctx.canvas.clientHeight - CHART_PADDING_BOTTOM - boxHeight));

  ctx.beginPath();
  // roundRect: Safari < 16 i starsze Firefoksy go nie mają — wtedy zwykły prostokąt.
  if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
  else ctx.rect(boxX, boxY, boxWidth, boxHeight);
  ctx.fillStyle = colors.surface2;
  ctx.fill();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = colors.text;
  lines.forEach((line, i) => {
    ctx.fillText(line, boxX + paddingX, boxY + paddingY + lineHeight * i + 9);
  });
}

/* ============================================================
   Czas w strefach tętna
   ============================================================ */

// Odstęp między próbkami to normalnie 5 s; limit luki (HR_ZONE_MAX_GAP_S)
// jest wspólny z podglądem na żywo, patrz nav.js.
const DEFAULT_SAMPLE_S = 5;

let redrawZonesChart = null;

function groupDetailBySession(detail) {
  const groups = new Map();
  detail.forEach((r) => {
    const id = r["ID sesji"];
    if (!id) return;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(r);
  });
  return groups;
}

// Sekundy w kolejnych przedziałach: [0] poniżej strefy 1, [1..5] strefy
// 1–5 (tętno powyżej maksimum trafia do strefy 5). Próbka bez odczytu
// pulsu (0 / puste) wlicza się do `total`, ale nie do `measured`.
function sessionZoneTimes(samples, zones) {
  const points = samples
    .map((r) => ({ t: Number(r["Czas od startu (s)"]), hr: Number(r["Puls (bpm)"]) }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);

  const secs = [0, 0, 0, 0, 0, 0];
  let measured = 0;
  let total = 0;
  points.forEach((p, i) => {
    const next = points[i + 1];
    const dt = next ? Math.min(next.t - p.t, HR_ZONE_MAX_GAP_S) : DEFAULT_SAMPLE_S;
    if (!(dt > 0)) return;
    total += dt;
    if (!(p.hr > 0)) return;
    measured += dt;
    secs[hrZoneIndex(zones, p.hr)] += dt;
  });
  return { secs, measured, total };
}

function formatPercent(fraction) {
  const pct = fraction * 100;
  if (pct > 0 && pct < 0.5) return "<1%";
  return `${Math.round(pct)}%`;
}

// Karta pod wykresem trendów; korzysta z tego samego zakresu dat
// (`analysisState`), więc odświeża się razem z nim przez `update()`.
// Granice stref pochodzą z Ustawień (tętno maksymalne, opcjonalnie
// spoczynkowe → Karvonen), tak samo jak podgląd stref tam.
function buildZonesCard(rows, detail, hrOk) {
  const card = el("div", "stat-card zones-card");
  card.appendChild(el("p", "label", "Czas w strefach tętna"));
  const body = el("div");
  card.appendChild(body);

  const maxHr = getMaxHr();
  if (!maxHr) {
    const note = el("p", "zones-note");
    note.innerHTML = 'Ustaw tętno maksymalne w <a href="ustawienia.html">Ustawieniach</a>, żeby zobaczyć czas w strefach.';
    body.appendChild(note);
    return { card, update() {} };
  }

  const zones = computeHrZones(maxHr, getRestingHr());
  const segmentColors = [ZONE_BELOW_COLOR, ...zones.map((z) => z.color)];
  const segmentLabels = [ZONE_BELOW_LABEL, ...zones.map((z) => `Strefa ${z.number}`)];
  const groups = groupDetailBySession(detail);

  const allSessions = rows
    .filter((r) => r["Data"])
    .map((row) => {
      const samples = groups.get(row["ID sesji"]);
      const times = samples ? sessionZoneTimes(samples, zones) : null;
      return {
        date: row["Data"],
        day: warsawDay(row["Data"]),
        secs: times ? times.secs : null,
        measured: times ? times.measured : 0,
        usable: !!times && times.measured > 0 && hrOk(row["ID sesji"]),
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const summary = el("div", "zones-summary");
  const canvas = el("canvas");
  canvas.id = "zonesChart";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Wykres słupkowy: udział czasu w strefach tętna dla kolejnych treningów");
  const note = el("p", "zones-note");
  body.append(summary, canvas, note);

  let chartSessions = [];
  let selectedIndex = null;

  const draw = () => {
    if (chartSessions.length === 0) return;
    drawZonesChart(canvas, chartSessions, selectedIndex, segmentColors, segmentLabels);
  };
  redrawZonesChart = draw;

  canvas.addEventListener("click", (event) => {
    if (chartSessions.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const step = canvas.clientWidth / chartSessions.length;
    const index = Math.max(0, Math.min(chartSessions.length - 1, Math.floor((event.clientX - rect.left) / step)));
    selectedIndex = selectedIndex === index ? null : index;
    draw();
  });

  function update() {
    const { from, to } = analysisState;
    const inRange = allSessions.filter((s) => (!from || s.day >= from) && (!to || s.day <= to));
    const used = inRange.filter((s) => s.usable);

    chartSessions = used.map((s) => ({ date: s.date, secs: s.secs, measured: s.measured }));
    selectedIndex = null;

    summary.replaceChildren();
    if (used.length === 0) {
      canvas.style.display = "none";
      summary.appendChild(el("p", "zones-note", "Brak treningów z pomiarem tętna w wybranym zakresie dat."));
    } else {
      canvas.style.display = "";
      const totals = [0, 0, 0, 0, 0, 0];
      used.forEach((s) => s.secs.forEach((v, i) => (totals[i] += v)));
      const totalSecs = totals.reduce((a, b) => a + b, 0);

      // Od najwyższej strefy w dół — jak słupki na wykresie poniżej.
      for (let i = 5; i >= 0; i--) {
        if (i === 0 && totals[0] === 0) continue;
        const fraction = totalSecs > 0 ? totals[i] / totalSecs : 0;
        const row = el("div", "zone-row");
        const head = el("div", "zone-row-head");
        const swatch = el("span", "hr-zone-swatch");
        swatch.style.background = segmentColors[i];
        const name = el("span", "zone-name", segmentLabels[i]);
        if (i > 0) {
          name.appendChild(el("span", "zone-bpm", `${zones[i - 1].from}–${zones[i - 1].to} bpm`));
        } else {
          name.appendChild(el("span", "zone-bpm", `< ${zones[0].from} bpm`));
        }
        head.append(swatch, name, el("span", "zone-time", formatMinSec(totals[i])), el("span", "zone-pct", formatPercent(fraction)));
        const bar = el("div", "zone-bar");
        const fill = el("div", "zone-bar-fill");
        fill.style.width = `${fraction * 100}%`;
        fill.style.background = segmentColors[i];
        bar.appendChild(fill);
        row.append(head, bar);
        summary.appendChild(row);
      }
      draw();
    }

    const skipped = inRange.length - used.length;
    note.style.display = skipped > 0 || used.length > 0 ? "" : "none";
    note.textContent =
      (skipped > 0
        ? `Pominięto ${skipped} z ${inRange.length} treningów w zakresie: ${coverageReason(getMinHrCoveragePct())}. `
        : "") + (used.length > 0 ? "Kliknij słupek, żeby zobaczyć podział dla treningu." : "");
  }

  return { card, update };
}

// Słupki skumulowane 100%: dół — poniżej strefy 1, góra — strefa 5.
function drawZonesChart(canvas, sessions, selectedIndex, segmentColors, segmentLabels) {
  const { ctx, w, h } = prepareCanvas(canvas);
  const colors = chartColors();

  const chartHeight = h - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const { step, barWidth } = barGeometry(w, sessions.length);
  const baseline = CHART_PADDING_TOP + chartHeight;

  let selected = null;
  sessions.forEach((s, i) => {
    const x = i * step + (step - barWidth) / 2;
    let bottom = baseline;
    s.secs.forEach((v, k) => {
      const height = (v / s.measured) * chartHeight;
      if (height <= 0) return;
      ctx.fillStyle = segmentColors[k];
      ctx.fillRect(x, bottom - height, barWidth, height);
      bottom -= height;
    });
    if (i === selectedIndex) {
      selected = { session: s, x, y: CHART_PADDING_TOP, barWidth, barCenterX: x + barWidth / 2 };
    }
  });

  if (selected) {
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(selected.x - 1.5, CHART_PADDING_TOP - 1.5, selected.barWidth + 3, chartHeight + 3);
    const s = selected.session;
    const lines = [formatFullDate(s.date)];
    for (let k = s.secs.length - 1; k >= 0; k--) {
      if (s.secs[k] === 0) continue;
      lines.push(`${segmentLabels[k]}: ${formatPercent(s.secs[k] / s.measured)} · ${formatMinSec(s.secs[k])}`);
    }
    drawChartTooltip(ctx, w, selected, colors, lines);
  }

  drawDateLabels(ctx, sessions, w, h, step, colors.muted);
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
