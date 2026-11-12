---
objekt: entscheid
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
---
**Stand:** 12.11.2026 · **Quelle:** Pascal im Hauptfenster, 12.11.2026

# Entscheid: Hosting auf Cloudflare Pages, Online-Bestenliste in D1 (12.11.2026)

## Auftrag

Pascal, 12.11.2026: Er will das Spiel über das Internet spielen, «nicht
öffentlich aber mit Freunden». Auf den Vorschlag Cloudflare Pages mit Access:
«Ja vorbereiten mit cloud bestenliste auf Cloudflare».

## Ergebnis

- **Seite:** Cloudflare Pages, gebaut aus dem Zweig **`live`** mit
  `npm run build:cloud`. Das GitHub-Repo bleibt privat. `main` bleibt der
  Arbeitsstand; `live` schiebt nur Pascal nach (Regel «Ein Push, der live
  geht, ist immer Pascals Ja»). Vorschau-Bauten aus anderen Zweigen sind aus.
- **Zugang:** Cloudflare Access davor. Rein kommt, wessen E-Mail-Adresse in
  der Richtlinie steht (Code per Mail). Die Bestenliste verlässt sich nicht
  darauf: Die Funktion prüft bei jeder Anfrage das Token von Access selbst
  (`server/access.ts`: Unterschrift, Aussteller, Anwendung, Ablauf) und
  antwortet sonst mit 403 – auch dann, wenn die Einrichtung fehlt.
- **Bestenliste:** eine Pages Function (`functions/api/scores.ts`) mit einer
  D1-Datenbank. Je Spieler und Einstellung steht nur die Bestleistung drin.
  Gemeldet wird nur das Einzelspiel; Challenges bleiben auf dem Gerät.
- **Ohne Cloudflare** (Testseite, lokaler Bau) ist die Online-Liste
  ausgeschaltet: Der Bau fragt nur mit `VITE_CLOUD=1` ab.

## Warum

- Pascal kennt Cloudflare: fünf Projekte liegen dort, Access mit E-Mail-Code
  nutzt er schon für eine andere Seite.
- D1 statt KV: Zwei Meldungen zur gleichen Zeit überschreiben sich in KV
  gegenseitig; in D1 entscheidet eine einzige Anweisung, ob ein Ergebnis
  besser ist.
- Das eigene NAS scheidet aus (Entscheid 10.10.2026: von aussen nur über VPN).

## Bewusst nicht gebaut

- **Die Dateien des Spiels schützt nur Access.** Ist eine Adresse des
  Projekts nicht von Access gedeckt, ist dort das Spiel selbst offen (die
  Bestenliste nicht, siehe oben). Darum die Prüfschritte in `docs/betrieb.md`.
- **Kein Schutz gegen Schummeln.** Wer Zugang hat, kann mit etwas Geschick
  erfundene Punkte melden; der Speicher prüft nur, ob die Werte möglich sind.
  Unter Freunden vertretbar. Einträge löscht Pascal in der D1-Konsole.
- **Keine Mengenbegrenzung je Person.** Die Liste nimmt je Einstellung
  höchstens 300 Namen an (`BOARD.maxPlayers`), mehr Schutz gibt es nicht.

## Verhältnis zum Konzept

`docs/konzept.md` sah vor: Spielen nur im Heimnetz, Server (Node, SQLite) auf
dem NAS ab Etappe 3, «Spielen über das Internet» bewusst nicht dabei. Dieser
Entscheid ändert davon:

- **Ersetzt:** «nicht über das Internet». Das Spiel ist für Freunde über das
  Internet erreichbar, hinter Access.
- **Neu:** eine gemeinsame Bestenliste fürs Einzelspiel bei Cloudflare (D1).
- **Offen, nicht entschieden:** wo der Server für die Challenge übers Netz
  (Etappe 3) laufen soll – NAS wie im Konzept oder ebenfalls Cloudflare. Bis
  Pascal das entscheidet, gilt für Etappe 3 weiter das Konzept; kein zweites
  Backend ohne diesen Entscheid.

## Daten

In der Datenbank stehen Spielername, Einstellung, Punkte, Meter, bester
Strike und Zeitpunkt. Keine E-Mail-Adressen, keine Geräte-Kennungen. Alle mit
Zugang sehen diese Liste. Die E-Mail-Adressen der Freunde stehen nur in der
Access-Richtlinie bei Cloudflare, nie im Repo.
