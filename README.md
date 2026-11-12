---
objekt: einstieg
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-08
status: offen
art: App
zweck: "Ein Browserspiel fürs iPad, in dem man mit einem Strichmännchen von Gebäude zu Gebäude schwingt, mit Challenge-Modus für mindestens zwei Spieler im lokalen Netzwerk"
sprache: TypeScript
framework: Vite (Canvas 2D, eigene Physik)
datenbank: offen
host: NAS (Heimnetz)
stack: Vite, TypeScript, Vitest; Server (Node, SQLite) ab Etappe 3
port: offen
adresse: offen
repo: offen
fuer: privat
---
# Meg Rope

Ein Browserspiel fürs iPad, in dem man mit einem Strichmännchen von Gebäude zu Gebäude schwingt, mit Challenge-Modus für mindestens zwei Spieler im lokalen Netzwerk

Angelegt am 08.11.2026 aus der Projektvorlage (`20-Infra/projekt-vorlage/`).
Was gebaut wird: `docs/konzept.md` (abgenommen 08.11.2026).

- **Starten:** `npm install`, dann `npm run dev` (im Heimnetz erreichbar – nur
  im eigenen WLAN starten, nie in fremden Netzen)
- **Tageszeit ansehen:** `?tageszeit=1300` an die Adresse hängen zeigt die
  Stimmung, die sonst nach 1300 m käme (nur Farben, siehe `docs/arbeit/B9-grafik-tageszeit.md`).
- **Testlink als eine Datei:** `npm run einzelseite -- ‹ziel.html›`
- **Prüfen:** `bash pruefen.sh`

- **Stand und Offenes:** `docs/STAND.md`
- **Ideen und Aufgaben:** `docs/arbeit/eingang.md`
- **Fachbegriffe:** `docs/glossar.md`
- **Regeln für KI-Werkzeuge:** `AGENTS.md`
