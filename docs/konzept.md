---
objekt: konzept
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-08
status: abgenommen
---
# Konzept – Meg Rope

**Abgenommen am 08.11.2026** von Pascal, samt Wertungs-Vorschlag.

## Worum es geht

Ein Strichmännchen schwingt an einem Seil von Hochhaus zu Hochhaus durch eine
Stadt bis ins **Ziel**. Das Ziel ist schwierig zu erreichen. Vorbild ist das Spielprinzip von
«Rope'n'Fly 4» (iPad, nicht mehr erhältlich). Meg Rope ist ein **eigenes** Spiel
nach diesem Prinzip: eigener Name, eigene Grafik, eigene Stadt. Es übernimmt
keine Bilder, Figuren oder Levels des Vorbilds.

Dazu kommt, was das Vorbild nicht hatte: ein **Challenge-Modus** für mindestens
zwei Spieler im lokalen Netz. Gespielt wird nacheinander, nicht gleichzeitig.

## So spielt es sich

| Handlung | Was passiert |
|---|---|
| Tippen, Männchen fliegt frei | Das Seil schiesst genau zur getippten Stelle und hakt dort ein |
| Männchen hängt am Seil | Es schwingt wie ein Pendel um den Einhakpunkt |
| Tippen, Männchen hängt | Das Seil löst sich, das Männchen fliegt mit dem Schwung weiter |
| Boden berührt | Versuch vorbei |
| Ziel erreicht | Runde geschafft |

- Tippen wechselt also immer zwischen **einhaken** und **lösen**. Man muss den
  Finger nicht halten.
- **Einhaken** geht an **jedem Haltepunkt**: Turm (Wand, Dach, Kante), Kran,
  Ballon. Tippt man in den leeren Himmel, passiert nichts.
- **Gebäude sind Kulisse**: Das Männchen fliegt davor durch. Nur der
  **Boden** beendet den Versuch (Entscheid
  `docs/entscheide/2026-11-08-haeuser-kulisse.md`, ersetzt «prallt ab»).
- **Kamera** folgt dem Männchen nach rechts bis zum Ziel.
- **Drei Versuche**: Wer am Boden landet, beginnt von vorne. Nach dem dritten
  missglückten Versuch ist die Runde vorbei. Wer das Ziel erreicht, ist sofort
  fertig.
- **Anzeige**: Versuch (1/3), Distanz bis zum Ziel, Zeit.
- **Gefühl ist alles**: Die Physik (Pendel, Schwerkraft, Schwung beim Lösen)
  wird zuerst gebaut und so lange angepasst, bis sie sich gut anfühlt.

## Look

Ein **animiertes Strichmännchen**: Arme, Beine und Körper bewegen sich beim
Schwingen, Fliegen und Abprallen. Die Stimmung lehnt sich an Rope'n'Fly 4 an:
eine schlichte Hochhaus-Stadt, das Männchen gut sichtbar davor. Alle Grafiken
zeichnen wir selbst.

## Welt

**Erst einmal gibt es genau eine Welt**: eine von Hand gebaute Stadt mit Start
und Ziel, schwierig zu schaffen. Weitere Welten (oder Städte aus einem
Zufalls-Seed) kommen später.

## Spielmodi

### Freies Spiel

Allein auf der Welt üben: drei Versuche, Ziel erreichen. Die eigene
Bestleistung wird auf dem Gerät gespeichert.

### Challenge

1. **Erstellen**: Ein Spieler (der Gastgeber) legt eine Challenge an: Name,
   Anzahl Runden (1–5).
2. **Beitreten**: Die anderen öffnen im Heimnetz die Adresse auf dem NAS (oder
   scannen einen QR-Code), wählen ihren Namen und sehen die offene Challenge.
3. **Spielen**: Jeder spielt die Runden auf seinem Gerät, wann er will. Alle
   bekommen **dieselbe Welt**. Solange es nur eine Welt gibt, spielt jede
   Runde der Challenge dieselbe Welt.
4. **Drei Versuche pro Runde** und Spieler. Wer das Ziel erreicht, ist fertig.
5. **Wertung**: Ziel erreicht gibt Punkte, dazu **Bonuspunkte, je weniger
   Versuche** man gebraucht hat. Details siehe Vorschlag unten.
6. **Rangliste**: Sie ist für alle sichtbar und aktualisiert sich, sobald
   jemand eine Runde abschliesst.
7. **Abschluss**: Der Gastgeber schliesst die Challenge, oder sie endet, wenn
   alle ihre Läufe gespielt haben.

## Technik (Vorschlag)

| Teil | Wahl | Warum |
|---|---|---|
| Spiel | Web-App, TypeScript, Canvas 2D, eigene Physik | Läuft in Safari auf dem iPad, kein App Store; eigene Physik, damit sie auf allen Geräten gleich rechnet |
| Gleichheit | feste Zeitschritte, Welt als Datei | Gleiche Welt für alle, faire Rangliste |
| Server | kleiner Node-Dienst, Daten in SQLite | Hält Spieler, Challenges, Läufe; liefert auch das Spiel aus |
| Betrieb | Docker auf dem NAS | Läuft durchgehend, alle Geräte im WLAN erreichen ihn |
| iPad | «Zum Home-Bildschirm» (PWA) | Startet im Vollbild wie eine App, Freies Spiel auch offline |

Kein Login mit Passwort: Im Heimnetz reicht ein Spielername pro Gerät. Den Port
auf dem NAS reservieren wir erst, wenn es den Server wirklich gibt (Etappe 3).

## Bewusst nicht dabei (erste Version)

- Gleichzeitiges Spielen mehrerer Spieler in derselben Stadt
- Spielen über das Internet, Konten, Passwörter
- App Store, native iPad-App
- Shop, Upgrades, Werbung
- Schutz gegen Mogeln (Heimnetz, man kennt sich)

## Etappen

Jede Etappe ist für sich spielbar und wird von Pascal auf dem iPad abgenommen.

1. **Schwingen**: ein Männchen, ein paar feste Gebäude, Tippen zum Einhaken und
   Lösen, Pendel, Fliegen, Abprallen. Ziel: fühlt sich gut an.
2. **Die Welt**: eine ganze Stadt mit Start und Ziel, Kamera, drei Versuche,
   Zeit, Freies Spiel mit Bestleistung. Schwierigkeit so lange anpassen, bis
   das Ziel schwer, aber machbar ist.
3. **Server & Challenge mit einer Runde**: Spielername, Challenge erstellen,
   beitreten, drei Versuche, Punkte, Rangliste. Läuft auf dem NAS.
4. **Turnier**: mehrere Runden, Gesamtwertung.
5. **Feinschliff**: Animation des Männchens, Grafik, Sound, Home-Bildschirm.

## Wertung

Fest steht: drei Versuche, Ziel erreichen beendet die Runde, weniger Versuche
geben mehr Bonus. Dazu gilt:

| Ergebnis der Runde | Punkte |
|---|---|
| Ziel im 1. Versuch | 100 + 50 Bonus |
| Ziel im 2. Versuch | 100 + 25 Bonus |
| Ziel im 3. Versuch | 100 |
| Ziel nicht erreicht | Anteil der Strecke im weitesten Versuch, z. B. halbe Strecke = 50, kein Bonus |

- **Gleichstand** (gleich viele Punkte): Die schnellere Zeit liegt vorne.
- **Gesamtwertung**: Punkte aller Runden zusammengezählt.
