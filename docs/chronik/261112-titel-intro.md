---
objekt: chronik
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
datum: 2026-11-12
---
# 12.11.2026 – Titelseite, Intro, Label; Freier Schwung wie Normal (B10, B11)

- Auftrag Pascal: Titelseite schöner, ein Intro, mehr Spielgefühl, Label
  «megene games»; die zweite Spielvariante soll beschleunigen wie Normal.
- B10 gebaut: `src/brand.ts` (Label und Zeichen), `src/intro.ts` (Intro beim
  Laden), `src/demo.ts` (Titelbild: Männchen schwingt hinter dem Menü, Tageszeit
  zieht durch), Titelseite und alle Menüs im neuen Aussehen (`index.html`,
  `src/ui.ts`), drei Töne (`ui`, `title`, `record` in `src/audio.ts`), Punkte
  zählen in der Wertung hoch.
- B11 gebaut: `standingLimit()` ist für beide Varianten die Hakenhöhe. Selbst
  entschieden: «Beschleunigungskonzept» heisst Schwung holen; die Kraft bleibt
  der Unterschied. Name «Freier Schwung» nicht geändert, Frage an Pascal offen.
- Zwei Tests beschrieben den Looping aus dem Stand und sind an die neue Regel
  angepasst (`test/strength.test.ts`, `test/physics.test.ts`).
- Gegenlesen (drei Leser): kein Blocker. Behoben: Das Titelbild hat einen
  eigenen Zustand (vorher schien es in der Challenge hinter «Jetzt spielt …»
  durch, mit Metern in der Anzeige), Karte B4 nachgeführt, «Startmenü» bleibt
  der Name der Titelseite, `studio` statt `label` im Intro, Zeiten in CSS und
  TypeScript verweisen aufeinander, Farben über Variablen, Fanfare als
  geprüfte Funktion (`resultFx`), Tests für `runIntro()` und die gleiche Bahn
  über 15 s.
- Ungetestet: iPad (Schrift, Ton beim Titelschild, Tempo des Titelbilds).
