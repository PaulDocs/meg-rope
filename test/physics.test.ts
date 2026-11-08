import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createState, findAnchor, isTaut, step, tap, TUNING, type Building } from '../src/physics';

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

  it('Das Seil bleibt immer gleich lang', () => {
    const s = createState();
    s.pos = { x: 0, y: 40 };
    const b: Building[] = [{ x: 20, width: 2, height: 41 }];
    expect(tap(s, { x: 20, y: 40 }, b)).toBe('attached');
    expect(s.rope?.length).toBeCloseTo(20);
    const seg = s.rope!.chain.seg;
    for (let i = 0; i < 120 * 5; i++) {
      step(s, b);
      const pts = s.rope!.chain.points;
      for (let k = 0; k < pts.length - 1; k++) {
        expect(Math.hypot(pts[k + 1]!.x - pts[k]!.x, pts[k + 1]!.y - pts[k]!.y)).toBeLessThan(seg * 1.1);
      }
    }
    expect(s.rope?.length).toBeCloseTo(20);
    const pts = s.rope!.chain.points;
    let total = 0;
    for (let k = 0; k < pts.length - 1; k++) total += Math.hypot(pts[k + 1]!.x - pts[k]!.x, pts[k + 1]!.y - pts[k]!.y);
    expect(Math.abs(total - 20)).toBeLessThan(1); // sichtbare Kette höchstens 5 % daneben
  });

  it('Tippt man ganz nah, bekommt das Seil die Mindestlänge und rechnet sauber', () => {
    const s = createState();
    const b: Building[] = [{ x: 10, width: 2, height: 41 }];
    s.pos = { x: 10, y: 30 };
    expect(tap(s, { x: 10.3, y: 30 }, b)).toBe('attached');
    expect(s.rope!.length).toBe(TUNING.minRopeLength);
    expect(s.rope!.chain.points).toHaveLength(5);
    run(s, b, 1);
    expect(s.rope!.chain.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it('Ohne Schwung fällt das Seil zusammen: Männchen kommt näher als die Seillänge', () => {
    const s = createState();
    s.pos = { x: 0, y: 20 };
    const b: Building[] = [{ x: 0, width: 2, height: 41 }];
    tap(s, { x: 1, y: 30 }, b); // Haken 10 m darüber
    s.vel = { x: 0, y: 12 }; // nach oben geworfen, auf den Haken zu
    let closest = Infinity;
    for (let i = 0; i < 60; i++) {
      step(s, b);
      closest = Math.min(closest, Math.hypot(s.pos.x - 1, s.pos.y - 30));
    }
    expect(closest).toBeLessThan(s.rope!.length - 3); // Seil hängt durch, zieht nicht
    expect(isTaut(s)).toBe(false);
    // Die Glieder hängen sichtbar durch: Mitte liegt unter der Geraden Haken–Männchen
    const pts = s.rope!.chain.points;
    const mid = pts[pts.length >> 1]!;
    expect(mid.y).toBeLessThan((30 + s.pos.y) / 2 - 1);
  });

  it('Am lockeren Seil und über dem Haken holt es keinen Schwung', () => {
    const b: Building[] = [{ x: 0, width: 2, height: 41 }];
    const runWith = (pump: number, pos: { x: number; y: number }, vel: { x: number; y: number }) => {
      const old = TUNING.pump;
      TUNING.pump = pump;
      const s = createState();
      s.pos = { ...pos };
      tap(s, { x: 1, y: 30 }, b);
      s.vel = { ...vel };
      run(s, b, 0.3);
      TUNING.pump = old;
      return s.vel;
    };
    // locker: fliegt auf den Haken zu
    expect(runWith(2.2, { x: 1, y: 20 }, { x: 0, y: 12 })).toEqual(runWith(0, { x: 1, y: 20 }, { x: 0, y: 12 }));
    // gespannt, aber über dem Haken
    expect(runWith(2.2, { x: 1, y: 40 }, { x: 3, y: 0 })).toEqual(runWith(0, { x: 1, y: 40 }, { x: 3, y: 0 }));
  });

  it('Das Männchen holt am Seil selbst Schwung – es hängt nie einfach still', () => {
    const s = createState();
    const b: Building[] = [{ x: 0, width: 20, height: 41 }];
    s.pos = { x: 10, y: 30 };
    tap(s, { x: 10, y: 40 }, b); // genau darunter, Seil 10 m
    s.vel = { x: 0, y: 0 };
    let farthest = 0;
    for (let i = 0; i < 120 * 10; i++) {
      step(s, b);
      farthest = Math.max(farthest, Math.abs(s.pos.x - 10));
    }
    expect(farthest).toBeGreaterThan(5); // nach 10 s schwingt es kräftig
  });

  it('Schwung holen geht allmählich: nach 3 s noch unter dem Haken', () => {
    const s = createState();
    const b: Building[] = [{ x: 0, width: 20, height: 41 }];
    s.pos = { x: 10, y: 30 };
    tap(s, { x: 10, y: 40 }, b);
    s.vel = { x: 0, y: 0 };
    for (let i = 0; i < 120 * 3; i++) {
      step(s, b);
      expect(s.pos.y).toBeLessThan(40);
    }
  });

  it('Die Seil-Glieder hängen am Haken und am Männchen', () => {
    const s = createState();
    s.pos = { x: 0, y: 40 };
    const b: Building[] = [{ x: 20, width: 2, height: 41 }];
    tap(s, { x: 20, y: 40 }, b);
    run(s, b, 1);
    const pts = s.rope!.chain.points;
    expect(pts[0]).toEqual(s.rope!.anchor);
    expect(pts[pts.length - 1]).toEqual(s.pos);
  });

  it('Ein gelöstes Seil fällt herunter und verschwindet', () => {
    const s = createState();
    s.pos = { x: 0, y: 40 };
    const b: Building[] = [{ x: 20, width: 2, height: 41 }];
    tap(s, { x: 20, y: 40 }, b);
    run(s, b, 0.3);
    tap(s, { x: 0, y: 0 }, b);
    expect(s.looseRopes).toHaveLength(1);
    const y0 = s.looseRopes[0]!.chain.points[0]!.y;
    run(s, b, 0.5);
    expect(s.looseRopes[0]!.chain.points[0]!.y).toBeLessThan(y0);
    run(s, b, TUNING.looseRopeTime);
    expect(s.looseRopes).toHaveLength(0);
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
  it('Landet es eingehakt, fällt das Seil weiter und verschwindet', () => {
    const s = createState();
    const b: Building[] = [{ x: 0, width: 2, height: 41 }];
    s.pos = { x: 4, y: 3 };
    tap(s, { x: 1, y: 2 }, b); // Seil lang genug bis unter den Boden
    s.vel = { x: 0, y: -20 };
    run(s, b, 0.5);
    expect(s.phase).toBe('down');
    expect(s.rope).toBeNull();
    expect(s.looseRopes).toHaveLength(1);
    const y0 = s.looseRopes[0]!.chain.points[0]!.y;
    run(s, b, 0.2);
    expect(s.looseRopes[0]!.chain.points[0]!.y).toBeLessThan(y0); // fällt auch nach der Landung
    run(s, b, TUNING.looseRopeTime);
    expect(s.looseRopes).toHaveLength(0);
  });

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
