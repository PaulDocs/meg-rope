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

| Note | Einhaken: Ruck (Tempo, das das Seil wegnimmt) | Lösen: Abflug-Winkel («Flugzeitpunkt») | Grundpunkte |
|---|---|---|---|
| Perfekt | bis 3 m/s | 20–55° nach vorne oben | 30 |
| Gut | bis 10 m/s | 5–70° | 20 |
| Knapp | bis 18 m/s | −20–85° | 10 |
| Nicht im Schwung | mehr | flacher nach unten, steiler oder rückwärts | 0 |

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

## Testanleitung für Pascal

Link: kommt mit der Meldung (privates Artifact).

1. Spiel öffnen: Startmenü erscheint. Ohne Namen «Einzelspiel» tippen – es
   verlangt einen Namen. Namen eingeben, «Normal» wählen, «Einzelspiel» – es
   geht sofort los, oben rechts steht nur dein Name (kein «Versuch 1/3»).
2. Schwingen: Oben rechts zählen Punkte, Meter und Style. Sauber quer
   einhaken und schräg nach oben lösen: «Perfekt +30» o. ä. erscheint, ab drei
   in Folge «STRIKE». In die Tiefe fallen und ins Seil rucken: «Nicht im
   Schwung», der Strike ist weg.
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
7. Sagt dir die Strenge der Noten zu (zu leicht oder zu schwer im Strike zu
   bleiben)?
