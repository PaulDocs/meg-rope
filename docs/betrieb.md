---
objekt: doku
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
---
# Betrieb – Meg Rope auf Cloudflare

**Stand:** 12.11.2026 · vorbereitet, **noch nicht eingerichtet**. Die Schritte
unten macht Pascal im Cloudflare-Dashboard; Claude hat dort keinen Zugang.
Die Namen der Menüs stammen aus dem Gedächtnis und können im Dashboard leicht
anders heissen. Grundlage: `docs/entscheide/2026-11-12-hosting-cloudflare.md`.

## Was wo liegt

| Teil | Wo | Im Repo |
|---|---|---|
| Spiel (Dateien) | Cloudflare Pages, Projekt `meg-rope`, gebaut aus dem Zweig **`live`** | `dist/` aus `npm run build:cloud` |
| Online-Bestenliste | Pages Function `/api/scores` | `functions/api/scores.ts`, `server/access.ts` |
| Speicher der Bestenliste | D1-Datenbank `meg-rope`, gebunden als `DB` | Tabelle legt die Funktion selbst an |
| Zugang | Cloudflare Access (Zero Trust) | nichts – E-Mail-Adressen nie ins Repo |

**Live geht nur der Zweig `live`.** `main` bleibt der Arbeitsstand: Was Claude
nach `main` mergt, sehen die Freunde nicht. Live schaltest du selbst, siehe
«Neue Version». **Gesperrt seit 12.11.2026 für Claude:** Der Hook
`live-schutz.sh` weist jeden `git push` auf `live` ab (Zeile «Live» in
`AGENTS.md`, Schritt 4). Der Deploy-Key selbst darf weiter in jeden Zweig
schieben; wer ohne den Hook arbeitet (du selbst, ein anderes Werkzeug), ist
nicht gebremst. Wer auch das sperren will: Zweigschutz bei GitHub.

## Einrichten (einmal)

Die Reihenfolge ist Absicht: zuerst der Zugang, dann die Daten.

### 1. Zweig `live` und Pages-Projekt

1. GitHub → Repo `PaulDocs/meg-rope` → Zweig-Auswahl → `live` eintippen →
   «Create branch: live from main».
2. Cloudflare-Dashboard → Workers & Pages → Erstellen → Pages → mit Git
   verbinden. Bei der Abfrage von GitHub **«Only select repositories»** wählen
   und nur `meg-rope` freigeben (sonst liest Cloudflare alle deine privaten
   Repos).
3. Produktionszweig: **`live`** · Build-Befehl: `npm run build:cloud` ·
   Ausgabeordner: `dist` · Framework: keines. Node kommt aus `.node-version`.
4. Einstellungen → Builds → Vorschau-Bereitstellungen: **keine** (sonst baut
   Cloudflare aus jedem Zweig eine eigene Adresse).
5. Speichern und bauen lassen. **Ab jetzt bis Schritt 2 ist das Spiel unter
   `meg-rope.pages.dev` für alle offen** (nur das Spiel; die Bestenliste gibt
   es noch nicht und sie wäre ohnehin zu). Darum gleich weiter.

### 2. Zugang nur für Freunde (Access)

1. Pages-Projekt → Einstellungen → Allgemein → «Zugriffsrichtlinie
   aktivieren». Das schützt zuerst nur die Vorschau-Adressen.
2. Zero Trust → Access → Anwendungen → die neue Anwendung öffnen und die
   Adresse so ändern, dass sie auch die Hauptadresse deckt: aus
   `*.meg-rope.pages.dev` wird `meg-rope.pages.dev` plus ein zweiter Eintrag
   `*.meg-rope.pages.dev`.
3. Richtlinie: Aktion «Zulassen», Regel «E-Mails» mit deiner Adresse und
   denen der Freunde. Anmeldung: Einmal-Code per E-Mail. Sitzungsdauer z. B.
   1 Monat, damit niemand ständig Codes abtippen muss.
4. Eigene Adresse (z. B. `megrope.‹deine-domain›`): im Pages-Projekt unter
   «Benutzerdefinierte Domains» hinzufügen **und** in der Access-Anwendung
   als weitere Adresse eintragen.
5. **Prüfen** in einem privaten Fenster (nicht angemeldet):
   - [ ] `https://meg-rope.pages.dev` → Anmeldeseite von Cloudflare, nicht das Spiel
   - [ ] Adresse des letzten Laufs (Pages-Projekt → Deployments, Form
         `https://‹kennung›.meg-rope.pages.dev`) → Anmeldeseite
   - [ ] eigene Adresse, falls eingerichtet → Anmeldeseite

   Kommt irgendwo das Spiel ohne Anmeldung, ist diese Adresse offen: zurück
   zu Punkt 2.

### 3. Bestenliste: Datenbank und Zugangsprüfung

1. Dashboard → Storage & Databases → D1 → Datenbank erstellen, Name
   `meg-rope`, Standort Westeuropa.
2. Pages-Projekt → Einstellungen → Bindings → hinzufügen → D1-Datenbank,
   Variablenname **`DB`** (genau so), Datenbank `meg-rope`, für «Production».
3. Pages-Projekt → Einstellungen → Variablen (Production), beide als Text:
   - **`ACCESS_TEAM`**: dein Team-Name von Zero Trust (der Teil vor
     `.cloudflareaccess.com`; Zero Trust → Einstellungen → Team-Domain).
   - **`ACCESS_AUD`**: «Application Audience (AUD) Tag» der Access-Anwendung
     aus Schritt 2 (Zero Trust → Access → Anwendungen → Anwendung → Übersicht).

   Beides sind keine Geheimnisse, gehören aber nicht ins Repo. Ohne sie
   antwortet die Bestenliste mit «Kein Zugang» (403) – auch für Angemeldete.
4. Neu bauen lassen (Deployments → letzter Lauf → erneut ausführen), damit
   Bindung und Variablen greifen.
5. **Prüfen**, angemeldet:
   - [ ] Spiel lädt, im Startmenü steht «Online-Bestenliste» mit Liste oder
         «Noch keine Ergebnisse» (nicht «gerade nicht erreichbar»)
   - [ ] ein Einzelspiel mit Punkten spielen → in der Wertung «Online: Platz …»
   - [ ] auf einem zweiten Gerät erscheint der Eintrag

   Und im privaten Fenster: `https://meg-rope.pages.dev/api/scores?setting=normal`
   → Anmeldeseite, keine Liste.

### 4. `live` gegen Claude gesperrt (erledigt 12.11.2026)

- Die Zeile **Live** in `AGENTS.md` nennt den Live-Zweig `live`. Der Hook
  (`~/.claude/hooks/sitzungen.py`, aufgerufen von `live-schutz.sh`) liest sie
  und weist jeden `git push` ab, der `live` träfe: `main:live`, `live`,
  `HEAD:refs/heads/live`, erzwungen, Löschen, `--all`, auch ohne Angabe auf dem
  Zweig `live`. In jedem Checkout und Worktree dieses Repos, auch wenn die
  `AGENTS.md` dort alt ist (die Wahrheit auf dem Remote zählt mit).
- **Grenze:** Der Hook erkennt nur direkte `git push`-Befehle. Ein Push über
  `bash -c`, eine Variable oder ein Skript wird nicht erkannt, und der Hook
  bremst nur Claude. Ein Zweigschutz bei GitHub (Einstellungen → Branches →
  Regel für `live`: nur per Pull Request) würde für alle gelten; ob das Abo ihn
  für ein privates Repo anbietet, ist nicht geprüft.
- Wird Cloudflare eingerichtet, kommt in `AGENTS.md` bei **Live** noch die
  Adresse dazu; den Namen des Zweigs nicht ändern, sonst greift der Hook nicht
  mehr.

## Im Alltag

- **Neue Version live schalten (nur Pascal):** GitHub → «Pull requests» →
  neu: von `main` nach `live` → mergen. Cloudflare baut danach selbst. Stand
  sehen: Pages-Projekt → Deployments.
- **Freund dazu oder weg:** Zero Trust → Access → Anwendung → Richtlinie →
  E-Mail ergänzen oder löschen.
- **Eintrag löschen** (Tippfehler, Quatschwert): D1 → `meg-rope` → Konsole:
  `DELETE FROM scores WHERE name_key = 'name klein geschrieben' AND setting = 'normal';`
- **Zurück auf eine alte Version:** Pages-Projekt → Deployments → älterer
  Lauf → «Rollback».

## Schema ändern und sichern

- **Sichern** vor jedem Löschen oder Umbau: D1 → `meg-rope` → Konsole →
  `SELECT * FROM scores;` und das Ergebnis als Datei ablegen (oder der Export
  im Dashboard). `DELETE FROM scores;` leert die Liste und ist nicht rückholbar.
- **Schema ändern:** Die Funktion legt die Tabelle nur an, wenn es sie nicht
  gibt (`SCHEMA` in `functions/api/scores.ts`); eine bestehende Tabelle ändert
  sie nie. Kommt eine Spalte dazu: zuerst sichern, dann in der D1-Konsole
  `ALTER TABLE scores ADD COLUMN …` ausführen, **erst danach** die neue
  Version live schalten. Nur ergänzen, nichts umbenennen oder löschen
  (Leitplanke 7).

## Was nicht hierher gehört

- Die private Testseite (claude.ai-Link) bleibt ein Werkzeug zum Ansehen
  während des Bauens; sie hat keine Online-Bestenliste.
- Bestenlisten auf dem Gerät (`localStorage`) bleiben, wo sie sind. Sie
  werden nicht in die Online-Liste hochgeladen.
