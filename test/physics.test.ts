import { afterEach, describe, expect, it } from 'vitest';
import { createState, isPumping, isTaut, step, swingEnergy, tap, turnsOnRope, TUNING, type State } from '../src/physics';
import type { Hold } from '../src/world';

// Ein hoher, breiter Turm von x 0 bis 20, 80 m hoch
const tower: Hold = { kind: 'rect', x: 0, y: 0, w: 20, h: 80 };
const holds = [tower];

// Tests, die eine Stellschraube ändern, stellen sie hier sicher zurück
const pumpDefault = TUNING.pump;
afterEach(() => {
  TUNING.pump = pumpDefault;
});

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

/**
 * Wie oft das Männchen bei gespanntem Seil ganz oben über dem Haken durchgeht –
 * der sichtbare Looping. Strenger als turnsOnRope() (Netto-Winkel fürs
 * Schwungholen), das auch bei kurz lockerem Seil weiterzählt.
 */
function countLoops(s: State, hook: { x: number; y: number }, seconds: number): number {
  let loops = 0;
  let onTop = false;
  for (let i = 0; i < seconds * 120; i++) {
    step(s);
    const top = isTaut(s) && s.pos.y > hook.y + s.rope!.length - 0.1 && Math.abs(s.pos.x - hook.x) < 0.8;
    if (top && !onTop) loops++;
    onTop = top;
  }
  return loops;
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

  it('wird allmählich schneller: nach 1 s weit unter dem Haken', () => {
    const s = hang({ x: 10, y: 30 }, { x: 10, y: 40 });
    for (let i = 0; i < 120; i++) {
      step(s);
      expect(s.pos.y).toBeLessThan(35);
    }
  });

  it('aus dem Stand gibt es keinen Looping, auch nicht nach 15 s', () => {
    const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }); // kurzes Seil, Looping am leichtesten
    expect(countLoops(s, { x: 10, y: 55 }, 15)).toBe(0);
  });

  it('kommt es mit Tempo vom Flug, macht Schwung holen daraus Loopings', () => {
    // √(4·g·L) reicht allein nicht über den Haken (dafür braucht es √(5·g·L))
    const entry = { x: Math.sqrt(4 * TUNING.gravity * 5), y: 0 };
    const withPump = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, entry);
    expect(countLoops(withPump, { x: 10, y: 55 }, 15)).toBeGreaterThanOrEqual(3);
    const old = TUNING.pump;
    TUNING.pump = 0;
    const without = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, entry);
    const loops = countLoops(without, { x: 10, y: 55 }, 15);
    TUNING.pump = old;
    expect(loops).toBe(0);
  });

  it('jede Umdrehung wird schneller, aber nur die ersten drei', () => {
    const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(5.2 * TUNING.gravity * 5), y: 0 });
    // Tempo jeweils ganz unten, je Umdrehung
    const bottom: number[] = [];
    let below = false;
    for (let i = 0; i < 120 * 15 && bottom.length < 6; i++) {
      step(s);
      const low = s.pos.y < 55 - 4.9 && Math.abs(s.pos.x - 10) < 0.8;
      if (low && !below) bottom.push(Math.hypot(s.vel.x, s.vel.y));
      below = low;
    }
    expect(bottom.length).toBe(6);
    // Durchgang 0 ist der Start; 1–3 nach je einer Umdrehung: jedes Mal schneller
    for (let k = 1; k <= 3; k++) expect(bottom[k]!).toBeGreaterThan(bottom[k - 1]! + 1);
    // ab der dritten Umdrehung kein Zuwachs mehr (nur noch etwas Luftwiderstand)
    expect(bottom[5]!).toBeLessThanOrEqual(bottom[3]! + 0.5);
    // nicht extrem: höchstens so schnell, wie die Energiegrenze erlaubt
    expect(Math.max(...bottom)).toBeLessThan(Math.sqrt(TUNING.swingSpeedAtHookHeight ** 2 + 2 * TUNING.gravity * 5) + 1);
  });

  it('Grenze nach Energie: oben schon bei weniger Tempo Schluss mit Schwung holen', () => {
    // 5 m Seil, Männchen ganz oben, 47 m/s: Energie über der Grenze, obwohl Tempo < 50
    const top = hang({ x: 10, y: 60 }, { x: 10, y: 55 }, { x: -47, y: 0 });
    expect(swingEnergy(top)).toBeGreaterThan(0.5 * TUNING.swingSpeedAtHookHeight ** 2);
    expect(isPumping(top)).toBe(false);
    // ganz unten mit 50 m/s: Energie darunter, es holt noch Schwung
    const bottom = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: 50, y: 0 });
    expect(swingEnergy(bottom)).toBeLessThan(0.5 * TUNING.swingSpeedAtHookHeight ** 2);
    expect(isPumping(bottom)).toBe(true);
  });

  it('auch beim Schwung holen ist es oben langsamer als unten – Abflug je nach Winkel', () => {
    const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(5.2 * TUNING.gravity * 5), y: 0 });
    let top = 0;
    let bottom = 0;
    for (let i = 0; i < 120 * 3 && turnsOnRope(s) < 2; i++) {
      step(s);
      if (turnsOnRope(s) < 1) continue; // in der zweiten Umdrehung messen, Schwung holen läuft
      if (s.pos.y > 59.9) top = Math.hypot(s.vel.x, s.vel.y);
      if (s.pos.y < 50.1) bottom = Math.hypot(s.vel.x, s.vel.y);
    }
    expect(isPumping(s)).toBe(true);
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(bottom - 3);
    // unten² − oben² ≈ 2·g·(2·L); Schwung holen in der halben Runde ändert wenig
    expect(Math.abs(bottom ** 2 - top ** 2 - 2 * TUNING.gravity * 10)).toBeLessThan(0.25 * 2 * TUNING.gravity * 10);
  });

  it('Pendeln zählt nicht als Umdrehung, neu einhaken beginnt bei null', () => {
    const s = hang({ x: 10, y: 30 }, { x: 10, y: 40 }); // 10 m Seil, aus dem Stand
    run(s, 15);
    expect(turnsOnRope(s)).toBe(0);
    const loop = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(5.2 * TUNING.gravity * 5), y: 0 });
    run(loop, 8);
    expect(turnsOnRope(loop)).toBeGreaterThanOrEqual(TUNING.maxPumpTurns);
    tap(loop, loop.pos, holds); // lösen …
    tap(loop, { x: loop.pos.x + 0.5, y: Math.min(79, loop.pos.y + 6) }, holds); // … und neu einhaken
    expect(turnsOnRope(loop)).toBe(0);
  });

  it('oben im Looping langsamer als unten – wie in echt', () => {
    const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(5.2 * TUNING.gravity * 5), y: 0 });
    let top = 0;
    let bottom = 0;
    for (let i = 0; i < 120 * 8; i++) {
      step(s);
      if (turnsOnRope(s) < TUNING.maxPumpTurns) continue; // erst wenn kein Schwung mehr dazukommt
      if (s.pos.y > 59.9) top = Math.hypot(s.vel.x, s.vel.y);
      if (s.pos.y < 50.1) bottom = Math.hypot(s.vel.x, s.vel.y);
    }
    expect(top).toBeGreaterThan(0);
    // Energie bleibt: unten² − oben² = 2·g·(2·L)
    expect(bottom ** 2 - top ** 2).toBeCloseTo(2 * TUNING.gravity * 10, -2);
    expect(top).toBeLessThan(bottom - 3);
  });

  it('Abflug je nach Winkel: steiler gelöst fliegt höher, die Höhe folgt der Physik', () => {
    // gleicher Schwung, einmal unten (waagrecht) und einmal schräg nach oben gelöst
    const flight = (releaseAt: number) => {
      const s = hang({ x: 0, y: 60 }, { x: 0, y: 80 }, { x: 35, y: 0 });
      TUNING.pump = 0;
      run(s, releaseAt);
      tap(s, s.pos, holds);
      const y0 = s.pos.y;
      const vy = s.vel.y;
      let apex = y0;
      for (let i = 0; i < 120 * 3; i++) {
        step(s);
        apex = Math.max(apex, s.pos.y);
      }
      return { rise: apex - y0, expected: vy > 0 ? (vy * vy) / (2 * TUNING.gravity) : 0 };
    };
    const flat = flight(0.01);
    const steep = flight(0.45);
    expect(steep.expected).toBeGreaterThan(3);
    expect(steep.rise).toBeGreaterThan(flat.rise + 2);
    // Wurfhöhe v_y²/(2g); Luftwiderstand nimmt höchstens ein paar Prozent
    expect(steep.rise).toBeGreaterThan(steep.expected * 0.95);
    expect(steep.rise).toBeLessThanOrEqual(steep.expected + 0.05);
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
