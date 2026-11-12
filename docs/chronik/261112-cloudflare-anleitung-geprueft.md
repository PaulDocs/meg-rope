---
objekt: chronik
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
datum: 2026-11-12
---
# 12.11.2026 – Cloudflare-Anleitung geprüft (B12)

- Auftrag: Die Anleitung `docs/betrieb.md` stammte aus dem Gedächtnis; gegen die
  Cloudflare-Doku prüfen, korrigieren, Pascal bei der Einrichtung begleiten.
- Geprüft mit WebFetch/WebSearch gegen `developers.cloudflare.com` (Access
  «Validate JWTs», Pages Vorschau-Bereitstellungen, Bindings, Build-Image,
  Branch-Steuerung, Rollback, Known Issues; D1 Worker API). Ergebnis im
  Abschnitt «Geprüft» von `docs/betrieb.md`.
- Der Code (`server/access.ts`, `functions/api/scores.ts`) passt zur Doku;
  keine Änderung, keine neuen Tests nötig. Dass die Funktion mit den Importen
  aus `src/` und `server/` bündelt und echte Tokens besteht, zeigt der Lauf
  von Pascal (Antworten «Kein Zugang», dann «Speicher nicht verbunden»).
- Korrigiert in der Anleitung: «Zugriffsrichtlinie aktivieren» schützt nur
  Vorschau-Adressen (die Hauptadresse braucht eine eigene Access-Anwendung);
  `ACCESS_TEAM` ist nur der Name (mit Pfad: 403 für alle); Menünamen auf
  Deutsch nach Pascals Bildschirmfotos; Zweig `live` zuerst anlegen; Vorschau-Bauten
  ausschalten; Tabelle der Antworten von `/api/scores`; Neu bauen nach
  Bindung und Variablen; kein gemeinsames Passwort in Access.
- Nicht belegt blieb: D1-Konsole im Dashboard, Ort des AUD-Tags und des
  Team-Namens im neuen Dashboard, Anmeldeseite vor jeder Adresse (Prüfliste),
  eigene Domain in derselben Anwendung.
- Gefunden beim Einrichten: Cloudflare empfiehlt für neue Projekte Workers
  statt Pages (Doku «Start new projects with Workers»); Pages mit Git läuft
  weiter. Kein Entscheid nötig, in `docs/betrieb.md` vermerkt.
