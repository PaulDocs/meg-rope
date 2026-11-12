// Online-Bestenliste (B12): Cloudflare Pages Function hinter /api/scores.
//   GET  /api/scores?setting=normal  → die besten Plätze einer Einstellung
//   POST /api/scores  {name, setting, score, distance, bestStrike}  → meldet ein
//        Ergebnis; gespeichert wird je Spieler und Einstellung nur die Bestleistung
// Speicher: D1-Datenbank, gebunden als `DB` (docs/betrieb.md). Keine offene
// Route: Jede Anfrage braucht ein gültiges Token von Cloudflare Access
// (server/access.ts); ohne Einrichtung (ACCESS_TEAM, ACCESS_AUD) antwortet sie 403.

import { hasAccess, type AccessEnv } from '../../server/access';
import { BOARD, isSetting, nameKey, parseSubmission, type Board, type Entry } from '../../src/board';

/**
 * Was diese Funktion von D1 braucht (die echte Schnittstelle kann mehr). Von
 * Hand nach der D1-Doku geschrieben (prepare/bind/all/run/batch), aus dem
 * Gedächtnis am 12.11.2026 – nicht gegen installierte Typen geprüft und bei
 * Cloudflare noch nicht gelaufen (Karte B12, «Nicht geprüft»).
 */
export interface Statement {
  bind(...values: unknown[]): Statement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch<T = unknown>(statements: Statement[]): Promise<{ results: T[] }[]>;
}
export interface Env extends AccessEnv {
  DB?: Database;
}
interface Context {
  request: Request;
  env: Env;
}

/**
 * Eine Zeile je Spieler und Einstellung. `name_key`: Name klein geschrieben, damit «Anna» und «anna» eine sind.
 * Die Tabelle entsteht beim ersten Aufruf. Wer das Schema später ändert, muss die
 * bestehende Tabelle von Hand nachziehen: docs/betrieb.md, «Schema ändern und sichern».
 */
export const SCHEMA = `CREATE TABLE IF NOT EXISTS scores (
  setting TEXT NOT NULL,
  name_key TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  distance INTEGER NOT NULL,
  best_strike INTEGER NOT NULL,
  at TEXT NOT NULL,
  PRIMARY KEY (setting, name_key)
)`;

// Rangregel: mehr Punkte, dann mehr Meter, dann wer es früher geschafft hat (wie byRank() in src/game.ts,
// plus Zeitpunkt). Sie steht in TOP, UPSERT und AHEAD – an allen drei Stellen gleich halten.
const TOP = `SELECT name, score, distance, best_strike AS bestStrike, at AS date FROM scores
  WHERE setting = ? ORDER BY score DESC, distance DESC, at ASC LIMIT ?`;
const COUNT = `SELECT COUNT(*) AS players, COALESCE(SUM(name_key = ?), 0) AS mine FROM scores WHERE setting = ?`;
const UPSERT = `INSERT INTO scores (setting, name_key, name, score, distance, best_strike, at) VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (setting, name_key) DO UPDATE SET
    name = excluded.name, score = excluded.score, distance = excluded.distance, best_strike = excluded.best_strike, at = excluded.at
  WHERE excluded.score > scores.score OR (excluded.score = scores.score AND excluded.distance > scores.distance)`;
const AHEAD = `SELECT COUNT(*) AS ahead FROM scores AS s JOIN scores AS me ON me.setting = s.setting AND me.name_key = ?
  WHERE s.setting = ? AND (s.score > me.score OR (s.score = me.score AND s.distance > me.distance)
    OR (s.score = me.score AND s.distance = me.distance AND s.at < me.at))`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    // public/_headers gilt nur für Dateien, nicht für Antworten von Funktionen: darum hier nochmals
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
const fail = (status: number, error: string): Response => json({ error }, status);

/** Liste einer Einstellung lesen; mit `key` dazu den Rang dieses Spielers. */
async function board(db: Database, setting: string, key: string | null): Promise<Board> {
  const statements = [db.prepare(TOP).bind(setting, BOARD.top), db.prepare(COUNT).bind(key ?? '', setting)];
  if (key !== null) statements.push(db.prepare(AHEAD).bind(key, setting));
  const [top, count, ahead] = await db.batch<Record<string, unknown>>(statements);
  const c = count!.results[0] ?? {};
  const known = key !== null && Number(c.mine) > 0;
  return {
    best: top!.results as unknown as Entry[],
    players: Number(c.players ?? 0),
    rank: known ? Number(ahead!.results[0]?.ahead ?? 0) + 1 : null,
  };
}

/** Inhalt lesen, aber höchstens `max` Bytes; null, wenn es mehr ist. */
async function readText(request: Request, max: number): Promise<string | null> {
  if (Number(request.headers.get('content-length') ?? 0) > max) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const all = new Uint8Array(max);
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size + value.byteLength > max) {
      await reader.cancel();
      return null;
    }
    all.set(value, size);
    size += value.byteLength;
  }
  return new TextDecoder().decode(all.subarray(0, size));
}

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  if (!(await hasAccess(request, env))) return fail(403, 'Kein Zugang');
  if (!env.DB) return fail(503, 'Speicher nicht verbunden');
  const setting = new URL(request.url).searchParams.get('setting');
  if (!isSetting(setting)) return fail(400, 'Einstellung unbekannt');
  await env.DB.prepare(SCHEMA).run();
  return json(await board(env.DB, setting, null));
}

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  if (!(await hasAccess(request, env))) return fail(403, 'Kein Zugang');
  if (!env.DB) return fail(503, 'Speicher nicht verbunden');
  // Nur JSON: Ein Formular einer fremden Seite kann diesen Inhaltstyp nicht schicken
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return fail(415, 'Nur JSON');
  const text = await readText(request, BOARD.maxBody);
  if (text === null) return fail(413, 'Zu gross');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail(400, 'Kein JSON');
  }
  const x = parseSubmission(raw);
  if (!x) return fail(400, 'Meldung ungültig');
  const db = env.DB;
  const key = nameKey(x.name);
  await db.prepare(SCHEMA).run();
  const { results } = await db.prepare(COUNT).bind(key, x.setting).all<{ players: number; mine: number }>();
  const count = results[0];
  if (count && Number(count.mine) === 0 && Number(count.players) >= BOARD.maxPlayers) return fail(409, 'Liste voll');
  await db.prepare(UPSERT).bind(x.setting, key, x.name, x.score, x.distance, x.bestStrike, new Date().toISOString()).run();
  return json(await board(db, x.setting, key));
}
