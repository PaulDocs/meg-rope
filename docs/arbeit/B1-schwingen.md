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
  steil nach oben → rund 8 m, 50 m/s → rund 31 m. Flughöhe: Pascal wollte
  höher, siehe Rückmeldung «zu wenig Schwung» weiter unten (g 30).

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

## Rückmeldung Pascal 08.11.2026: zu wenig Schwung, zu leicht weit

Pascal: fliegt immer noch zu wenig hoch, hat im Vergleich zum Vorbild
immer etwas zu wenig Schwung. «Zu kurz» heisst: das Spiel ist zu wenig
lang, man kommt zu leicht weit.

Umgesetzt:
- **Mehr Schwung, höher**: Schwerkraft 40 → 30, Energiegrenze 50 → 60 m/s
  auf Hakenhöhe, Schwung holen 7 → 8, Start 24 m/s, Obergrenze 90 → 110 m/s
  (sonst kappt sie das Tempo nach den Looping-Schüben). 50 m/s steil nach
  oben ergibt jetzt rund 42 m Wurfhöhe (vorher 31 m).
- **Schwerer bis 6 km statt 3 km** (`DIFFICULTY.fullAt`): normale Lücken
  26–46 m am Start bis 70–90 m; dichte Gruppen von 25 % auf 5 %, weite
  Strecken von 15 % auf 40 %, kurze Blöcke von 15 % auf 40 %.
- Bot (sieht alles voraus): erste 1,5 km in 37 s, höchster Punkt 153 m; ab
  6 km noch machbar (Test).
- Gegenlesen: Wahrscheinlichkeiten in `DIFFICULTY.odds` (Start/Ende), Test
  dass sie gültig bleiben; Strassentests bis 6,7 km; Test «oben langsamer»
  rechnet den Zuwachs durch Schwung holen genau nach.

## Rückmeldung Pascal 08.11.2026: 80 m hoch, fällt zu langsam, Seitenwände

Pascal: Flughöhe auf 80 m. Die Fallgeschwindigkeit stimmt nicht, sie soll
etwa einem 80-kg-Gewicht entsprechen. Auf Nachfrage: Er fällt zu langsam.
Das Seil soll auch an den Seitenwänden einhaken.

Umgesetzt:
- **Fällt schwerer**: Schwerkraft 30 → 40. Nach 1 s Fall über 35 m/s.
- **Trotzdem 80 m hoch**: Energiegrenze 60 → 80 m/s auf Hakenhöhe. Mit
  vollem Schwung steil gelöst steigt er rund 80 m (v²/2g). Richtwert, keine
  Obergrenze: mit Looping-Schüben geht es höher. Obergrenze
  110 → 130 m/s (unten am langen Seil plus Looping-Schübe).
- **Seitenwände greifbar** (`onSideWall`): Was in der Perspektive von der
  Seite sichtbar ist, hakt ein. Das Dach bleibt Kulisse.
- Bot: erste 1,6 km in 35 s (vorher 37 s), höchster Punkt 117 m; ab 6 km
  noch machbar. Der Bot greift nur an Haltepunkten, nicht an Seitenwänden
  (er hat keine Kamera) – im Spiel ist es also eher leichter.
- Gegenlesen: Perspektive für Zeichnen und Treffen geteilt (`sideFace`,
  `viewMid`), gemeinsame Fingertoleranz `GRAB_SLACK`, `tap()` verlangt die
  Seitenwand-Prüfung ausdrücklich; Tests für beide Seiten und das Dach;
  Glossar und Konzept nachgezogen.

## Video IMG_185322 ausgemessen (08.11.2026)

Pascal: neues Video, Geschwindigkeiten und Bewegungen ablesen. Das erste
Upload (IMG_1853, HEVC) liess sich hier nicht öffnen; IMG_185322 ist H.264.
Das Video bleibt lokal (`.gitignore`).

Gemessen (Bilder alle 0,05–0,5 s, Meterzähler und Turmspitzen verfolgt):
- **Bildbreite** im Vorbild rund 40 «Vorbild-Meter» (Zähler gegen
  vorbeiziehende Türme). Darum vergleiche ich in Bildbreiten (BB), nicht in
  Metern: das Vorbild zählt kleinere Meter als wir.
- **Flug waagrecht**: Zähler +18 m in 0,6 s → rund 30 m/s = 0,75 BB/s. Bei
  uns rund 55 m/s auf 93 m Bildbreite = 0,6 BB/s. Passt ungefähr.
- **Fallen**: Ein steiler Wurf stieg rund 1,4 s und fiel ebenso lang; am
  Ende kamen die Türme mit rund 0,6 BB/s von unten herauf. Das ergibt
  rund 0,43 BB/s² – genau unsere Schwerkraft 40 (40 / 93 m). Mit der
  alten 30 waren es 0,32: daher «fällt zu langsam».
- **Kamera**: Das Männchen bleibt fast fest oben links (unter der Sonne,
  rund 30 % von links, 25 % von oben); die Welt zieht vorbei, beim Fallen
  kommen Häuser und Boden von unten herauf. Bei uns stand es in der
  Bildmitte und die Kamera zog weich nach.
- **Perspektive**: echte 3D-Kamera, Türme schräg von unten und von der
  Seite, Boden als Fläche. Gehört zur Grafikumsetzung (`docs/STAND.md`).

Umgesetzt:
- **Kamera wie im Vorbild** (`FIGURE_AT`, `CAMERA_FOLLOW`): Männchen bei
  30 % von links und 25 % von oben, enger nachgezogen. Unten bleibt der
  Boden im Bild.
- Schwerkraft bleibt 40 (bestätigt durch die Messung).
- Gegenlesen: Kamera zieht pro Zeit nach, nicht pro Bild (gleich bei 60
  und 120 Hz); Tests für Untergrenze, Nachziehen und Sprung beim Neustart.
  `.gitignore` sperrt auch `*.MOV`/`*.MP4` (IMG_1853.MOV wäre sonst ins Repo).

## Rückmeldung Pascal 08.11.2026: bleibt hängen, Häuser zu hoch?

Pascal (Bildschirmfoto): Das Männchen hängt schräg unter dem Haken still.
Frage: Sind die Gebäude zu hoch?

- **Hängenbleiben war ein Fehler** in `applyRope`: Am gespannten Seil wurde
  das ganze Tempo erhalten, auch der Zug der Schwerkraft nach aussen. Fast
  still wurde daraus Tempo bergauf, das Männchen kroch und blieb hängen.
  Jetzt folgt das Tempo am gespannten Seil der Energie (½v² + g·y, plus
  Arbeit von Luft und Schwung holen): nichts geht verloren, nichts kommt
  dazu. Tests: Pascals Lage, gespiegelt und ganz still; ein Pendel ohne
  Luft und Schwung holen behält 10 s lang seine Energie (± 2 %).
- **Ja, zu hoch**: Im Video reichen Türme etwa 0,5–1,3 Bildhöhen (bei uns
  35–90 m), unsere waren bis 170 m. Alle Höhen rund × 0,6 (Nadel 65–100,
  gestuft 42–78, Scheibe 48–84, doppelt 28–52, kurz 12–27 m), Bodenkräne,
  Ballone und Luftschiffe tiefer, Start auf 50 m. Bot: weiter machbar.
  Test: Türme höchstens 105 m, Bodenkräne 65 m, Ballone/Luftschiffe 90 m.
- Gegenlesen: Namen (`posBefore` entfiel mit der Energie-Rechnung),
  `updateCamera` verlangt `dt`, Verweis von `VIEW_HEIGHT` auf die Höhen.

## Rückmeldung Pascal 08.11.2026: anderer Einflug, nicht nach vorne springen

Im Video (IMG_185322, Läufe ab 41,7 s und 44,6 s) erscheint das Männchen
in der Luft links vor dem ersten Turm, etwas über dessen Dach, und fällt
sofort gerade herunter; der Zähler bleibt bei 0–2 m. Nach rund 1,3 s
hakt der Spieler ein. Bei uns stand es still auf dem Dach und sprang beim
ersten Tippen mit 24 m/s nach vorne.

Umgesetzt:
- **Einflug** (`startPos` −24/62, `dropInDelay` 0,5 s): kurz schweben,
  dann senkrecht fallen; aus 62 m bleiben rund 1,8 s bis zum Boden.
  Tippen hakt schon während des Schwebens ein, ohne Schub (`startVel`
  entfernt).
- Bot: Mit dem neuen Start lief der gierige Bot bei 758 m in eine
  Sackgasse (steiler Wurf, oben still, nichts erreichbar). Er verfolgt
  jetzt drei Wege parallel (`BEAM`) und schafft wieder beide Strecken.
  Für einen Spieler, der nur den nächsten Sprung sieht, gibt es also
  Sackgassen (hoher, steiler Wurf ohne erreichbaren Halt).
- Gegenlesen: Phase heisst jetzt `dropIn`, Hinweis «Tippe auf …» über
  `isDropIn()` bis zum ersten Einhaken; Bot hakt erst nach 1,3 s Fallen ein
  (Reaktionszeit wie im Video); Bot-Suche in `candidates`/`pickDistinct`.

## Rückmeldung Pascal 08.11.2026: kaum spielbar, stockt, Häuser zum Teil zu tief, Welt bewegt sich zu fest

Pascal: fällt zu schnell ins Seil; beim Schwung holen fällt er immer am
gleichen Punkt; Häuser zum Teil zu tief; die Welt bewegt sich zu fest
(mit der Maus schwieriger als mit dem Finger?).

Gemessen: Mit Schwung holen 8 und Schwerkraft 40 wuchsen die Schwünge nur
bis knapp über die Hakenhöhe. Dort wird das Seil locker, er fällt zurück
ins Seil (Ruck) und verliert den Schwung – immer an derselben Stelle. Mit
16 klappte es meistens, mit 22 ohne lockeres Seil: Looping nach 2–4 s.

Umgesetzt:
- **Schwung holen 8 → 22**: Die Schwünge wachsen ohne Stocken bis zum
  Looping. In den ersten 3 Umdrehungen ist es oben darum fast so schnell
  wie unten; danach (ohne Schwung holen) wieder deutlich langsamer.
  **Hebt «Weniger Hilfe» (oben) auf**: Looping aus dem Stand ist jetzt
  möglich (nach 2–4 s). Frage an Pascal bei der Abnahme: so gewollt?
  → Nein, siehe nächster Abschnitt.
- **Häuser höher**: alle rund +10 m, die kurzen am meisten (kurz 20–35,
  doppelt 38–62, gestuft 52–88, Scheibe 58–94, Nadel 75–110 m); erster
  Turm 60 m, Start 72 m. Spielentscheid über der Video-Messung (dort bis
  1,3 Bildhöhen ≈ 90 m).
- **Kamera senkrecht ruhiger** (`CAMERA_FOLLOW_Y` 0,06): folgt dem Auf und
  Ab der Schwünge nur weich, hält das Männchen aber immer zwischen 12 % und
  60 % von oben (`FIGURE_Y_RANGE`). Waagrecht bleibt sie eng. Im Video
  bewegt sich die Welt auch stark (Männchen fast fest im Bild); mit dem
  Finger trifft man bewegte Ziele leichter als mit der Maus.
- Schwerkraft bleibt 40 (Video-Messung); der Ruck beim Einhaken kommt vom
  Tempo beim Fallen. Rückmeldung abwarten.
- Gegenlesen: Tests ohne Abschalten von Schwung holen (Boden, Pendeln),
  «oben langsamer» ohne Luft genau nachgerechnet, Looping aus dem Stand
  frühestens nach 1,5 s und ohne lockeres Seil, Kamera senkrecht auch bei
  120 Hz gleich, Häuser mindestens 20 m.

## Rückmeldung Pascal 08.11.2026: kein Looping aus dem Stand

Pascal: «das mit dem Schwung ist jetzt zu viel des Guten. Aus dem Stand
sollte kein Looping möglich sein.»

Umgesetzt:
- **Grenze beim Schwung holen je Seil** (`Rope.pumpLimit`, `pumpLimitFor()`),
  festgelegt, sobald das Seil zum ersten Mal zieht: Aus dem Stand holt es
  höchstens bis auf Hakenhöhe Schwung. Dort bleibt das Seil gespannt, es
  stockt also nicht (gemessen bei 5–30 m Seil: Hakenhöhe nach 2–6 s, nie
  locker, kein Looping). Kommt es mit Tempo vom Flug (Energie über
  `flightEnergy` 0,5 · g · Seillänge über Hakenhöhe), gilt wie bisher die
  Energiegrenze 80 m/s – daraus werden Loopings.
- Schwung holen bleibt 22; «Weniger Hilfe» gilt wieder für den Looping.
- Gegenlesen fand ein Schlupfloch: oben lösen, knapp darunter neu einhaken
  gab wieder Loopings. Grund war ein alter Rechenfehler: Fiel das Männchen
  ins schon gespannte Seil (Einhaken im Wegfliegen, oder knapp innerhalb der
  Seillänge), wurde das Fall-Tempo ohne Ruck zu Tempo quer zum Seil. Jetzt
  nimmt der **Ruck** diesen Teil weg – beim Einhaken (`catchJerk`) und beim
  Fall ins Seil. Folge fürs Spielgefühl: Wer im Fallen schräg über sich
  einhakt, schwingt etwas weniger stark an als bisher.
- Offen (Frage an Pascal), beides mit Test festgehalten: Schnell fliegend
  weit über sich einhaken (hohe Turmspitze) zählt als «aus dem Stand», wenn
  die Energie nicht über die Hakenhöhe reicht – an diesem Seil dann kein
  Looping. Umgekehrt zählt hochschwingen, lösen, rund 10 m fallen und
  seitlich an einem kurzen Seil einhaken als «vom Flug» – Looping möglich.

## Testanleitung für Pascal

Testlink (privat): https://claude.ai/artifact/8QQcGgVaD9Fa4fCDFUw6GW
Neu erzeugen: `npm run einzelseite -- ‹ziel.html›`, dann veröffentlichen.

1. Link auf dem iPad in Safari öffnen, iPad quer halten. Das Männchen
   erscheint vor dem ersten Turm und fällt gerade herunter: schnell einhaken.
2. Auf ein Haus, einen Kran, einen Ballon oder ein Luftschiff tippen: Das
   Seil hakt dort ein, auch an der sichtbaren Seitenwand eines Turms. In den
   Himmel oder aufs Dach tippen: nichts. Tippen löst das Seil.
3. Hängen lassen: Das Männchen holt mit den Beinen Schwung, die Schwünge
   werden grösser, aber höchstens bis auf Hakenhöhe – aus dem Stand kein
   Looping. Am Boden: tippen startet neu.
4. Schnell am kurzen Seil einhaken (z. B. an einem Kranausleger): Nach jedem
   der ersten 3 Loopings ein spürbarer Schub, danach nicht mehr.
5. Mit vollem Schwung steil oben lösen: rund 80 m hoch? Fällt er danach
   schwer genug? Unten gelöst flacher und schneller.
6. Erste 1,5 km: Wechseln Gebäudearten, Höhen und Abstände wie im Video?
   Steht das Männchen wie im Vorbild oben links, und kommen beim Fallen
   die Häuser von unten herauf? Passen die tieferen Häuser? Bleibt es nie
   mehr schräg hängen?
7. Weiter fliegen: Ab etwa 1,5 km spürbar schwerer (grössere Lücken, mehr
   weite Strecken, kurze Blöcke), bis 6 km immer schwerer?
