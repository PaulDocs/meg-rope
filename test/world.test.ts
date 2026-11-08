import { describe, expect, it } from 'vitest';
import { buildPracticeStreet, extentOf, holdsOf, isOnHold } from '../src/world';

describe('Welt', () => {
  it('Tipp auf Rechteck und Kreis, mit Spielraum für den Finger', () => {
    expect(isOnHold({ x: 5, y: 5 }, { kind: 'rect', x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(isOnHold({ x: 10.5, y: 5 }, { kind: 'rect', x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(isOnHold({ x: 12, y: 5 }, { kind: 'rect', x: 0, y: 0, w: 10, h: 10 })).toBe(false);
    expect(isOnHold({ x: 4, y: 0 }, { kind: 'circle', x: 0, y: 0, r: 4 })).toBe(true);
    expect(isOnHold({ x: 6, y: 0 }, { kind: 'circle', x: 0, y: 0, r: 4 })).toBe(false);
  });

  it('Tipp auf Kranausleger, Turmspitze und Korb trifft; knapp über dem Dach nicht', () => {
    const crane = holdsOf({ kind: 'crane', x: 50, h: 70, jib: 20, counter: 6 });
    expect(crane.some((h) => isOnHold({ x: 69, y: 70.7 }, h))).toBe(true); // Auslegerspitze
    expect(crane.some((h) => isOnHold({ x: 50, y: 73 }, h))).toBe(false); // Luft über dem Ausleger
    const flat = holdsOf({ kind: 'tower', x: 0, w: 10, h: 50, top: 'flat', color: 0 });
    expect(flat.some((h) => isOnHold({ x: 5, y: 52 }, h))).toBe(false);
    const spire = holdsOf({ kind: 'tower', x: 0, w: 10, h: 50, top: 'spire', color: 0 });
    expect(spire.some((h) => isOnHold({ x: 5, y: 60 }, h))).toBe(true);
    const balloon = holdsOf({ kind: 'balloon', x: 0, y: 60, r: 4, color: 0 });
    expect(balloon.some((h) => isOnHold({ x: 0, y: 60 - 4 * 1.45 + 0.6 }, h))).toBe(true); // Korb
  });

  it('Übungsstrasse ist jedes Mal gleich und hat Türme, Kräne und Ballone', () => {
    const a = buildPracticeStreet();
    expect(buildPracticeStreet()).toEqual(a);
    const kinds = new Set(a.props.map((p) => p.kind));
    expect(kinds).toEqual(new Set(['tower', 'crane', 'balloon']));
    expect(a.length).toBeGreaterThan(1400);
  });

  it('Lücken zwischen den Teilen sind gross (mindestens 16 m)', () => {
    const w = buildPracticeStreet();
    for (let i = 1; i < w.props.length; i++) {
      const gap = extentOf(w.props[i]!).left - extentOf(w.props[i - 1]!).right;
      expect(gap).toBeGreaterThanOrEqual(16 - 1e-9);
      expect(gap).toBeLessThanOrEqual(30 + 1e-9);
    }
    expect(w.length).toBe(extentOf(w.props.at(-1)!).right);
  });

  it('Haltepunkte liegen innerhalb der Teile (Tippen trifft, was man sieht)', () => {
    for (const p of buildPracticeStreet().props) {
      const { left, right } = extentOf(p);
      for (const h of holdsOf(p)) {
        const hl = h.kind === 'circle' ? h.x - h.r : h.x;
        const hr = h.kind === 'circle' ? h.x + h.r : h.x + h.w;
        expect(hl).toBeGreaterThanOrEqual(left - 1e-9);
        expect(hr).toBeLessThanOrEqual(right + 1e-9);
      }
    }
  });
});
