"use strict";

// Podbijaj ten numer przy każdej zmianie w plikach PWA — widoczny
// w stopce i na ekranach wczytywania danych, żeby od razu było
// wiadomo, czy telefon faktycznie pobrał najnowszą wersję, bez
// zaglądania do narzędzi deweloperskich.
const APP_VERSION = "2026-08-26.29";

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

// Tętno maksymalne — na razie tylko zapisywane w Ustawieniach, docelowo
// posłuży do wyliczania stref tętna (patrz TODO.md, Faza 1).
function getMaxHr() {
  const stored = Number(localStorage.getItem("rowerLoggerMaxHr"));
  return stored > 0 ? stored : null;
}

function markActiveNavTile() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-tile[data-page]").forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.page === page);
  });
}

markActiveNavTile();
