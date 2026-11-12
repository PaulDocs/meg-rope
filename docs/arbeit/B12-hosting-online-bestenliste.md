---
objekt: karte
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
status: abnahme
---
# B12 – Hosting auf Cloudflare und Online-Bestenliste

Auftrag von Pascal am 12.11.2026, nach der Frage, wo er das Spiel «nicht
öffentlich aber mit Freunden» hosten kann:

> Ja vorbereiten mit cloud bestenliste auf Cloudflare

Entscheid und Abwägung: `docs/entscheide/2026-11-12-hosting-cloudflare.md`.
Einrichten und Alltag: `docs/betrieb.md`.

## Was gebaut ist

- **Bau für Cloudflare:** `npm run build:cloud` (wie `build`, mit
  `VITE_CLOUD=1`). Nur dieser Bau spricht mit der Online-Bestenliste; die
  Testseite und der normale Bau fragen nichts ab.
- **Kopfzeilen** (`public/_headers`): nicht in Suchmaschinen, nicht in fremden
  Rahmen, nur eigene Skripte und Verbindungen. Dazu `noindex` in `index.html`.
- **Live nur aus dem Zweig `live`**: `main` bleibt Arbeitsstand. Was Claude
  mergt, geht nicht live; live schaltet Pascal (PR von `main` nach `live`).
  Das ist heute eine Abmachung, technisch noch nicht gesperrt
  (`docs/betrieb.md`, Schritt 4).
- **Zugangsprüfung** (`server/access.ts`): Die Funktion prüft bei jeder
  Anfrage das Token von Cloudflare Access selbst und antwortet sonst mit 403,
  auch wenn `ACCESS_TEAM` oder `ACCESS_AUD` fehlen.
- **Funktion** (`functions/api/scores.ts`): `GET /api/scores?setting=…` gibt
  die besten 20, `POST /api/scores` meldet ein Ergebnis. Gespeichert wird je
  Spieler und Einstellung nur die Bestleistung, in einer D1-Datenbank; die
  Tabelle legt die Funktion selbst an. «Anna» und «anna» gelten als eine
  Spielerin.
- **Im Spiel** (`src/cloud.ts`, `src/board.ts`): Das Startmenü zeigt oben die
  Online-Bestenliste der gewählten Einstellung, darunter die Liste «Auf diesem
  Gerät». Nach einem Einzelspiel mit Punkten meldet das Spiel das Ergebnis; in
  der Wertung steht «Online: Platz 3 von 12». Ist die Liste nicht erreichbar,
  steht das dort, und das Spiel läuft normal weiter.
- Gemeldet werden Spielername, Einstellung, Punkte, Meter und bester Strike.
  Challenges bleiben auf dem Gerät.

## Was Pascal macht

Die vier Schritte in `docs/betrieb.md` (Zweig `live` und Pages-Projekt,
Access, Datenbank mit Zugangsprüfung, Regeln nachführen) samt den Prüflisten
dort. Claude hat keinen Zugang zu Cloudflare.

## Geprüft

- Funktion und Regeln mit Tests auf echtem SQLite (`test/board.test.ts`),
  Zugangsprüfung mit echt signierten Tokens (`test/access.test.ts`).
- `pruefen.sh` baut zusätzlich den Cloud-Bau («Bau Cloud»).
- Im Browser: Cloud-Bau mit den Kopfzeilen aus `_headers` und der echten
  Funktion (lokal, SQLite): Liste leer, drei Meldungen, Liste gefüllt, keine
  Fehler in der Konsole.

## Nicht geprüft

- **Bei Cloudflare selbst lief noch nichts**: Bau auf Pages, D1 und Access
  sind ungetestet. Die Menünamen in `docs/betrieb.md` stammen aus dem
  Gedächtnis.
- Die Zeile «Online: Platz …» in der Wertung war im Browser nicht zu sehen
  (der Prüflauf kommt nicht auf Punkte); ihr Text und die Meldung sind getestet.
- Die Browserprüfung in `pruefen.sh` läuft auf dem normalen Bau, nicht auf dem
  Cloud-Bau (der bräuchte die Funktion dahinter). Bekannte Lücke.
- Die D1-Schnittstelle und der Ablauf der Token-Prüfung sind von Hand nach der
  Cloudflare-Doku geschrieben, aus dem Gedächtnis, ohne installierte Typen.
  Ob Pages `functions/api/scores.ts` mit den Importen aus `src/` und `server/`
  so bündelt, zeigt erst der erste Bau dort.
