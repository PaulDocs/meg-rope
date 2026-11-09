import { describe, expect, it } from 'vitest';
import { createState, isGoodSwing, isTaut, jerkCost, noSideWalls, resetState, ropeLoad, settingByName, settingOf, SETTINGS, step, STRENGTH, tap, TUNING, turnsOnRope, type Level, type State } from '../src/physics';
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

/**
 * Ein guter Schwung: quer zum Seil ohne Ruck einhaken (10-m-Seil, 20 m/s, unten 2 g),
 * schwingen, bis er lang genug gehalten ist und wieder schnell ist, dann lösen.
 */
function goodSwing(s: State): void {
  s.phase = 'flying';
  s.pos = { x: 0, y: 140 };
  s.vel = { x: 20, y: 0 };
  expect(tap(s, { x: 0, y: 150 }, wall, noSideWalls)).toBe('attached');
  for (let i = 0; i < 120 * 4 && !isGoodSwing(s); i++) step(s);
  expect(isGoodSwing(s)).toBe(true);
  expect(tap(s, s.pos, wall, noSideWalls)).toBe('released');
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
      // Anlauf von Schwung zu Schwung (09.11.): gemessen 5 m 7,0 s, 10 m 8,9 s, 20 m 10,2 s
      for (let i = 0; i < 120 * 12 && !looped; i++) {
        step(free);
        looped = free.rope !== null && free.rope.looped;
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

});

describe('Einstellungen', () => {
  it('Startmenü bietet Normal, leicht, mittel, schwer; neuer Versuch behält die Einstellung', () => {
    const s = createState();
    const seen: string[] = [];
    for (const x of SETTINGS) {
      resetState(s, x.variant, x.level);
      seen.push(settingOf(s).name);
    }
    expect(seen).toEqual(['normal', 'free-easy', 'free-medium', 'free-hard']);
    resetState(s, 'free', 'hard');
    s.phase = 'down';
    tap(s, { x: 0, y: 0 }, wall, noSideWalls);
    expect(settingOf(s).name).toBe('free-hard');
  });

  it('gemerkte Einstellung: Unbekanntes oder nichts gibt «normal»', () => {
    expect(settingByName('free-easy')).toMatchObject({ variant: 'free', level: 'easy' });
    expect(settingByName('free-hard')).toMatchObject({ variant: 'free', level: 'hard' });
    expect(settingByName(null).name).toBe('normal');
    expect(settingByName('free').name).toBe('normal');
    expect(settingByName('xyz').name).toBe('normal');
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
    s.goodSwings = 3;
    s.style.strike = 2;
    expect(fallIntoRope(s, 12)).toBe('attached'); // voller Ruck: 0,3 − 0,45 → 0
    expect(s.strength).toBe(0);
    s.vel = { x: 15, y: 0 };
    step(s);
    expect(s.rope).toBeNull();
    expect(s.looseRopes.length).toBe(1);
    expect(s.goodSwings).toBe(0); // Serie vorbei
    expect(s.style.strike).toBe(0); // Strike vorbei …
    expect(s.style.last).toBeNull(); // … ohne Note für einen Übergang
    expect(s.phase).toBe('flying');
    expect(s.vel.x).toBeGreaterThan(14);
  });

  it('erholt sich nicht von selbst: weder im Flug noch ruhig am Seil', () => {
    const fly = createState('free');
    fly.phase = 'flying';
    fly.pos = { x: 0, y: 250 };
    fly.strength = 0.1;
    run(fly, 1);
    expect(fly.strength).toBe(0.1);
    expect(tap(fly, { x: fly.pos.x, y: fly.pos.y + 10 }, wall, noSideWalls)).toBe('weak');
    const pump = TUNING.pump;
    TUNING.pump = 0;
    try {
      const hang = hangStill('free', 10);
      hang.strength = 0.3;
      run(hang, 3);
      expect(hang.strength).toBe(0.3);
    } finally {
      TUNING.pump = pump;
    }
  });

  it('gute Schwünge nacheinander laden langsam auf: ab dem zweiten, je nach Stufe', () => {
    const gained: Record<Level, number> = { easy: 0, medium: 0, hard: 0 };
    for (const level of ['easy', 'medium', 'hard'] as const) {
      const s = createState('free', level);
      s.strength = 0.5;
      goodSwing(s);
      expect(s.goodSwings).toBe(1);
      expect(s.strength).toBe(0.5); // der erste allein gibt nichts
      goodSwing(s);
      expect(s.strength).toBeCloseTo(0.5 + STRENGTH.gain[level], 9);
      goodSwing(s);
      expect(s.strength).toBeCloseTo(0.5 + 2 * STRENGTH.gain[level], 9);
      gained[level] = s.strength - 0.5;
    }
    expect(gained.easy).toBeGreaterThan(gained.medium);
    expect(gained.medium).toBeGreaterThan(gained.hard);
    // höchstens bis 100 %
    const full = createState('free', 'easy');
    full.strength = 0.99;
    goodSwing(full);
    goodSwing(full);
    expect(full.strength).toBe(1);
  });

  it('mit Ruck eingehakt: kein guter Schwung, die Folge beginnt neu', () => {
    const s = createState('free', 'easy');
    s.strength = 0.8;
    goodSwing(s);
    expect(s.goodSwings).toBe(1);
    // quer wie beim guten Schwung, aber 15 m/s nach unten (vom Haken weg): Ruck über jerkFrom
    s.pos = { x: 0, y: 140 };
    s.vel = { x: 20, y: -15 };
    expect(tap(s, { x: 0, y: 150 }, wall, noSideWalls)).toBe('attached');
    expect(s.rope!.clean).toBe(false);
    for (let i = 0; i < 120 * 4 && !(s.rope!.age >= STRENGTH.goodSwingTime && Math.hypot(s.vel.x, s.vel.y) >= STRENGTH.goodSwingSpeed); i++) step(s);
    const before = s.strength;
    tap(s, s.pos, wall, noSideWalls);
    expect(s.goodSwings).toBe(0);
    expect(s.strength).toBe(before);
  });

  it('Loopings kosten Kraft, der Schwung bleibt trotzdem gut', () => {
    const s = createState('free', 'easy');
    s.strength = 0.5;
    goodSwing(s);
    // 5-m-Seil mit 40 m/s quer, ohne Ruck: unten 9 g, über loadFrom
    s.pos = { x: 0, y: 145 };
    s.vel = { x: 40, y: 0 };
    expect(tap(s, { x: 0, y: 150 }, wall, noSideWalls)).toBe('attached');
    run(s, 1);
    expect(s.rope!.clean).toBe(true);
    expect(s.strength).toBeLessThan(0.5);
    const before = s.strength;
    expect(isGoodSwing(s)).toBe(true);
    tap(s, s.pos, wall, noSideWalls);
    expect(s.goodSwings).toBe(2);
    expect(s.strength).toBeCloseTo(before + STRENGTH.gain.easy, 9);
  });

  it('zu langsam gelöst oder zu kurz gehalten: kein guter Schwung', () => {
    const pump = TUNING.pump;
    TUNING.pump = 0;
    try {
      const s = createState('free', 'easy');
      s.goodSwings = 1;
      s.phase = 'flying';
      s.pos = { x: 0, y: 140 };
      s.vel = { x: 12, y: 0 }; // ruckfrei, unten 1,4 g
      tap(s, { x: 0, y: 150 }, wall, noSideWalls);
      // bis zum Umkehrpunkt, dort ist es langsamer als goodSwingSpeed
      for (let i = 0; i < 120 * 4 && !(s.rope!.age >= STRENGTH.goodSwingTime && Math.hypot(s.vel.x, s.vel.y) < 3); i++) step(s);
      expect(s.rope!.clean).toBe(true);
      expect(s.rope!.age).toBeGreaterThanOrEqual(STRENGTH.goodSwingTime);
      expect(isGoodSwing(s)).toBe(false);
      tap(s, s.pos, wall, noSideWalls);
      expect(s.goodSwings).toBe(0);
    } finally {
      TUNING.pump = pump;
    }
    // sofort wieder lösen zählt nicht, auch wenn es schnell ist
    const q = createState('free', 'easy');
    q.goodSwings = 1;
    q.phase = 'flying';
    q.pos = { x: 0, y: 140 };
    q.vel = { x: 20, y: 0 };
    tap(q, { x: 0, y: 150 }, wall, noSideWalls);
    run(q, 0.1);
    expect(isGoodSwing(q)).toBe(false);
    tap(q, q.pos, wall, noSideWalls);
    expect(q.goodSwings).toBe(0);
  });

  it('im normalen Spiel zählt keine Serie', () => {
    const s = createState('normal');
    goodSwing(s);
    goodSwing(s);
    expect(s.goodSwings).toBe(0);
    expect(s.strength).toBe(1);
  });

  it('Fall ins durchhängende Seil kostet Kraft, schnelles Kreisen am gespannten Seil ist kein Ruck', () => {
    // 5-m-Seil, Männchen 1 m unter dem Haken (Seil hängt durch), schnell nach unten: rund 39 m/s beim Spannen
    const s = hangStill('free', 5);
    s.pos = { x: 0, y: 149 };
    s.vel = { x: 0, y: -35 };
    for (let i = 0; i < 120 && !isTaut(s); i++) step(s);
    step(s);
    expect(s.strength).toBeCloseTo(1 - STRENGTH.fullJerkCost, 1);
    // gespannt mit 60 m/s im Kreis: kostet nur den Zug (rund 19 g → rund 6,5 %/s bei loadFrom 6, loadCost 0,005), keine ganzen Rucke
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

  it('Loopings kosten massvoll: rund 7 % je Umdrehung am 5-m-Seil, unter 6 g nichts', () => {
    // Pascal 09.11.: ging zu schnell weg
    const pump = TUNING.pump;
    TUNING.pump = 0;
    try {
      const s = createState('free');
      s.phase = 'flying';
      s.pos = { x: 0, y: 145 };
      s.vel = { x: 85, y: 0 };
      tap(s, { x: 0, y: 150 }, wall, noSideWalls);
      for (let i = 0; i < 120 * 2 && turnsOnRope(s) < 1; i++) step(s);
      expect(turnsOnRope(s)).toBe(1);
      expect(1 - s.strength).toBeGreaterThan(0.04);
      expect(1 - s.strength).toBeLessThan(0.1);
      // knapp unter loadFrom: ganz unten 5,5 g bei 10 m Seil → v² = 4,5·g·L
      const calm = createState('free');
      calm.phase = 'flying';
      calm.pos = { x: 0, y: 140 };
      calm.vel = { x: Math.sqrt(4.5 * g * 10), y: 0 };
      tap(calm, { x: 0, y: 150 }, wall, noSideWalls);
      expect(ropeLoad(calm)).toBeCloseTo(5.5, 5);
      run(calm, 0.1); // unten durch, Zug bleibt unter 6 g (danach würde es übers Seil fallen – das wäre ein Ruck)
      expect(ropeLoad(calm)).toBeGreaterThan(5);
      expect(calm.strength).toBe(1);
    } finally {
      TUNING.pump = pump;
    }
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
