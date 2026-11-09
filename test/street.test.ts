import { describe, expect, it } from 'vitest';
import { createState, noSideWalls, step, tap, type State } from '../src/physics';
import { buildPracticeStreet, DIFFICULTY, extentOf, roofOf } from '../src/world';

const W = buildPracticeStreet(7, DIFFICULTY.fullAt + 700);
const FIRST = 1500;

/**
 * Ist die Strasse mit den aktuellen Werten überhaupt machbar?
 * Ein Bot probiert je Sprung Haltepunkte und Haltezeiten durch und nimmt den,
 * der am weitesten bringt. Er sieht dabei voraus – spielt also besser als ein
 * Mensch. Ein grüner Test heisst: machbar, nicht leicht.
 */
const clone = (s: State): State => structuredClone(s);

function targets(s: State) {
  const out: { x: number; y: number }[] = [];
  for (const h of W.holds) {
    if (h.kind === 'circle' || h.kind === 'ellipse') {
      if (Math.abs(h.x - s.pos.x) < 90) out.push({ x: h.x, y: h.y });
      continue;
    }
    if (h.x + h.w < s.pos.x - 25 || h.x > s.pos.x + 90) continue; // Lücken bis 90 m: weit genug vorausschauen
    for (const fy of [0.7, 1]) for (const fx of [0, 1]) out.push({ x: h.x + h.w * fx, y: h.y + h.h * fy });
  }
  return out;
}

function tryHop(s0: State, t: { x: number; y: number }, hold: number): State | null {
  const s = clone(s0);
  if (tap(s, t, W.holds, noSideWalls) !== 'attached') return null;
  for (let i = 0; i < hold * 120 && s.phase === 'flying'; i++) step(s);
  if (s.phase !== 'flying') return null;
  tap(s, s.pos, W.holds, noSideWalls);
  let n = 0;
  while (s.phase === 'flying' && (s.vel.y > 0 || n < 12) && n < 600) {
    step(s);
    n++;
  }
  if (s.phase !== 'flying' || s.pos.y < 10) return null;
  return s;
}

// Wie gut ist ein Zwischenstand? Weit und hoch.
const score = (r: State) => r.pos.x + 0.3 * r.pos.y;
const BEAM = 3; // so viele Zwischenstände verfolgt der Bot parallel – einer allein läuft leicht in eine Sackgasse
const DISTINCT = 3; // m – Zwischenstände näher beieinander gelten als derselbe Weg

// Haltezeiten am Seil. 3,2 s seit 09.11. (Schwung holen wie auf einer Schaukel,
// über Hakenhöhe nur pumpHigh): für die grössten Lücken braucht es längeres
// Schwingen. Der erste Abschnitt muss weiter mit höchstens 2,2 s gehen.
const HOLDS_SHORT = [0.4, 0.8, 1.4, 2.2];
const HOLDS_LONG = [...HOLDS_SHORT, 3.2];

/** Alle Sprünge, die von b aus weiterbringen. */
function candidates(b: State, holds: number[]): State[] {
  const out: State[] = [];
  for (const t of targets(b)) {
    for (const hold of holds) {
      const r = tryHop(b, t, hold);
      if (r && r.pos.x > b.pos.x + 2) out.push(r);
    }
  }
  return out;
}

/** Die besten n verschiedenen Zwischenstände. */
function pickDistinct(all: State[], n: number): State[] {
  const sorted = [...all].sort((p, q) => score(q) - score(p));
  const out: State[] = [];
  for (const r of sorted) {
    if (out.every((k) => Math.abs(k.pos.x - r.pos.x) > DISTINCT || Math.abs(k.pos.y - r.pos.y) > DISTINCT)) out.push(r);
    if (out.length === n) break;
  }
  return out;
}

function play(s: State, until: number, holds: number[]): State {
  let beam = [s];
  let best = s;
  for (let hops = 0; hops < 80 && best.maxX < until; hops++) {
    const next = beam.flatMap((b) => candidates(b, holds));
    if (next.length === 0) break;
    beam = pickDistinct(next, BEAM);
    for (const r of beam) if (r.maxX > best.maxX) best = r;
  }
  return best;
}

describe('Übungsstrasse', () => {
  it('ist ab dem Start machbar', { timeout: 300_000 }, () => {
    let s = createState();
    // erst nach einer menschlichen Reaktionszeit einhaken (im Video rund 1,3 s Fallen)
    for (let i = 0; i < 1.3 * 120; i++) step(s);
    expect(s.phase).toBe('flying');
    s = play(s, FIRST, HOLDS_SHORT);
    expect(s.maxX).toBeGreaterThanOrEqual(FIRST);
  });

  it('ist auch mit den grössten Lücken (ab voller Schwierigkeit) machbar', { timeout: 300_000 }, () => {
    // Start knapp über dem ersten Turm ab voller Schwierigkeit, mit etwas Flugtempo
    const t = W.props.find((p) => p.kind === 'tower' && extentOf(p).left > DIFFICULTY.fullAt);
    if (!t || t.kind !== 'tower') throw new Error('kein Turm ab voller Schwierigkeit');
    const roof = roofOf(t);
    let s = createState();
    s.pos = { x: roof.x + roof.w / 2, y: roof.y + roof.h + 8 };
    s.maxX = s.pos.x;
    s.phase = 'flying';
    s.vel = { x: 24, y: 6 }; // mit etwas Flugtempo, wie mitten im Lauf
    const from = s.pos.x;
    s = play(s, from + 500, HOLDS_LONG);
    expect(s.maxX - from).toBeGreaterThanOrEqual(500);
  });
});
