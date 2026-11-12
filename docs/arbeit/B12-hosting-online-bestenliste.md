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
  Gegen Claude gesperrt seit 12.11.2026: Der Hook weist jeden `git push` auf
  `live` ab (`AGENTS.md`, Zeile «Live»; `docs/betrieb.md`, Schritt 4). Ein
  Zweigschutz bei GitHub wäre die Sperre für alle, nicht geprüft.
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

- **Stand 12.11.2026:** Pascal hat Pages, Access und D1 eingerichtet und nach
  dem Binden der Datenbank «ok läuft» gemeldet (Meldung der Hauptsitzung; die
  Antwort selbst habe ich nicht gesehen). Die Anleitung ist gegen die Cloudflare-Doku geprüft
  (Abschnitt «Geprüft» in `docs/betrieb.md`, Chronik `261112-cloudflare-anleitung-geprueft.md`).
  Offen bleiben die Prüflisten dort: Anmeldeseite vor Hauptadresse und
  Lauf-Adresse im privaten Fenster, Eintrag auf einem zweiten Gerät.
- Nicht in der Doku belegt: D1-Konsole im Dashboard, Ort von AUD-Tag und
  Team-Name im neuen Dashboard, eigene Domain in derselben Access-Anwendung.
- Die Zeile «Online: Platz …» in der Wertung war im Browser nicht zu sehen
  (der Prüflauf kommt nicht auf Punkte); ihr Text und die Meldung sind getestet.
- Die Browserprüfung in `pruefen.sh` läuft auf dem normalen Bau, nicht auf dem
  Cloud-Bau (der bräuchte die Funktion dahinter). Bekannte Lücke.
- Die D1-Schnittstelle (`prepare`, `bind`, `all`, `run`, `batch`) und der Ablauf
  der Token-Prüfung sind jetzt gegen die Cloudflare-Doku verglichen und stimmen.
  Es gibt weiter keine installierten Typen dazu. Dass Pages die Funktion mit den
  Importen aus `src/` und `server/` bündelt und echte Tokens die Prüfung
  bestehen, zeigt der Lauf bei Cloudflare (Antworten der Funktion). Die
  Meldung eines Ergebnisses (`POST`) bei Cloudflare ist noch nicht gesehen
  (Prüfliste Schritt 3).
