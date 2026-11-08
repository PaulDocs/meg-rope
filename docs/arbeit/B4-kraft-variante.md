---
objekt: karte
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-08
status: konzept
---
# B4 – Spielvariante «Freier Schwung» mit Kraft

Noch nicht gebaut. Gebaut wird erst mit «BAU FREI» für B4.

## Auftrag (Pascal, 08.11.2026)

> merke dir den vorderen Modus als Spielvariante dass es aber doch noch eine
> Schwierigkeit hat, würde ich noch ein Kraftlevel einbauen. Jedes mal wenn
> das Männchen zu fest in die Seile fällt gibt es Abzug. Es darf nur max 2
> mal hintereinander voll zurückgezogen werden. Wenn das level auf 0 ist
> flieg es einfach weg. Loopinge strapazieren ebenso. Kraft an den
> physikalischen Werten des fluges und drehens anlehnen

## Die Variante

«Freier Schwung» ist der Stand von Commit `4bb4e58`: Aus dem Stand holt das
Männchen Schwung bis zum Looping (Grenze beim Schwung holen immer die
Energiegrenze, nicht die Hakenhöhe). Die Normal-Variante bleibt wie jetzt
(`06718c4`: aus dem Stand nur bis Hakenhöhe). Der Ruck beim Fall ins Seil
gilt in beiden.

Umsetzung: `standingLimit()` gibt in der Variante `energyLimit()` zurück.
Die Variante wird vor dem Start gewählt.

## Kraft – Vorschlag

Die Kraft geht von 100 % bis 0 %. Sie steht als Balken im Bild.

| Was | Physikalischer Wert | Abzug (Vorschlag) |
|---|---|---|
| **Ruck** (zu fest ins Seil fallen) | Tempo, das der Ruck wegnimmt (m/s, `removeOutwardSpeed`) | ab 10 m/s; ein **voller Ruck** ab 30 m/s (rund 11 m freier Fall bei g 40) kostet 45 % |
| **Looping / schnelles Drehen** | Zug im Seil in g: v²/(g·L) + Anteil Schwerkraft | über 4 g: je Sekunde (g − 4) × 4 % |
| **Erholung** | – | im freien Flug und ruhig hängend +15 % je s |

- Zwei volle Rucke hintereinander lassen 10 % übrig, der dritte leert die
  Kraft. «Hintereinander» heisst: ohne Erholung dazwischen.
- **Kraft 0**: Das Männchen lässt das Seil los und fliegt mit seinem Schwung
  weiter, wie beim Lösen. Einhaken geht erst wieder mit etwas Kraft (Vorschlag
  ab 20 %).
- Zahlen sind Startwerte für `TUNING`, abgestimmt wird beim Spielen.

## Offene Fragen an Pascal

1. Kraft nur in der Variante «Freier Schwung» oder auch im normalen Spiel?
2. Erholt sich die Kraft (im Flug, beim ruhigen Hängen) oder hält sie für
   einen ganzen Versuch?
3. Kraft 0: Seil los und weiterfliegen, und erst mit etwas Kraft wieder
   einhaken. Passt das?
