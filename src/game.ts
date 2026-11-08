// Ablauf einer Runde im Einzelspiel und in der Challenge (B-neu-1).
// Reine Rechnung ohne Bildschirm: Wer ist dran, welcher Versuch, wie viele
// Punkte. Die Challenge läuft vorerst auf einem Gerät: Die Spieler geben das
// iPad nacheinander weiter. Übers Heimnetz kommt sie mit dem Server (Etappe 3).

/** Einzelspiel oder Challenge (mindestens zwei Spieler, nacheinander). */
export type Mode = 'single' | 'challenge';

export const ROUND = {
  attempts: 3, // Versuche je Spieler und Runde
  // Bonus nach Zahl der gebrauchten Versuche (Konzept: 50 / 25 / 0 auf 100):
  // Wer nach dem 1. Versuch werten lässt, bekommt + 50 %, nach dem 2. + 25 %.
  bonus: [0.5, 0.25, 0],
  minPlayers: 2, // Challenge
  maxPlayers: 6,
  maxName: 16, // Zeichen
};

/** Ergebnis eines Versuchs. */
export interface Attempt {
  distance: number; // m
  style: number; // Style-Punkte
  points: number; // Distanz + Style
  bestStrike: number;
}

/** Ein Spieler in der Runde. */
export interface Turn {
  name: string;
  attempts: Attempt[];
  done: boolean;
}

export interface Round {
  id: string;
  mode: Mode;
  setting: string; // Name der Einstellung (physics.ts SETTINGS)
  turns: Turn[];
  current: number; // Index des Spielers, der dran ist (turns.length: alle fertig)
}

/** Name aufräumen: Leerzeichen weg, gekürzt; leer bleibt leer. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, ROUND.maxName);
}

export function createRound(mode: Mode, names: string[], setting: string, id: string): Round {
  const list = names.map(cleanName).filter((n) => n !== '');
  if (list.length === 0) throw new Error('Runde ohne Spieler');
  if (mode === 'single' && list.length !== 1) throw new Error('Einzelspiel hat genau einen Spieler');
  if (mode === 'challenge' && (list.length < ROUND.minPlayers || list.length > ROUND.maxPlayers)) {
    throw new Error(`Challenge braucht ${ROUND.minPlayers}–${ROUND.maxPlayers} Spieler`);
  }
  return { id, mode, setting, turns: list.map((name) => ({ name, attempts: [], done: false })), current: 0 };
}

/** Der Spieler, der dran ist (null: Runde fertig). */
export function currentTurn(r: Round): Turn | null {
  return r.turns[r.current] ?? null;
}

export function isRoundOver(r: Round): boolean {
  return r.current >= r.turns.length;
}

/** Nummer des Versuchs, der als nächster läuft (1 … attempts). */
export function attemptNumber(t: Turn): number {
  return Math.min(ROUND.attempts, t.attempts.length + 1);
}

function finish(r: Round, t: Turn): void {
  t.done = true;
  r.current++;
}

/** Ein Versuch ist zu Ende (Boden). Nach dem letzten ist der Spieler fertig. */
export function endAttempt(r: Round, a: Attempt): void {
  const t = currentTurn(r);
  if (!t) return;
  t.attempts.push(a);
  if (t.attempts.length >= ROUND.attempts) finish(r, t);
}

/** Der Spieler lässt seinen besten Versuch werten und hört auf (mit Bonus für weniger Versuche). */
export function stopTurn(r: Round): void {
  const t = currentTurn(r);
  if (t && t.attempts.length > 0) finish(r, t);
}

/** Bester Versuch eines Spielers (null ohne Versuch). */
export function bestAttempt(t: Turn): Attempt | null {
  let best: Attempt | null = null;
  for (const a of t.attempts) if (!best || a.points > best.points) best = a;
  return best;
}

/** Bonus-Anteil für so viele gebrauchte Versuche. */
export function bonusFor(used: number): number {
  return ROUND.bonus[Math.max(0, Math.min(ROUND.bonus.length, used) - 1)] ?? 0;
}

/** Wertung eines Spielers: bester Versuch × (1 + Bonus für die gebrauchten Versuche). */
export function turnScore(t: Turn): number {
  const best = bestAttempt(t);
  if (!best) return 0;
  return Math.round(best.points * (1 + bonusFor(t.attempts.length)));
}

export interface Rank {
  name: string;
  score: number;
  distance: number; // m im besten Versuch
  attempts: number;
}

/** Rangliste: mehr Punkte vorne, bei Gleichstand die weitere Distanz. */
export function ranking(r: Round): Rank[] {
  return r.turns
    .map((t) => ({ name: t.name, score: turnScore(t), distance: bestAttempt(t)?.distance ?? 0, attempts: t.attempts.length }))
    .sort((a, b) => b.score - a.score || b.distance - a.distance);
}
