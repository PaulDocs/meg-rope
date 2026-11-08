---
objekt: regel
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-08
---
# KI-Leitplanken – Meg Rope

Was KI-Werkzeuge erfahrungsgemäss falsch machen, und das Gegenmittel. Kurzform
der Leitplanken aus Documenti und Henri (`10-Projekte/ungestellt-crm/crm-app/docs/ki-leitplanken.md`
hat die ausführliche Fassung mit Beispielen). Projekteigene Muster kommen
unten dazu, sobald sie auftreten – mit Datum und Anlass.

Pascal prüft das **Verhalten**, nicht den Code. Die Kontrolle über den Code
liegt bei `pruefen.sh`, `/q-pr-gegenlesen` und diesen Regeln.

1. **Erfolg nur mit Beleg.** «Funktioniert» nur mit ausgeführtem Befehl und
   Ausgabe. Ungetestetes heisst «ungetestet». Fehler wörtlich zitieren.
2. **Nachschauen statt erinnern.** APIs, Optionen und Versionen aus den
   installierten Typen, dem Lockfile oder der Doku – nie aus dem Gedächtnis.
3. **Die Dateien sind das Gedächtnis.** Vor der Arbeit `docs/STAND.md` lesen,
   danach nachführen. Was nur im Chat steht, ist verloren.
4. **Kein ungefragtes Verbessern.** Der Umfang des Go ist der Umfang der
   Arbeit. Funde ausserhalb kommen in den Eingang, nicht in den Code.
5. **Tests nie passend machen.** Eine Erwartung wird nur geändert, wenn das
   neue Verhalten gewollt ist – und das steht dann im Commit.
6. **Kleine Schritte.** Ein Schritt, ein Commit, eine Testanleitung.
7. **Migrationen additiv, mit Sicherung.** Nie destruktiv ohne Backup und Go.
8. **Keine Sicherheits-Abkürzungen**, auch nicht «nur in der Entwicklung»:
   keine Geheimnisse im Code, keine offenen Routen.
9. **Keine erfundenen Fakten** in Doku, Texten oder Antworten.
10. **Dateizustand prüfen, nicht annehmen.** Vor dem Schreiben lesen; eine
    andere Sitzung kann die Datei geändert haben.

## Hier stoppen und fragen

Live-Systeme, Löschen, Geld, Texte in Pascals Namen oder für Kunden,
Kundendaten, Geheimnisse, ein Entscheid, der einen früheren umkehrt.

## Projekteigene Muster

- _noch keine_
