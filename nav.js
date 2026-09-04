"use strict";

// Podbijaj ten numer przy każdej zmianie w plikach PWA — widoczny
// w stopce i na ekranach wczytywania danych, żeby od razu było
// wiadomo, czy telefon faktycznie pobrał najnowszą wersję, bez
// zaglądania do narzędzi deweloperskich.
const APP_VERSION = "2026-08-26.27";

// Domyślny adres wdrożenia — współdzielony z app.js przez ten sam klucz
// w localStorage, żeby ustawienia zmienione na jednej podstronie
// obowiązywały wszędzie.
const APPS_SCRIPT_URL_DEFAULT =
  "https://script.google.com/macros/s/AKfycbwQNzfoCtdyPGG3VFp9SJB_J8IRqwQoro9pEnAgsQGJ4wGuJAXqFXWXx1U8WDT4HSZb/exec";

function getAppsScriptUrl() {
  return localStorage.getItem("rowerLoggerAppsScriptUrl") || APPS_SCRIPT_URL_DEFAULT;
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
