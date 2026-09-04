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

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  localStorage.setItem("rowerLoggerAppsScriptUrl", urlInput.value.trim());

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
