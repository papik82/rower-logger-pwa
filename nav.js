"use strict";

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

// Wspólny prompt dla pola "Tętno maksymalne" — używany zarówno przez
// standalone'owy handler "Ustawienia" poniżej, jak i przez app.js na
// index.html (tam ma bogatszą, "managed" obsługę reszty ustawień).
function promptMaxHr() {
  const current = getMaxHr();
  const input = prompt(
    "Tętno maksymalne (bpm) — zostaw puste, jeśli nie chcesz go teraz podawać:",
    current === null ? "" : String(current)
  );
  if (input === null) return;
  const trimmed = input.trim();
  if (trimmed === "") {
    localStorage.removeItem("rowerLoggerMaxHr");
    return;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    alert("Nieprawidłowa wartość tętna maksymalnego — zignorowano.");
    return;
  }
  localStorage.setItem("rowerLoggerMaxHr", String(Math.round(value)));
}

function markActiveNavTile() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-tile[data-page]").forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.page === page);
  });
}

// Na index.html przycisk "Ustawienia" ma swoją, bogatszą obsługę w app.js
// (aktualizuje CONFIG w pamięci i baner ostrzeżenia bez przeładowania
// strony) — tam ma data-settings="managed" i ten handler go pomija.
function initStandaloneSettingsTile() {
  const tile = document.getElementById("settingsBtn");
  if (!tile || tile.dataset.settings !== "standalone") return;
  tile.addEventListener("click", () => {
    const current = getAppsScriptUrl();
    const url = prompt("Wklej URL wdrożenia Google Apps Script (kończy się na /exec):", current);
    if (url === null) return;
    localStorage.setItem("rowerLoggerAppsScriptUrl", url.trim());

    promptMaxHr();

    alert("Zapisano ustawienia.");
  });
}

markActiveNavTile();
initStandaloneSettingsTile();
