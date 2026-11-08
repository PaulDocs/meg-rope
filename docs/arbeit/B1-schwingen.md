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
- ~~Seil zieht sich ein~~ – nach Pascals erstem iPad-Test (08.11.2026)
  ersetzt durch:
  - **Seil bleibt immer gleich lang.** Es hängt durch und fällt zusammen,
    wenn der Schwung nicht reicht (Glieder-Kette, nur Darstellung; für das
    Männchen gilt die feste Länge).
  - **Gelöstes Seil fällt** herunter und verschwindet nach 1,5 s.
  - **Schwung holen:** Am gespannten Seil bewegt das Männchen die Beine wie
    auf einer Schaukel und beschleunigt in Schwungrichtung (2,2 m/s²). Es
    hängt nie einfach still. Test-Bot: ganze Strasse geschafft.
  - Vorbild laut Pascals Fotos und Videos: Häuser sind Kulisse.
- Kriterium 1 und das Gefühl auf dem iPad: **ungetestet**. Im Browser
  (Chrome, Testlauf) geprüft: Einhaken, Seil sichtbar, Lösen, Weiterfliegen,
  keine JS-Fehler.

## Rückmeldung Pascal 08.11.2026 (erster Test)

«Noch überhaupt nicht, was ich mir vorstelle»: Seil soll immer gleich lang
sein, nach der Physik schwingen und ohne Schwung zusammenfallen; das Männchen
holt immer Schwung. Fotos und Videos des Vorbilds geschickt.

## Rückmeldung Pascal 08.11.2026 (zweiter Test) und Umbau

Pascal: Grafik nach den Videos anpassen, Abstände zwischen den Häusern wie
im Vorbild, ab und zu Kräne oder andere Dinge zum Festhalten, alles etwas
schneller, Loopings mit dem richtigen Schwung, Drehungen werden bis zu einer
Grenze schneller.

Umgesetzt:
- **Welt** (`src/world.ts`): schlanke Türme (45–95 m) mit grossen Lücken
  (16–30 m), dazwischen Baukräne und Heissluftballone; alles hält das Seil.
  Feste Startzahl: Die Strasse sieht jedes Mal gleich aus (1,5 km).
- **Nur noch Kulisse**: feste Häuser und der Umschalter sind entfernt (das
  Vorbild fliegt vor den Häusern durch).
- **Schneller**: Schwerkraft 28 m/s², Start mit 14 m/s.
- **Loopings**: Schwung holen wirkt jetzt am gespannten Seil überall, auch
  oben (10 m/s²), bis 38 m/s. Mit genug Tempo bleibt das Seil oben gespannt
  und das Männchen dreht ganz um den Haken. Im freien Flug dreht es mit dem
  mitgenommenen Schwung weiter.
- **Grafik**: eigener Look – heller Taghimmel, Wolken, blasse Stadt hinten,
  Türme als Quader mit Seite und Dach in drei Tönen, gelbe Kräne,
  gestreifte Ballone, dunkles Männchen. Bilder und Figuren des Vorbilds
  sind nicht übernommen.
- Spielbarkeit als Test (`test/street.test.ts`): Ein einfacher Bot muss die
  ganze Übungsstrasse schaffen. Läuft rund 20 s in `pruefen.sh`.
- Kran-Ausleger überlappen keine Nachbarn mehr; alle Lücken 16–30 m.
- Toleranzen in den Tests bewusst gelockert (Gegenlesen): sichtbare
  Seil-Glieder dürfen sich beim schnellen Schwingen bis 20 % dehnen
  (Gesamtlänge bleibt auf 5 % genau); «allmählich schneller» heisst jetzt:
  nach 1 s weit unter dem Haken, nach 2 s noch kein Looping.
- Kulisse als Entscheid abgelegt: `docs/entscheide/2026-11-08-haeuser-kulisse.md`
  (Bestätigung Pascal offen).

## Testanleitung für Pascal

Testlink (privat): https://claude.ai/artifact/8QQcGgVaD9Fa4fCDFUw6GW
Neu erzeugen: `npm run einzelseite -- ‹ziel.html›`, dann veröffentlichen.

1. Link auf dem iPad in Safari öffnen, iPad quer halten.
2. Auf ein Haus, einen Kran oder einen Ballon tippen: Das Seil hakt dort ein.
3. Hängen lassen: Das Männchen holt mit den Beinen Schwung, die Schwünge
   werden grösser, mit kurzem Seil bis zum Looping.
4. Tippen löst das Seil, das Männchen fliegt (und dreht) weiter.
5. Ein paar hundert Meter weit kommen. Stimmen Tempo und Abstände?
6. In den Himmel tippen: nichts passiert. Am Boden: tippen startet neu.
