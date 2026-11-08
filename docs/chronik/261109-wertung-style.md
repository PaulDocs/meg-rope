---
objekt: chronik
bereich: meg-rope
erstellt: 2026-11-09
stand: 2026-11-09
datum: 2026-11-09
---
# 09.11.2026 – Wertung mit Style und Strike, Einzelspiel und Challenge (B-neu-1)

- Pascal: Score für Einzel- und Challenge-Modus, «wer kommt weiter», gespeichert,
  Spielername zu Beginn, Style und Flugzeitpunkte zählen, Strike mit
  Spielraum, Tempo als Kriterium, Energie-Checkpoints für die Kraft.
- Gebaut: `score.ts` (Noten je Übergang nach Ruck und Abflug-Winkel, Tempo-
  und Looping-Punkte, Strike-Faktor bis 3), `game.ts` (drei Versuche, Werten
  mit + 50/25 %, Challenge-Reihenfolge, Rangliste), `store.ts` (Ergebnisse und
  Namen im Browser), `ui.ts` (Startmenü, Zwischenstand, Wertung). Kraftstation
  alle 300 m im Freien Schwung.
- Der Schalter oben links ist weg; die Einstellung wählt man im Startmenü
  (eine Challenge spielt für alle dieselbe).
- Challenge vorerst nacheinander auf einem Gerät; übers Netz mit Etappe 3.
- Entscheid: `docs/entscheide/2026-11-09-wertung-weiteste-strecke.md`
  («Freies Spiel» heisst jetzt Einzelspiel).
- Im Browser durchgespielt (Skript): Name nötig, Einstellung, Einzelspiel mit
  Werten und Bestleistung, Challenge mit zwei Spielern, Ergebnisse im
  Browser-Speicher und im Startmenü; keine Fehler in der Konsole. Neuladen
  der Seite nicht im Skript geprüft. Auf dem iPad ungetestet.
