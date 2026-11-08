import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/physics';
import { buildPracticeStreet, createStreet, extentOf, gapRange, holdsOf, isOnHold, SHAPE } from '../src/world';

describe('Welt', () => {
  it('Tipp auf Rechteck und Kreis, mit Spielraum für den Finger', () => {
    expect(isOnHold({ x: 5, y: 5 }, { kind: 'rect', x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(isOnHold({ x: 10.5, y: 5 }, { kind: 'rect', x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(isOnHold({ x: 12, y: 5 }, { kind: 'rect', x: 0, y: 0, w: 10, h: 10 })).toBe(false);
    expect(isOnHold({ x: 4, y: 0 }, { kind: 'circle', x: 0, y: 0, r: 4 })).toBe(true);
    expect(isOnHold({ x: 6, y: 0 }, { kind: 'circle', x: 0, y: 0, r: 4 })).toBe(false);
  });

  it('Tipp auf Kranausleger, Turmspitze und Korb trifft; knapp über dem Dach nicht', () => {
    const crane = holdsOf({ kind: 'crane', x: 50, base: 0, h: 70, jib: 20, counter: 6 });
    expect(crane.some((h) => isOnHold({ x: 69, y: 70.7 }, h))).toBe(true); // Auslegerspitze
    expect(crane.some((h) => isOnHold({ x: 50, y: 73 }, h))).toBe(false); // Luft über dem Ausleger
    const flat = holdsOf({ kind: 'tower', x: 0, w: 10, h: 50, top: 'flat', color: 0 });
    expect(flat.some((h) => isOnHold({ x: 5, y: 52 }, h))).toBe(false);
    const step = holdsOf({ kind: 'tower', x: 0, w: 10, h: 50, top: 'step', color: 0 });
    expect(step.some((h) => isOnHold({ x: 5, y: 50 * (1 + 0.12 + 0.05) }, h))).toBe(true); // zweiter Absatz
    const spire = holdsOf({ kind: 'tower', x: 0, w: 10, h: 50, top: 'spire', color: 0 });
    expect(spire.some((h) => isOnHold({ x: 5, y: 60 }, h))).toBe(true);
    const balloon = holdsOf({ kind: 'balloon', x: 0, y: 60, r: 4, color: 0 });
    expect(balloon.some((h) => isOnHold({ x: 0, y: 60 - 4 * 1.45 + 0.6 }, h))).toBe(true); // Korb
  });

  it('Kran auf einem Dach und Luftschiff lassen sich greifen', () => {
    const roof = holdsOf({ kind: 'crane', x: 10, base: 80, h: 12, jib: 16, counter: 4 });
    expect(roof.some((h) => isOnHold({ x: 10, y: 85 }, h))).toBe(true); // Mast über dem Dach
    expect(roof.some((h) => isOnHold({ x: 25, y: 92.5 }, h))).toBe(true); // Auslegerspitze
    expect(roof.some((h) => isOnHold({ x: 10, y: 40 }, h))).toBe(false); // unter dem Dach ist kein Mast
    const ship = holdsOf({ kind: 'airship', x: 50, y: 80, len: 24 });
    expect(ship.some((h) => isOnHold({ x: 50, y: 80 }, h))).toBe(true);
    expect(ship.some((h) => isOnHold({ x: 50, y: 80 - 24 * 0.13 - 1 }, h))).toBe(true); // Gondel
    expect(ship.some((h) => isOnHold({ x: 50 + 12, y: 80 + 24 * 0.13 }, h))).toBe(false); // Ecke neben der Hülle
    expect(ship.some((h) => isOnHold({ x: 50, y: 80 + 24 * 0.13 + 2 }, h))).toBe(false); // über der Hülle
  });

  it('Dachkräne stehen auf einem flachen Turm, ganz auf dem Dach', () => {
    const w = buildPracticeStreet();
    for (let i = 0; i < w.props.length; i++) {
      const c = w.props[i]!;
      if (c.kind !== 'crane' || c.base === 0) continue;
      const t = w.props[i - 1]!;
      expect(t.kind).toBe('tower');
      if (t.kind !== 'tower') continue;
      expect(t.top).toBe('flat');
      expect(c.base).toBe(t.h);
      expect(c.x - SHAPE.craneMastHalf).toBeGreaterThanOrEqual(t.x);
      expect(c.x + SHAPE.craneMastHalf).toBeLessThanOrEqual(t.x + t.w);
      expect(c.x - c.counter).toBeGreaterThanOrEqual(t.x);
    }
  });

  it('Lücken wachsen mit der Strecke bis zu einer Grenze', () => {
    expect(gapRange(-50)).toEqual([24, 42]);
    expect(gapRange(0)).toEqual([24, 42]);
    expect(gapRange(1000)).toEqual([34, 52]);
    expect(gapRange(3000)).toEqual([54, 72]);
    expect(gapRange(50_000)).toEqual([54, 72]);
  });

  it('Die Strasse ist endlos: wird beim Fliegen weitergebaut, immer gleich', () => {
    const a = createStreet();
    a.extendTo(500);
    const n = a.props.length;
    a.extendTo(5000);
    expect(a.length).toBeGreaterThanOrEqual(5000);
    expect(a.props.length).toBeGreaterThan(n);
    expect(a.holds.length).toBe(a.props.flatMap(holdsOf).length);
    const b = createStreet();
    b.extendTo(5000);
    expect(b.props).toEqual(a.props); // in Schritten oder auf einmal gebaut: gleich
  });

  it('Start liegt knapp über dem ersten Turm', () => {
    const first = buildPracticeStreet().props[0]!;
    expect(first.kind).toBe('tower');
    if (first.kind !== 'tower') return;
    expect(TUNING.startPos.y).toBeGreaterThan(first.h);
    expect(TUNING.startPos.y).toBeLessThanOrEqual(first.h + 10);
  });

  it('Übungsstrasse ist jedes Mal gleich und hat Türme, Kräne, Ballone und Luftschiffe', () => {
    const a = buildPracticeStreet();
    expect(buildPracticeStreet()).toEqual(a);
    const kinds = new Set(a.props.map((p) => p.kind));
    expect(kinds).toEqual(new Set(['tower', 'crane', 'balloon', 'airship']));
    expect(a.props.some((p) => p.kind === 'crane' && p.base > 0)).toBe(true); // Kran auf einem Dach
    expect(a.length).toBeGreaterThan(1400);
  });

  it('Lücken sind gross und wachsen mit der Strecke', () => {
    const w = buildPracticeStreet();
    // Ein Kran auf einem Dach gehört zu seinem Turm (gleiche Gruppe)
    const groups: { left: number; right: number }[] = [];
    for (const p of w.props) {
      const e = extentOf(p);
      if (p.kind === 'crane' && p.base > 0) groups.at(-1)!.right = Math.max(groups.at(-1)!.right, e.right);
      else groups.push({ ...e });
    }
    for (let i = 1; i < groups.length; i++) {
      const gap = groups[i]!.left - groups[i - 1]!.right;
      const [min, max] = gapRange(groups[i - 1]!.right);
      expect(gap).toBeGreaterThanOrEqual(min - 1e-9);
      expect(gap).toBeLessThanOrEqual(max + 1e-9);
    }
    expect(w.length).toBe(groups.at(-1)!.right);
  });

  it('Haltepunkte liegen innerhalb der Teile (Tippen trifft, was man sieht)', () => {
    for (const p of buildPracticeStreet().props) {
      const { left, right } = extentOf(p);
      for (const h of holdsOf(p)) {
        const hl = h.kind === 'circle' ? h.x - h.r : h.kind === 'ellipse' ? h.x - h.rx : h.x;
        const hr = h.kind === 'circle' ? h.x + h.r : h.kind === 'ellipse' ? h.x + h.rx : h.x + h.w;
        expect(hl).toBeGreaterThanOrEqual(left - 1e-9);
        expect(hr).toBeLessThanOrEqual(right + 1e-9);
      }
    }
  });
});
