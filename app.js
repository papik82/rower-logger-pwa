"use strict";

/* ============================================================
   KONFIGURACJA — uzupełnij po wdrożeniu Google Apps Script
   (patrz DEPLOY.md, sekcja "Apps Script")
   ============================================================ */
const CONFIG = {
  // URL wdrożonego Google Apps Script — patrz getAppsScriptUrl() w nav.js
  // (wspólny domyślny adres i klucz localStorage dla wszystkich podstron).
  APPS_SCRIPT_URL: getAppsScriptUrl(),
  SAMPLE_INTERVAL_S: 5,
  IDLE_SPEED_THRESHOLD_KMH: 0.5,
  TRIM_IDLE_EDGES: true,
  BEST_EFFORT_WINDOW_S: 900, // 15 minut — patrz "Dystans 15 min" w podsumowaniu
};

const FITNESS_MACHINE_SERVICE = 0x1826;
const INDOOR_BIKE_DATA_CHAR = "00002ad2-0000-1000-8000-00805f9b34fb";
const HEART_RATE_SERVICE = 0x180d;
const HEART_RATE_MEASUREMENT_CHAR = "00002a37-0000-1000-8000-00805f9b34fb";

const DETAIL_HEADERS_ORDER = [
  "session_id", "timestamp", "elapsed_s", "speed_kmh", "cadence_rpm",
  "distance_m", "resistance_level", "power_w", "heart_rate_bpm",
  "energy_total_kcal", "energy_per_hour_kcal", "energy_per_minute_kcal",
];

/* ============================================================
   Dekodowanie FTMS Indoor Bike Data (0x2AD2) — ten sam algorytm
   co w bike_core.py, przepisany na JavaScript.
   ============================================================ */
function decodeIndoorBikeData(dataView) {
  const flags = dataView.getUint16(0, true);
  let idx = 2;
  const result = {};

  const moreData = flags & 0x0001;
  if (!moreData) {
    result.speed_kmh = dataView.getUint16(idx, true) * 0.01;
    idx += 2;
  }
  if (flags & 0x0002) idx += 2; // average speed — pomijamy
  if (flags & 0x0004) {
    result.cadence_rpm = dataView.getUint16(idx, true) * 0.5;
    idx += 2;
  }
  if (flags & 0x0008) idx += 2; // average cadence — pomijamy
  if (flags & 0x0010) {
    // total distance — uint24
    const b0 = dataView.getUint8(idx);
    const b1 = dataView.getUint8(idx + 1);
    const b2 = dataView.getUint8(idx + 2);
    result.distance_m = b0 | (b1 << 8) | (b2 << 16);
    idx += 3;
  }
  if (flags & 0x0020) {
    result.resistance_level = dataView.getInt16(idx, true);
    idx += 2;
  }
  if (flags & 0x0040) {
    result.power_w = dataView.getInt16(idx, true);
    idx += 2;
  }
  if (flags & 0x0080) idx += 2; // average power — pomijamy
  if (flags & 0x0100) {
    result.energy_total_kcal = dataView.getUint16(idx, true);
    idx += 2;
    result.energy_per_hour_kcal = dataView.getUint16(idx, true);
    idx += 2;
    result.energy_per_minute_kcal = dataView.getUint8(idx);
    idx += 1;
  }
  if (flags & 0x0200) {
    result.heart_rate_bpm = dataView.getUint8(idx);
    idx += 1;
  }
  if (flags & 0x0400) idx += 1; // metabolic equivalent — pomijamy
  if (flags & 0x0800) {
    result.elapsed_s = dataView.getUint16(idx, true);
    idx += 2;
  }
  if (flags & 0x1000) idx += 2; // remaining time — pomijamy

  return result;
}

/* ============================================================
   Dekodowanie standardowego Heart Rate Measurement (0x2A37) —
   ten sam otwarty protokół BLE, którego używa pasek. Uwzględnia
   flagę "sensor contact": jeśli pasek zgłasza brak kontaktu ze
   skórą, odczyt jest odrzucany zamiast zwracać mylącą wartość.
   ============================================================ */
function decodeHeartRateMeasurement(dataView) {
  const flags = dataView.getUint8(0);
  const is16bit = flags & 0x01;
  const contactSupported = (flags >> 1) & 0x01;
  const contactDetected = (flags >> 2) & 0x01;

  if (contactSupported && !contactDetected) return null;

  return is16bit ? dataView.getUint16(1, true) : dataView.getUint8(1);
}

/* ============================================================
   Wysyłka do Google Sheets przez Apps Script (unikamy CORS
   preflight, wysyłając jako text/plain — Apps Script i tak
   parsuje treść jako JSON po swojej stronie)
   ============================================================ */
async function sendToSheets(type, row) {
  if (!CONFIG.APPS_SCRIPT_URL) {
    queueOffline(type, row);
    return { ok: false, offline: true };
  }
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type, row }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Nieznany błąd Apps Script");
    return { ok: true };
  } catch (err) {
    log(`  [!] Błąd wysyłki (${type}): ${err.message}. Zapisano lokalnie.`);
    queueOffline(type, row);
    return { ok: false, error: err.message };
  }
}

function queueOffline(type, row) {
  const key = "rowerLoggerOfflineQueue";
  const queue = JSON.parse(localStorage.getItem(key) || "[]");
  queue.push({ type, row, ts: Date.now() });
  localStorage.setItem(key, JSON.stringify(queue));
}

async function retryOfflineQueue() {
  const key = "rowerLoggerOfflineQueue";
  const queue = JSON.parse(localStorage.getItem(key) || "[]");
  if (queue.length === 0) {
    log("Brak zaległych danych do wysłania.");
    return;
  }
  log(`Próbuję wysłać ${queue.length} zaległych wpisów...`);
  const remaining = [];
  for (const item of queue) {
    const result = await sendToSheetsDirect(item.type, item.row);
    if (!result.ok) remaining.push(item);
  }
  localStorage.setItem(key, JSON.stringify(remaining));
  log(`Wysłano ${queue.length - remaining.length}/${queue.length}. Pozostało: ${remaining.length}.`);
}

async function sendToSheetsDirect(type, row) {
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type, row }),
    });
    const data = await res.json();
    return { ok: !!data.ok };
  } catch (err) {
    return { ok: false };
  }
}

/* ============================================================
   Stan aplikacji
   ============================================================ */
let bleDevice = null;
let bleServer = null;
let bleChar = null;
let bikeConnected = false;
let hrDevice = null;
let hrServer = null;
let hrChar = null;
let hrConnected = false;
let hrLatestValue = null;
let wakeLock = null;
let isRecording = false;
let sessionId = null;
let startTime = null;
let latestSample = {};
let history = [];
let samplingTimer = null;
let elapsedTimer = null;
let sparklineData = [];
let hrSparklineData = [];
let manualResistance = parseInt(localStorage.getItem("rowerLoggerResistance"), 10) || 5;

/* ============================================================
   Wake Lock — nie pozwól zgasnąć ekranowi podczas nagrywania
   ============================================================ */
async function acquireWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => log("Wake Lock zwolniony przez system."));
    } else {
      log("Wake Lock API niedostępne w tej przeglądarce — ekran może zgasnąć sam.");
    }
  } catch (err) {
    log(`Nie udało się zablokować usypiania ekranu: ${err.message}`);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

document.addEventListener("visibilitychange", async () => {
  if (isRecording && document.visibilityState === "visible" && wakeLock === null) {
    await acquireWakeLock();
  }
});

/* ============================================================
   Bluetooth
   ============================================================ */
async function connectBike() {
  try {
    log("Otwieram wybór urządzenia Bluetooth...");
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [FITNESS_MACHINE_SERVICE] }],
    });
    log(`Wybrano: ${bleDevice.name || "(urządzenie bez nazwy)"}`);

    bleDevice.addEventListener("gattserverdisconnected", onBikeDisconnected);

    bleServer = await bleDevice.gatt.connect();
    const service = await bleServer.getPrimaryService(FITNESS_MACHINE_SERVICE);
    bleChar = await service.getCharacteristic(INDOOR_BIKE_DATA_CHAR);

    bleChar.addEventListener("characteristicvaluechanged", onBikeNotification);
    await bleChar.startNotifications();

    bikeConnected = true;
    updateBikeUI();
    log("Połączono z rowerem. Odbieram dane...");
  } catch (err) {
    log(`Nie udało się połączyć roweru: ${err.message}`);
  }
}

function onBikeNotification(event) {
  latestSample = decodeIndoorBikeData(event.target.value);
  updateLiveStats(latestSample);
  refreshHrDisplay();
}

function onBikeDisconnected() {
  bikeConnected = false;
  updateBikeUI();
  if (isRecording) {
    log("Rower rozłączony niespodziewanie — kończę trening.");
    stopRecording();
  } else {
    log("Rower rozłączony.");
  }
}

async function disconnectBike() {
  try {
    if (bleChar) await bleChar.stopNotifications();
    if (bleDevice && bleDevice.gatt.connected) bleDevice.gatt.disconnect();
  } catch (err) {
    log(`Błąd przy rozłączaniu roweru: ${err.message}`);
  }
}

function updateBikeUI() {
  document.getElementById("bikeStatus").textContent = bikeConnected ? "Połączony" : "Niepołączony";
  document.getElementById("bikeConnectBtn").textContent = bikeConnected ? "Rozłącz" : "Połącz";
}

/* ============================================================
   Pasek pulsu — niezależne, drugie połączenie BLE (standardowy
   Heart Rate Service). Priorytet nad czujnikiem w uchwytach
   roweru: gdy pasek jest połączony i ma odczyt, on wygrywa;
   gdy się rozłączy, automatycznie wracamy do uchwytów.
   ============================================================ */
async function connectHrStrap() {
  try {
    log("Otwieram wybór paska pulsu...");
    hrDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE] }],
    });
    hrDevice.addEventListener("gattserverdisconnected", onHrDisconnected);

    hrServer = await hrDevice.gatt.connect();
    const service = await hrServer.getPrimaryService(HEART_RATE_SERVICE);
    hrChar = await service.getCharacteristic(HEART_RATE_MEASUREMENT_CHAR);
    hrChar.addEventListener("characteristicvaluechanged", onHrNotification);
    await hrChar.startNotifications();

    hrConnected = true;
    updateHrStrapUI();
    log(`Pasek pulsu połączony: ${hrDevice.name || "(bez nazwy)"}`);
  } catch (err) {
    log(`Nie udało się połączyć paska pulsu: ${err.message}`);
  }
}

function onHrNotification(event) {
  const value = decodeHeartRateMeasurement(event.target.value);
  if (value !== null) hrLatestValue = value;
  refreshHrDisplay();
}

function onHrDisconnected() {
  hrConnected = false;
  hrLatestValue = null;
  updateHrStrapUI();
  refreshHrDisplay();
  log("Pasek pulsu rozłączony — wracam do czujnika w uchwytach roweru.");
}

function disconnectHrStrap() {
  if (hrDevice && hrDevice.gatt.connected) {
    hrDevice.gatt.disconnect(); // onHrDisconnected zajmie się resztą
  }
}

function updateHrStrapUI() {
  document.getElementById("hrStrapStatus").textContent = hrConnected ? "Połączony" : "Niepołączony";
  document.getElementById("hrConnectBtn").textContent = hrConnected ? "Rozłącz" : "Połącz";
}

function getEffectiveHeartRate() {
  if (hrConnected && hrLatestValue !== null) return hrLatestValue;
  return latestSample.heart_rate_bpm; // zapasowo: uchwyty roweru (może być undefined)
}

function refreshHrDisplay() {
  document.getElementById("statHr").textContent = fmtLive(getEffectiveHeartRate(), 0);
}

/* ============================================================
   Nagrywanie — próbkowanie co N sekund, zapis do arkusza
   ============================================================ */
function startSampling() {
  samplingTimer = setInterval(async () => {
    if (Object.keys(latestSample).length === 0) return;
    const sample = {
      ...latestSample,
      resistance_level: manualResistance,
      heart_rate_bpm: getEffectiveHeartRate(),
    };
    history.push(sample);

    const row = [
      sessionId,
      new Date().toISOString(),
      sample.elapsed_s ?? "",
      sample.speed_kmh ?? "",
      sample.cadence_rpm ?? "",
      sample.distance_m ?? "",
      sample.resistance_level ?? "",
      sample.power_w ?? "",
      sample.heart_rate_bpm ?? "",
      sample.energy_total_kcal ?? "",
      sample.energy_per_hour_kcal ?? "",
      sample.energy_per_minute_kcal ?? "",
    ];
    await sendToSheets("sample", row);

    sparklineData.push(sample.speed_kmh ?? 0);
    if (sparklineData.length > 60) sparklineData.shift();
    hrSparklineData.push(sample.heart_rate_bpm ?? 0);
    if (hrSparklineData.length > 60) hrSparklineData.shift();
    drawSparkline();

    log(
      `[${new Date().toLocaleTimeString("pl-PL")}] ` +
      `speed=${sample.speed_kmh ?? "-"} cadence=${sample.cadence_rpm ?? "-"} ` +
      `power=${sample.power_w ?? "-"} HR=${sample.heart_rate_bpm ?? "-"}`
    );
  }, CONFIG.SAMPLE_INTERVAL_S * 1000);
}

function stopSampling() {
  if (samplingTimer) clearInterval(samplingTimer);
  samplingTimer = null;
}

/* ============================================================
   Licznik czasu treningu — aktualizowany co sekundę, niezależnie
   od interwału próbkowania danych z roweru
   ============================================================ */
function startElapsedTimer() {
  updateElapsedDisplay();
  elapsedTimer = setInterval(updateElapsedDisplay, 1000);
}

function stopElapsedTimer() {
  if (elapsedTimer) clearInterval(elapsedTimer);
  elapsedTimer = null;
}

function updateElapsedDisplay() {
  const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
  document.getElementById("statElapsed").textContent = formatDuration(secs);
}

/* ============================================================
   Podsumowanie — przycinanie brzegów + statystyki (lustrzane
   odbicie logiki z bike_core.py)
   ============================================================ */
function trimIdleEdges(hist) {
  if (!CONFIG.TRIM_IDLE_EDGES) return hist;
  const activeIdx = [];
  hist.forEach((h, i) => {
    if ((h.speed_kmh ?? 0) > CONFIG.IDLE_SPEED_THRESHOLD_KMH) activeIdx.push(i);
  });
  if (activeIdx.length === 0) return hist;
  const first = activeIdx[0];
  const last = activeIdx[activeIdx.length - 1];
  const trimmedStart = first;
  const trimmedEnd = hist.length - 1 - last;
  if (trimmedStart || trimmedEnd) {
    log(`  Przycinam podsumowanie: pomijam ${trimmedStart} próbek na starcie i ${trimmedEnd} na końcu.`);
  }
  return hist.slice(first, last + 1);
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Najlepszy odcinek treningu o długości `windowSeconds` pod względem
// przejechanego dystansu (jak "best effort" w aplikacjach kolarskich):
// dla każdego możliwego startu bierzemy najkrótsze okno, które sięga
// co najmniej `windowSeconds` do przodu, i patrzymy na różnicę
// dystansu. Dwuwskaźnikowo po próbkach posortowanych rosnąco wg czasu
// — O(n). Zwraca null, gdy trening jest krótszy niż samo okno.
//
// UWAGA: ta sama logika jest zduplikowana w apps-script.gs (funkcja
// backfillDistance15Min) — to dwa różne środowiska (przeglądarka i
// Apps Script), nie da się między nimi dzielić kodu. Zmieniając jedną,
// zmień też drugą.
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

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function buildSummary() {
  const active = trimIdleEdges(history);
  const col = (key) => active.map((h) => h[key]).filter((v) => v !== undefined);

  const speeds = col("speed_kmh");
  const cadences = col("cadence_rpm");
  const powers = col("power_w");
  const resistances = col("resistance_level");
  const hrs = col("heart_rate_bpm");
  const distances = col("distance_m");
  const energies = col("energy_total_kcal");
  const elapsedVals = col("elapsed_s");

  const windowSamples = active
    .filter((h) => h.elapsed_s !== undefined && h.distance_m !== undefined)
    .map((h) => ({ elapsed_s: h.elapsed_s, distance_m: h.distance_m }));
  const distance15min = bestDistanceInWindow(windowSamples, CONFIG.BEST_EFFORT_WINDOW_S);

  const durationS = elapsedVals.length
    ? Math.max(...elapsedVals) - Math.min(...elapsedVals)
    : Math.round((Date.now() - startTime.getTime()) / 1000);

  const endTime = new Date();

  const summary = {
    session_id: sessionId,
    date: startTime.toISOString().slice(0, 10),
    start: startTime.toTimeString().slice(0, 8),
    end: endTime.toTimeString().slice(0, 8),
    duration_str: formatDuration(durationS),
    distance_m: distances.length ? Math.max(...distances) : "",
    avg_speed: speeds.length ? Math.round(mean(speeds) * 100) / 100 : "",
    max_speed: speeds.length ? Math.round(Math.max(...speeds) * 100) / 100 : "",
    avg_cadence: cadences.length ? Math.round(mean(cadences) * 10) / 10 : "",
    max_cadence: cadences.length ? Math.max(...cadences) : "",
    avg_power: powers.length ? Math.round(mean(powers) * 10) / 10 : "",
    max_power: powers.length ? Math.max(...powers) : "",
    avg_resistance: resistances.length ? Math.round(mean(resistances) * 10) / 10 : "",
    avg_hr: hrs.length ? Math.round(mean(hrs) * 10) / 10 : "",
    max_hr: hrs.length ? Math.max(...hrs) : "",
    total_energy: energies.length ? Math.max(...energies) : "",
    distance_15min_m: distance15min !== null ? distance15min : "",
  };

  const row = [
    summary.session_id, summary.date, summary.start, summary.end,
    summary.duration_str, summary.distance_m, summary.avg_speed, summary.max_speed,
    summary.avg_cadence, summary.max_cadence, summary.avg_power, summary.max_power,
    summary.avg_resistance, summary.avg_hr, summary.max_hr, summary.total_energy,
    summary.distance_15min_m,
  ];

  return { summary, row };
}

/* ============================================================
   Sterowanie: Start / Stop
   ============================================================ */
async function startRecording() {
  if (!bikeConnected || !bleDevice || !bleDevice.gatt.connected) {
    alert('Najpierw połącz rower przyciskiem "Połącz" przy karcie Rower.');
    return;
  }
  try {
    sessionId = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
    startTime = new Date();
    history = [];
    sparklineData = [];
    hrSparklineData = [];
    hideSummary();

    await acquireWakeLock();
    startSampling();
    startElapsedTimer();

    isRecording = true;
    setStatus("Trening w toku", "recording");
    setRecordButton(true);
  } catch (err) {
    log(`Błąd startu: ${err.message}`);
    setStatus("Błąd", "error");
    isRecording = false;
    setRecordButton(false);
  }
}

async function stopRecording() {
  isRecording = false;
  setRecordButton(false);
  setStatus("Zapisuję podsumowanie...", "connecting");

  stopSampling();
  stopElapsedTimer();
  releaseWakeLock();

  const { summary, row } = buildSummary();
  await sendToSheets("summary", row);
  showSummary(summary);

  setStatus("Gotowy", "");
  log("=== Trening zakończony i zapisany ===\n");
}

/* ============================================================
   UI
   ============================================================ */
function log(msg) {
  const box = document.getElementById("logBox");
  box.textContent += "\n" + msg;
  box.scrollTop = box.scrollHeight;
}

function setStatus(text, cls) {
  const pill = document.getElementById("statusPill");
  pill.textContent = text;
  pill.className = cls || "";
}

function setRecordButton(recording) {
  const btn = document.getElementById("recordBtn");
  const label = document.getElementById("recordBtnLabel");
  const wrap = document.getElementById("recordBtnWrap");
  btn.classList.toggle("recording", recording);
  label.textContent = recording ? "Stop" : "Start";
  btn.querySelector(".icon").textContent = recording ? "\u25A0" : "\u25CF";

  let ring = document.getElementById("pulseRing");
  if (recording && !ring) {
    ring = document.createElement("div");
    ring.id = "pulseRing";
    ring.className = "pulse-ring";
    wrap.appendChild(ring);
  } else if (!recording && ring) {
    ring.remove();
  }
}

function fmtLive(value, decimals) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return Number(value).toFixed(decimals);
}

function updateLiveStats(sample) {
  document.getElementById("statSpeed").textContent = fmtLive(sample.speed_kmh, 1);
  document.getElementById("statCadence").textContent = fmtLive(sample.cadence_rpm, 1);
  document.getElementById("statPower").textContent = fmtLive(sample.power_w, 0);
}

function hideSummary() {
  document.getElementById("summaryCard").classList.remove("visible");
}

function showSummary(summary) {
  document.getElementById("sumDuration").textContent = summary.duration_str;
  document.getElementById("sumDistance").textContent = summary.distance_m !== "" ? `${summary.distance_m} m` : "—";
  document.getElementById("sumSpeed").textContent =
    `${summary.avg_speed ?? "—"} / ${summary.max_speed ?? "—"} km/h`;
  document.getElementById("sumCadence").textContent =
    `${summary.avg_cadence ?? "—"} / ${summary.max_cadence ?? "—"} obr/min`;
  document.getElementById("sumPower").textContent =
    `${summary.avg_power ?? "—"} / ${summary.max_power ?? "—"} W`;
  document.getElementById("sumHr").textContent =
    `${summary.avg_hr ?? "—"} / ${summary.max_hr ?? "—"} bpm`;
  document.getElementById("summaryCard").classList.add("visible");
}

function drawSparklineSeries(ctx, data, w, h, color, maxLabelId, minLabelId, decimals) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);

  document.getElementById(maxLabelId).textContent = max.toFixed(decimals);
  document.getElementById(minLabelId).textContent = min.toFixed(decimals);

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawSparkline() {
  const canvas = document.getElementById("sparkline");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (sparklineData.length < 2) return;
  drawSparklineSeries(ctx, sparklineData, w, h, "#2FD9C4", "sparkMax", "sparkMin", 1);
  drawSparklineSeries(ctx, hrSparklineData, w, h, "#FF9F43", "hrSparkMax", "hrSparkMin", 0);
}

/* ============================================================
   Ustawienia (URL Apps Script) — pola edytowane na osobnej stronie
   ustawienia.html; tu tylko odczyt i baner ostrzeżenia.
   ============================================================ */
function checkConfig() {
  const warning = document.getElementById("configWarning");
  warning.classList.toggle("visible", !CONFIG.APPS_SCRIPT_URL);
}

/* ============================================================
   Ręczny opór — rower nie ma elektronicznej regulacji, więc
   użytkownik ustawia wartość sam, przed i w trakcie treningu.
   Zapisywana w tej samej kolumnie "Opór", którą wcześniej rower
   i tak zawsze raportował jako 0.
   ============================================================ */
function updateResistanceDisplay() {
  document.getElementById("resistanceValue").textContent = manualResistance;
  document.getElementById("resistanceMinus").disabled = manualResistance <= 1;
  document.getElementById("resistancePlus").disabled = manualResistance >= 16;
}

document.getElementById("resistanceMinus").addEventListener("click", () => {
  if (manualResistance <= 1) return;
  manualResistance -= 1;
  localStorage.setItem("rowerLoggerResistance", manualResistance);
  updateResistanceDisplay();
  if (isRecording) log(`  Opór zmieniony na ${manualResistance}/16.`);
});

document.getElementById("resistancePlus").addEventListener("click", () => {
  if (manualResistance >= 16) return;
  manualResistance += 1;
  localStorage.setItem("rowerLoggerResistance", manualResistance);
  updateResistanceDisplay();
  if (isRecording) log(`  Opór zmieniony na ${manualResistance}/16.`);
});

document.getElementById("bikeConnectBtn").addEventListener("click", () => {
  if (!navigator.bluetooth) {
    alert("Ta przeglądarka nie obsługuje Web Bluetooth. Użyj Chrome, Edge lub Samsung Internet.");
    return;
  }
  if (bikeConnected) {
    disconnectBike();
  } else {
    connectBike();
  }
});

document.getElementById("hrConnectBtn").addEventListener("click", () => {
  if (!navigator.bluetooth) {
    alert("Ta przeglądarka nie obsługuje Web Bluetooth. Użyj Chrome, Edge lub Samsung Internet.");
    return;
  }
  if (hrConnected) {
    disconnectHrStrap();
  } else {
    connectHrStrap();
  }
});

document.getElementById("recordBtn").addEventListener("click", () => {
  if (!navigator.bluetooth) {
    alert("Ta przeglądarka nie obsługuje Web Bluetooth. Użyj Chrome, Edge lub Samsung Internet.");
    return;
  }
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

checkConfig();
updateResistanceDisplay();
retryOfflineQueue();
document.getElementById("appVersion").textContent = APP_VERSION;
