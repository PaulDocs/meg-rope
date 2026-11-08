import { describe, expect, it } from 'vitest';
import { createState, step, tap, TUNING, type State } from '../src/physics';
import { buildPracticeStreet, extentOf, roofOf } from '../src/world';

const W = buildPracticeStreet(7, 3600);
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
      if (Math.abs(h.x - s.pos.x) < 70) out.push({ x: h.x, y: h.y });
      continue;
    }
    if (h.x + h.w < s.pos.x - 25 || h.x > s.pos.x + 70) continue; // Lücken bis 72 m: weit genug vorausschauen
    for (const fy of [0.7, 1]) for (const fx of [0, 1]) out.push({ x: h.x + h.w * fx, y: h.y + h.h * fy });
  }
  return out;
}

function tryHop(s0: State, t: { x: number; y: number }, hold: number): State | null {
  const s = clone(s0);
  if (tap(s, t, W.holds) !== 'attached') return null;
  for (let i = 0; i < hold * 120 && s.phase === 'flying'; i++) step(s);
  if (s.phase !== 'flying') return null;
  tap(s, s.pos, W.holds);
  let n = 0;
  while (s.phase === 'flying' && (s.vel.y > 0 || n < 12) && n < 600) {
    step(s);
    n++;
  }
  if (s.phase !== 'flying' || s.pos.y < 10) return null;
  return s;
}

function play(s: State, until: number): State {
  for (let hops = 0; hops < 80 && s.maxX < until; hops++) {
    let best: State | null = null;
    for (const t of targets(s)) {
      for (const hold of [0.4, 0.8, 1.4, 2.2]) {
        const r = tryHop(s, t, hold);
        if (r && r.pos.x > s.pos.x + 2 && (!best || r.pos.x + 0.3 * r.pos.y > best.pos.x + 0.3 * best.pos.y)) best = r;
      }
    }
    if (!best) break;
    s = best;
  }
  return s;
}

describe('Übungsstrasse', () => {
  it('ist ab dem Start machbar', { timeout: 120_000 }, () => {
    let s = createState();
    s = play(s, FIRST);
    expect(s.maxX).toBeGreaterThanOrEqual(FIRST);
  });

  it('ist auch mit den grössten Lücken (ab 3 km) machbar', { timeout: 120_000 }, () => {
    // Start knapp über dem ersten Turm hinter 3 km, mit Starttempo
    const t = W.props.find((p) => p.kind === 'tower' && extentOf(p).left > 3000);
    if (!t || t.kind !== 'tower') throw new Error('kein Turm hinter 3 km');
    const roof = roofOf(t);
    let s = createState();
    s.pos = { x: roof.x + roof.w / 2, y: roof.y + roof.h + 8 };
    s.maxX = s.pos.x;
    s.phase = 'flying';
    s.vel = { ...TUNING.startVel };
    const from = s.pos.x;
    s = play(s, from + 500);
    expect(s.maxX - from).toBeGreaterThanOrEqual(500);
  });
});
