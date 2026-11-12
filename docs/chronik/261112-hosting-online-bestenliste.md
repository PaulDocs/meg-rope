---
objekt: chronik
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
datum: 2026-11-12
---
# 12.11.2026 – Hosting auf Cloudflare vorbereitet, Online-Bestenliste (B12)

- Pascal fragte, wo er das Spiel «nicht öffentlich aber mit Freunden» hosten
  kann; empfohlen Cloudflare Pages mit Access. Auftrag: «Ja vorbereiten mit
  cloud bestenliste auf Cloudflare».
- Gebaut: `functions/api/scores.ts` (Pages Function, D1), `src/board.ts`
  (geteilte Regeln), `src/cloud.ts` (Anbindung, nur mit `VITE_CLOUD=1`),
  Online-Liste im Startmenü, Rang in der Wertung, `public/_headers`,
  `.node-version`, Skript `build:cloud`.
- Selbst entschieden (im Entscheid begründet): D1 statt KV; kein Schutz gegen
  erfundene Punkte; nur das Einzelspiel wird gemeldet; live aus einem eigenen
  Zweig `live` statt aus `main`.
- Gegenlesen (drei Leser): kein Blocker. Behoben: Die Funktion prüft das
  Access-Token selbst (`server/access.ts`; zuerst war die Route nur durch
  Access davor geschützt – gegen Leitplanke 8), Anleitung in sicherer
  Reihenfolge (Zugang vor Datenbank), Zweig `live`, GitHub-Freigabe nur für
  dieses Repo, Kopfzeilen an den Antworten der Funktion, Grössengrenze beim
  Lesen, Verhältnis zum Konzept im Entscheid, Steckbrief in der README,
  «Bau Cloud» in `pruefen.sh`, `cleanName` trimmt nach dem Kürzen, Tests für
  Gleichstand, Umlaute, die Kette Runde → Meldung und den Schalter. Offen:
  eigene Typen für D1 statt `@cloudflare/workers-types` (neues Paket, nicht
  ohne Pascal), Browserprüfung des Cloud-Baus.
- Zweite Sicherheitslesung nach dem Einbau der Token-Prüfung: Prüfung ohne
  Befund. Behoben: Sperrfrist beim Nachladen der Schlüssel, Prüfpunkt für die
  Adresse eines einzelnen Laufs. Offen für Pascal: `live` ist nur per
  Abmachung geschützt, bis GitHub-Zweigschutz oder ein Hook es sperrt.
- Tests laufen auf echtem SQLite aus Node (`node:sqlite`), ohne neues Paket;
  die Typen dafür stehen in `test/sqlite.d.ts`.
- Nicht eingerichtet und nicht bei Cloudflare getestet: Das macht Pascal nach
  `docs/betrieb.md`.
- `docs/STAND.md` nicht angefasst (Kopf nur in der Tages-Abschluss-Sitzung);
  der Stand dort ist vom 08.11. und veraltet.
