"use strict";

const urlInput = document.getElementById("appsScriptUrl");
const maxHrInput = document.getElementById("maxHr");
const restingHrInput = document.getElementById("restingHr");
const minCoverageInput = document.getElementById("minHrCoverage");
const testModeInput = document.getElementById("testMode");
const statusEl = document.getElementById("settingsStatus");

urlInput.value = getAppsScriptUrl();
const currentMaxHr = getMaxHr();
maxHrInput.value = currentMaxHr === null ? "" : currentMaxHr;
const currentRestingHr = getRestingHr();
restingHrInput.value = currentRestingHr === null ? "" : currentRestingHr;
const storedMinCoverage = localStorage.getItem("rowerLoggerMinHrCoverage");
minCoverageInput.value = storedMinCoverage === null ? "" : storedMinCoverage;
testModeInput.checked = isTestMode();

function showStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", !!isError);
}

const hrZonesList = document.getElementById("hrZonesList");

// Odświeżany na bieżąco przy wpisywaniu, nie tylko po zapisie — żeby
// od razu było widać efekt, zanim ktoś kliknie "Zapisz ustawienia".
// Tętno spoczynkowe jest opcjonalne: gdy podane i sensowne (dodatnie,
// niższe niż maksymalne), przełącza wyliczenia na metodę Karvonena
// (rezerwa tętna) — dokładniejszą, bo uwzględnia indywidualną
// wydolność, a nie tylko wiek/maksimum.
function renderHrZones() {
  const maxRaw = maxHrInput.value.trim();
  const maxHr = Number(maxRaw);
  if (maxRaw === "" || !Number.isFinite(maxHr) || maxHr <= 0) {
    hrZonesList.innerHTML = '<p class="hr-zones-empty">Wpisz tętno maksymalne powyżej, żeby zobaczyć strefy.</p>';
    return;
  }

  const restRaw = restingHrInput.value.trim();
  const restingHr = Number(restRaw);
  let methodNote;
  let methodClass = "hr-zones-method";
  let effectiveRestingHr = 0;

  if (restRaw === "") {
    methodNote = "Strefy liczone jako % tętna maksymalnego. Dodaj tętno spoczynkowe dla dokładniejszych granic (metoda Karvonena).";
  } else if (!Number.isFinite(restingHr) || restingHr <= 0 || restingHr >= maxHr) {
    methodNote = "Nieprawidłowe tętno spoczynkowe (musi być dodatnie i niższe niż maksymalne) — pominięte, strefy liczone jako % tętna maksymalnego.";
    methodClass += " hr-zones-method-warning";
  } else {
    effectiveRestingHr = Math.round(restingHr);
    methodNote = "Strefy liczone metodą rezerwy tętna (Karvonena) — uwzględniają tętno spoczynkowe.";
  }

  const zones = computeHrZones(Math.round(maxHr), effectiveRestingHr);
  const rows = zones
    .map(
      (z) => `
      <div class="hr-zone-row">
        <span class="hr-zone-swatch" style="background: ${z.color};"></span>
        <span class="hr-zone-label">Strefa ${z.number} · ${z.label}</span>
        <span class="hr-zone-range">${z.from}–${z.to} bpm</span>
      </div>`
    )
    .join("");
  hrZonesList.innerHTML = rows + `<p class="${methodClass}">${methodNote}</p>`;
}

maxHrInput.addEventListener("input", renderHrZones);
restingHrInput.addEventListener("input", renderHrZones);
renderHrZones();

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  // Walidacja obu pól tętna przed zapisem czegokolwiek — inaczej błąd
  // w jednym polu mógłby zostawić ustawienia w połowie zaktualizowane.
  const maxHrRaw = maxHrInput.value.trim();
  let maxHrValue = null;
  if (maxHrRaw !== "") {
    maxHrValue = Number(maxHrRaw);
    if (!Number.isFinite(maxHrValue) || maxHrValue <= 0) {
      showStatus("Nieprawidłowa wartość tętna maksymalnego — nie zapisano.", true);
      return;
    }
    maxHrValue = Math.round(maxHrValue);
  }

  const restingHrRaw = restingHrInput.value.trim();
  let restingHrValue = null;
  if (restingHrRaw !== "") {
    restingHrValue = Number(restingHrRaw);
    if (!Number.isFinite(restingHrValue) || restingHrValue <= 0) {
      showStatus("Nieprawidłowa wartość tętna spoczynkowego — nie zapisano.", true);
      return;
    }
    if (maxHrValue !== null && restingHrValue >= maxHrValue) {
      showStatus("Tętno spoczynkowe musi być niższe niż tętno maksymalne — nie zapisano.", true);
      return;
    }
    restingHrValue = Math.round(restingHrValue);
  }

  const minCoverageRaw = minCoverageInput.value.trim();
  let minCoverageValue = null;
  if (minCoverageRaw !== "") {
    minCoverageValue = Number(minCoverageRaw);
    if (!Number.isFinite(minCoverageValue) || minCoverageValue < 0 || minCoverageValue > 100) {
      showStatus("Minimalny udział odczytów pulsu musi być liczbą od 0 do 100 — nie zapisano.", true);
      return;
    }
    minCoverageValue = Math.round(minCoverageValue);
  }

  localStorage.setItem("rowerLoggerAppsScriptUrl", urlInput.value.trim());
  // Adres mógł się zmienić — bez tego Wyniki/Analizy pokazałyby jeszcze
  // przez chwilę dane z poprzedniego arkusza z cache'a.
  clearAppsScriptDataCache();

  if (maxHrValue === null) {
    localStorage.removeItem("rowerLoggerMaxHr");
  } else {
    localStorage.setItem("rowerLoggerMaxHr", String(maxHrValue));
    maxHrInput.value = maxHrValue;
  }

  if (restingHrValue === null) {
    localStorage.removeItem("rowerLoggerRestingHr");
  } else {
    localStorage.setItem("rowerLoggerRestingHr", String(restingHrValue));
    restingHrInput.value = restingHrValue;
  }

  if (minCoverageValue === null) {
    localStorage.removeItem("rowerLoggerMinHrCoverage");
  } else {
    localStorage.setItem("rowerLoggerMinHrCoverage", String(minCoverageValue));
    minCoverageInput.value = minCoverageValue;
  }

  if (testModeInput.checked) localStorage.setItem("rowerLoggerTestMode", "1");
  else localStorage.removeItem("rowerLoggerTestMode");

  renderHrZones();
  showStatus(
    testModeInput.checked ? "Zapisano ustawienia. Tryb testowy WŁĄCZONY — treningi nie będą zapisywane." : "Zapisano ustawienia.",
    false
  );
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
