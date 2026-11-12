---
objekt: karte
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
status: abnahme
---
# B11 – «Freier Schwung» beschleunigt wie Normal

Auftrag von Pascal am 12.11.2026:

> Die zweite Spielvariante soll das selbe Beschleunigungskonzept haben wie das
> Normal

## So verstanden und gebaut

Schwung holen ist jetzt in beiden Spielvarianten gleich: aus dem Stand nur bis
auf Hakenhöhe, Loopings nur mit Tempo vom Flug, über Hakenhöhe zuerst nur
mässig (höchstens 3 Looping-Anläufe). Bis dahin durfte das Männchen im Freien
Schwung aus dem Stand bis zum Looping Schwung holen.

- `standingLimit()` in `src/physics.ts` gibt für beide Varianten die Hakenhöhe.
- Ersetzt in der Karte B4 den Abschnitt «Die Variante» und Schritt 2 der
  Testanleitung (dort nachgeführt).
- «Freier Schwung» unterscheidet sich damit nur noch durch die **Kraft**
  (Rucke und Loopings kosten, gute Schwünge laden, Kraftstationen, drei
  Stufen). Die Kraft-Regeln sind unverändert (B4).

## Offen für Pascal

- Der Name «Freier Schwung» (im Menü «Frei · leicht/mittel/schwer») stammt vom
  Looping aus dem Stand und passt nicht mehr genau. Vorschlag: «Kraft ·
  leicht/mittel/schwer». Nicht geändert, weil gespeicherte Ergebnisse und die
  Doku den Namen tragen.
- Gespeicherte Bestleistungen im Freien Schwung stammen noch aus der alten
  Regel und sind mit neuen nicht ganz vergleichbar.

## So testest du

1. Einstellung «Frei · mittel», an ein Haus hängen und nichts tun: Das Männchen
   schwingt sich bis etwa auf Hakenhöhe hoch, ein Looping kommt nicht.
2. Mit Tempo aus dem Flug einhaken: Looping geht wie in Normal und kostet Kraft.
