// Online-Bestenliste im Spiel (B12): holt die Liste und meldet Ergebnisse an
// /api/scores auf derselben Adresse. Eingeschaltet nur im Bau für Cloudflare
// (VITE_CLOUD=1, siehe docs/betrieb.md) – die Testseite und der lokale Bau
// fragen nichts ab. Geht etwas schief, gibt es null: Das Spiel läuft ohne weiter.

import { parseBoard, parseSubmission, type Board, type Submission } from './board';
import type { Result } from './store';

/** Läuft dieser Bau mit Online-Bestenliste? */
export const CLOUD: boolean = import.meta.env.VITE_CLOUD === '1';
export const SCORES_URL = '/api/scores';
export const CLOUD_TIMEOUT = 6000; // ms – länger wartet das Spiel nicht auf die Liste

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Was von einem gespeicherten Ergebnis online gemeldet wird: nur das
 * Einzelspiel und nur mit Punkten. null heisst: nichts melden.
 */
export function submissionOf(r: Result | undefined): Submission | null {
  if (!r || r.mode !== 'single' || !(r.score > 0)) return null;
  return parseSubmission({ name: r.name, setting: r.setting, score: Math.round(r.score), distance: Math.round(r.distance), bestStrike: Math.round(r.bestStrike) });
}

async function ask(f: Fetch, url: string, init: RequestInit): Promise<Board | null> {
  try {
    const res = await f(url, { ...init, signal: AbortSignal.timeout(CLOUD_TIMEOUT), credentials: 'same-origin' });
    if (!res.ok) return null;
    return parseBoard(await res.json());
  } catch {
    return null; // kein Netz, Zeit um, keine gültige Antwort
  }
}

/** Die Liste einer Einstellung holen. */
export function loadBoard(setting: string, f: Fetch = fetch): Promise<Board | null> {
  return ask(f, `${SCORES_URL}?setting=${encodeURIComponent(setting)}`, { method: 'GET' });
}

/** Ein Ergebnis melden; zurück kommt die Liste mit dem eigenen Rang. */
export function sendResult(x: Submission, f: Fetch = fetch): Promise<Board | null> {
  return ask(f, SCORES_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(x) });
}
