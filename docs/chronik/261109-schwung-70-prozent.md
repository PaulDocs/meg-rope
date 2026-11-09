---
objekt: chronik
bereich: meg-rope
erstellt: 2026-11-09
stand: 2026-11-09
---
# 09.11.2026 – «Nicht im Schwung» nach 70 % Schwungverlust

- Auftrag Pascal: «Nicht im Schwung» kam viel zu oft; Vorschlag: im Schwung,
  solange nicht mehr als 70 % Schwung verloren gehen. BAU FREI im Hauptfenster.
- Gemessen (Zufalls-Spieler, 1057 Übergänge): 51 % «out». Ruck in m/s 369,
  Winkel 310, zu langsam 35, zu kurz 0. Schnelle Spieler flogen wegen des
  absoluten Rucks raus, obwohl er nur wenige Prozent ihres Tempos kostete.
- Neu: Schwung = Tempo; `Rope.lost` (Anteil des Tempos, den ein Ruck wegnahm,
  `tempoLost()`), `STYLE.lost` 15/40/70 %. Winkel gibt nur noch die Note.
  `STYLE.jerk` und `Rope.jerk` entfallen. Nachher 10 % «out» im selben Test.
- Tests: `test/score.test.ts` angepasst und ergänzt (70-%-Grenze, `tempoLost`,
  schneller Spieler bleibt im Strike). Auf dem iPad ungetestet.
- Offen: Die Messung läuft mit einem Zufalls-Spieler, nicht mit Pascals
  Spiel; die Werte sind Startwerte.
