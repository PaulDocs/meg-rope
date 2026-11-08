---
objekt: stand
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-08
---
# Stand – Meg Rope

**08.11.2026: Etappe 1 «Schwingen» gebaut, wartet auf Pascals Test auf dem iPad (B1).** Ein Browserspiel fürs iPad, in dem man mit einem Strichmännchen von Gebäude zu Gebäude schwingt, mit Challenge-Modus für mindestens zwei Spieler im lokalen Netzwerk

## Offen / Nächster Zug

### Dringend

- **B4 «Freier Schwung» mit Kraft testen**: Testanleitung in `docs/arbeit/B4-kraft-variante.md`.
- **B1 auf dem iPad testen**: Testanleitung in `docs/arbeit/B1-schwingen.md`,
  privater Link https://claude.ai/artifact/8QQcGgVaD9Fa4fCDFUw6GW.
- **Projekt schärfen**: harte Regeln in `AGENTS.md`.

### Entscheid Pascal

- Häuser nur noch Kulisse bestätigen (`docs/entscheide/2026-11-08-haeuser-kulisse.md`).
- Spielgefühl nach dem zweiten Umbau (Tempo, Loopings, Abstände, Grafik): Werte in `src/physics.ts` (`TUNING`) und `src/world.ts`.
- GitHub-Push: erster Commit liegt lokal, Push nach `PaulDocs/meg-rope` auf dein Wort.

### Später

- Grafik in echtem 3D (three.js) – Vorschlag, Entscheid Pascal nach dem Physik-Test. Pascal 08.11.2026: Das Vorbild zeigt die Welt perspektivisch, nicht als Frontansicht; das gehört in die Grafikumsetzung (heute nur einfache Perspektive in `box()`).
