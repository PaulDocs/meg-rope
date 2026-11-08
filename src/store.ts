// Gespeicherte Ergebnisse und Spielernamen (B-neu-1). Der Browser des Geräts
// hält sie (localStorage); fehlt der Speicher (privates Fenster), gilt alles
// nur bis zum Neuladen. Gelesenes wird geprüft: Kaputtes fällt weg.

import { bestAttempt, turnScore, type Mode, type Round } from './game';

/** Ein gewertetes Ergebnis eines Spielers in einer Runde. */
export interface Result {
  round: string; // Runden-Kennung (Challenge: alle Spieler derselben Runde)
  mode: Mode;
  name: string;
  setting: string;
  score: number;
  distance: number; // m im besten Versuch
  style: number; // Style-Punkte im besten Versuch
  attempts: number;
  bestStrike: number;
  date: string; // ISO-Zeit
}

/** Was der Speicher braucht (localStorage oder ein Ersatz in Tests). */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const KEYS = { results: 'meg-rope.results', names: 'meg-rope.names' };
export const MAX_RESULTS = 300; // ältere fallen weg

function read(kv: KeyValue | null, key: string): unknown {
  if (!kv) return null;
  try {
    const raw = kv.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(kv: KeyValue | null, key: string, value: unknown): void {
  if (!kv) return;
  try {
    kv.setItem(key, JSON.stringify(value));
  } catch {
    // voll oder gesperrt: dann eben nur bis zum Neuladen
  }
}

const str = (x: unknown): x is string => typeof x === 'string';
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function isResult(x: unknown): x is Result {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    str(r.round) && (r.mode === 'single' || r.mode === 'challenge') && str(r.name) && str(r.setting) &&
    num(r.score) && num(r.distance) && num(r.style) && num(r.attempts) && num(r.bestStrike) && str(r.date)
  );
}

export function loadResults(kv: KeyValue | null): Result[] {
  const raw = read(kv, KEYS.results);
  return Array.isArray(raw) ? raw.filter(isResult) : [];
}

/** Die gewerteten Ergebnisse einer fertigen Runde dazuschreiben (neueste zuletzt). */
export function saveRound(kv: KeyValue | null, r: Round, now: Date): Result[] {
  const date = now.toISOString();
  const added: Result[] = r.turns
    .filter((t) => t.attempts.length > 0)
    .map((t) => {
      const best = bestAttempt(t)!;
      return {
        round: r.id, mode: r.mode, name: t.name, setting: r.setting, score: turnScore(t),
        distance: best.distance, style: best.style, attempts: t.attempts.length, bestStrike: best.bestStrike, date,
      };
    });
  const all = [...loadResults(kv), ...added].slice(-MAX_RESULTS);
  write(kv, KEYS.results, all);
  return all;
}

/** Bestenliste im Einzelspiel für eine Einstellung: die besten n, bei Gleichstand das ältere vorne. */
export function bestSingles(all: Result[], setting: string, n = 10): Result[] {
  return all
    .filter((x) => x.mode === 'single' && x.setting === setting)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, n);
}

/** Bestleistung eines Spielers im Einzelspiel (für eine Einstellung), null ohne Ergebnis. */
export function personalBest(all: Result[], name: string, setting: string): Result | null {
  return bestSingles(all.filter((x) => x.name === name), setting, 1)[0] ?? null;
}

/** Die letzten n Challenges, neueste zuerst, je mit Rangliste. */
export function recentChallenges(all: Result[], n = 5): { round: string; setting: string; date: string; ranks: Result[] }[] {
  const byRound = new Map<string, Result[]>();
  for (const x of all) if (x.mode === 'challenge') byRound.set(x.round, [...(byRound.get(x.round) ?? []), x]);
  return [...byRound.entries()]
    .map(([round, list]) => ({
      round,
      setting: list[0]!.setting,
      date: list[0]!.date,
      ranks: [...list].sort((a, b) => b.score - a.score || b.distance - a.distance),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n);
}

/** Gemerkte Spielernamen (der erste ist der zuletzt gewählte). */
export function loadNames(kv: KeyValue | null): string[] {
  const raw = read(kv, KEYS.names);
  return Array.isArray(raw) ? raw.filter(str).slice(0, 12) : [];
}

export function saveNames(kv: KeyValue | null, names: string[]): void {
  const seen = new Set<string>();
  const list = names.filter((n) => n !== '' && !seen.has(n) && seen.add(n));
  write(kv, KEYS.names, [...list, ...loadNames(kv).filter((n) => !seen.has(n))].slice(0, 12));
}
