---
objekt: chronik
bereich: meg-rope
erstellt: 2026-11-12
stand: 2026-11-12
datum: 2026-11-12
---
# 12.11.2026 – Push auf den Live-Zweig gesperrt (B12)

- Anlass: Der Sicherheitsleser fand, dass «live schaltet nur Pascal» nur eine
  Abmachung war. Pascal: «ok hook setzen».
- Gebaut in `~/.claude/hooks/sitzungen.py` (ausserhalb dieses Repos): Nennt die
  Zeile «Live» in `AGENTS.md` einen Live-Zweig, weist der Hook jeden
  `git push` auf diesen Zweig ab. Wirkt nur in Repos mit dieser Zeile, andere
  Projekte sind nicht betroffen. Neue Fälle in
  `20-Infra/pruefung/test-sitzungen.sh`.
- In diesem Repo trägt die Zeile «Live» in `AGENTS.md` jetzt `live`.
- Grenze: erkannt werden nur direkte `git push`-Befehle; Pushes über
  `bash -c`, Variablen oder Skripte nicht. Der Hook bremst nur Claude.
  Zweigschutz bei GitHub wäre die Sperre für alle (nicht geprüft).
- Den Zweig `live` gibt es noch nicht; Cloudflare ist nicht eingerichtet.
