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
| Ziel | Ende der Welt; wer es erreicht, hat die Runde geschafft | `goal` | – |
| Bonuspunkte | Zusatzpunkte, je weniger Versuche bis ins Ziel gebraucht wurden | `bonus` | – |
| Challenge | Wettkampf über 1–5 Runden, alle Spieler auf derselben Welt | `challenge` | Freies Spiel |
| Freies Spiel | Allein auf der Welt üben, ohne Rangliste | `freePlay` | Challenge |
| Gastgeber | Spieler, der eine Challenge anlegt und schliesst | `host` | Server |
| Schwung holen | Das Männchen bewegt am gespannten Seil die Beine wie auf einer Schaukel und beschleunigt in Schwungrichtung, überall bis `maxSwingSpeed` | `pump()`, `TUNING.pump` | – |
| Seil-Glieder | Kette, die zeigt, wie das Seil durchhängt oder fällt; die Länge des Seils bleibt fest | `Chain` (in `Rope.chain`, `LooseRope.chain`) | Seillänge (`Rope.length`) |
| Haltepunkt | Stelle, an der das Seil einhaken kann: Turm, Kranmast, Kranausleger, Ballon | `Hold`, `isOnHold()` | Teil (`Prop`, das Gezeichnete) |
| Übungsstrasse | 1,5 km Türme, Kräne und Ballone für Etappe 1, ohne Ziel, immer gleich | `PRACTICE_STREET`, `buildPracticeStreet()`; Typ `World` ist die gemeinsame Form von Übungsstrasse und Welt | Welt (mit Ziel, Etappe 2) |
| Looping | Das Männchen dreht am gespannten Seil ganz um den Haken | – | – |
| Einhaken / Lösen | Tippen hängt das Seil an die getippte Stelle eines Haltepunkts bzw. löst es wieder | `tap()` → `'attached'` / `'released'` | – |
