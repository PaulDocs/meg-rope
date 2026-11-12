---
objekt: chronik
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
datum: 2026-11-12
---
# 12.11.2026 – Grafik: Tageszeit und Männchen mit Schal (B9)

- Pascal gab die Gestaltung frei («Das Männchen bist du») und bat, beim Bauen
  sparsam mit Token zu sein («verbraucht nicht grad alle Token»); das betrifft
  den Aufwand der Sitzung, nicht die Grafik.
- Gebaut: Farbstimmung nach Strecke (`src/look.ts`: Tag, Abendrot, Dämmerung,
  Nacht, Morgen; ein Tag = 2400 m), Kulisse (`src/backdrop.ts`: Sonne, Mond,
  Sterne, zwei Schichten ferne Stadt, Strasse), Männchen mit flatterndem Schal
  und Rand (`src/figure.ts`), Fenster und Dachaufbauten an den Türmen.
  `render.ts` behält Kamera, Türme, Kulissen-Objekte und Anzeige.
- Greifen, Physik und Wertung unverändert; keine Bilddateien.
- Ungetestet: Tempo auf dem iPad.
- Gegenlesen (drei Leser): kein Blocker. Behoben: Stimmung und Spielzeit
  laufen über `Proj` statt über Modul-Zustand, `Stage` statt zweier Typen für
  «Stimmung», `Camera` in `canvas.ts`, Tests für Morgen, Farbwechsel, Strecke
  und Fenster, riesige Adress-Zusätze bleiben gültig. Offen als Anregung:
  `drawFigure()` und `drawSky()` aufteilen, Mond-, Stern- und Schattenfarbe
  nach `look.ts`.
