# Rower Logger PWA — plan rozwoju

Roadmapa funkcji ponad podstawowe rejestrowanie treningów. Fazy ułożone
w kolejności zależności — każda kolejna korzysta z fundamentu poprzedniej.

---

## 🚧 FAZA 1 — Moduł analityczny (w trakcie planowania)

**Cel:** osobny widok/strona w aplikacji (dostępna też w zwykłej
przeglądarce desktopowej, bez wymogu Web Bluetooth — analiza tylko
czyta dane z arkusza, nie łączy się z rowerem).

### Wymagany fundament techniczny
- [x] Rozbudować `apps-script.gs`: właściwy `doGet(e)` zwracający dane
      z `Trening_Szczegoly` i `Trening_Podsumowania` jako JSON
      (zamiast obecnego stubu z samym komunikatem statusu)
- [ ] Rozważyć limit/paginację przy odczycie (żeby przy setkach
      treningów odpowiedź nie była zbyt ciężka)

### Architektura widoku (ustalone)
- [x] Osobna strona `analiza.html` w tym samym repozytorium (nie
      zakładka w `index.html`) — prościej, i nie wymaga Bluetootha,
      więc działa w każdej przeglądarce niezależnie od tego, gdzie
      się ją otworzy
- [x] Wydzielić wspólny plik `styles.css` z dotychczasowego CSS
      w `index.html`, użyć go też w `analiza.html` — zapewnia spójność
      wizualną (te same kolory, karty, typografia) i unika duplikacji
      przy przyszłych zmianach wyglądu
- [x] Jednolite menu nawigacyjne (bloki z ikonami: Trening / Analizy /
      Wyniki / Ustawienia), wspólne dla wszystkich podstron —
      `.nav-menu` w `styles.css`, znacznik aktywnej podstrony i obsługa
      przycisku "Ustawienia" na stronach bez `app.js` w nowym `nav.js`.
      Zastąpiło to wcześniejszy pomysł osobnego linku powrotnego —
      jedna, spójna nawigacja zamiast dwóch równoległych
- [x] Dodać `analiza.html` (i jej plik JS, jeśli osobny) do listy
      cache'owanych plików w `sw.js` (`SHELL_FILES`) oraz objąć tym
      samym mechanizmem wersjonowania `?v=`, co `app.js`

### Zakres merytoryczny (wszystko naraz, jeden moduł)
- [ ] **Historia treningów** — lista/tabela dotychczasowych sesji
      z podstawowymi statystykami (data, dystans, czas, śr. moc, śr. puls)
- [ ] **Wykresy trendów w czasie** — prędkość / moc / puls / kadencja
      na przestrzeni tygodni, z możliwością wyboru zakresu dat
- [ ] **Rekordy osobiste (PR)** — najdłuższy dystans, najwyższa średnia
      moc, najwyższa maks. prędkość, itd., automatycznie wyłapywane
      z historii
- [ ] **Strefy tętna** — podział czasu treningu na strefy (na bazie
      tętna maksymalnego), wizualizacja % czasu w każdej strefie.
      Domyślnie wyliczane automatycznie wzorem szacunkowym (220 − wiek),
      z polem w Ustawieniach do wpisania własnej, znanej wartości
      tętna maksymalnego, która nadpisuje wyliczenie wzorem
- [ ] Dostępność w zwykłej przeglądarce desktopowej (Chrome/Firefox/
      Safari) — bez wymogu Web Bluetooth, bo to tylko odczyt danych

### Do ustalenia po drodze
- [ ] Pole "wiek" w Ustawieniach (potrzebne do wzoru 220 − wiek, dopóki
      użytkownik nie poda własnego, znanego tętna maksymalnego)

---

## 🔜 BACKLOG — kolejne fazy (skonkretyzować przed startem każdej)

### Faza 2 — Struktura treningu (typy + prowadzenie interwałów)
- [ ] Wybór typu treningu na starcie: swobodna jazda / interwały /
      wytrzymałościowy / sprint test
- [ ] Sygnały wizualne (i docelowo dźwiękowe) prowadzące przez
      zaplanowane odcinki ("zmień tempo za 10 s")
- [ ] Konfigurowalny szablon interwałów (czas pracy/odpoczynku,
      liczba powtórzeń)

### Faza 3 — Grywalizacja
- [ ] Odznaki/osiągnięcia (progi dystansu, serie dni treningowych)
- [ ] Wyzwania tygodniowe (np. suma dystansu, suma czasu w danej
      strefie tętna)
- [ ] System uwzględniający regenerację — ostrzeżenie przy zbyt wielu
      intensywnych treningach pod rząd, nie tylko nagradzanie wysiłku

### Faza 4 — Wirtualne trasy z nachyleniem
- [ ] Model trasy: odcinki z przypisanym docelowym poziomem oporu
      (1–16) odpowiadającym symulowanemu nachyleniu
- [ ] Podpowiedzi zmiany oporu w czasie rzeczywistym (ręczna regulacja
      przez użytkownika, zgodnie z ograniczeniem sprzętu)
- [ ] Wizualizacja profilu wysokościowego trasy

### Faza 5 — Wyścig z duchem
- [ ] Wybór poprzedniej sesji jako "ducha" przed startem
- [ ] Porównanie na żywo: aktualny dystans/tempo względem tej samej
      chwili w sesji-duchu (przewaga/strata w czasie rzeczywistym)

---

## 💭 Do przemyślenia (luźne, jeszcze nie w backlogu)
- Test bazowy do kalibracji stref mocy/tętna (np. 20-minutowy test
  maksymalnego wysiłku) — punkt odniesienia pod przyszłe treningi
- Progresja oparta na trendzie (np. średnia moc z ostatnich 4 tygodni),
  nie tylko na pojedynczym rekordzie z jednej sesji

---

## ✅ Zrobione
- Rejestrowanie treningu przez PWA (Bluetooth FTMS)
- Ręczny opór na rowerze (1–16) z zapisem do arkusza
- Priorytetowy odczyt pulsu z paska BLE, automatyczny fallback na
  uchwyty roweru przy rozłączeniu paska
- Licznik czasu treningu na żywo
- Osobne przyciski połączenia (rower / pasek), niezależne od Start/Stop
- Mini-wykres (sparkline) prędkości na żywo w trakcie treningu, z osią
- Mechanizm wersjonowania plików (`?v=`) i przycisk wymuszenia
  aktualizacji aplikacji
- `apps-script.gs`: `doGet(e)` zwracający dane z obu zakładek jako JSON
- Wspólny `styles.css`, jednolite menu nawigacyjne (Trening / Analizy /
  Wyniki / Ustawienia) na wszystkich podstronach
- `wyniki.html` — surowa tabela wszystkich próbek z `Trening_Szczegoly`,
  najnowsze na górze
- Wersja desktopowa (Python, GUI) — obecnie zamrożona na rzecz PWA
