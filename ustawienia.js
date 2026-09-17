"use strict";

const urlInput = document.getElementById("appsScriptUrl");
const maxHrInput = document.getElementById("maxHr");
const statusEl = document.getElementById("settingsStatus");

urlInput.value = getAppsScriptUrl();
const currentMaxHr = getMaxHr();
maxHrInput.value = currentMaxHr === null ? "" : currentMaxHr;

function showStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", !!isError);
}

const hrZonesList = document.getElementById("hrZonesList");

// Odświeżany na bieżąco przy wpisywaniu, nie tylko po zapisie — żeby
// od razu było widać efekt, zanim ktoś kliknie "Zapisz ustawienia".
function renderHrZones() {
  const raw = maxHrInput.value.trim();
  const maxHr = Number(raw);
  if (raw === "" || !Number.isFinite(maxHr) || maxHr <= 0) {
    hrZonesList.innerHTML = '<p class="hr-zones-empty">Wpisz tętno maksymalne powyżej, żeby zobaczyć strefy.</p>';
    return;
  }

  const zones = computeHrZones(Math.round(maxHr));
  hrZonesList.innerHTML = zones
    .map(
      (z) => `
      <div class="hr-zone-row">
        <span class="hr-zone-swatch" style="background: ${z.color};"></span>
        <span class="hr-zone-label">Strefa ${z.number} · ${z.label}</span>
        <span class="hr-zone-range">${z.from}–${z.to} bpm</span>
      </div>`
    )
    .join("");
}

maxHrInput.addEventListener("input", renderHrZones);
renderHrZones();

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  localStorage.setItem("rowerLoggerAppsScriptUrl", urlInput.value.trim());
  // Adres mógł się zmienić — bez tego Wyniki/Analizy pokazałyby jeszcze
  // przez chwilę dane z poprzedniego arkusza z cache'a.
  clearAppsScriptDataCache();

  const maxHrRaw = maxHrInput.value.trim();
  if (maxHrRaw === "") {
    localStorage.removeItem("rowerLoggerMaxHr");
  } else {
    const value = Number(maxHrRaw);
    if (!Number.isFinite(value) || value <= 0) {
      showStatus("Nieprawidłowa wartość tętna maksymalnego — nie zapisano.", true);
      return;
    }
    localStorage.setItem("rowerLoggerMaxHr", String(Math.round(value)));
    maxHrInput.value = Math.round(value);
  }

  renderHrZones();
  showStatus("Zapisano ustawienia.", false);
});

// Ta sama logika co dawniej w app.js — przeniesiona tu, bo to
// konserwacja aplikacji, a nie coś specyficznego dla rejestrowania
// treningu.
document.getElementById("forceUpdateBtn").addEventListener("click", async () => {
  if (!confirm("To wyczyści pamięć podręczną aplikacji i przeładuje tę stronę od zera. Kontynuować?")) {
    return;
  }
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    showStatus(`Błąd podczas czyszczenia: ${err.message}`, true);
    return;
  }
  // Wymuszone przeładowanie z pominięciem pamięci podręcznej przeglądarki.
  window.location.href = window.location.href.split("#")[0] + "?_v=" + Date.now();
});
