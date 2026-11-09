---
objekt: regel
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-09
---
# Glossar – Meg Rope

Die Fachbegriffe dieses Projekts: wie sie in der Oberfläche heissen, wie im
Code, und womit man sie nicht verwechseln darf. Ein Begriff hat genau einen
Namen. Gibt es ihn hier schon, wird er so verwendet – im Code, in Karten, in
der Doku. Ein neuer Begriff kommt im selben Zug dazu.

Die Sprachregeln (Button statt «Knopf», Commit, Deploy) stehen nicht hier,
sondern in `GLOSSAR.md` auf der Wurzel von ClaudeWork.

| Begriff | Bedeutung | Im Code | Nicht verwechseln mit |
|---|---|---|---|
| Versuch | Ein Flug vom Start bis zum Boden oder ins Ziel; zählt Meter plus Style. Challenge: höchstens drei pro Runde; Einzelspiel: jeder Versuch ist eine eigene Wertung | `Attempt`, `endAttempt()`, `attemptPoints()`, `attemptsFor()` | Runde |
| Runde | Ein Durchgang auf einer Welt; in der Challenge höchstens drei Versuche je Spieler, endet im Ziel, nach dem dritten Versuch oder mit «Werten»; im Einzelspiel ein Versuch | `Round`, `createRound()`, `Turn` (ein Spieler in der Runde) | Versuch |
| Welt | Eine von Hand gebaute Stadt mit Start und Ziel | `world` | Runde |
| Einflug | Start eines Versuchs: Das Männchen erscheint in der Luft vor dem ersten Turm, schwebt kurz und fällt gerade herunter; kein Sprung nach vorne | `startPos`, `dropInDelay`, Phase `dropIn`, `isDropIn()` | – |
| Ziel | Ende der Welt; wer es erreicht, hat die Runde geschafft | `goal` | – |
| Bonuspunkte | Zuschlag, je weniger Versuche gebraucht wurden: + 50 % nach dem 1., + 25 % nach dem 2. Versuch auf den besten | `ROUND.bonus`, `bonusFor()` | – |
| Werten | Nur Challenge: nach einem Versuch aufhören und den besten Versuch mit Bonus werten lassen | `stopTurn()`, `turnScore()` | – |
| Challenge | Wettkampf, alle Spieler auf derselben Welt, wer kommt weiter; vorerst nacheinander auf einem Gerät (übers Netz: Etappe 3, mehrere Runden: Etappe 4) | `Mode` `'challenge'` | Einzelspiel |
| Einzelspiel | Allein spielen; jeder Versuch wird gleich gewertet (ohne drei Versuche, ohne Bonus), mit Bestleistung und Bestenliste auf dem Gerät (hiess bis 09.11. «Freies Spiel») | `Mode` `'single'` | Challenge, Spielvariante «Freier Schwung» |
| Spielername | Name zu Beginn im Startmenü; der Browser merkt sich die zuletzt gewählten | `cleanName()`, `loadNames()`, `saveNames()` | – |
| Startmenü | Menü vor dem Spiel: Name, Einstellung, Einzelspiel oder Challenge, Bestenliste | `Menu.start()` (ui.ts) | – |
| Bestenliste | Die besten Ergebnisse im Einzelspiel je Einstellung, auf dem Gerät gespeichert | `bestSingles()`, `personalBest()`, `Result` | Rangliste |
| Rangliste | Reihenfolge der Spieler einer Challenge: Punkte, bei Gleichstand Meter | `ranking()`, `recentChallenges()` | Bestenliste |
| Style | Punkte für fliessende Übergänge, zusätzlich zu den Metern | `Style`, `STYLE`, `State.style` | Serie |
| Übergang | Einhaken, schwingen, lösen; bekommt beim Lösen eine Note: Perfekt, Gut, Knapp oder «Nicht im Schwung» (Ruck beim Einhaken, Abflug-Winkel, mind. 0,4 s, mind. 12 m/s) | `rateSwing()`, `gradeSwing()`, `Grade`, `SwingEnd`, `Rope.jerk` | Guter Schwung (Kraft) |
| Abflug-Winkel | Richtung beim Lösen, 0° waagrecht nach vorne, 90° hoch; der «Flugzeitpunkt» | `releaseAngle()`, `angleGrade()` | – |
| Strike | Übergänge in Folge im Schwung; ab dem dritten «STRIKE», jeder zählt mehr (Faktor bis 3); «Nicht im Schwung» oder Boden beendet ihn | `Style.strike`, `isStrike()`, `multiplier()`, `breakStrike()` | Serie (Kraft) |
| Kraftstation | Nur im Freien Schwung: alle 300 m eine grüne Lichtsäule; vorbeifliegen gibt volle Kraft | `stationAt()`, `State.stations`, `STRENGTH.stationEvery` | – |
| Gastgeber | Spieler, der eine Challenge anlegt und schliesst | `host` | Server |
| Schwung holen | Das Männchen bewegt am gespannten Seil die Beine wie auf einer Schaukel und beschleunigt in Schwungrichtung: kleiner Anstoss plus Anteil des Tempos, die Schwünge wachsen von Schwung zu Schwung (`pumpAccel`); über Hakenhöhe nur mässig und höchstens 3 Looping-Anläufe (`pumpHigh`, `TUNING.maxLoopTries`, `Rope.loopTries`), nach einem echten Looping (`Rope.looped`) voll; aus dem Stand bis auf Hakenhöhe (Variante «Freier Schwung»: bis zur Energiegrenze, `standingLimit()`), mit Tempo vom Flug bis zur Energiegrenze, und höchstens `TUNING.maxPumpTurns` (zurzeit 3) Umdrehungen | `pump()`, `isPumping()`, `pumpAccel()`, `pumpShare()`, `pumpLimitFor()`, `TUNING.pump`, `TUNING.flightEnergy` | – |
| Seil-Glieder | Kette, die zeigt, wie das Seil durchhängt oder fällt; die Länge des Seils bleibt fest | `Chain` (in `Rope.chain`, `LooseRope.chain`) | Seillänge (`Rope.length`) |
| Haltepunkt | Stelle, an der das Seil einhaken kann: Turm-Block, Turmspitze, Kranmast, Kranausleger, Container (Kran auch auf Dächern), Ballon, Luftschiff | `Hold`, `isOnHold()`, `GRAB_SLACK` | Teil (`Prop`, das Gezeichnete) |
| Seitenwand | In der Perspektive sichtbare Seite eines Turm-Blocks; greifbar wie die Front, das Dach nicht. Hängt von der Kamera ab, darum in render.ts | `onSideWall()` | Dach (Kulisse) |
| Übungsstrasse | Endlose Strasse aus Türmen, Kränen, Ballonen und Luftschiffen für Etappe 1, ohne Ziel, immer gleich, Lücken wachsen mit der Strecke | `createStreet()`, `extendTo()`, `buildPracticeStreet()` (fester Abschnitt), `DIFFICULTY`; Typ `World` ist die gemeinsame Form von Übungsstrasse und Welt | Welt (mit Ziel, Etappe 2) |
| Gebäudeart | Nadelturm, gestuftes Hochhaus, Doppelturm, kurzer Block, Scheibe; nie zweimal dieselbe hintereinander | `TowerStyle`, `Block`, `roofOf()` | Teil (`Prop`) |
| Looping | Das Männchen dreht am gespannten Seil ganz um den Haken; die ersten `TUNING.maxPumpTurns` (zurzeit 3) Umdrehungen werden schneller, nach jeder ein Schub. Nur mit Tempo vom Flug, nicht aus dem Stand (`Rope.pumpLimit`); in der Variante «Freier Schwung» auch aus dem Stand | `Rope.looped` (echter Looping: gespannt ganz oben durch); `turnsOnRope()` zählt dagegen Umdrehungen als Netto-Winkel, auch lockeres Darüberfallen – nicht als «Looping» verwenden; `TUNING.maxPumpTurns`, `TUNING.loopBoost` | – |
| Looping-Anlauf | Vom Flug über die Hakenhöhe hinaus, ohne echten Looping; höchstens 3 je Seil, misslingt der dritte, holt es an diesem Seil nur noch bis Hakenhöhe Schwung. Nicht «Versuch» (das ist ein Flug bis zum Boden) | `Rope.loopTries`, `TUNING.maxLoopTries`, `trackLoopTry()`, `TUNING.pumpHigh` | Looping-Versuch |
| Schwung-Energie | ½·v² + g·Höhe über dem Haken; Schwung holen hört bei einer Grenze auf, so bleibt oben langsamer als unten (in den ersten 3 Umdrehungen nur wenig, pump 22) | `swingEnergy()`, `TUNING.swingSpeedAtHookHeight` | Tempo |
| Ruck | Fliegt das Männchen ins gespannte Seil oder beim Einhaken vom Haken weg, fällt dieser Teil des Tempos weg (Schwung geht verloren) | `catchJerk()`, `removeOutwardSpeed()`, `applyRope()` ohne `energyTarget`, `TUNING.jerkSpeed` | – |
| Aus dem Stand / vom Flug | Wie ein Seil Schwung holen darf, festgelegt, sobald es zum ersten Mal zieht (nach 3 misslungenen Looping-Anläufen gesenkt): mit Energie über 0,44 · g · Seillänge über Hakenhöhe «vom Flug» (bis Energiegrenze, Loopings), sonst «aus dem Stand» (nur bis Hakenhöhe, in der Variante «Freier Schwung» bis Energiegrenze) | `Rope.pumpLimit`, `ropePulls()`, `standingLimit()`, `energyLimit()`, `TUNING.flightEnergy` | – |
| Spielvariante | «Normal» (aus dem Stand kein Looping) oder «Freier Schwung» (Looping aus dem Stand, dafür Kraft); gewählt im Startmenü (bis 09.11. Schalter oben links) | `Variant`, `State.variant`, `standingLimit()`, `resetState()` (gewählt über die Einstellung) | Modus |
| Kraft | Nur im Freien Schwung: 100–0 %, Rucke kosten nach weggenommenem Tempo, Zug im Seil über 6 g kostet je Sekunde; zurück nur mit guten Schwüngen in Folge, nach Stufe; bei 0 lässt das Männchen los, einhaken ab 20 % | `State.strength`, `STRENGTH`, `tooWeakToHook()`, `jerkCost()`, `ropeLoad()` | Kraftlevel |
| Guter Schwung | An diesem Seil kein Ruck (Loopings erlaubt), mindestens 0,8 s gehalten, schnell gelöst; in Folge gezählt («Serie»), lädt Kraft | `isGoodSwing()`, `State.goodSwings`, `Rope.clean` | Strike (Style) |
| Stufe | Leicht, mittel, schwer im Freien Schwung: wie viel Kraft ein guter Schwung zurückgibt | `Level`, `State.level`, `STRENGTH.gain`, `DEFAULT_LEVEL` | «Level», «Schwierigkeit» (nur in Oberfläche und Doku; im Code heisst der Typ `Level`) |
| Einstellung | Spielvariante plus Stufe, wie sie das Startmenü anbietet: Normal, Frei · leicht, Frei · mittel, Frei · schwer; der Browser merkt sie sich, jedes Ergebnis trägt sie | `Setting`, `SETTINGS`, `settingOf()`, `settingByName()`, `SETTING_LABEL` (ui.ts) | Modus |
| Zug im Seil | Was das Seil am Männchen zieht, in g (Vielfache des eigenen Gewichts): v²/L plus Schwerkraft entlang des Seils | `ropeLoad()` | G-Kraft |
| Einhaken / Lösen | Tippen hängt das Seil an die getippte Stelle eines Haltepunkts bzw. löst es wieder | `tap()` → `'attached'` / `'released'`; Seitenwände über den Parameter `grabbable` (ohne Kamera: `noSideWalls`) | – |
| Ton-Ereignis | Etwas, das einen Ton auslöst (Einhaken, Ruck, Looping, Aufprall, Punkte, Serie, Kraftstation, Warnung); der Beobachter leitet es aus dem Unterschied zweier Bilder des Spielzustands ab, die Physik weiss nichts davon | `SoundEvent`, `SoundObserver`, `Sound` (audio.ts), `SOUND` (Lautstärken) | Effekt |
| Stummschalter | Knopf unten rechts, schaltet allen Ton aus; der Browser merkt die Wahl | `#mute` (index.html), `loadMuted()`, `saveMuted()`, `MUTE_KEY` | – |
