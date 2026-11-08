import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/physics';
import {
  buildPracticeStreet,
  containerOf,
  createStreet,
  extentOf,
  gapRange,
  holdsOf,
  isOnHold,
  roofHeight,
  roofOf,
  spacingOdds,
  DIFFICULTY,
  SHAPE,
  type Prop,
} from '../src/world';

const street = buildPracticeStreet(7, DIFFICULTY.fullAt + 700);
const towers = street.props.filter((p): p is Extract<Prop, { kind: 'tower' }> => p.kind === 'tower');
const ground = street.props.filter((p) => p.kind === 'tower' || (p.kind === 'crane' && p.base === 0));

describe('Haltepunkte', () => {
  it('Tipp auf Rechteck, Kreis und Ellipse, mit Spielraum für den Finger', () => {
    expect(isOnHold({ x: 5, y: 5 }, { kind: 'rect', x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(isOnHold({ x: 10.5, y: 5 }, { kind: 'rect', x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(isOnHold({ x: 12, y: 5 }, { kind: 'rect', x: 0, y: 0, w: 10, h: 10 })).toBe(false);
    expect(isOnHold({ x: 4, y: 0 }, { kind: 'circle', x: 0, y: 0, r: 4 })).toBe(true);
    expect(isOnHold({ x: 6, y: 0 }, { kind: 'circle', x: 0, y: 0, r: 4 })).toBe(false);
  });

  it('Turm: jeder Block und die Spitze sind greifbar, die Luft darüber nicht', () => {
    const t: Prop = {
      kind: 'tower',
      style: 'needle',
      color: 0,
      blocks: [
        { x: 0, y: 0, w: 8, h: 60 },
        { x: 1, y: 60, w: 6, h: 25 },
      ],
      spire: { x: 2.4, y: 85, w: 3.2, h: 35 },
    };
    const h = holdsOf(t);
    expect(h.some((x) => isOnHold({ x: 4, y: 30 }, x))).toBe(true);
    expect(h.some((x) => isOnHold({ x: 4, y: 70 }, x))).toBe(true);
    expect(h.some((x) => isOnHold({ x: 4, y: 110 }, x))).toBe(true); // Spitze
    expect(h.some((x) => isOnHold({ x: 4, y: 125 }, x))).toBe(false);
    expect(h.some((x) => isOnHold({ x: 0, y: 75 }, x))).toBe(false); // neben dem schmaleren Block
  });

  it('Kran: Mast, Ausleger und Container greifbar, Luft darüber nicht', () => {
    const crane: Prop = { kind: 'crane', x: 50, base: 0, h: 70, jib: 20, counter: 6, load: true };
    const h = holdsOf(crane);
    expect(h.some((x) => isOnHold({ x: 69, y: 70.7 }, x))).toBe(true); // Auslegerspitze
    expect(h.some((x) => isOnHold({ x: 50, y: 73 }, x))).toBe(false);
    const c = containerOf(crane)!;
    expect(h.some((x) => isOnHold({ x: c.x + c.w / 2, y: c.y + c.h / 2 }, x))).toBe(true);
    expect(containerOf({ ...crane, load: false })).toBeNull();
  });

  it('Ballon und Luftschiff: Hülle, Korb und Gondel greifbar, Ecken daneben nicht', () => {
    const balloon = holdsOf({ kind: 'balloon', x: 0, y: 60, r: 4, color: 0 });
    expect(balloon.some((h) => isOnHold({ x: 0, y: 60 - 4 * 1.45 + 0.6 }, h))).toBe(true); // Korb
    const ship = holdsOf({ kind: 'airship', x: 50, y: 80, len: 24 });
    expect(ship.some((h) => isOnHold({ x: 50, y: 80 }, h))).toBe(true);
    expect(ship.some((h) => isOnHold({ x: 50, y: 80 - 24 * 0.13 - 1 }, h))).toBe(true); // Gondel
    expect(ship.some((h) => isOnHold({ x: 50 + 12, y: 80 + 24 * 0.13 }, h))).toBe(false);
  });
});

describe('Strasse', () => {
  it('ist jedes Mal gleich und endlos', () => {
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

  it('hat alle Gebäudearten, Kräne (auch auf Dächern, mit Container), Ballone und Luftschiffe', () => {
    expect(new Set(towers.map((t) => t.style))).toEqual(new Set(['needle', 'setback', 'twin', 'stub', 'slab']));
    const kinds = new Set(street.props.map((p) => p.kind));
    expect(kinds).toEqual(new Set(['tower', 'crane', 'balloon', 'airship']));
    expect(street.props.some((p) => p.kind === 'crane' && p.base > 0)).toBe(true);
    expect(street.props.some((p) => p.kind === 'crane' && p.load)).toBe(true);
  });

  it('dieselbe Gebäudeart kommt nie zweimal hintereinander', () => {
    for (let i = 1; i < towers.length; i++) expect(towers[i]!.style).not.toBe(towers[i - 1]!.style);
  });

  it('Höhen wechseln stark: kurze und sehr hohe Häuser', () => {
    const heights = towers.map(roofHeight);
    expect(Math.min(...heights)).toBeLessThan(27);
    expect(Math.max(...heights)).toBeGreaterThan(80);
    // nicht zu hoch (Pascal): Türme höchstens 1,5 Bildhöhen (70 m), wie im Video
    expect(Math.max(...heights)).toBeLessThanOrEqual(105);
    for (const p of street.props) {
      if (p.kind === 'crane' && p.base === 0) expect(p.h).toBeLessThanOrEqual(65);
      if (p.kind === 'balloon' || p.kind === 'airship') expect(p.y).toBeLessThanOrEqual(90);
    }
    // viele Sprünge von mindestens 18 m zwischen Nachbarn
    let jumps = 0;
    for (let i = 1; i < heights.length; i++) if (Math.abs(heights[i]! - heights[i - 1]!) >= 18) jumps++;
    expect(jumps / (heights.length - 1)).toBeGreaterThan(0.4);
  });

  it('Container hängen frei: nicht im eigenen Turm, bei Dachkränen über dem Dach', () => {
    for (let i = 0; i < street.props.length; i++) {
      const c = street.props[i]!;
      if (c.kind !== 'crane' || !c.load) continue;
      const box = containerOf(c)!;
      if (c.base > 0) expect(box.y).toBeGreaterThanOrEqual(c.base);
      const prev = street.props[i - 1];
      if (c.base > 0 && prev && prev.kind === 'tower') {
        for (const h of holdsOf(prev)) {
          if (h.kind !== 'rect') continue;
          const overlap = box.x < h.x + h.w && box.x + box.w > h.x && box.y < h.y + h.h && box.y + box.h > h.y;
          expect(overlap).toBe(false);
        }
      }
    }
  });

  it('jede Lücke ist dicht, normal oder weit – und jede weite hat einen Zwischenhalt', () => {
    const air = street.props.filter((p) => p.kind === 'balloon' || p.kind === 'airship');
    let right = extentOf(street.props[0]!).right;
    for (const p of street.props.slice(1)) {
      if (p.kind === 'balloon' || p.kind === 'airship') continue;
      const e = extentOf(p);
      if (p.kind === 'crane' && p.base > 0) {
        right = Math.max(right, e.right); // Dachkran gehört zu seinem Turm
        continue;
      }
      const gap = e.left - right;
      const [gMin, gMax] = gapRange(right);
      const [c0, c1] = DIFFICULTY.cluster;
      const [w0, w1] = DIFFICULTY.wideFactor;
      const ok = (gap >= c0 - 1e-9 && gap <= c1 + 1e-9) || (gap >= gMin - 1e-9 && gap <= gMax * w1 + 1e-9);
      expect(ok).toBe(true);
      if (gap > gMax + 1e-9) {
        expect(gap).toBeGreaterThanOrEqual(gMin * w0 - 1e-9);
        const mid = right + gap / 2;
        expect(air.some((a) => Math.abs((a.kind === 'balloon' || a.kind === 'airship' ? a.x : 0) - mid) < 1e-6)).toBe(true);
      }
      right = e.right;
    }
    expect(street.length).toBe(right);
    expect(street.length).toBeGreaterThanOrEqual(DIFFICULTY.fullAt);
  });

  it('Abstände wechseln: dicht, normal und weit – Teile am Boden überlappen nie', () => {
    let cluster = 0;
    let wide = 0;
    for (let i = 1; i < ground.length; i++) {
      const prev = ground[i - 1]!;
      const gap = extentOf(ground[i]!).left - extentOf(prev).right;
      const [, gMax] = gapRange(extentOf(prev).left);
      if (gap <= DIFFICULTY.cluster[1] + 1e-9) cluster++;
      if (gap > gMax + 1e-9) wide++;
    }
    expect(cluster).toBeGreaterThan(5);
    expect(wide).toBeGreaterThan(5);
  });

  it('kein Teil am Boden überlappt seinen Vorgänger (samt Dachkran)', () => {
    let right = -Infinity;
    for (const p of street.props) {
      if (p.kind === 'balloon' || p.kind === 'airship') continue;
      const e = extentOf(p);
      if (p.kind === 'crane' && p.base > 0) {
        right = Math.max(right, e.right);
        continue;
      }
      expect(e.left).toBeGreaterThanOrEqual(right + DIFFICULTY.cluster[0] - 1e-9);
      right = e.right;
    }
  });

  it('Ballone und Luftschiffe hängen in weiten Lücken, nicht über Häusern', () => {
    for (let i = 0; i < street.props.length; i++) {
      const p = street.props[i]!;
      if (p.kind !== 'balloon' && p.kind !== 'airship') continue;
      const e = extentOf(p);
      for (const g of ground) {
        const ge = extentOf(g);
        expect(e.right <= ge.left || e.left >= ge.right).toBe(true);
      }
    }
  });

  it('Dachkräne stehen auf dem Dach ihres Turms', () => {
    for (let i = 0; i < street.props.length; i++) {
      const c = street.props[i]!;
      if (c.kind !== 'crane' || c.base === 0) continue;
      const t = street.props[i - 1]!;
      expect(t.kind).toBe('tower');
      if (t.kind !== 'tower') continue;
      const roof = roofOf(t);
      expect(c.base).toBeCloseTo(roof.y + roof.h);
      expect(['twin', 'slab', 'setback']).toContain(t.style); // nur breite, flache Dächer
      expect(c.x - c.counter).toBeGreaterThanOrEqual(roof.x - 1e-9);
      expect(c.x - SHAPE.craneMastHalf).toBeGreaterThanOrEqual(roof.x - 1e-9);
      expect(c.x + SHAPE.craneMastHalf).toBeLessThanOrEqual(roof.x + roof.w + 1e-9); // ganzer Mast auf dem Dach
    }
  });

  it('Lücken wachsen mit der Strecke, weite Strecken werden häufiger', () => {
    expect(gapRange(-50)).toEqual([26, 46]);
    expect(gapRange(0)).toEqual([26, 46]);
    expect(gapRange(3000)).toEqual([48, 68]);
    expect(gapRange(6000)).toEqual([70, 90]);
    expect(gapRange(50_000)).toEqual([70, 90]);
    expect(spacingOdds(6000).wide).toBeGreaterThan(spacingOdds(0).wide);
    expect(spacingOdds(6000).cluster).toBeLessThan(spacingOdds(0).cluster);
    expect(spacingOdds(6000).stub).toBeGreaterThan(spacingOdds(0).stub);
    expect(spacingOdds(3000).wide).toBeLessThan(spacingOdds(6000).wide); // steigt bis 6 km weiter
    for (const x of [0, 3000, 6000, 50_000]) {
      const o = spacingOdds(x);
      expect(o.cluster).toBeGreaterThanOrEqual(0);
      expect(o.cluster + o.wide).toBeLessThanOrEqual(1);
      expect(o.stub).toBeLessThanOrEqual(1);
    }
  });

  it('Haltepunkte liegen innerhalb der Teile (Tippen trifft, was man sieht)', () => {
    for (const p of street.props) {
      const { left, right } = extentOf(p);
      for (const h of holdsOf(p)) {
        const hl = h.kind === 'circle' ? h.x - h.r : h.kind === 'ellipse' ? h.x - h.rx : h.x;
        const hr = h.kind === 'circle' ? h.x + h.r : h.kind === 'ellipse' ? h.x + h.rx : h.x + h.w;
        expect(hl).toBeGreaterThanOrEqual(left - 1e-9);
        expect(hr).toBeLessThanOrEqual(right + 1e-9);
      }
    }
  });

  it('Start: in der Luft vor dem ersten Turm, etwas über dem Dach', () => {
    const first = street.props[0]!;
    expect(first.kind).toBe('tower');
    if (first.kind !== 'tower') return;
    const top = roofHeight(first);
    expect(TUNING.startPos.y).toBeGreaterThan(top);
    expect(TUNING.startPos.y).toBeLessThanOrEqual(top + 15); // Video: etwas über dem Dach
    const { left } = extentOf(first);
    expect(TUNING.startPos.x).toBeLessThan(left); // links davor, nicht auf dem Dach
    expect(TUNING.startPos.x).toBeGreaterThan(left - 20);
  });
});
