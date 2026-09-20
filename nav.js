"use strict";

// Podbijaj ten numer przy każdej zmianie w plikach PWA — widoczny
// w stopce i na ekranach wczytywania danych, żeby od razu było
// wiadomo, czy telefon faktycznie pobrał najnowszą wersję, bez
// zaglądania do narzędzi deweloperskich. Format `MAJOR.MINOR`, ten
// sam numer w `?v=` w adresach plików HTML — patrz CHANGELOG.md.
const APP_VERSION = "1.20";

// Domyślny adres wdrożenia — współdzielony z app.js przez ten sam klucz
// w localStorage, żeby ustawienia zmienione na jednej podstronie
// obowiązywały wszędzie.
const APPS_SCRIPT_URL_DEFAULT =
  "https://script.google.com/macros/s/AKfycbwQNzfoCtdyPGG3VFp9SJB_J8IRqwQoro9pEnAgsQGJ4wGuJAXqFXWXx1U8WDT4HSZb/exec";

function getAppsScriptUrl() {
  return localStorage.getItem("rowerLoggerAppsScriptUrl") || APPS_SCRIPT_URL_DEFAULT;
}

// Wyniki i Analizy czytają dokładnie ten sam endpoint (doGet) — bez
// tego cache'a każde przełączenie między nimi odpytywało Apps Script
// od nowa, co przy zimnym starcie skryptu potrafi trwać kilka sekund.
// sessionStorage samo wygasa wraz z zamknięciem karty, więc nie ma
// ryzyka trwale nieaktualnych danych — a dodatkowo TTL i ręczny
// przycisk odświeżania (patrz fetchAppsScriptData) pozwalają wymusić
// świeże pobranie w trakcie tej samej sesji przeglądania.
const DATA_CACHE_KEY = "rowerLoggerDataCache";
const DATA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minut

function getCachedAppsScriptData() {
  try {
    const raw = sessionStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > DATA_CACHE_TTL_MS) return null;
    return cached.data;
  } catch (err) {
    return null;
  }
}

function setCachedAppsScriptData(data) {
  try {
    sessionStorage.setItem(DATA_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (err) {
    // sessionStorage bywa niedostępny (np. tryb prywatny) — po prostu
    // wtedy nie cache'ujemy, każda wizyta pobiera dane na nowo.
  }
}

function clearAppsScriptDataCache() {
  try {
    sessionStorage.removeItem(DATA_CACHE_KEY);
  } catch (err) {
    // jw.
  }
}

// Wspólny fetch dla wyniki.js i analiza.js. `forceRefresh` pomija
// i nadpisuje cache — używane po kliknięciu przycisku odświeżania.
async function fetchAppsScriptData(forceRefresh) {
  if (!forceRefresh) {
    const cached = getCachedAppsScriptData();
    if (cached) return { data: cached, fromCache: true };
  }
  const url = getAppsScriptUrl();
  const res = await fetch(url);
  const data = await res.json();
  if (data.ok) setCachedAppsScriptData(data);
  return { data, fromCache: false };
}

// Krótki obrót ikony przycisku odświeżania — sam efekt, niezależny od
// czasu trwania faktycznego pobierania danych.
function spinRefreshButton() {
  const btn = document.getElementById("refreshBtn");
  if (!btn) return;
  btn.classList.remove("spinning");
  void btn.offsetWidth; // wymuś reflow, żeby animacja zadziałała ponownie
  btn.classList.add("spinning");
}

// Tętno maksymalne — wpisywane w Ustawieniach na podstawie własnego testu
// użytkownika, bez wzoru szacunkowego z wieku (patrz TODO.md, Faza 1).
function getMaxHr() {
  const stored = Number(localStorage.getItem("rowerLoggerMaxHr"));
  return stored > 0 ? stored : null;
}

// Tętno spoczynkowe — opcjonalne, włącza dokładniejszą metodę Karvonena
// w computeHrZones() zamiast prostego % tętna maksymalnego.
function getRestingHr() {
  const stored = Number(localStorage.getItem("rowerLoggerRestingHr"));
  return stored > 0 ? stored : null;
}

// Minimalny udział próbek z odczytem pulsu w treningu (w %), poniżej
// którego trening jest pomijany w analizach tętna (wykres pulsu, czas w
// strefach, rekord maks. pulsu). Rower oddaje 0, gdy nie trzymamy
// uchwytów i nie ma paska, a utrata kontaktu paska daje serie zer —
// takie treningi zaniżają średnie i zniekształcają strefy. Puste pole
// w Ustawieniach = wartość domyślna; 0 = nie pomijaj żadnych.
const DEFAULT_MIN_HR_COVERAGE_PCT = 50;
function getMinHrCoveragePct() {
  const raw = localStorage.getItem("rowerLoggerMinHrCoverage");
  if (raw === null || raw === "") return DEFAULT_MIN_HR_COVERAGE_PCT;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : DEFAULT_MIN_HR_COVERAGE_PCT;
}

// Standardowy 5-strefowy podział intensywności. Wartości `low`/`high`
// to % rezerwy tętna (HRR = maxHr − restingHr) w metodzie Karvonena,
// albo zwykły % tętna maksymalnego, gdy restingHr nie jest podane —
// patrz computeHrZones().
const HR_ZONE_DEFS = [
  { label: "Regeneracja", low: 0.50, high: 0.60, color: "#4C8BF5" },
  { label: "Spalanie tłuszczu", low: 0.60, high: 0.70, color: "#2FD9C4" },
  { label: "Wytrzymałość aerobowa", low: 0.70, high: 0.80, color: "#F5C542" },
  { label: "Próg anaerobowy", low: 0.80, high: 0.90, color: "#FF9F43" },
  { label: "Maksymalny wysiłek", low: 0.90, high: 1.00, color: "#FF5C5C" },
];

// Granice kolejnych stref stykają się bez przerwy ani nakładania: dół
// strefy to góra poprzedniej + 1 bpm, więc każda wartość tętna trafia
// do dokładnie jednej strefy.
//
// Bez tętna spoczynkowego: granica = maxHr × %. Z tętnem spoczynkowym
// (metoda Karvonena/HRR, dokładniejsza — uwzględnia indywidualną
// wydolność): granica = restingHr + (maxHr − restingHr) × %. Podając
// restingHr = 0 do wzoru Karvonena dostajemy z powrotem zwykły % HRmax,
// więc jeden wzór obsługuje oba przypadki.
function computeHrZones(maxHr, restingHr) {
  const base = restingHr > 0 && restingHr < maxHr ? restingHr : 0;
  const reserve = maxHr - base;
  return HR_ZONE_DEFS.map((zone, i) => {
    const from = i === 0
      ? Math.round(base + reserve * zone.low)
      : Math.round(base + reserve * HR_ZONE_DEFS[i - 1].high) + 1;
    const to = i === HR_ZONE_DEFS.length - 1 ? maxHr : Math.round(base + reserve * zone.high);
    return { ...zone, number: i + 1, from, to };
  });
}

// Numer przedziału dla danego tętna: 0 = poniżej strefy 1, 1–5 = strefy
// (tętno powyżej maksimum trafia do strefy 5). Wspólne dla podglądu na
// żywo (Trening) i statystyk z arkusza (Analizy).
function hrZoneIndex(zones, hr) {
  if (hr < zones[0].from) return 0;
  const i = zones.findIndex((z) => hr <= z.to);
  return i === -1 ? 5 : i + 1;
}

const ZONE_BELOW_COLOR = "#3A464B";
const ZONE_BELOW_LABEL = "Poniżej strefy 1";
// Odstęp między próbkami to normalnie 5 s. Dłuższa luka (np. aplikacja
// w tle przy rozmowie telefonicznej) liczy się tylko do tego limitu,
// żeby nie przypisać strefie czasu, którego nie zmierzono.
const HR_ZONE_MAX_GAP_S = 15;

function formatMinSec(totalSeconds) {
  const secs = Math.round(totalSeconds);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function markActiveNavTile() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-tile[data-page]").forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.page === page);
  });
}

markActiveNavTile();
