---
objekt: regel
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-08
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
| Versuch | Ein Flug vom Start bis zum Boden oder ins Ziel; höchstens drei pro Runde | `attempt` | Runde |
| Runde | Ein Durchgang auf einer Welt mit höchstens drei Versuchen; endet im Ziel oder nach dem dritten Versuch | `round` | Versuch |
| Welt | Eine von Hand gebaute Stadt mit Start und Ziel | `world` | Runde |
| Einflug | Start eines Versuchs: Das Männchen erscheint in der Luft vor dem ersten Turm, schwebt kurz und fällt gerade herunter; kein Sprung nach vorne | `startPos`, `dropInDelay`, Phase `dropIn`, `isDropIn()` | – |
| Ziel | Ende der Welt; wer es erreicht, hat die Runde geschafft | `goal` | – |
| Bonuspunkte | Zusatzpunkte, je weniger Versuche bis ins Ziel gebraucht wurden | `bonus` | – |
| Challenge | Wettkampf über 1–5 Runden, alle Spieler auf derselben Welt | `challenge` | Freies Spiel |
| Freies Spiel | Allein auf der Welt üben, ohne Rangliste | `freePlay` | Challenge |
| Gastgeber | Spieler, der eine Challenge anlegt und schliesst | `host` | Server |
| Schwung holen | Das Männchen bewegt am gespannten Seil die Beine wie auf einer Schaukel und beschleunigt in Schwungrichtung, bis zur Energiegrenze und höchstens `TUNING.maxPumpTurns` (zurzeit 3) Umdrehungen | `pump()`, `TUNING.pump` | – |
| Seil-Glieder | Kette, die zeigt, wie das Seil durchhängt oder fällt; die Länge des Seils bleibt fest | `Chain` (in `Rope.chain`, `LooseRope.chain`) | Seillänge (`Rope.length`) |
| Haltepunkt | Stelle, an der das Seil einhaken kann: Turm-Block, Turmspitze, Kranmast, Kranausleger, Container (Kran auch auf Dächern), Ballon, Luftschiff | `Hold`, `isOnHold()`, `GRAB_SLACK` | Teil (`Prop`, das Gezeichnete) |
| Seitenwand | In der Perspektive sichtbare Seite eines Turm-Blocks; greifbar wie die Front, das Dach nicht. Hängt von der Kamera ab, darum in render.ts | `onSideWall()` | Dach (Kulisse) |
| Übungsstrasse | Endlose Strasse aus Türmen, Kränen, Ballonen und Luftschiffen für Etappe 1, ohne Ziel, immer gleich, Lücken wachsen mit der Strecke | `createStreet()`, `extendTo()`, `buildPracticeStreet()` (fester Abschnitt), `DIFFICULTY`; Typ `World` ist die gemeinsame Form von Übungsstrasse und Welt | Welt (mit Ziel, Etappe 2) |
| Gebäudeart | Nadelturm, gestuftes Hochhaus, Doppelturm, kurzer Block, Scheibe; nie zweimal dieselbe hintereinander | `TowerStyle`, `Block`, `roofOf()` | Teil (`Prop`) |
| Looping | Das Männchen dreht am gespannten Seil ganz um den Haken; die ersten `TUNING.maxPumpTurns` (zurzeit 3) Umdrehungen werden schneller, nach jeder ein Schub | `turnsOnRope()`, `TUNING.maxPumpTurns`, `TUNING.loopBoost` | – |
| Schwung-Energie | ½·v² + g·Höhe über dem Haken; Schwung holen hört bei einer Grenze auf, so bleibt oben langsamer als unten | `swingEnergy()`, `TUNING.swingSpeedAtHookHeight` | Tempo |
| Einhaken / Lösen | Tippen hängt das Seil an die getippte Stelle eines Haltepunkts bzw. löst es wieder | `tap()` → `'attached'` / `'released'`; Seitenwände über den Parameter `grabbable` (ohne Kamera: `noSideWalls`) | – |
