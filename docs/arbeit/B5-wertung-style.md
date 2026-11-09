---
objekt: karte
bereich: meg-rope
erstellt: 2026-11-09
stand: 2026-11-09
status: abnahme
---
# B5 – Wertung mit Style und Strike, Spielername, Einzelspiel und Challenge

BAU FREI von Pascal am 09.11.2026 (Auftrag aus dem Hauptfenster).

## Auftrag (Pascal, 09.11.2026)

> Score wie schon am anfang beschrieben sollte es einen einzel und
> mehrspielermodus geben (Challenge) wer kommt weiter. schau was wir definiert
> haben. Der Score im einzel und multi soll jeweils gespeichert werden. es
> braucht also einen Spielername zu beginn des spieles, zudem sollen nicht nur
> die distanz gezählt werden sondern es soll auf style und flugzeitpunkte
> geben. […] Style gibt wie fliessend sind die sprünge, wie viel in folge.
> könnte bonus geben wenn strike. wenn man nicht schön im schwung landet ist
> der strike zu ende. nicht schön im schwung muss noch definiert werden. es
> soll einen spielraum geben von perfektem übergang zu immer noch im strike
> modus. ebenso könnte die geschwindigkeit ein kriterium sein. Wenn die Welt
> genug lang ist könnte es auch mit kraft kombiniert werden. man müsste immer
> wieder zu einem Energiecheckpoint kommen um kraft wieder 100% zu laden. Vom
> Prinzip her wie im apple game Hill Climb Racing

Hill Climb Racing ist nur Vorbild fürs Prinzip (Tankstellen), keine Grafik
und keine Namen übernommen.

## Was gebaut ist

### Ablauf

1. **Startmenü**: Spielername (der Browser merkt ihn sich), Einstellung
   (Normal, Frei · leicht, mittel, schwer – der Schalter oben links im Spiel
   ist dafür weg), dann **Einzelspiel** oder **Challenge**. Darunter die
   Bestenliste Einzelspiel der gewählten Einstellung und die letzten drei
   Challenges.
2. **Challenge**: Spieler eintragen (2 bis 6, der eigene Name steht schon da,
   gemerkte Namen werden vorgeschlagen). Ihr spielt **nacheinander auf
   demselben Gerät** («Jetzt spielt Anna – Gerät weitergeben»). Übers Heimnetz
   kommt die Challenge mit dem Server (Etappe 3).
3. **Einzelspiel**: Jeder Versuch ist für sich eine Wertung – gleich nach
   dem Boden kommen Punkte, Bestleistung und Bestenliste, dann «Nochmal» oder
   «Menü». Keine drei Versuche, kein Bonus (Pascal 09.11., siehe unten).
4. **Challenge: drei Versuche** je Spieler. Nach jedem Versuch: Ergebnis und die Wahl
   **«Versuch 2»** oder **«Werten»**. Werten nach dem 1. Versuch gibt
   + 50 %, nach dem 2. + 25 % auf den besten Versuch (wie im Konzept: weniger
   Versuche, mehr Bonus).
5. **Wertung**: Einzelspiel mit Bestleistung («Neue Bestleistung!») und
   Bestenliste; Challenge mit Rangliste. Alles wird auf dem Gerät gespeichert
   (die letzten 300 Ergebnisse).

### Punkte eines Versuchs (`src/score.ts`, Stellschrauben in `STYLE`)

**Punkte = Distanz in Metern + Style-Punkte.**

Style zählt jeden **Übergang** (einhaken, schwingen, lösen) und gibt ihm eine
Note. Es zählt die schlechtere von zwei Messungen:

| Note | Schwung verloren (Anteil des Tempos, den der Ruck wegnimmt) | Lösen: Abflug-Winkel («Flugzeitpunkt») | Grundpunkte |
|---|---|---|---|
| Perfekt | bis 15 % | 20–55° nach vorne oben | 30 |
| Gut | bis 40 % | 5–70° | 20 |
| Knapp | bis 70 % | alles übrige (auch nach unten oder rückwärts) | 10 |
| Nicht im Schwung | mehr als 70 % | – (der Winkel allein wirft nicht raus) | 0 |


- **Nicht im Schwung** heisst auch: kürzer als 0,4 s am Seil (nur
  angetippt) oder langsamer als 12 m/s gelöst. Ebenso, wenn die Kraft weg ist
  und es loslässt, oder am Boden.
- **Tempo**: Jedes m/s über 20 beim Lösen gibt 0,5 Punkte dazu.
- **Loopings**: 15 Punkte je Umdrehung an diesem Seil.
- **Strike**: Übergänge in Folge, die nicht «nicht im Schwung» sind. Ab dem
  dritten heisst es STRIKE. Jeder Übergang in Folge zählt mehr: Faktor 1,
  1,25, 1,5 … bis höchstens 3. «Nicht im Schwung» beendet den Strike.
- Spielraum: Perfekt bis Knapp bleibt im Strike, nur die Punkte sinken.
- Anzeige oben rechts: Punkte, Meter, Style, Name, Versuch. Oben in der Mitte:
  «2 in Folge» bzw. «STRIKE 5 · ×2,00», und kurz die Note des letzten
  Übergangs («Perfekt +45»).

### Kraftstation (nur Freier Schwung, `STRENGTH.stationEvery`)

Alle 300 m ab dem Start steht eine grüne Lichtsäule mit Blitz. Wer daran
vorbeifliegt (egal wie hoch), hat wieder 100 % Kraft. Unter dem Kraftbalken
steht, wie weit die nächste ist. Schon passierte Stationen werden grau.

## Meine Ideen dazu (gebaut)

- **Werten oder nochmal**: Der Bonus für weniger Versuche wird zur Wette –
  ein guter erster Versuch sicher + 50 %, oder weiter riskieren.
- **Loopings** geben Style-Punkte, damit der Freie Schwung sich lohnt.

## Offen / nicht gebaut

- **Kraft sinkt mit der Zeit** wie Treibstoff (Hill-Climb-Prinzip): heute
  kostet nur Ruck und Looping Kraft. Mit Stationen wäre ein langsames
  Abnehmen naheliegend – Entscheid Pascal (in den Eingang).
- Challenge übers Heimnetz (Server, Etappe 3), mehrere Runden (Etappe 4).
- Die Zahlen in `STYLE` sind Startwerte, gemessen nur in Tests; abgestimmt
  wird beim Spielen.

## Rückmeldung Pascal 09.11.2026: drei Versuche nur in der Challenge

> das mit den 3 versüchen gilt nur in Challenge. nicht im einzeln.

Umgesetzt (`attemptsFor()` in `src/game.ts`): Im Einzelspiel hat ein Spieler
einen Versuch je Runde, gewertet ohne Bonus und sofort gespeichert. Kein
Zwischenstand, kein «Versuch 1/3» oben rechts, kein «Los»-Schritt vor dem
Start. In der Challenge bleibt alles wie oben.

Einzelspiel-Ergebnisse, die noch mit drei Versuchen und Bonus gespielt
wurden (`attempts` über 1), bleiben gespeichert, zählen aber nicht mehr in
Bestenliste und Bestleistung – sie wären mit Bonus kaum zu schlagen.

## Rückmeldung Pascal 09.11.2026: «Nicht im Schwung» kam viel zu oft

> die berechnung der Folgen stimmt nicht, "nicht im Schwung" kommt viel zu
> oft, auch wenn ich das gefühl habe es wäre im Schwung bin. Als einfach
> gesagt, wenn ich nicht mehr als 70% schwung verliere bin ich im schwung.

**Gemessen** (Zufalls-Spieler über die Übungsstrasse, 1057 Übergänge,
Normal): 51 % waren «Nicht im Schwung». Gründe (Mehrfachnennung): Ruck 369,
Abflug-Winkel 310, zu langsam 35, zu kurz 0. Der Ruck wurde in m/s gemessen
(Grenze 18): wer mit 60 m/s fliegt, verliert bei 18 m/s Ruck nur 5 % seines
Tempos und flog trotzdem raus. Von den 369 Ruck-«out» hätten 286 nicht mehr
als 70 % Tempo verloren.

**Neu:** Schwung = Tempo. «Schwung verloren» = Anteil des Tempos, den ein Ruck
(Einhaken oder späteres Spannen) wegnimmt; vorher = √(nachher² + Ruck²).
«Nicht im Schwung» nur noch bei mehr als 70 % verloren (Note «Knapp» bis 70 %,
«Gut» bis 40 %, «Perfekt» bis 15 %), nur angetippt (unter 0,4 s) oder unter
12 m/s gelöst. Der Abflug-Winkel gibt weiter die Note (Perfekt/Gut/Knapp),
wirft aber nicht mehr aus dem Strike. Nachher im selben Test: 10 % «Nicht im
Schwung» (Startwert, abgestimmt wird beim Spielen). Stellschrauben:
`STYLE.lost`, `STYLE.angle`. Bekannt: Bleibt nach dem Ruck fast kein Tempo
(Einhaken im Stand mit kleinem Ruck), gilt das als 100 % verloren.

## Rückmeldung Pascal 09.11.2026: direkt weiterschwingen belohnen

> direktes weiterschwingen (nur einen Schwung) sollte auch zählen, bzw. sogar
> noch belohnt werden in dem die regel für ein und ausstieg etwas gelockert
> werden vorausgesetzt die anderen regeln werden eingehalten.

Umgesetzt (`isDirect()`, `STYLE.direct`): Wer nach **höchstens 1,5 s** am Seil
löst (nur ein Schwung) und mindestens 0,4 s gehalten hat, wird grosszügiger
benotet und bekommt **+10 Punkte** (mal Faktor der Folge):

| | normal | direkt (bis 1,5 s) |
|---|---|---|
| Perfekt / Gut / Knapp bei verlorenem Schwung | 15 / 40 / 70 % | 25 / 50 / 80 % |
| Abflug-Winkel Perfekt / Gut | 20–55° / 5–70° | 10–65° / −5–80° |

Unverändert: mindestens 0,4 s am Seil und mindestens 12 m/s beim Lösen, sonst
«Nicht im Schwung». Die 1,5 s sind meine Deutung von «nur einen Schwung»
(rund eine Viertelperiode bei langem Seil); Entscheid Pascal, ob enger oder
weiter. Die Note ist im Bild noch nicht als «Direkt» beschriftet.

## Testanleitung für Pascal

Link: kommt mit der Meldung (privates Artifact).

1. Spiel öffnen: Startmenü erscheint. Ohne Namen «Einzelspiel» tippen – es
   verlangt einen Namen. Namen eingeben, «Normal» wählen, «Einzelspiel» – es
   geht sofort los, oben rechts steht nur dein Name (kein «Versuch 1/3»).
2. Schwingen: Oben rechts zählen Punkte, Meter und Style. Sauber quer
   einhaken und schräg nach oben lösen: «Perfekt +30» o. ä. erscheint, ab drei
   in Folge «STRIKE». Gerade in die Tiefe fallen und ins Seil rucken (fast kein Tempo quer zum
   Seil, also über 70 % verloren): «Nicht im Schwung», der Strike ist weg.
   Wer dabei schnell quer fliegt, bleibt im Strike.
3. Am Boden: gleich die Wertung dieses Versuchs mit «Neue Bestleistung!»
   und deiner Zeile in der Bestenliste. «Nochmal» startet sofort neu.
4. «Menü»: Die Bestenliste steht auch im Startmenü, auch nach Neuladen der
   Seite.
5. «Frei · mittel» wählen, Einzelspiel: grüne Kraftstation nach 300 m, beim
   Vorbeifliegen ist der Kraftbalken wieder voll.
6. «Challenge»: zweiten Namen eintragen, «Los». Jeder hat drei Versuche
   («Versuch 1/3» oben rechts); nach dem ersten «Werten» tippen – die Punkte
   zeigen + 50 %. Dazwischen «Jetzt spielt …». Am Ende Rangliste, im Startmenü unter
   «Letzte Challenges».
7. Fliegst du schnell (über 40 m/s) und hakst schräg ein: bleibt der Strike?
   Fällst du gerade ins Seil: «Nicht im Schwung».
8. Von Seil zu Seil ohne Pumpen (unter 1,5 s): gibt es 10 Punkte mehr, und
   bleibt der Strike auch bei etwas mehr Ruck oder flachem Abflug?
9. Sagt dir die Strenge der Noten zu (zu leicht oder zu schwer im Strike zu
   bleiben)?
