---
objekt: karte
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-08
status: abnahme
---
# B4 – Spielvariante «Freier Schwung» mit Kraft

BAU FREI B4 von Pascal am 08.11.2026; gebaut mit den Vorschlägen unten
(offene Fragen: jeweils die erste Antwort angenommen).

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
Die Variante wählt man mit dem Schalter oben links (`variantButton`), nur
vor dem ersten Einhaken und am Boden; der Browser merkt sich die Wahl.

## Kraft (`STRENGTH` in `src/physics.ts`)

Die Kraft geht von 100 % bis 0 %. Sie steht als Balken im Bild.

| Was | Physikalischer Wert | Abzug |
|---|---|---|
| **Ruck** (zu fest ins Seil fallen) | Tempo, das der Ruck wegnimmt (m/s, `removeOutwardSpeed`) | ab 10 m/s; ein **voller Ruck** ab 30 m/s (rund 11 m freier Fall bei g 40) kostet 45 % |
| **Looping / schnelles Drehen** | Zug im Seil in g: v²/(g·L) + Anteil Schwerkraft | über 4 g: je Sekunde (g − 4) × 1 % (Looping am 5-m-Seil rund 15 % je Umdrehung) |
| **Erholung** | gute Schwünge in Folge (siehe unten) | nur beim Lösen, ab dem 2. guten Schwung in Folge, nach Stufe |

- Zwei volle Rucke hintereinander lassen 10 % übrig, der dritte leert die
  Kraft. «Hintereinander» heisst: ohne Erholung dazwischen.
- **Kraft 0**: Das Männchen lässt das Seil los und fliegt mit seinem Schwung
  weiter, wie beim Lösen. Einhaken geht erst wieder ab 20 %.
- Zahlen sind Startwerte in `STRENGTH`, abgestimmt wird beim Spielen.

## Entschieden (Pascal: «Ja, BAU FREI B4» auf die Vorschläge)

1. Kraft nur in der Variante «Freier Schwung».
2. ~~Sie erholt sich im freien Flug und bei wenig Zug am Seil.~~ Geändert
   am 09.11., siehe unten.
3. Kraft 0: Seil los, weiterfliegen; einhaken erst wieder ab 20 %.

## Rückmeldung Pascal 09.11.2026: langsamer aufladen, drei Stufen

> Die Kraft soll sich nicht so schnell aufladen, nur ganz langsam und nur bei
> guter schwünge nacheinander. 3 verschiedene einstellungen leicht, mittel,
> schwer. je nach level wird die kraft schneller oder langsamer wieder geladen

Umgesetzt:
- **Keine Erholung von selbst** mehr, weder im Flug noch am Seil.
- **Guter Schwung** (`isGoodSwing`): am Seil keine Kraft verloren (kein
  Ruck über 10 m/s, nie über 4 g), mindestens 0,8 s gehalten und mit
  mindestens 15 m/s gelöst. Gute Schwünge in Folge zählen (`goodSwings`,
  «Serie» neben dem Balken); jeder andere Schwung beginnt neu.
- **Ab dem 2. guten Schwung in Folge** gibt jeder beim Lösen Kraft zurück:
  leicht 10 %, mittel 5 %, schwer 2 % (`STRENGTH.gain`).
- **Schalter oben links** geht jetzt durch: Normal → Frei · leicht → Frei ·
  mittel → Frei · schwer (`SETTINGS`). Der Browser merkt sich die Wahl.
- Folge: Unter 20 % Kraft ohne Seil kommt keine Kraft mehr zurück – es fällt
  bis zum Boden («Keine Kraft mehr zum Einhaken»).

## Gemessen

- Senkrecht ins Seil nach 11 m Fall: 56 % übrig; 45° schräg: 75 %.
- Aus dem Stand: Looping am 5-m-Seil nach 3 s, Kraft leer nach 7 s (lässt
  los); 10 m: 4 s / 10,5 s; 20 m: 6 s / 24 s; 30 m: Looping nach 7 s, die
  Kraft sinkt nur noch langsam (36 % nach 30 s).
- Ruhiges Pendeln bis knapp unter Hakenhöhe (unten 3 g) kostet nichts.
- Am 09.11. ohne Erholung von selbst nachgemessen: dieselben Zeiten (beim
  Kreisen lag der Zug nie unter 2 g, die alte Erholung griff dort nicht).

## Testanleitung für Pascal

Link: https://claude.ai/artifact/8QQcGgVaD9Fa4fCDFUw6GW

1. Oben links auf «Normal ⇄» tippen: Frei · leicht, nochmals: mittel,
   schwer, wieder Normal.
2. Einhaken: Oben links steht jetzt der Kraftbalken. Hängen lassen: Es
   holt Schwung bis zum Looping, die Kraft sinkt, irgendwann lässt es los.
3. Aus grosser Höhe fallen und dann einhaken: Der Ruck kostet sichtbar Kraft.
   Zweimal hintereinander so – beim dritten Mal hakt es nicht mehr ein
   (Balken rot, «Keine Kraft mehr zum Einhaken»).
4. Saubere Schwünge (quer einhaken, nicht ins Seil fallen, schnell lösen):
   «Serie» zählt hoch, ab der zweiten wächst der Balken ein wenig – auf
   leicht mehr, auf schwer kaum.
5. Am Boden: Schalter zurück auf «Normal» – kein Balken, aus dem Stand kein
   Looping.
