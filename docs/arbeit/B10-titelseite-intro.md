---
objekt: karte
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
status: abnahme
---
# B10 – Titelseite, Intro und Label «megene games»

Auftrag von Pascal am 12.11.2026:

> Titelseite noch etwas schöner gestalten. Ein Intro erstellen. bisschen mehr
> game Feeling. Label = megene games

## Was gebaut ist

- **Label** (`src/brand.ts`): «megene games» mit einem kleinen «m» aus Seil und
  Haken als Zeichen. Steht im Intro und unten auf der Titelseite.
- **Intro** (`src/intro.ts`): Beim Laden gut 2 s das Label auf dunklem Grund,
  dann wird die Stadt sichtbar und das Titelschild fällt an zwei Seilen ins
  Bild. Tippen überspringt. Nur einmal je Laden. `?intro=0` in der Adresse
  schaltet es ab; wer am Gerät «Bewegung reduzieren» eingestellt hat, sieht
  keines.
- **Titelseite** (im Code und Glossar «Startmenü»; `src/ui.ts`, `index.html`): Titelschild «MEG ROPE», das an
  zwei Seilen leicht pendelt, darunter «Spielen» (Name, Einstellung,
  Einzelspiel, Challenge) und daneben die Bestenliste. Dunkle Glasflächen,
  Haupt-Button in der Farbe des Schals.
- **Titelbild** (`src/demo.ts`): Hinter der Titelseite schwingt das Männchen
  von selbst an einem Seil, die Tageszeit zieht in gut 90 s einmal durch.
  Dabei wird nichts gewertet und nichts gespeichert.
- **Spielgefühl**: Buttons geben nach und klicken; in der Wertung zählen die
  Punkte hoch; «Neue Bestleistung!» springt ins Bild, dazu eine Fanfare (auch
  beim Sieg in der Challenge); Plätze 1–3 in Gold, Silber, Bronze; Ton, wenn
  das Titelschild landet.

Spielregeln, Wertung und Speicherung sind unverändert.

## So testest du

1. Seite neu laden: Label, dann fällt das Schild herunter. Beim zweiten Mal
   früh tippen: Es geht sofort weiter, und das Schild landet mit Ton.
2. Titelseite eine Minute stehen lassen: Abend, Nacht mit Lichtern, Morgen.
3. Buttons drücken: kurzer Klick (Ton an).
4. Einzelspiel spielen: Punkte zählen hoch; bei Bestleistung Fanfare.
5. «Menü»: zurück auf die Titelseite, ohne Intro.

## Nicht geprüft

- Auf dem iPad: Die Titelschrift nutzt dort «Avenir Next Condensed»; im
  Prüf-Browser war nur die Ersatzschrift zu sehen.
- Der Ton beim Landen des Schilds kommt nur, wenn vorher getippt wurde (das
  iPad gibt Ton erst nach einer Berührung frei).
