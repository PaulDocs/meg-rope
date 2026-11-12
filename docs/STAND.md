---
objekt: stand
bereich: meg-rope
erstellt: 2026-11-08
stand: 2026-11-12
---
# Stand – Meg Rope

**12.11.2026: Alles Gebaute (B1, B4, B5, B8–B12) liegt in `main` (letzter Commit `64c980f`) und wartet auf Pascals Abnahme – kein Punkt ist bisher abgenommen.** Ein Browserspiel fürs iPad, in dem man mit einem Strichmännchen von Gebäude zu Gebäude schwingt, mit Challenge-Modus für mindestens zwei Spieler im lokalen Netzwerk

## Wo wir stehen

- **Spiel:** Schwingen mit Seil und Pendel (B1), Spielvariante «Freier Schwung» mit Kraft in drei Stufen (B4, seit B11 mit demselben Schwung-holen wie «Normal»), Wertung mit Style und Strike, Spielername, Einzelspiel und Challenge nacheinander **auf einem Gerät**, Bestenliste auf dem Gerät (B5), Soundeffekte im Code erzeugt mit Stummschalter (B8), Tageszeit läuft mit der Strecke, Türme mit Fenstern, Männchen mit Schal (B9), neue Titelseite mit Intro und Label «megene games» (B10).
- **Nicht gebaut:** Challenge übers Netz (Etappe 3), Turnier mit mehreren Runden (Etappe 4). Wo der Server für Etappe 3 laufen soll (NAS wie im Konzept oder Cloudflare), ist nicht entschieden (`docs/entscheide/2026-11-12-hosting-cloudflare.md`).
- **Hosting (B12):** Am 12.11.2026 von Pascal bei Cloudflare eingerichtet, begleitet von der Sitzung `meg-rope-cloudflare`: Pages-Projekt `meg-rope` unter `meg-rope.pages.dev`, Production aus dem Zweig `live` (Stand `64c980f`), Access davor (Anmeldung vorhanden), D1-Datenbank `meg-rope` als Bindung `DB`, Variablen `ACCESS_TEAM` und `ACCESS_AUD` (Werte nur bei Cloudflare, nie im Repo). Nach dem Binden der Datenbank meldete Pascal «ok läuft»; vorher antwortete `/api/scores` erst «Kein Zugang», dann «Speicher nicht verbunden». **Nicht bestätigt:** Anmeldeseite im privaten Fenster für die Hauptadresse und für `/api/scores`; Eintrag eines Einzelspiels auf einem zweiten Gerät sichtbar; Vorschau-Bauten (die Läufe von `main` standen bei Cloudflare als «Preview» und haben eigene Adressen; die Anleitung sieht sie als ausgeschaltet vor); Adresse eines einzelnen Laufs von Access gedeckt. **Lehren beim Einrichten** (noch nicht in `docs/betrieb.md`): `ACCESS_TEAM` ist nur der Name, keine Adresse mit Pfad (sonst «Kein Zugang»); Bindung und Variablen greifen erst nach «Retry deployment». Claude pusht nie auf `live` (Hook `live-schutz.sh`); Anleitung und Prüflisten: `docs/betrieb.md`.
- **GitHub:** `PaulDocs/meg-rope`, Zweig `main` ist die Wahrheit; Push per Deploy-Key (SSH `github-meg-rope`), keine GitHub-API (`AGENTS.md`, «Sitzungen»).
- **Alle Karten** (`docs/arbeit/`) stehen auf `abnahme`. Nur Pascal nimmt ab.

## Offen / Nächster Zug

### Dringend

- **iPad-Tests, je mit Testanleitung in der Karte**:
  - **B1 Schwingen**: `docs/arbeit/B1-schwingen.md`
  - **B4 Kraft («Freier Schwung»)**: `docs/arbeit/B4-kraft-variante.md`
  - **B5 Wertung, Style, Strike, Challenge**: `docs/arbeit/B5-wertung-style.md`
  - **B8 Soundeffekte**: `docs/arbeit/B8-soundeffekte.md` (Seitenschalter des iPads auf «Ton»)
  - **B9 Grafik, Tageszeit**: `docs/arbeit/B9-grafik-tageszeit.md` (läuft es auf dem iPad flüssig? Tageslänge 2400 m recht?)
  - **B10 Titelseite, Intro, Label**: `docs/arbeit/B10-titelseite-intro.md` (Titelschrift auf dem iPad ungeprüft)
  - **B11 «Freier Schwung» wie Normal**: `docs/arbeit/B11-freier-schwung-wie-normal.md`
  - Testlink (privat): https://claude.ai/artifact/8QQcGgVaD9Fa4fCDFUw6GW. **Ungeklärt**, ob er den neuesten Bau zeigt; neu erzeugen mit `npm run einzelseite -- ‹ziel.html›`, dann veröffentlichen (siehe B1). Die Karten B5, B8, B10, B11 nennen keinen Link.
- **Cloudflare-Einrichtung abschliessen** (Pascal): Sie läuft (siehe «Hosting (B12)» oben). Offen sind die Prüfpunkte aus `docs/betrieb.md` (privates Fenster, zweites Gerät), die Vorschau-Bauten ausschalten und in `AGENTS.md` bei «Live» die Adresse ergänzen. Solange die Hauptadresse im privaten Fenster nicht geprüft ist, den Link nicht weitergeben.
- **Projekt schärfen**: In `AGENTS.md` steht bei den harten Regeln «noch keine»; die Zeilen «Gesperrt», «Merge-Weg» und «Dev nachziehen» sind noch offen.

### Entscheid Pascal

- **B11 bestätigen**: «Beschleunigungskonzept» ist als «Schwung holen» ausgelegt; dabei fiel der Looping aus dem Stand im Freien Schwung weg. Gespeicherte Bestleistungen im Freien Schwung stammen aus der alten Regel und sind mit neuen nicht ganz vergleichbar (B11).
- **Name «Freier Schwung»** passt nicht mehr genau (stammte vom Looping aus dem Stand). Vorschlag: «Kraft · leicht/mittel/schwer». Nicht geändert, weil gespeicherte Ergebnisse und die Doku den Namen tragen.
- **B6 und B7 aus dem Eingang** (`docs/arbeit/eingang.md`): B6 Kraft sinkt mit der Zeit wie Treibstoff (mit Kraftstationen); B7 «Serie» und «Strike» auf eine Note zusammenlegen.
- **Häuser nur noch Kulisse bestätigen**: `docs/entscheide/2026-11-08-haeuser-kulisse.md` steht noch auf «Bestätigung durch Pascal offen».
- **GitHub-Repo privat?** Der Entscheid zu Cloudflare geht davon aus, dass es privat bleibt; ob es privat ist, ist nicht geprüft. Der Testlink (Artifact, «jeder mit dem Link») steht in `docs/arbeit/B1`, `B4`, `B9` und in dieser Datei.
- **Zweigschutz bei GitHub für `live`?** Heute sperrt nur der Hook Claude; er erkennt nur direkte `git push`-Befehle und bremst sonst niemanden. Ob das GitHub-Abo den Schutz für ein privates Repo anbietet, ist nicht geprüft (`docs/betrieb.md`, Schritt 4).
- **Server für die Challenge übers Netz** (Etappe 3): NAS oder Cloudflare, offen. Bis dahin gilt das Konzept; kein zweites Backend ohne Entscheid.

### Später

- Grafik in echtem 3D (three.js) – Vorschlag vom 08.11.2026, Entscheid Pascal nach dem Physik-Test; B9 hat die Grafik inzwischen im bestehenden 2D-Aufbau verbessert, ob 3D noch gewollt ist, ist **ungeklärt**. Pascal 08.11.2026: Das Vorbild zeigt die Welt perspektivisch, nicht als Frontansicht.
- Etappe 4 «Turnier» und Etappe 5 «Feinschliff» (`docs/konzept.md`).
