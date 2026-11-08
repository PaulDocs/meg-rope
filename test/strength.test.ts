import { describe, expect, it } from 'vitest';
import { createState, isTaut, jerkCost, noSideWalls, ropeLoad, step, STRENGTH, tap, TUNING, turnsOnRope, type State } from '../src/physics';
import { onVariantButton, variantButton } from '../src/render';
import type { Hold } from '../src/world';

// Variante «Freier Schwung» mit Kraft (B4)

const wall: Hold[] = [{ kind: 'rect', x: -500, y: 0, w: 1000, h: 300 }];
const g = TUNING.gravity;

function run(s: State, seconds: number) {
  for (let i = 0; i < seconds * 120; i++) step(s);
}

/** Fällt h m frei und hakt dann senkrecht über sich ein: der ganze Fall wird zum Ruck. */
function fallIntoRope(s: State, h: number): ReturnType<typeof tap> {
  s.phase = 'flying';
  s.pos = { x: 0, y: 100 };
  s.vel = { x: 0, y: -Math.sqrt(2 * g * h) };
  return tap(s, { x: 0, y: 110 }, wall, noSideWalls);
}

/** Hängt still am Seil der Länge L. */
function hangStill(variant: 'normal' | 'free', L: number): State {
  const s = createState(variant);
  s.phase = 'flying';
  s.pos = { x: 0, y: 150 - L };
  expect(tap(s, { x: 0, y: 150 }, wall, noSideWalls)).toBe('attached');
  return s;
}

describe('Variante «Freier Schwung»', () => {
  it('aus dem Stand ist ein Looping möglich, in der normalen Variante nicht', () => {
    for (const L of [5, 10, 20]) {
      const free = hangStill('free', L);
      let looped = false;
      for (let i = 0; i < 120 * 8 && !looped; i++) {
        step(free);
        looped = free.rope !== null && turnsOnRope(free) >= 1;
      }
      expect(looped).toBe(true);
      const normal = hangStill('normal', L);
      run(normal, 15);
      expect(turnsOnRope(normal)).toBe(0);
    }
  });

  it('neuer Versuch behält die Variante, mit voller Kraft', () => {
    const s = createState('free');
    s.strength = 0.3;
    s.phase = 'down';
    expect(tap(s, { x: 0, y: 0 }, wall, noSideWalls)).toBe('restart');
    expect(s.variant).toBe('free');
    expect(s.strength).toBe(1);
  });

  it('Schalter oben links nur vor dem ersten Einhaken und am Boden', () => {
    const h = 800;
    const b = variantButton(h);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const s = createState('free');
    expect(onVariantButton(s, h, cx, cy)).toBe(true);
    expect(onVariantButton(s, h, b.x + b.w + 5, cy)).toBe(false);
    s.phase = 'flying';
    expect(tap(s, { x: s.pos.x + 5, y: s.pos.y + 5 }, wall, noSideWalls)).toBe('attached');
    expect(onVariantButton(s, h, cx, cy)).toBe(false);
    s.phase = 'down';
    expect(onVariantButton(s, h, cx, cy)).toBe(true);
  });
});

describe('Kraft', () => {
  it('Ruck kostet nach dem Tempo, das er wegnimmt: ab 10 m/s, voll ab 30 m/s', () => {
    expect(jerkCost(0)).toBe(0);
    expect(jerkCost(STRENGTH.jerkFrom)).toBe(0);
    expect(jerkCost(20)).toBeCloseTo(STRENGTH.fullJerkCost / 2, 9);
    expect(jerkCost(STRENGTH.fullJerk)).toBeCloseTo(STRENGTH.fullJerkCost, 9);
    expect(jerkCost(80)).toBeCloseTo(STRENGTH.fullJerkCost, 9);
  });

  it('nur in der Variante: im normalen Spiel bleibt die Kraft voll', () => {
    const s = createState('normal');
    expect(fallIntoRope(s, 20)).toBe('attached');
    run(s, 1);
    expect(s.strength).toBe(1);
  });

  it('höchstens zwei volle Rucke hintereinander: danach reicht die Kraft nicht mehr zum Einhaken', () => {
    const s = createState('free');
    // 12 m Fall: rund 31 m/s, also ein voller Ruck
    expect(fallIntoRope(s, 12)).toBe('attached');
    expect(s.strength).toBeCloseTo(1 - STRENGTH.fullJerkCost, 9);
    tap(s, s.pos, wall, noSideWalls); // lösen
    expect(fallIntoRope(s, 12)).toBe('attached');
    expect(s.strength).toBeCloseTo(1 - 2 * STRENGTH.fullJerkCost, 9);
    tap(s, s.pos, wall, noSideWalls);
    expect(fallIntoRope(s, 12)).toBe('weak'); // 10 % – zu wenig
    expect(s.rope).toBeNull();
  });

  it('Kraft 0 am Seil: es lässt los und fliegt mit seinem Schwung weiter', () => {
    const s = createState('free');
    s.strength = 0.3;
    expect(fallIntoRope(s, 12)).toBe('attached'); // voller Ruck: 0,3 − 0,45 → 0
    expect(s.strength).toBe(0);
    s.vel = { x: 15, y: 0 };
    step(s);
    expect(s.rope).toBeNull();
    expect(s.looseRopes.length).toBe(1);
    expect(s.phase).toBe('flying');
    expect(s.vel.x).toBeGreaterThan(14);
  });

  it('erholt sich im freien Flug, bis es wieder einhaken kann', () => {
    const s = createState('free');
    s.phase = 'flying';
    s.pos = { x: 0, y: 250 };
    s.strength = 0;
    run(s, 1);
    expect(s.strength).toBeCloseTo(STRENGTH.recover, 2);
    run(s, 0.5);
    expect(s.strength).toBeGreaterThanOrEqual(STRENGTH.toHook);
    expect(tap(s, { x: s.pos.x, y: s.pos.y + 10 }, wall, noSideWalls)).toBe('attached');
  });

  it('erholt sich höchstens bis 100 %: danach wieder nur zwei volle Rucke', () => {
    const s = createState('free');
    s.phase = 'flying';
    s.pos = { x: 0, y: 1000 };
    s.strength = 0.95;
    run(s, 2);
    expect(s.strength).toBe(1);
    expect(fallIntoRope(s, 12)).toBe('attached');
    tap(s, s.pos, wall, noSideWalls);
    expect(fallIntoRope(s, 12)).toBe('attached');
    tap(s, s.pos, wall, noSideWalls);
    expect(fallIntoRope(s, 12)).toBe('weak');
  });

  it('erholt sich auch ruhig am Seil (wenig Zug) und bleibt dabei hängen', () => {
    const pump = TUNING.pump;
    TUNING.pump = 0; // sonst holt es Schwung
    try {
      const s = hangStill('free', 10);
      s.strength = 0.3;
      run(s, 1);
      expect(s.strength).toBeCloseTo(0.3 + STRENGTH.recover, 2);
      expect(s.rope).not.toBeNull();
    } finally {
      TUNING.pump = pump;
    }
  });

  it('Fall ins durchhängende Seil kostet Kraft, schnelles Kreisen am gespannten Seil ist kein Ruck', () => {
    // 5-m-Seil, Männchen 1 m unter dem Haken (Seil hängt durch), schnell nach unten: rund 39 m/s beim Spannen
    const s = hangStill('free', 5);
    s.pos = { x: 0, y: 149 };
    s.vel = { x: 0, y: -35 };
    for (let i = 0; i < 120 && !isTaut(s); i++) step(s);
    step(s);
    expect(s.strength).toBeCloseTo(1 - STRENGTH.fullJerkCost, 1);
    // gespannt mit 60 m/s im Kreis: kostet nur den Zug (rund 19 g → 15 %/s), keine ganzen Rucke
    const pump = TUNING.pump;
    TUNING.pump = 0;
    try {
      const fast = createState('free');
      fast.phase = 'flying';
      fast.pos = { x: 0, y: 145 };
      fast.vel = { x: 60, y: 0 };
      tap(fast, { x: 0, y: 150 }, wall, noSideWalls);
      run(fast, 0.2);
      expect(fast.rope).not.toBeNull();
      expect(fast.strength).toBeLessThan(1);
      expect(fast.strength).toBeGreaterThan(0.95);
    } finally {
      TUNING.pump = pump;
    }
  });

  it('Zug im Seil in g: ganz unten v²/L + g, still hängend 1 g', () => {
    const still = hangStill('free', 10);
    expect(ropeLoad(still)).toBeCloseTo(1, 9);
    const fast = createState('free');
    fast.phase = 'flying';
    fast.pos = { x: 0, y: 140 };
    fast.vel = { x: 40, y: 0 };
    tap(fast, { x: 0, y: 150 }, wall, noSideWalls);
    expect(ropeLoad(fast)).toBeCloseTo((40 * 40) / 10 / g + 1, 9);
  });

  it('Loopings strapazieren: am kurzen Seil ist die Kraft nach einigen Umdrehungen weg', () => {
    const s = hangStill('free', 5);
    let released = -1;
    let turnsBefore = 0;
    for (let i = 0; i < 120 * 20 && released < 0; i++) {
      if (s.rope) turnsBefore = turnsOnRope(s);
      step(s);
      if (!s.rope) released = i / 120;
    }
    expect(released).toBeGreaterThan(0);
    expect(turnsBefore).toBeGreaterThanOrEqual(3); // erst nach ein paar Loopings
    // ruhiges Pendeln bis knapp unter Hakenhöhe (unten 3 g, unter loadFrom) kostet nichts
    const pump = TUNING.pump;
    TUNING.pump = 0;
    try {
      const calm = createState('free');
      calm.phase = 'flying';
      calm.pos = { x: 0, y: 140 };
      calm.vel = { x: Math.sqrt(2 * g * 10) * 0.99, y: 0 };
      tap(calm, { x: 0, y: 150 }, wall, noSideWalls);
      let most = 0;
      for (let i = 0; i < 120 * 15; i++) {
        step(calm);
        most = Math.max(most, ropeLoad(calm));
      }
      expect(most).toBeGreaterThan(2.5);
      expect(most).toBeLessThan(STRENGTH.loadFrom);
      expect(calm.strength).toBe(1);
    } finally {
      TUNING.pump = pump;
    }
  });
});
