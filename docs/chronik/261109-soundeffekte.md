---
objekt: chronik
bereich: meg-rope
erstellt: 2026-11-09
stand: 2026-11-09
datum: 2026-11-09
---
# 09.11.2026 – Soundeffekte (B8)

- Pascal fragte, ob Soundeffekte möglich sind; empfohlen und angenommen:
  im Code erzeugte Web-Audio-Töne, die der Physik folgen, plus Stummschalter.
- Gebaut: `src/audio.ts` (reine Logik `SoundObserver` und Abbildungen Tempo →
  Wind, Ruck/Aufprall → Stärke; `Sound` mit Web Audio), Stummknopf unten
  rechts, Wahl im Browser gemerkt. `main.ts` ruft nur die Ereignisse auf, die
  Physik ist unverändert.
- Tests `test/audio.test.ts` ohne echten AudioContext (u. a. Warnton nur einmal
  beim Unterschreiten der Kraft).
- Bekannt: Der Stumm-Schalter des iPads kann Web Audio stummschalten; der Ton
  startet erst bei der ersten Berührung.
- Ungetestet: der echte Klang auf dem iPad (im Code-Werkzeug nicht hörbar);
  Lautstärken sind zurückhaltend geschätzt, Pascal justiert nach Gehör.
