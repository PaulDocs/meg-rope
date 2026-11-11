---
objekt: karte
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
status: abnahme
---
# B9 – Grafik: Tageszeit und Männchen mit Schal

BAU FREI von Pascal am 12.11.2026:

> Jetzt erstelle die Grafik dazu. Ich überlasse dir die Freiheit es zu
> gestalten. Das Männchen bist du ;-)

## Was gebaut ist

- **Tageszeit läuft mit der Strecke** (`src/look.ts`, `DAY_CYCLE` 2400 m):
  Tag bis rund 400 m, Abendrot um 700 m, Dämmerung um 900 m, Nacht von rund
  1100 bis 1870 m, Morgen um 2100 m, dann wieder Tag. Massgebend ist die
  weiteste erreichte Stelle; jeder Versuch beginnt am Tag.
- **Himmel** (`src/backdrop.ts`): Verlauf, Sonne mit Schein, nachts Mondsichel
  und funkelnde Sterne, Wolken in der Farbe der Stunde.
- **Stadt**: ferne Stadt in zwei Schichten mit Dunst, nachts mit Lichtpunkten.
  Türme mit Fensterraster; nachts brennt in knapp der Hälfte Licht (fester
  Zufall je Fenster). Dachaufbauten als Kulisse: Antenne mit rotem Warnlicht
  oder Wassertank. Vorn eine Strasse mit Mittelstrichen, die das Tempo zeigt.
- **Männchen** (`src/figure.ts`): korallenroter Schal, der hinter ihm
  herflattert und bei wenig Tempo herunterhängt; Tempostriche ab 28 m/s im
  Flug; Rand in der Gegenfarbe, damit es vor jedem Hintergrund sichtbar bleibt.
  Nachts sind Männchen, Seil und Schrift hell statt dunkel (ab `DARK_FROM`).
- **Haken** als roter Punkt mit Rand; Schrift der Anzeige mit dünnem Rand.
- Kräne, Ballone und Luftschiffe werden nachts abgedunkelt (`dimmed`).

Greifen, Physik, Kamera und Wertung sind unverändert. Alles ist im Code
gezeichnet, ohne Bilddateien und ohne Grafik aus anderen Spielen.

## Zum Ansehen ohne zu spielen

Lokal (`npm run dev`) zeigt `?tageszeit=1300` die Stimmung, die sonst nach
1300 m käme. Im Testlink geht das nicht (er gibt keine Adress-Zusätze weiter).

## Geprüft und nicht geprüft

- Tests `test/look.test.ts`: Ablauf des Tages, Schwelle für helle Schrift,
  Wiederholung, gültige Farben, Zufall der Fenster.
- Im Browser angesehen (1180 × 820): Tag, Abendrot, Nacht; Männchen im Fall
  mit Schal und Tempostrichen.
- **Nicht geprüft:** Tempo auf dem iPad (viele Fenster je Bild), Morgen und
  Dämmerung nur über die Tests, Männchen am gespannten Seil nur im Code.

## Testanleitung für Pascal

Link: https://claude.ai/artifact/8QQcGgVaD9Fa4fCDFUw6GW

1. Starten: heller Tag, Türme mit Fenstern, Strasse unten, Sonne oben rechts.
2. Schwingen: Der rote Schal weht hinter dem Männchen her; hängt es still,
   hängt auch der Schal.
3. Weiter als 600 m: Der Himmel wird orange, ab rund 1100 m ist Nacht mit
   Mond, Sternen und Licht in den Fenstern; Männchen und Seil sind dann hell.
4. Läuft es auf dem iPad flüssig? Wenn nicht: melden, dann zeichne ich
   weniger Fenster.
5. Gefällt die Länge des Tages (2400 m)? Kürzer oder länger ist eine Zahl.
