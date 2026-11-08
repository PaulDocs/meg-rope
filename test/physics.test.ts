import { describe, expect, it } from 'vitest';
import { createState, isTaut, step, tap, TUNING, type State } from '../src/physics';
import type { Hold } from '../src/world';

// Ein hoher, breiter Turm von x 0 bis 20, 80 m hoch
const tower: Hold = { kind: 'rect', x: 0, y: 0, w: 20, h: 80 };
const holds = [tower];

function run(s: State, seconds: number) {
  for (let i = 0; i < seconds * 120; i++) step(s);
}

/** Männchen bei pos, Seil zum Punkt hook am Turm, Tempo vel. */
function hang(pos: { x: number; y: number }, hook: { x: number; y: number }, vel = { x: 0, y: 0 }): State {
  const s = createState();
  s.pos = { ...pos };
  expect(tap(s, hook, holds)).toBe('attached');
  s.vel = { ...vel };
  return s;
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('Einhaken', () => {
  it('Tippen in den leeren Himmel hakt nicht ein', () => {
    const s = createState();
    expect(tap(s, { x: 50, y: 60 }, holds)).toBe('missed');
    expect(s.rope).toBeNull();
    expect(s.phase).toBe('ready');
  });

  it('Hakt genau dort ein, wo getippt wird, und startet den Versuch', () => {
    const s = createState();
    expect(tap(s, { x: 13, y: 29 }, holds)).toBe('attached');
    expect(s.rope?.anchor).toEqual({ x: 13, y: 29 });
    expect(s.phase).toBe('flying');
    expect(s.vel).toEqual(TUNING.startVel);
  });

  it('Hakt auch an einem Ballon ein', () => {
    const s = createState();
    expect(tap(s, { x: 31, y: 61 }, [{ kind: 'circle', x: 30, y: 60, r: 4 }])).toBe('attached');
  });

  it('Nochmals tippen löst das Seil', () => {
    const s = createState();
    expect(tap(s, { x: 13, y: 26 }, holds)).toBe('attached');
    expect(tap(s, { x: 13, y: 26 }, holds)).toBe('released');
    expect(s.rope).toBeNull();
  });
});

describe('Seil', () => {
  it('bleibt immer gleich lang, auch die sichtbare Kette', () => {
    const s = hang({ x: 0, y: 60 }, { x: 20, y: 60 });
    expect(s.rope!.length).toBeCloseTo(20);
    const seg = s.rope!.chain.seg;
    for (let i = 0; i < 120 * 5 && s.rope; i++) {
      step(s);
      expect(dist(s.pos, s.rope.anchor)).toBeLessThanOrEqual(s.rope.length + 1e-6);
      const pts = s.rope.chain.points;
      // einzelne Glieder dürfen sich beim schnellen Schwingen sichtbar wenig dehnen
      for (let k = 0; k < pts.length - 1; k++) expect(dist(pts[k]!, pts[k + 1]!)).toBeLessThan(seg * 1.2);
    }
    expect(s.rope!.length).toBeCloseTo(20);
    const pts = s.rope!.chain.points;
    let total = 0;
    for (let k = 0; k < pts.length - 1; k++) total += dist(pts[k]!, pts[k + 1]!);
    expect(Math.abs(total - 20)).toBeLessThan(1);
  });

  it('bekommt die Mindestlänge, wenn man ganz nah tippt, und rechnet sauber', () => {
    const s = hang({ x: 10, y: 30 }, { x: 10.3, y: 30 });
    expect(s.rope!.length).toBe(TUNING.minRopeLength);
    expect(s.rope!.chain.points).toHaveLength(5);
    run(s, 1);
    expect(s.rope!.chain.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it('fällt ohne Schwung zusammen: hängt durch und zieht nicht', () => {
    const s = hang({ x: 1, y: 20 }, { x: 1, y: 30 }, { x: 0, y: 16 }); // nach oben auf den Haken zu
    let closest = Infinity;
    for (let i = 0; i < 60; i++) {
      step(s);
      closest = Math.min(closest, dist(s.pos, { x: 1, y: 30 }));
    }
    expect(closest).toBeLessThan(s.rope!.length - 3);
    expect(isTaut(s)).toBe(false);
    const pts = s.rope!.chain.points;
    expect(pts[pts.length >> 1]!.y).toBeLessThan((30 + s.pos.y) / 2 - 1); // Mitte hängt durch
  });

  it('Glieder hängen am Haken und am Männchen', () => {
    const s = hang({ x: 0, y: 60 }, { x: 20, y: 60 });
    run(s, 1);
    const pts = s.rope!.chain.points;
    expect(pts[0]).toEqual(s.rope!.anchor);
    expect(pts[pts.length - 1]).toEqual(s.pos);
  });

  it('ein gelöstes Seil fällt herunter und verschwindet', () => {
    const s = hang({ x: 0, y: 60 }, { x: 20, y: 60 });
    run(s, 0.3);
    tap(s, { x: 0, y: 0 }, holds);
    expect(s.looseRopes).toHaveLength(1);
    const y0 = s.looseRopes[0]!.chain.points[0]!.y;
    run(s, 0.5);
    expect(s.looseRopes[0]!.chain.points[0]!.y).toBeLessThan(y0);
    run(s, TUNING.looseRopeTime);
    expect(s.looseRopes).toHaveLength(0);
  });
});

describe('Schwung holen und Loopings', () => {
  it('holt am Seil selbst Schwung – hängt nie einfach still', () => {
    const s = hang({ x: 10, y: 30 }, { x: 10, y: 40 });
    let farthest = 0;
    for (let i = 0; i < 120 * 4; i++) {
      step(s);
      farthest = Math.max(farthest, Math.abs(s.pos.x - 10));
    }
    expect(farthest).toBeGreaterThan(5);
  });

  it('wird allmählich schneller: nach 1 s weit unter dem Haken, nach 2 s noch kein Looping', () => {
    const s = hang({ x: 10, y: 30 }, { x: 10, y: 40 });
    for (let i = 0; i < 120; i++) {
      step(s);
      expect(s.pos.y).toBeLessThan(35);
    }
    const k = hang({ x: 10, y: 50 }, { x: 10, y: 55 }); // kurzes Seil, Looping am leichtesten
    const polar = () => Math.atan2(k.pos.y - 55, k.pos.x - 10);
    let total = 0;
    let last = polar();
    for (let i = 0; i < 240; i++) {
      step(k);
      const a = polar();
      total += Math.atan2(Math.sin(a - last), Math.cos(a - last));
      last = a;
    }
    expect(Math.abs(total)).toBeLessThan(2 * Math.PI);
  });

  it('macht mit genug Schwung Loopings, schnelle Loopings mit gespanntem Seil', () => {
    const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }); // 5 m Seil
    // Winkel des Männchens um den Haken, fortlaufend gezählt
    const polar = () => Math.atan2(s.pos.y - 55, s.pos.x - 10);
    let total = 0;
    let last = polar();
    const tautOnTop: boolean[] = [];
    let onTop = false;
    for (let i = 0; i < 120 * 15 && Math.abs(total) < 3 * 2 * Math.PI; i++) {
      step(s);
      const a = polar();
      total += Math.atan2(Math.sin(a - last), Math.cos(a - last));
      last = a;
      const top = s.pos.y > 55 && Math.abs(s.pos.x - 10) < 0.5;
      if (top && !onTop) tautOnTop.push(isTaut(s));
      onTop = top;
    }
    expect(Math.abs(total)).toBeGreaterThanOrEqual(3 * 2 * Math.PI); // dreimal ganz um den Haken
    // Der erste Looping darf knapp sein (Seil kurz locker), mit mehr Tempo bleibt es oben gespannt
    expect(tautOnTop.at(-1)).toBe(true);
  });

  it('Drehungen werden nur bis zu einer Grenze schneller', () => {
    const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 });
    let fastest = 0;
    for (let i = 0; i < 120 * 30; i++) {
      step(s);
      fastest = Math.max(fastest, Math.hypot(s.vel.x, s.vel.y));
    }
    // Schwung holen bringt es bis nahe maxSwingSpeed; danach kommt bergab (höchstens 10 m
    // Höhenunterschied bei 5 m Seil) nur noch die Schwerkraft dazu
    expect(fastest).toBeGreaterThan(TUNING.maxSwingSpeed * 0.9);
    expect(fastest).toBeLessThan(Math.hypot(TUNING.maxSwingSpeed, Math.sqrt(2 * TUNING.gravity * 10)) + 1);
  });

  it('am lockeren Seil holt es keinen Schwung', () => {
    const runWith = (pump: number) => {
      const old = TUNING.pump;
      TUNING.pump = pump;
      const s = hang({ x: 1, y: 20 }, { x: 1, y: 30 }, { x: 0, y: 12 });
      s.rope!.length = 12; // Seil von Anfang an locker
      run(s, 0.3);
      TUNING.pump = old;
      return s.vel;
    };
    expect(runWith(TUNING.pump)).toEqual(runWith(0));
  });
});

describe('Fliegen', () => {
  it('Lösen behält den Schwung, danach fliegt es im Bogen weiter', () => {
    const s = hang({ x: 0, y: 60 }, { x: 20, y: 60 });
    run(s, 0.5);
    const vel = { ...s.vel };
    expect(tap(s, { x: 20, y: 60 }, holds)).toBe('released');
    expect(s.vel).toEqual(vel);
    const x0 = s.pos.x;
    run(s, 0.5);
    expect(s.pos.x).toBeGreaterThan(x0);
    expect(s.vel.y).toBeLessThan(vel.y - TUNING.gravity * 0.5 * 0.9);
  });

  it('am gespannten Seil zeigt der Kopf zum Haken, beim Lösen dreht es in Schwungrichtung weiter', () => {
    const s = hang({ x: 0, y: 60 }, { x: 20, y: 60 });
    run(s, 0.5);
    expect(isTaut(s)).toBe(true);
    const head = { x: -Math.sin(s.angle), y: Math.cos(s.angle) };
    const toHook = { x: (20 - s.pos.x) / s.rope!.length, y: (60 - s.pos.y) / s.rope!.length };
    expect(head.x * toHook.x + head.y * toHook.y).toBeGreaterThan(0.99);
    tap(s, s.pos, holds);
    expect(s.spin).not.toBe(0);
    const a0 = s.angle;
    const spin = s.spin;
    run(s, 0.3);
    expect(Math.sign(s.angle - a0)).toBe(Math.sign(spin));
  });

  it('dreht im freien Flug mit dem Schwung weiter und wird ruhiger', () => {
    const s = createState();
    s.phase = 'flying';
    s.spin = 6;
    run(s, 0.5);
    expect(s.angle).toBeGreaterThan(1);
    expect(s.spin).toBeLessThan(6);
  });

  it('Vor dem ersten Tipp steht das Männchen still', () => {
    const s = createState();
    run(s, 1);
    expect(s.pos).toEqual(TUNING.startPos);
  });

  it('Der Meterzähler sinkt nicht beim Zurückschwingen', () => {
    const s = createState();
    s.phase = 'flying';
    s.vel = { x: 10, y: 10 };
    run(s, 0.5);
    const weitest = s.pos.x;
    s.vel.x = -10;
    run(s, 0.3);
    expect(s.maxX).toBeCloseTo(weitest, 5);
  });
});

describe('Boden', () => {
  it('Landet es eingehakt, fällt das Seil weiter und verschwindet', () => {
    const s = hang({ x: 4, y: 3 }, { x: 1, y: 2 });
    s.vel = { x: 0, y: -20 };
    run(s, 0.5);
    expect(s.phase).toBe('down');
    expect(s.rope).toBeNull();
    expect(s.looseRopes).toHaveLength(1);
    const y0 = s.looseRopes[0]!.chain.points[0]!.y;
    run(s, 0.2);
    expect(s.looseRopes[0]!.chain.points[0]!.y).toBeLessThan(y0);
    run(s, TUNING.looseRopeTime);
    expect(s.looseRopes).toHaveLength(0);
  });

  it('Am Boden ist der Versuch vorbei, Tippen startet neu', () => {
    const s = createState();
    s.phase = 'flying';
    run(s, 4);
    expect(s.phase).toBe('down');
    expect(tap(s, { x: 0, y: 0 }, holds)).toBe('restart');
    expect(s.phase).toBe('ready');
    expect(s.pos).toEqual(TUNING.startPos);
  });
});
