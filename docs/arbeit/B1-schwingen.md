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

## Rückmeldung Pascal 08.11.2026 (drittes Video) und Umbau

Pascal: Video `docs/IMG_1852.mov` (liegt nur lokal, `*.mov` ist in
`.gitignore`) ansehen und die Umgebung so gut wie möglich nachbauen.

Aus dem Video (richtig gedreht) abgeleitet und umgesetzt:
- **Boden** als helle Fläche, man blickt leicht von oben; Türme werfen
  Schatten auf den Boden.
- **Perspektive**: Türme sind tiefe Quader; man sieht die Seite, die zur
  Bildmitte zeigt – beim Vorbeifliegen wandert sie von rechts nach links.
- **Türme** schlank und höher (55–110 m), ein kühler Ton mit senkrechten
  Rillen, Absätze und Nadelspitzen; blasse Türme weit hinten.
- **Haltepunkte** neu: Kräne auch auf Dächern, Luftschiffe; Ballone wie bisher.
- **Seil** dünn und dunkel, Meter oben rechts, Figur etwas kleiner, Blick
  weiter (120 m hoch).
- Eigene Farben und Formen; nichts aus dem Vorbild kopiert.
- Bekannt: Tippt man auf die sichtbare Seite eines Turms (nicht die Front),
  hakt das Seil nur in der Nähe der Front-Kante ein (0,8 m Spielraum). Das
  Leitwerk des Luftschiffs ist nur Kulisse. **Entscheid Pascal 08.11.2026:
  nur die Front ist greifbar**, Seite und Dach bleiben Kulisse.
- Gegenlesen: zweiter Turm-Absatz und Luftschiff-Hülle (jetzt Ellipse)
  greifen wie gezeichnet; Dachkräne und Startpunkt mit Tests abgesichert.

## Rückmeldung Pascal 08.11.2026: zu einfach, Welt zu kurz

Pascal: im Vergleich zum Vorbild viel zu einfach (Tempo, Abstände?), die
Welt ist zu kurz; Tempo im Video nachschauen. Grafik später (Etappe 5,
Vorschlag echtes 3D mit three.js).

Gemessen im Video (`docs/IMG_1852.mov`, Einzelbilder alle 0,4 s, Anzeige
mitgelesen): im Flug rund **50 m/s** (464 → 485 → 505 → 524 → 537 m), danach
rund 6 s Loopings um einen Turm. Kamera viel näher: Türme ragen oben aus
dem Bild, Lücken etwa eine halbe bis ganze Bildbreite.

Umgesetzt:
- **Endlose Strasse** (`createStreet().extendTo()`), wird beim Fliegen 600 m
  voraus gebaut, bei gleicher Startzahl immer gleich.
- **Schwerer mit der Strecke**: Lücken 24–42 m am Start, alle 100 m 1 m
  mehr, ab 3 km 54–72 m (`DIFFICULTY`).
- **Schneller**: Schwerkraft 40 m/s², Start 22 m/s, Schwingen bis 55 m/s.
- **Weniger Hilfe**: Schwung holen schwächer (7 m/s²); aus dem Stand gibt es
  am kurzen Seil keinen Looping mehr – dafür braucht es Tempo vom Flug.
- **Kamera näher** (70 m hoch), Männchen in der Bildmitte; Türme 70–150 m.
- Bot (sieht alles voraus, spielt also besser als ein Mensch): 4 km mit
  rund 30 m/s im Schnitt. Tests: erste 1,5 km und 500 m hinter 3 km (grösste
  Lücken) – heisst «machbar», nicht «leicht».
- Gegenlesen: Die Rechnung bremste schnelle Drehungen künstlich (Seil-Länge
  in festen Schritten); behoben – am gespannten Seil bleibt das Tempo jetzt
  erhalten, nur der Ruck beim Spannen kostet Schwung. Loopings erreichen so
  wirklich bis 55 m/s; Loopings werden in Tests nur gezählt, wenn das Seil
  oben gespannt ist.

## Rückmeldung Pascal 08.11.2026: Loopings und Abflug

Pascal: Tempo ok, Loopings ok. Loopings sollen pro Drehung schneller werden,
bis zu 3 Umdrehungen, nicht extrem. Abflug-Tempo soll je nach Winkel
verschieden sein (physikalisch korrekt); maximale Flughöhe evtl. anpassen.

Ursache: Schwung holen hob das Tempo überall bis zur Grenze – oben im Kreis
war das Männchen fast so schnell wie unten, der Abflug darum in jedem Winkel
ähnlich.

Umgesetzt:
- **Grenze nach Energie** statt nach Tempo (`swingEnergy`): oben langsamer,
  unten schneller; ohne Schwung holen bleibt die Energie gleich. Die Grenze
  ist neu ein Tempo **auf Hakenhöhe: 50 m/s** (vorher 55 m/s überall); ganz
  unten wird es je nach Seillänge schneller (20 m Seil: rund 64 m/s).
- **Bis 3 Umdrehungen** (`maxPumpTurns`, `turnsOnRope`): jede volle Drehung
  um denselben Haken wird schneller, danach kein Zuwachs mehr.
- Abflug ist ein echter Wurf: Höhe = v_y²/(2g). Mit g 40 heisst das: 25 m/s
  steil nach oben → rund 8 m, 50 m/s → rund 31 m. **Offen: Flughöhe** –
  höher oder tiefer? Stellschraube ist die Schwerkraft (`TUNING.gravity`).

## Rückmeldung Pascal 08.11.2026: Welt zu gleichförmig

Pascal: Loopings ja – die ersten drei sollen spürbar schneller werden. Welt
immer noch kurz (Nachfrage offen: was genau?). Zu einfach: zu viele gleich
hohe und allgemein hohe Gebäude; im Video wechseln Höhen, Abstände und
Gebäudearten.

Aus dem Video (24 Bilder quer durch): Nadeltürme, gestufte Hochhäuser,
breite Doppeltürme, kurze Blöcke; Kran auf dem Dach mit hängendem
Container; Häuser mal dicht beieinander, mal lange Strecken nur mit Ballon
oder Luftschiff.

Umgesetzt:
- **Fünf Gebäudearten** aus gestapelten Blöcken (`TowerStyle`: needle,
  setback, twin, stub, slab), Höhen von 20 m bis 170 m; dieselbe Art nie
  zweimal hintereinander.
- **Abstände wechseln**: dicht (5–12 m), normal (`gapRange`) oder weit
  (1,4–1,8 × normal, immer mit Ballon oder Luftschiff als Zwischenhalt). Je
  weiter, desto öfter weit und seltener dicht, mehr kurze Blöcke
  (`spacingOdds`).
- **Kräne mit Container** (greifbar), öfter auch auf Dächern.
- **Loopings**: nach jeder der ersten 3 Umdrehungen ein Schub, Tempo × 1,1
  (`loopBoost`), zusammen × 1,33. Der Schub darf über die Grenze fürs
  Schwung holen hinaus (sonst schluckte sie am kurzen Seil den dritten);
  nach 3 Umdrehungen ist Schluss.
- Gegenlesen: Gebäudearten als `buildTower()`/`TOWER_STYLES` (auch für die
  Welt in Etappe 2), Schwierigkeit über `progress()`/`DIFFICULTY.fullAt`,
  Dachkräne höher (Container hängt über dem Dach), Tests für Schub, Lücken
  samt Zwischenhalt, Container und Dachkran-Mast.

## Testanleitung für Pascal

Testlink (privat): https://claude.ai/artifact/8QQcGgVaD9Fa4fCDFUw6GW
Neu erzeugen: `npm run einzelseite -- ‹ziel.html›`, dann veröffentlichen.

1. Link auf dem iPad in Safari öffnen, iPad quer halten.
2. Auf ein Haus, einen Kran, einen Ballon oder ein Luftschiff tippen: Das
   Seil hakt dort ein.
3. Hängen lassen: Das Männchen holt mit den Beinen Schwung, die Schwünge
   werden grösser. Einen Looping gibt es nur, wenn man schnell aus einem
   Flug am kurzen Seil einhakt.
4. Tippen löst das Seil, das Männchen fliegt (und dreht) weiter.
5. Ein paar hundert Meter weit kommen. Stimmen Tempo und Abstände? Wird es mit der
   Strecke schwerer (grössere Lücken)?
6. In den Himmel tippen: nichts passiert. Am Boden: tippen startet neu.
7. Schnell am kurzen Seil einhaken (z. B. an einem Kranausleger): Nach jedem
   der ersten 3 Loopings ein spürbarer Schub, danach nicht mehr.
8. Einmal ganz unten, einmal schräg oben lösen: Oben gelöst fliegt höher,
   unten gelöst flacher und schneller. Passt die Flughöhe – höher oder tiefer?
9. Ein paar Kilometer fliegen: Wechseln Gebäudearten, Höhen und Abstände
   wie im Video? Wird es spürbar schwerer?
