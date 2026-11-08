import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createState, findAnchor, step, tap, TUNING, type Building } from '../src/physics';

const tower: Building = { x: 10, width: 6, height: 30 };
const world = [tower];

const solidDefault = TUNING.solidBuildings;
afterEach(() => {
  TUNING.solidBuildings = solidDefault;
});

function run(s: ReturnType<typeof createState>, buildings: Building[], seconds: number) {
  for (let i = 0; i < seconds * 120; i++) step(s, buildings);
}

describe('Einhaken bei festen Häusern', () => {
  beforeEach(() => {
    TUNING.solidBuildings = true;
  });

  it('Tippen in den leeren Himmel hakt nicht ein', () => {
    const s = createState();
    expect(tap(s, { x: 4, y: 60 }, world)).toBe('missed');
    expect(s.rope).toBeNull();
    expect(s.phase).toBe('ready');
  });

  it('Tippen auf ein Gebäude hakt an dessen Oberfläche ein', () => {
    const s = createState();
    s.pos = { x: 4, y: 26 };
    expect(tap(s, { x: 13, y: 26 }, world)).toBe('attached');
    expect(s.rope?.anchor.x).toBeCloseTo(10); // linke Wand, nicht mitten im Haus
    expect(s.rope?.anchor.y).toBeCloseTo(26);
    expect(s.phase).toBe('flying');
  });

  it('Ein Gebäude dazwischen verdeckt das dahinter', () => {
    const near: Building = { x: 6, width: 2, height: 40 };
    const hit = findAnchor({ x: 4, y: 26 }, { x: 13, y: 26 }, [tower, near]);
    expect(hit?.x).toBeCloseTo(6);
  });

  it('Nochmals tippen löst das Seil', () => {
    const s = createState();
    expect(tap(s, { x: 13, y: 26 }, world)).toBe('attached');
    expect(tap(s, { x: 13, y: 26 }, world)).toBe('released');
    expect(s.rope).toBeNull();
  });
});

describe('Schwingen', () => {
  it('Das Seil dehnt sich nie mehr als 1 cm über seine Länge', () => {
    const s = createState();
    s.pos = { x: 0, y: 40 };
    tap(s, { x: 12, y: 45 }, [{ x: 10, width: 6, height: 50 }]);
    const b: Building[] = [{ x: 10, width: 6, height: 50 }];
    for (let i = 0; i < 600; i++) {
      step(s, b);
      if (!s.rope) break;
      const d = Math.hypot(s.pos.x - s.rope.anchor.x, s.pos.y - s.rope.anchor.y);
      expect(d).toBeLessThanOrEqual(s.rope.length + 0.01);
    }
  });

  it('Am Seil schwingt das Männchen unter dem Haken durch', () => {
    const s = createState();
    s.pos = { x: 0, y: 40 };
    const b: Building[] = [{ x: 20, width: 2, height: 41 }];
    tap(s, { x: 20, y: 40 }, b); // Haken waagrecht rechts
    s.vel = { x: 0, y: 0 };
    let lowest = s.pos.y;
    for (let i = 0; i < 240; i++) {
      step(s, b);
      lowest = Math.min(lowest, s.pos.y);
    }
    expect(lowest).toBeLessThan(30); // ist nach unten geschwungen
    expect(s.phase).toBe('flying');
  });

  it('Das Seil zieht sich ein, aber nie unter die Mindestlänge', () => {
    const s = createState();
    s.pos = { x: 0, y: 40 };
    const b: Building[] = [{ x: 20, width: 2, height: 41 }];
    expect(tap(s, { x: 20, y: 40 }, b)).toBe('attached');
    expect(s.rope?.length).toBeCloseTo(20);
    run(s, b, 1);
    expect(s.rope?.length).toBeCloseTo(20 - TUNING.reelSpeed, 1);
    run(s, b, 10);
    expect(s.rope?.length).toBe(TUNING.minRopeLength);
  });

  it('Lösen behält den Schwung, danach fliegt es im Bogen weiter', () => {
    const s = createState();
    s.pos = { x: 0, y: 40 };
    const b: Building[] = [{ x: 20, width: 2, height: 41 }];
    tap(s, { x: 20, y: 40 }, b);
    run(s, b, 0.5);
    const vel = { ...s.vel };
    expect(tap(s, { x: 20, y: 40 }, b)).toBe('released');
    expect(s.vel).toEqual(vel);
    const x0 = s.pos.x;
    run(s, b, 0.5);
    expect(s.pos.x).toBeGreaterThan(x0);
    expect(s.vel.y).toBeLessThan(vel.y - TUNING.gravity * 0.5 * 0.9); // Schwerkraft biegt die Bahn
  });

  it('Vor dem ersten Tipp steht das Männchen still', () => {
    const s = createState();
    run(s, world, 1);
    expect(s.pos).toEqual(TUNING.startPos);
  });

  it('Der Meterzähler sinkt nicht beim Zurückschwingen', () => {
    const s = createState();
    s.phase = 'flying';
    s.vel = { x: 10, y: 10 };
    run(s, [], 0.5);
    const weitest = s.pos.x;
    s.vel.x = -10;
    run(s, [], 0.3);
    expect(s.maxX).toBeCloseTo(weitest, 5);
  });
});

describe('Feste Häuser', () => {
  beforeEach(() => {
    TUNING.solidBuildings = true;
  });

  it('Fliegt nicht durch ein Gebäude hindurch', () => {
    const s = createState();
    s.phase = 'flying';
    s.pos = { x: 2, y: 20 };
    s.vel = { x: 40, y: 0 };
    run(s, world, 0.5);
    expect(s.pos.x).toBeLessThan(tower.x);
  });

  it('Steckt es im Turm nahe dem Dach, kommt es oben heraus', () => {
    const s = createState();
    s.phase = 'flying';
    s.pos = { x: 13, y: 29 };
    s.vel = { x: 0, y: 0 };
    step(s, world);
    expect(s.pos.y).toBeGreaterThanOrEqual(tower.height + TUNING.bodyRadius - 0.01);
  });

  it('Steckt es im Turm nahe der linken Wand, kommt es links heraus', () => {
    const s = createState();
    s.phase = 'flying';
    s.pos = { x: 10.2, y: 10 };
    s.vel = { x: 0, y: 0 };
    step(s, world);
    expect(s.pos.x).toBeLessThanOrEqual(tower.x - TUNING.bodyRadius + 0.01);
  });

  it('Landet auf dem Dach und rutscht, statt hineinzufallen', () => {
    const s = createState();
    s.phase = 'flying';
    s.pos = { x: 13, y: 34 };
    s.vel = { x: 0, y: -5 };
    run(s, world, 1);
    expect(s.pos.y).toBeGreaterThanOrEqual(tower.height + TUNING.bodyRadius - 0.01);
    expect(s.phase).toBe('flying');
  });

});

describe('Häuser als Kulisse', () => {
  beforeEach(() => {
    TUNING.solidBuildings = false;
  });

  it('Hakt genau dort ein, wo getippt wird – auch hinter einer Hauskante', () => {
    const s = createState();
    s.pos = { x: 4, y: 26 };
    expect(tap(s, { x: 13, y: 29 }, world)).toBe('attached');
    expect(s.rope?.anchor).toEqual({ x: 13, y: 29 });
  });

  it('Tippen neben das Haus in den Himmel hakt nicht ein', () => {
    const s = createState();
    expect(tap(s, { x: 30, y: 20 }, world)).toBe('missed');
    expect(tap(s, { x: 13, y: 40 }, world)).toBe('missed');
  });

  it('Fliegt vor dem Haus durch', () => {
    const s = createState();
    s.phase = 'flying';
    s.pos = { x: 2, y: 20 };
    s.vel = { x: 40, y: 0 };
    run(s, world, 0.5);
    expect(s.pos.x).toBeGreaterThan(tower.x + tower.width);
  });
});

describe('Boden', () => {
  it('Am Boden ist der Versuch vorbei, Tippen startet neu', () => {
    const s = createState();
    s.phase = 'flying';
    run(s, [], 3);
    expect(s.phase).toBe('down');
    expect(tap(s, { x: 0, y: 0 }, world)).toBe('restart');
    expect(s.phase).toBe('ready');
    expect(s.pos).toEqual(TUNING.startPos);
  });
});
