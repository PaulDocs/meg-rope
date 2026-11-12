# AGENTS.md — Anweisungen für KI-Werkzeuge (Meg Rope)

Diese Datei hält die **Projektregeln selbst** – werkzeugneutral, damit jedes
KI-Werkzeug dieselbe Quelle liest. `CLAUDE.md` importiert sie und ergänzt nur
Claude-Eigenes. Gilt zusätzlich zu `/home/node/work/AGENTS.md` (BAU FREI,
Löschen, Sprache, Schreiben); wo diese Datei genauer ist, geht sie vor.
Angelegt am 08.11.2026 aus `20-Infra/projekt-vorlage/` nach dem Katalog
(`100-Cowork/q-lab/entscheide/2026-08-14-dokumentenkatalog-arbeitsformat.md`
§8.2, ergänzt durch `100-Cowork/q-lab/entscheide/2026-10-31-projektvorlage.md`).

## Projekt in einem Satz

Ein Browserspiel fürs iPad, in dem man mit einem Strichmännchen von Gebäude zu Gebäude schwingt, mit Challenge-Modus für mindestens zwei Spieler im lokalen Netzwerk

## Leseordnung bei Sitzungsstart (Pflicht, in dieser Reihenfolge)

1. `docs/STAND.md` — wo stehen wir, nächster Zug
2. `docs/glossar.md` — die Fachbegriffe dieses Projekts und wie sie im Code heissen
3. `docs/ki-leitplanken.md` — die Fehlermuster, die hier teuer sind
4. `docs/arbeit/eingang.md` — was offen ist

## Die harten Regeln (nicht verhandelbar)

- _Noch keine. Hier steht, was in diesem Projekt nie passieren darf, je mit
  Grund – zum Beispiel Daten, die nie ins Repo dürfen, oder ein System, das
  live ist. Wird beim Schärfen des Projekts gefüllt._

## Arbeitsformat

- Karten in `docs/arbeit/` (`B‹n›-‹slug›.md`), roher Eingang in
  `docs/arbeit/eingang.md`. Adressen werden nie wiederverwendet.
- **Gebaut wird erst nach «BAU FREI»** von Pascal. Erfassen und Triagieren ist
  ohne Go erlaubt. Höfliche Fragen sind kein Go.
- Nur Pascal nimmt ab (abnahme → erledigt).
- Immer nur ein kleiner Schritt aufs Mal, Erfolgs-Kriterien vorab. Nach jedem
  Schritt: sag Pascal genau, wie er testet. Abnahmen klein halten, höchstens
  7 Punkte.
- Neue Fachbegriffe kommen im selben Zug in `docs/glossar.md`.

## Sitzungen

<!-- Fester Abschnitt (Konzept 20-Infra/konzept-sitzungen.md, 05.11.2026).
     Gelesen von /q-auftrag, /q-pr-nummer, /q-pr-fertig, /q-release-dev,
     /q-release und den Hooks schreibgrenze.sh und live-schutz.sh
     (~/.claude/hooks/sitzungen.py). Schlüssel nicht umbenennen.
     Pfade relativ zu /home/node/work. «Wo» in der Tabelle: Pfad mit / am Ende =
     Namen darunter, Pfad mit * = Dateinamen, sonst Inhalt der Datei. -->
- **Wahrheit:** GitHub `PaulDocs/meg-rope`, Zweig `main`
- **Gesperrt:** _noch offen_ (nach dem ersten Commit hier den Hauptordner eintragen, in Backticks: 10-Projekte/meg-rope; ab dann Arbeit nur in eigenen Worktrees)
- **Worktrees:** aus dem Hauptordner, Zweig `feat/…`, `fix/…`, `doku/…`
- **Nummern:**
  | Art | Muster | Wo |
  |---|---|---|
  | B | `B(\d+)` | `docs/arbeit/eingang.md`, `docs/arbeit/B*.md` |
- **Im eigenen PR nachführen:** `CHANGELOG.md` (eigener Eintrag), `docs/chronik/JJMMTT-slug.md`,
  `docs/arbeit/eingang.md`. Kopf von `docs/STAND.md` nur die Tages-Abschluss-Sitzung.
- **Merge-Weg:** _noch offen_ (Standard seit 06.11.2026: Claude mergt selbst, sobald `/q-pr-pruefen` grün,
  `/q-pr-gegenlesen` ohne `issue (blocking)` und die CI komplett grün ist; reine Doku-PRs ohne CI nach dem
  Nachführen; bleibt ein Blocker: melden, nicht mergen; kein Force-Push)
- **GitHub-API:** keine; Push per Deploy key (SSH `github-meg-rope`, nur dieses Repo)
- **Dev nachziehen:** _noch offen_ (kein Dev-Checkout)
- **Live:** Cloudflare Pages `meg-rope`, gebaut aus dem Live-Zweig `live` (vorbereitet, noch nicht eingerichtet:
  `docs/betrieb.md`). `main` ist nur der Arbeitsstand. Den Zweig `live` schiebt nur Pascal nach (Pull Request von
  `main` nach `live` auf GitHub); der Hook `live-schutz.sh` weist jeden `git push` auf `live` ab.

## Definition of Done

- `pruefen.sh` ist grün, mit gezeigter Ausgabe (`/q-pr-pruefen`). Der Hook
  `~/.claude/hooks/pruefstand.py` lässt Commit und Push sonst nicht durch.
- `/q-pr-gegenlesen` ist gelaufen und kein `issue (blocking)` ist offen.
- `docs/STAND.md` und eine Chronik-Datei des Tages sind nachgeführt.
- Die Karte steht auf `abnahme`, mit Testanleitung für Pascal.
- Ungetestetes heisst «ungetestet».

Reihenfolge: `/q-pr-pruefen` → `/q-pr-gegenlesen` → Commit → `/q-sitzung-meldung`;
am Ende eines Auftrags alles in einem: `/q-pr-fertig`.

## Für wen gebaut wird

Für: privat. Pascal hat keine Coding-Skills: erkläre in einfacher Sprache,
was du tust und warum.

## Betrieb

- Stack und Port nach `100-Cowork/q-lab/entscheide/2026-08-31-betriebsmodell.md`,
  Ports in `100-Cowork/q-lab/entscheide/docker-ports.md` reservieren.
- KI hat keinen Docker-Zugriff: Compose schreibt die KI als Datei nach
  `20-Infra/`, einspielen tut Pascal (Dockge).
- Ein Push, der live geht, ist immer Pascals Ja
  (`100-Cowork/q-lab/entscheide/2026-10-30-commit-push-bei-gruen.md`).

## Dokumente (Katalog §8.2)

`README.md` (Einstieg und Steckbrief) · `docs/STAND.md` (nur Zustand) ·
`docs/chronik/` (`JJMMTT-slug.md`, je Arbeitstag) · `docs/entscheide/`
(`JJJJ-MM-TT-thema.md`, ein Entscheid je Datei, nie ändern – nur ergänzen
oder ersetzen) · `docs/arbeit/` (Karten) · `docs/glossar.md` ·
`docs/ki-leitplanken.md` · `CHANGELOG.md`.

Bei Bedarf, erst wenn es sie braucht: `DESIGN.md`, `docs/architektur.md`,
`docs/betrieb.md`, `docs/programmier-regeln.md`, `docs/code-stil.md`,
`docs/lehren.md`, `docs/wiki/`, `docs/handbuch/`, `docs/abnahmen/`.

Nach jedem Arbeitspaket nachführen – Sitzungen teilen kein Gedächtnis, die
Dokumente sind die Brücke. Was nur im Chat oder im Claude-Gedächtnis steht,
gilt nicht.
