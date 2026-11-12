// Online-Bestenliste (B12): Form und Prüfung der Daten, die das Spiel und die
// Cloudflare-Funktion (functions/api/scores.ts) austauschen. Reine Rechnung,
// kein Netz, kein Speicher, keine Anzeige. Was nur das Spiel braucht, steht in
// src/cloud.ts (melden) und src/ui.ts (Texte).
// Gewertet wird nur das Einzelspiel: je Spieler und Einstellung die Bestleistung.

import { cleanName } from './game';
import { SETTINGS } from './physics';

export const BOARD = {
  top: 20, // so viele Plätze zeigt die Liste
  maxPlayers: 300, // so viele Namen je Einstellung nimmt der Speicher an
  maxScore: 10_000_000, // Obergrenzen gegen Unsinn; echte Werte liegen weit darunter
  maxDistance: 1_000_000, // m
  maxStrike: 10_000,
  maxBody: 2000, // Bytes – grösser ist keine Meldung des Spiels
};

/** Ein Platz in der Liste. */
export interface Entry {
  name: string;
  score: number;
  distance: number;
  bestStrike: number;
  date: string; // ISO-Zeit, vom Speicher gesetzt
}

/** Was das Spiel nach einem Einzelspiel meldet. */
export interface Submission {
  name: string;
  setting: string;
  score: number;
  distance: number;
  bestStrike: number;
}

/** Antwort des Speichers: die besten Plätze, wie viele Spieler, und der eigene Rang nach einer Meldung. */
export interface Board {
  best: Entry[];
  players: number;
  rank: number | null;
}

const whole = (x: unknown, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max;
const record = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Gibt es diese Einstellung? (Nur bekannte Namen kommen in den Speicher.) */
export function isSetting(x: unknown): x is string {
  return typeof x === 'string' && SETTINGS.some((s) => s.name === x);
}

/** Unter diesem Schlüssel gilt ein Name als derselbe Spieler: «Anna» und «anna » sind eine. */
export function nameKey(name: string): string {
  return cleanName(name).toLowerCase();
}

/** Meldung prüfen und säubern; null, wenn etwas fehlt oder nicht sein kann. */
export function parseSubmission(x: unknown): Submission | null {
  if (!record(x) || typeof x.name !== 'string' || !isSetting(x.setting)) return null;
  const name = cleanName(x.name);
  if (name === '') return null;
  if (!whole(x.score, BOARD.maxScore) || !whole(x.distance, BOARD.maxDistance) || !whole(x.bestStrike, BOARD.maxStrike)) return null;
  return { name, setting: x.setting, score: x.score, distance: x.distance, bestStrike: x.bestStrike };
}

function parseEntry(x: unknown): Entry | null {
  if (!record(x) || typeof x.name !== 'string' || typeof x.date !== 'string') return null;
  if (!whole(x.score, BOARD.maxScore) || !whole(x.distance, BOARD.maxDistance) || !whole(x.bestStrike, BOARD.maxStrike)) return null;
  return { name: cleanName(x.name), score: x.score, distance: x.distance, bestStrike: x.bestStrike, date: x.date };
}

/** Antwort des Speichers prüfen (das Spiel traut ihr nicht blind); null, wenn sie nicht passt. */
export function parseBoard(x: unknown): Board | null {
  if (!record(x) || !Array.isArray(x.best) || !whole(x.players, Number.MAX_SAFE_INTEGER)) return null;
  const best = x.best.map(parseEntry);
  if (best.some((e) => e === null)) return null;
  const rank = x.rank === null || x.rank === undefined ? null : whole(x.rank, Number.MAX_SAFE_INTEGER) && x.rank >= 1 ? x.rank : null;
  return { best: (best as Entry[]).slice(0, BOARD.top), players: x.players, rank };
}
