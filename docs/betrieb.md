---
objekt: doku
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
---
# Betrieb – Meg Rope auf Cloudflare

**Stand:** 12.11.2026 · von Pascal bei Cloudflare eingerichtet, die Prüflisten
unten sind **noch nicht alle abgehakt**. Die Schritte macht Pascal im
Cloudflare-Dashboard; Claude hat dort keinen Zugang. Grundlage:
`docs/entscheide/2026-11-12-hosting-cloudflare.md`. Was gegen die
Cloudflare-Doku geprüft ist und was nicht: Abschnitt «Geprüft» am Ende.

**Menünamen:** Pascals Dashboard ist auf Deutsch. Namen in «» stammen aus
seinen Bildschirmfotos (12.11.2026); Namen in Englisch aus der Cloudflare-Doku.
Cloudflare benennt Menüs oft um: Passt ein Name nicht, nimm den ähnlichsten.

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
   «Create branch: live from main». **Zuerst das:** Die Auswahl «Produktions-Branch»
   bei Cloudflare zeigt nur Zweige, die es schon gibt (am 12.11. standen nur
   `main` und ein alter Arbeitszweig drin; `live` fehlte).
2. Cloudflare-Dashboard → Workers & Pages → Erstellen → Pages → mit Git
   verbinden. Bei der Abfrage von GitHub **«Only select repositories»** wählen
   und nur `meg-rope` freigeben (sonst liest Cloudflare alle deine privaten
   Repos).
3. Auf der Seite «Builds und Bereitstellungen einrichten»:
   - **Projektname** `meg-rope` (ergibt `meg-rope.pages.dev`)
   - **Produktions-Branch** **`live`** (nicht `main`, das ist der Vorgabewert)
   - **Framework-Voreinstellung** «Keine»
   - **Build-Befehl** `npm run build:cloud`
   - **Build-Ausgabeverzeichnis** `dist`
   - «Stammverzeichnis (erweitert)» und «Umgebungsvariablen (erweitert)»
     leer lassen. Die Node-Version (22) liest Cloudflare aus `.node-version`.
4. **Vorschau-Bauten ausschalten.** Pages baut sonst jeden anderen Zweig als
   «Preview» mit eigener Adresse (`‹kennung›.meg-rope.pages.dev`); am 12.11.
   standen die Läufe von `main` so da. Das ist eine zweite Adresse mit dem
   Spiel, die Access gesondert schützen müsste. Einstellungen → «Builds &
   deployments» (englisch bei Cloudflare) → Vorschau-Branches → **«None»**.
   Der deutsche Name der Einstellung ist nicht belegt.
5. «Speichern und bereitstellen» klicken und bauen lassen. In der
   Bauausgabe soll eine Zeile zu `functions` stehen (Cloudflare erkennt die
   Bestenlisten-Funktion). **Ab jetzt bis Schritt 2 ist das Spiel unter
   `meg-rope.pages.dev` für alle offen** (nur das Spiel; die Bestenliste gibt
   es noch nicht und sie wäre ohnehin zu). Darum gleich weiter.

Hinweis: Die Cloudflare-Doku empfiehlt für neue Projekte inzwischen Workers
(«Start new projects with Workers»). Pages mit Git geht weiter und lief am
12.11. so; falls Cloudflare Pages später abkündigt, ist ein Umzug auf
Workers ein eigener Auftrag.

### 2. Zugang nur für Freunde (Access)

**Wichtig:** «Zugriffsrichtlinie aktivieren» im Pages-Projekt (Einstellungen →
Allgemein, im Dashboard als **«Vorschau-Zugriff» → «Vorschauen beschränken»**)
schützt **nur die Vorschau-Adressen**. Das Dashboard sagt es selbst:
«Produktions-pages.dev und benutzerdefinierte Domains werden separat in Zero
Trust verwaltet.» Der Knopf legt zudem eine **eigene** Access-Anwendung mit
eigenem AUD-Tag an. Die Funktion prüft aber nur **einen** AUD-Tag
(`ACCESS_AUD`). Darum legst du die Hauptadresse selbst an und drückst den
Knopf nicht (Vorschau-Bauten sind ohnehin aus, Schritt 1.4).

1. Zero Trust → «Access controls» → «Applications» → «Create new
   application» → **«Self-hosted and private»**.
2. Bereich «Ziele» → «Öffentliche Hostnamen», zwei Einträge:
   - Subdomain **leer**, Domäne `meg-rope.pages.dev` (die Domäne steht im
     Dropdown zur Auswahl)
   - Subdomain **`*`**, Domäne `meg-rope.pages.dev` (deckt `‹kennung›.meg-rope.pages.dev`)
3. «Details»: Name `meg-rope`, **Sitzungsdauer** `1 month`, damit niemand
   ständig Codes abtippen muss. «Authentifizierung»: «Alle verfügbaren
   Identitätsanbieter akzeptieren» an (der Einmal-Code per E-Mail ist darin,
   wenn er im Konto aktiv ist).
4. «Access-Richtlinien» → «Neue Richtlinie erstellen»: Aktion «Zulassen»,
   bei den Regeln der Selektor **«E-Mails»** mit deiner Adresse und denen der
   Freunde. **Ein gemeinsames Passwort gibt es nicht:** Das Dropdown bietet
   Identität (u. a. «E-Mails», «E-Mails mit der Endung»), Service Auth
   (Zertifikat, Service Token) und weitere; ein Passwort-Selektor ist nicht
   darunter. «E-Mails mit der Endung» (z. B. `@gmail.com`) wäre für alle
   offen, die so eine Adresse haben: nicht nehmen.
5. Eigene Adresse (z. B. `megrope.‹deine-domain›`): im Pages-Projekt unter
   «Benutzerdefinierte Domains» hinzufügen **und** in Zero Trust als weiteren
   öffentlichen Hostnamen **derselben Anwendung** eintragen (bis 50 Ziele je
   Anwendung). Eine zweite Anwendung hätte einen zweiten AUD-Tag, und die
   Bestenliste gäbe dort «Kein Zugang». Die Doku nennt für eigene Domains
   eine neue Anwendung; ob sich die Domain auch in die bestehende eintragen
   lässt, ist nicht geprüft. Ohne Access-Regel für die eigene Domain «wird die
   Anmeldeseite zwar angezeigt, funktioniert aber nicht» (Doku).
6. **Prüfen** in einem privaten Fenster (nicht angemeldet):
   - [ ] `https://meg-rope.pages.dev` → Anmeldeseite von Cloudflare, nicht das Spiel
   - [ ] Adresse des letzten Laufs (Pages-Projekt → Bereitstellungen, Form
         `https://‹kennung›.meg-rope.pages.dev`) → Anmeldeseite
   - [ ] eigene Adresse, falls eingerichtet → Anmeldeseite

   Kommt irgendwo das Spiel ohne Anmeldung, ist diese Adresse offen: zurück
   zu Punkt 2.

### 3. Bestenliste: Datenbank und Zugangsprüfung

1. Dashboard → Storage & Databases → D1 → Datenbank erstellen, Name
   `meg-rope`, Standort Westeuropa.
2. Pages-Projekt → Einstellungen → Bindings → Hinzufügen → «D1 database
   bindings»: Variablenname **`DB`** (genau so), Datenbank `meg-rope`, für
   «Production».
3. Pages-Projekt → Einstellungen → «Variablen und Geheimnisse»
   (englisch «Variables and Secrets»), für Production, beide als Text:
   - **`ACCESS_TEAM`**: **nur der Team-Name**, z. B. `meinteam` – der Teil vor
     `.cloudflareaccess.com`. **Nicht** die Schlüssel-Adresse
     `https://meinteam.cloudflareaccess.com/cdn-cgi/access/certs` einsetzen:
     Mit Pfad ist der Wert ungültig, und **jede Anfrage bekommt 403**
     («Kein Zugang»), auch von Angemeldeten. (Das ist am 12.11. beim
     Einrichten passiert.) Erlaubt sind der Name oder
     `https://meinteam.cloudflareaccess.com` ohne Pfad. Die Schlüssel-Adresse
     taugt nur zum Ansehen im Browser: Sie zeigt eine Liste mit `keys`, wenn
     der Team-Name stimmt. Den Team-Namen findest du laut Doku in Zero Trust
     unter «Settings» (je nach Dashboard-Version «Team name and domain»).
   - **`ACCESS_AUD`**: «Application Audience (AUD) Tag» der Access-Anwendung
     aus Schritt 2. Laut Doku: Zero Trust → Access controls → Applications →
     Anwendung bearbeiten → «Additional settings». Im neuen Dashboard kann der
     Ort anders heissen; den deutschen Namen gibt es hier nicht belegt.

   Beides sind keine Geheimnisse, gehören aber nicht ins Repo. Ohne sie
   antwortet die Bestenliste mit «Kein Zugang» (403) – auch für Angemeldete.
4. **Neu bauen lassen:** Bindung und Variablen greifen erst im nächsten Lauf.
   Pages-Projekt → Bereitstellungen → den Production-Lauf → Menü mit den drei
   Punkten → «Bereitstellung wiederholen» (englisch «Retry deployment»).
5. **Eingrenzen**, wenn etwas nicht geht: im Browser (angemeldet)
   `https://meg-rope.pages.dev/api/scores?setting=normal` öffnen.

   | Antwort | Heisst | Nachsehen |
   |---|---|---|
   | `{"error":"Kein Zugang"}` | Zugangsprüfung lehnt ab | `ACCESS_TEAM` nur Name? `ACCESS_AUD` der richtigen Anwendung? nach dem Eintragen neu gebaut? |
   | `{"error":"Speicher nicht verbunden"}` | Zugang ok, Bindung fehlt | Bindung `DB` für Production, neu gebaut? |
   | JSON mit `best` | läuft | – |
   | Anmeldeseite von Cloudflare | Access greift, du bist nicht angemeldet | normal im privaten Fenster |

6. **Prüfen**, angemeldet:
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
  sehen: Pages-Projekt → Bereitstellungen.
- **Freund dazu oder weg:** Zero Trust → Access controls → Applications →
  Anwendung `meg-rope` → Access-Richtlinien → E-Mail ergänzen oder löschen.
  Wer schon angemeldet ist, bleibt bis zum Ende der Sitzungsdauer (1 Monat)
  drin; sofort rauswerfen geht in Zero Trust über die aktiven Sitzungen
  (Menüname nicht geprüft).
- **Eintrag löschen** (Tippfehler, Quatschwert) in der D1-Konsole:
  `DELETE FROM scores WHERE name_key = 'name klein geschrieben' AND setting = 'normal';`
  Die Konsole im Dashboard ist **nicht** in der Cloudflare-Doku belegt; belegt
  ist der Weg mit `wrangler d1 execute meg-rope --remote --command="…"` am
  eigenen Rechner. Gibt es im D1-Bereich keine Konsole: Claude schreibt den
  Befehl, du führst ihn aus.
- **Zurück auf eine alte Version:** Pages-Projekt → Bereitstellungen → älterer
  Production-Lauf → Menü mit den drei Punkten → «Rollback to this
  deployment» (englisch, Doku). Nur erfolgreich gebaute Production-Läufe
  gehen, keine Vorschau-Läufe.

## Schema ändern und sichern

- **Sichern** vor jedem Löschen oder Umbau: `wrangler d1 export meg-rope
  --remote --output=‹datei›.sql` (belegt, Cloudflare-Doku) oder in der
  D1-Konsole `SELECT * FROM scores;` und das Ergebnis als Datei ablegen (Konsole
  nicht belegt, siehe oben). `DELETE FROM scores;` leert die Liste und ist
  nicht rückholbar.
- **Schema ändern:** Die Funktion legt die Tabelle nur an, wenn es sie nicht
  gibt (`SCHEMA` in `functions/api/scores.ts`); eine bestehende Tabelle ändert
  sie nie. Kommt eine Spalte dazu: zuerst sichern, dann `ALTER TABLE scores ADD
  COLUMN …` ausführen, **erst danach** die neue Version live schalten. Nur
  ergänzen, nichts umbenennen oder löschen (Leitplanke 7).

## Geprüft (gegen die Cloudflare-Doku, 12.11.2026)

Quellen: `developers.cloudflare.com`, Seiten in Klammern.

**Stimmt:**

- Token im Kopf `Cf-Access-Jwt-Assertion`; Schlüssel unter
  `https://‹team›.cloudflareaccess.com/cdn-cgi/access/certs`, Auswahl über
  `kid`; `iss` ist `https://‹team›.cloudflareaccess.com`; Algorithmus RS256;
  `aud` benennt die Anwendung (Cloudflare One → Access → «Validate JWTs»).
  `server/access.ts` macht das so.
- Die Doku sagt nicht, ob `aud` im Token ein Text oder eine Liste ist;
  `server/access.ts` nimmt beides.
- Der Lauf bei Cloudflare bestätigt die Prüfung im Ablauf: Nach dem
  Richtigstellen von `ACCESS_TEAM` ging die Antwort von «Kein Zugang» auf
  «Speicher nicht verbunden». Das heisst: Ein echtes Token von Access hat
  Aussteller, Anwendung, Ablauf und Unterschrift gegen die echten Schlüssel
  bestanden (Meldung der Hauptsitzung, 12.11.2026).
- D1: `prepare(sql)` gibt ein Statement; `bind(…)` gibt ein Statement;
  `run()` und `all()` sind laut Doku gleichwertig und liefern
  `{success, meta, results}`; `batch([…])` liefert je Statement ein solches
  Ergebnis in der Reihenfolge der Statements (D1 → Worker API,
  «D1 Database» und «Prepared statements»). Die Schnittstelle in
  `functions/api/scores.ts` passt dazu.
- Pages Functions: Ordner `functions/` im Projektstamm; Handlernamen
  `onRequestGet` und `onRequestPost` gibt es (Pages → Functions → API
  reference); Binding und Variablen kommen in `context.env`.
- Dashboard-Wege: D1-Binding («Settings → Bindings → Add → D1 database
  bindings»), Variablen («Settings → Variables and Secrets»), neu bauen
  nach Binding, Node-Version aus `.node-version`, Rollback («Rollback to this
  deployment»), Vorschau-Branches auf «None» (Pages → Konfiguration).
- «Zugriffsrichtlinie aktivieren» schützt nur die Vorschau-Adressen
  (Pages → Vorschau-Bereitstellungen; Dashboard-Text im Bildschirmfoto).
- Die Funktion bündelt sich mit den Importen aus `src/` und `server/`: Das
  zeigt der Lauf bei Cloudflare, nicht die Doku. Am 12.11. antwortete
  `/api/scores` mit den Meldungen der Funktion («Kein Zugang», «Speicher nicht
  verbunden», danach läuft sie).

**Nicht belegt:**

- Dass die Anmeldeseite wirklich vor `meg-rope.pages.dev` und vor jeder
  Lauf-Adresse steht (Prüfliste Schritt 2.6, Pascal).
- Der deutsche Name der Vorschau-Einstellung; der Ort des AUD-Tags im neuen
  Dashboard; der Ort des Team-Namens (Doku nennt «Settings», je nach Version
  anders).
- Die D1-Konsole und ein Export im Dashboard; Sitzungen sofort beenden; eigene
  Domain in derselben Access-Anwendung; Zweigschutz bei GitHub.
- Die Meldung `POST /api/scores` bei Cloudflare (Eintrag aus einem Spiel):
  Prüfliste Schritt 3.6.

## Was nicht hierher gehört

- Die private Testseite (claude.ai-Link) bleibt ein Werkzeug zum Ansehen
  während des Bauens; sie hat keine Online-Bestenliste.
- Bestenlisten auf dem Gerät (`localStorage`) bleiben, wo sie sind. Sie
  werden nicht in die Online-Liste hochgeladen.
