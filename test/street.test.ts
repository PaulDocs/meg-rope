import { describe, expect, it } from 'vitest';
import { createState, step, tap, type State } from '../src/physics';
import { PRACTICE_STREET as W } from '../src/world';

/**
 * Ist die Übungsstrasse mit den aktuellen Werten überhaupt spielbar?
 * Ein einfacher Bot probiert je Sprung ein paar Haltepunkte und Haltezeiten
 * durch und nimmt den, der am weitesten nach vorne bringt. Er spielt
 * schlechter als ein Mensch – schafft er es, schafft es Pascal auch.
 */
const clone = (s: State): State => structuredClone(s);

function targets(s: State) {
  const out: { x: number; y: number }[] = [];
  for (const h of W.holds) {
    if (h.kind === 'circle') {
      if (Math.abs(h.x - s.pos.x) < 45) out.push({ x: h.x, y: h.y });
      continue;
    }
    if (h.x + h.w < s.pos.x - 20 || h.x > s.pos.x + 45) continue;
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

describe('Übungsstrasse', () => {
  it('ist bis ans Ende spielbar', { timeout: 120_000 }, () => {
    let s = createState();
    for (let hops = 0; hops < 80 && s.maxX < W.length; hops++) {
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
    expect(s.maxX).toBeGreaterThanOrEqual(W.length);
  });
});
