---
objekt: karte
bereich: meg-rope
erstellt: 2026-11-09
stand: 2026-11-09
status: abnahme
---
# B8 – Soundeffekte

BAU FREI von Pascal am 09.11.2026 (Auftrag aus dem Hauptfenster, Empfehlung
angenommen).

## Was gebaut ist

Alle Töne werden im Spiel selbst erzeugt (Web Audio: Schwingungen und
gefiltertes Rauschen). Keine Sounddateien, keine Töne aus Rope'n'Fly oder
anderen Spielen.

| Ereignis | Ton |
|---|---|
| Seil schiessen und einhaken | kurzes Zischen, dann ein Klick |
| Wind | laufender Ton: lauter und höher mit dem Tempo, folgt weich; still im Menü und am Boden |
| Ruck (Fall ins Seil) | dumpfer Schlag, Stärke nach dem weggenommenen Tempo |
| Looping | kurzer steigender Akzent pro Umdrehung |
| Aufprall am Boden | tiefer Schlag, Stärke nach dem Tempo |
| Punkte | kleines «Pling», höher bei besserer Note und längerer Folge; «Nicht im Schwung» klingt dumpf |
| Strike (3. Übergang in Folge) | zweiter, höherer Ton dazu |
| Serie guter Schwünge (Freier Schwung) | kleiner Zusatzton |
| Kraftstation | kurzer Akkord nach oben |
| Wenig Kraft (unter 30 %) | zwei kurze Pieptöne, einmal; wieder erst, wenn die Kraft über 45 % war |

Stummschalter: Knopf unten rechts (🔊/🔇), im Spiel und in den Menüs. Der
Browser merkt sich die Wahl (`meg-rope.muted`).

## Aufbau

- `src/audio.ts`: reine Logik (`SoundObserver` vergleicht den Spielzustand mit
  dem letzten Bild und meldet Ereignisse; `windParams`, `jerkLevel`,
  `impactLevel`) und `Sound` (spielt sie mit Web Audio). Physik und Wertung
  kennen den Ton nicht.
- `src/main.ts` ruft nur `heard.update(state)` und `sound.play(…)`.
- Tests: `test/audio.test.ts`, ohne echten AudioContext.
- Der Ton darf das Spiel nie bremsen: Wind ist ein einziges Rauschen in
  Endlosschleife, kurze Töne räumen sich selbst auf, höchstens 10 gleichzeitig.

## Bekannt (iPad)

- Der AudioContext startet erst bei der ersten Berührung. Davor ist es still.
- **Der Stumm-Schalter des iPads (Seitenschalter bzw. Kontrollzentrum) kann
  Web Audio stummschalten.** Hört man nichts: Schalter prüfen und Lautstärke
  hochdrehen. Das ist Verhalten von iPadOS, nicht des Spiels.
- Safari hält den Ton an, wenn die Seite in den Hintergrund geht; beim
  Zurückkehren läuft er weiter.

## Testanleitung für Pascal (iPad, höchstens 7 Punkte)

1. Testseite öffnen, Seitenschalter des iPads auf «Ton», Lautstärke mittel. Name
   eingeben, «Einzelspiel» tippen. Das Spiel ist am Anfang still, bis du das
   erste Mal tippst.
2. Auf ein Gebäude tippen: Zischen und Klick beim Einhaken.
3. Schwingen und fliegen: Windrauschen wird mit dem Tempo lauter und höher; im
   Menü ist es still.
4. Aus grosser Höhe ins Seil fallen lassen: dumpfer Schlag, stärker bei mehr
   Tempo. Looping: kurzer Akzent pro Umdrehung.
5. Schön lösen (Perfekt/Gut): «Pling», höher bei längerer Folge. «Nicht im
   Schwung»: dumpfer Ton.
6. Einstellung «Frei · mittel»: Kraft herunterfahren, bei unter 30 % kommt ein
   Warnton, einmal. Alle 300 m ein Akkord an der Kraftstation.
7. Knopf unten rechts tippen: stumm; Seite neu laden: bleibt stumm.

Rückmeldung zu Lautstärke und Klang bitte als Eindruck («zu laut», «Wind zu
hoch»); die Gesamtwerte (Wind, Schwellen, Warnton) stehen in `SOUND`, die Klangrezepte der einzelnen Töne in `Sound.one()` (beide in `src/audio.ts`).
