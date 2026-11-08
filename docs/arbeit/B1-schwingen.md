---
objekt: karte
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-08
status: abnahme
---
# B1 – Etappe 1: Schwingen

**Go:** BAU FREI von Pascal am 08.11.2026. Konzept: `docs/konzept.md`.

## Ziel

Ein Strichmännchen, ein paar feste Gebäude, das Seil. Im Safari auf dem iPad
ausprobieren, ob sich Schwingen und Fliegen gut anfühlen.

## Umfang

- Tippen auf ein Gebäude hakt das Seil dort ein, nochmals tippen löst es.
- Tippen in den leeren Himmel macht nichts.
- Am Seil schwingt das Männchen wie ein Pendel, gelöst fliegt es mit dem Schwung weiter.
- An Gebäuden prallt es ab oder rutscht daran ab.
- Boden berührt: Versuch vorbei, Neustart per Tippen.
- Kamera folgt dem Männchen.
- Einfaches Strichmännchen (Animation kommt in Etappe 5).

Nicht dabei: Ziel, drei Versuche, Zeit, Punkte, Server (Etappen 2–3).

## Erfolgs-Kriterien

1. Läuft in Safari auf dem iPad im Querformat, ohne Zoomen oder Scrollen.
2. Tippen auf ein Gebäude hakt ein, das Seil ist sichtbar.
3. Nochmals tippen löst das Seil, das Männchen fliegt im Bogen weiter.
4. Das Männchen fliegt nicht durch Gebäude hindurch.
5. Am Boden endet der Versuch, Tippen startet neu.
6. `pruefen.sh` ist grün.

## Umgesetzt

- Physik in `src/physics.ts` (feste Zeitschritte, Stellschrauben in `TUNING`),
  Übungsstrasse mit 21 Türmen in `src/world.ts`, Zeichnen in `src/render.ts`.
- **Zwei Häuser-Varianten**, umschaltbar oben rechts (Entscheid Pascal):
  - **Kulisse** (Start): Häuser sind Hintergrund, man fliegt davor durch und
    hakt genau dort ein, wo man tippt.
  - **Fest**: Häuser sind Hindernisse, man prallt ab; das Seil braucht freie
    Sicht und hakt an der ersten getroffenen Stelle ein.
  - Grund: Mit festen Häusern zieht jeder Schwung an ein Haus in dessen Wand.
    Ein Test-Bot kam damit nicht über 40 m hinaus, mit Kulisse bis ans Ende
    der Strasse (430 m).
- **Seil zieht sich ein** (4 m/s, bis 2 m), sonst verliert man bei jedem
  Schwung Höhe.
- Kriterium 1 und das Gefühl auf dem iPad: **ungetestet**. Im Browser
  (Chrome, Testlauf) geprüft: Einhaken, Seil sichtbar, Lösen, Weiterfliegen,
  keine JS-Fehler.

## Testanleitung für Pascal

Testlink (privat): https://claude.ai/artifact/8QQcGgVaD9Fa4fCDFUw6GW
Neu erzeugen: `npm run einzelseite -- ‹ziel.html›`, dann veröffentlichen.

1. Link auf dem iPad in Safari öffnen, iPad quer halten.
2. Auf einen Turm tippen: Das Seil hakt dort ein, das Männchen schwingt.
3. Nochmals irgendwo tippen: Das Seil löst sich, das Männchen fliegt weiter.
4. Ein paar Türme weit schwingen. Die Meter oben links zählen mit.
5. In den Himmel tippen: Es passiert nichts.
6. Auf den Boden fallen lassen: Meldung erscheint, tippen startet neu.
7. Oben rechts auf «Häuser: Kulisse» tippen und «fest» ausprobieren.
   Welche Variante fühlt sich richtig an?
