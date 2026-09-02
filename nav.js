"use strict";

// Domyślny adres wdrożenia — współdzielony z app.js przez ten sam klucz
// w localStorage, żeby ustawienia zmienione na jednej podstronie
// obowiązywały wszędzie.
const APPS_SCRIPT_URL_DEFAULT =
  "https://script.google.com/macros/s/AKfycbwQNzfoCtdyPGG3VFp9SJB_J8IRqwQoro9pEnAgsQGJ4wGuJAXqFXWXx1U8WDT4HSZb/exec";

function getAppsScriptUrl() {
  return localStorage.getItem("rowerLoggerAppsScriptUrl") || APPS_SCRIPT_URL_DEFAULT;
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
    alert(url.trim() ? "Zapisano adres Apps Script." : "Wyczyszczono adres Apps Script.");
  });
}

markActiveNavTile();
initStandaloneSettingsTile();
