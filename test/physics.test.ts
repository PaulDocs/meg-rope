import { afterEach, describe, expect, it } from 'vitest';
import { createState, isDropIn, energyLimit, isPumping, pumpAccel, pumpShare, isTaut, noSideWalls, step, swingEnergy, tap, turnsOnRope, TUNING, type State } from '../src/physics';
import type { Hold } from '../src/world';

// Ein hoher, breiter Turm von x 0 bis 20, 80 m hoch
const tower: Hold = { kind: 'rect', x: 0, y: 0, w: 20, h: 80 };
const holds = [tower];

// Tests, die eine Stellschraube ändern, stellen sie hier sicher zurück
const pumpDefault = TUNING.pump;
const dragDefault = TUNING.airDrag;
afterEach(() => {
  TUNING.pump = pumpDefault;
  TUNING.airDrag = dragDefault;
});

function run(s: State, seconds: number) {
  for (let i = 0; i < seconds * 120; i++) step(s);
}

/** Männchen bei pos, Seil zum Punkt hook am Turm, Tempo vel. */
function hang(pos: { x: number; y: number }, hook: { x: number; y: number }, vel = { x: 0, y: 0 }): State {
  const s = createState();
  s.pos = { ...pos };
  s.vel = { ...vel }; // vor dem Einhaken: das Tempo entscheidet, ob es vom Flug kommt
  expect(tap(s, hook, holds, noSideWalls)).toBe('attached');
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
    expect(tap(s, { x: 50, y: 60 }, holds, noSideWalls)).toBe('missed');
    expect(s.rope).toBeNull();
    expect(s.phase).toBe('dropIn');
  });

  it('Hakt genau dort ein, wo getippt wird, und startet den Versuch', () => {
    const s = createState();
    expect(tap(s, { x: 13, y: 29 }, holds, noSideWalls)).toBe('attached');
    expect(s.rope?.anchor).toEqual({ x: 13, y: 29 });
    expect(s.phase).toBe('flying');
    expect(s.vel).toEqual({ x: 0, y: 0 }); // kein Sprung nach vorne
  });

  it('Hakt auch an einem Ballon ein', () => {
    const s = createState();
    expect(tap(s, { x: 31, y: 61 }, [{ kind: 'circle', x: 30, y: 60, r: 4 }], noSideWalls)).toBe('attached');
  });

  it('Nochmals tippen löst das Seil', () => {
    const s = createState();
    expect(tap(s, { x: 13, y: 26 }, holds, noSideWalls)).toBe('attached');
    expect(tap(s, { x: 13, y: 26 }, holds, noSideWalls)).toBe('released');
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
    tap(s, { x: 0, y: 0 }, holds, noSideWalls);
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
    // Anlauf von Schwung zu Schwung (09.11.): 10 m Seil nach rund 4,7 s über 30°
    for (let i = 0; i < 120 * 6; i++) {
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

  it('aus dem Stand: Schwünge wachsen ohne Stocken bis auf Hakenhöhe, aber kein Looping', () => {
    // Pascal: «beim Versuch Schwung zu holen fällt er immer beim gleichen Punkt»
    // und «Aus dem Stand sollte kein Looping möglich sein» (08.11.)
    for (const L of [5, 10, 20, 30]) {
      const hook = { x: 10, y: 80 };
      const s = hang({ x: 10, y: 80 - L }, hook);
      let highest = -Infinity;
      for (let i = 0; i < 120 * 15; i++) {
        step(s);
        expect(isTaut(s)).toBe(true); // nie zurück ins Seil fallen
        highest = Math.max(highest, s.pos.y);
      }
      expect(highest).toBeGreaterThan(hook.y - 1); // erreicht die Hakenhöhe …
      expect(highest).toBeLessThan(hook.y + 0.5); // … aber kommt kaum darüber
      expect(turnsOnRope(s)).toBe(0);
      expect(s.phase).toBe('flying');
      expect(s.rope!.pumpLimit).toBe(0);
    }
  });

  it('Schwung holen wie auf einer Schaukel: kleiner Anstoss plus Anteil des Tempos, über Hakenhöhe nur wenig', () => {
    // Pascal 09.11.: der erste Schwung nach einem Fall ins Seil soll nach Physik wirken
    const still = hang({ x: 10, y: 50 }, { x: 10, y: 55 });
    step(still);
    expect(pumpAccel(still)).toBeGreaterThanOrEqual(TUNING.pumpStart); // Anstoss aus dem Stillstand
    expect(pumpAccel(still)).toBeLessThan(TUNING.pumpStart + TUNING.pumpGrowth * 0.5);
    // ganz unten mit 5 m/s: Anstoss + 1,2·5
    const v5 = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: 5, y: 0 });
    step(v5);
    expect(pumpAccel(v5)).toBeCloseTo(TUNING.pumpStart + TUNING.pumpGrowth * Math.hypot(v5.vel.x, v5.vel.y), 1);
    // schnell, aber unter Hakenhöhe: höchstens pump
    const fast = hang({ x: 10, y: 40 }, { x: 10, y: 60 }, { x: 25, y: 0 }); // 20 m, Energie 312 − 800 < 0
    step(fast);
    expect(pumpAccel(fast)).toBe(TUNING.pump);
    // vom Flug über Hakenhöhe, noch kein Looping: nur pumpHigh
    const high = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: 26, y: 0 }); // Energie 138 > 0
    step(high);
    expect(high.rope!.pumpLimit).toBe(energyLimit());
    expect(pumpAccel(high)).toBe(TUNING.pumpHigh);
    expect(pumpShare(high)).toBeCloseTo(TUNING.pumpHigh / TUNING.pump, 9);
    // in der Variante «Freier Schwung» genauso (seit 12.11.)
    const free = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: 26, y: 0 });
    free.variant = 'free';
    step(free);
    expect(pumpAccel(free)).toBe(TUNING.pumpHigh);
    // nicht am Seil: 0; pump 0 schaltet alles ab
    expect(pumpAccel(createState())).toBe(0);
    TUNING.pump = 0;
    expect(pumpAccel(high)).toBe(0);
  });

  it('nach dem Fall ins Seil wachsen die Schwünge von Schwung zu Schwung, nicht in einem Zug', () => {
    // 10 m Seil, hängt still: Umkehrpunkte zählen, Ausschlag je Schwung messen
    const s = hang({ x: 10, y: 30 }, { x: 10, y: 40 });
    const amps: number[] = [];
    let last = 0;
    for (let i = 0; i < 120 * 8 && amps.length < 4; i++) {
      step(s);
      if (last !== 0 && Math.sign(s.vel.x) !== Math.sign(last)) amps.push(Math.abs(s.pos.x - 10));
      if (s.vel.x !== 0) last = s.vel.x;
    }
    expect(amps.length).toBe(4);
    expect(amps[0]!).toBeLessThan(1.5); // der erste Schwung ist klein
    for (let k = 1; k < 4; k++) expect(amps[k]!).toBeGreaterThan(amps[k - 1]!); // jeder grösser
  });

  it('Looping vom Flug: höchstens 3 Looping-Anläufe, mit zu wenig Schwung nie, mit viel gleich beim ersten', () => {
    // Pascal 09.11.: 1–3 Versuche; mit zu wenig Schwung auch nach 3 nicht
    const g = TUNING.gravity;
    const tries = (L: number, e: number): { n: number; limit: number | null } => {
      const s = hang({ x: 10, y: 40 - L }, { x: 10, y: 40 }, { x: Math.sqrt(2 * (e * g * L + g * L)), y: 0 });
      let above = false;
      let n = 0;
      for (let i = 0; i < 120 * 30; i++) {
        step(s);
        const a = s.pos.y > 40;
        if (a && !above) n++;
        above = a;
        if (isTaut(s) && s.pos.y > 40 + L - 0.1) return { n, limit: s.rope!.pumpLimit };
      }
      return { n: -1, limit: s.rope!.pumpLimit }; // nie
    };
    for (const L of [5, 10, 20, 30]) {
      // Raster 0,44 … 0,8: erst nie, dann 3, 2, 1 – nie mehr als 3, nie wieder schlechter
      const ns: number[] = [];
      for (let e = 0.44; e <= 0.8001; e += 0.02) ns.push(tries(L, e).n);
      expect(ns[0]).toBe(-1);
      expect(ns[ns.length - 1]).toBe(1);
      expect(ns).toContain(3);
      const first = ns.findIndex((n) => n !== -1);
      for (let k = first; k < ns.length; k++) {
        expect(ns[k]!).toBeGreaterThanOrEqual(1);
        expect(ns[k]!).toBeLessThanOrEqual(3);
        if (k > first) expect(ns[k]!).toBeLessThanOrEqual(ns[k - 1]!);
      }
      expect(tries(L, 0.3).n).toBe(-1); // aus dem Stand
      // knapp über der Flug-Schwelle: vom Flug, aber zu wenig – nach 3 Versuchen nur noch bis Hakenhöhe
      const few = tries(L, 0.45);
      expect(few.n).toBe(-1);
      expect(few.limit).toBe(0);
      const ok = tries(L, 0.6).n;
      expect(ok).toBeGreaterThanOrEqual(2);
      expect(ok).toBeLessThanOrEqual(3);
      expect(tries(L, 1).n).toBe(1);
    }
  }, 30_000); // rechnet viele lange Schwünge: auf belasteter Maschine über 10 s (12.11.2026), sonst unter 5 s

  it('nach 3 misslungenen Looping-Anläufen holt es an diesem Seil nur noch bis Hakenhöhe Schwung', () => {
    const L = 10;
    const g = TUNING.gravity;
    const s = hang({ x: 10, y: 40 - L }, { x: 10, y: 40 }, { x: Math.sqrt(2 * (0.45 * g * L + g * L)), y: 0 });
    step(s);
    expect(s.rope!.pumpLimit).toBe(energyLimit()); // vom Flug
    for (let i = 0; i < 120 * 30 && s.rope!.pumpLimit !== 0; i++) step(s);
    expect(s.rope!.loopTries).toBe(TUNING.maxLoopTries);
    expect(s.rope!.pumpLimit).toBe(0);
    expect(s.rope!.looped).toBe(false);
  });

  it('über den Haken hinweg gefallen ist kein Looping: danach nicht wieder voll Schwung holen', () => {
    // misslungener Versuch: fällt locker über den Haken – der Netto-Winkel zählt, ein Looping ist es nicht
    const L = 30;
    const g = TUNING.gravity;
    const s = hang({ x: 10, y: 40 - L }, { x: 10, y: 40 }, { x: Math.sqrt(2 * (0.46 * g * L + g * L)), y: 0 });
    let fellOver = false;
    for (let i = 0; i < 120 * 30 && !s.rope!.looped; i++) {
      step(s);
      if (turnsOnRope(s) >= 1 && !s.rope!.looped) fellOver = true;
      if (!s.rope!.looped && swingEnergy(s) >= 0 && isTaut(s)) expect(pumpAccel(s)).toBeLessThanOrEqual(TUNING.pumpHigh);
    }
    expect(fellOver).toBe(true);
    expect(s.rope!.loopTries).toBeGreaterThanOrEqual(1); // das Darüberfallen war ein Anlauf
  });

  it('kein Schub fürs Darüberfallen: loopBoost nur nach echtem Looping', () => {
    const L = 30;
    const g = TUNING.gravity;
    const s = hang({ x: 10, y: 40 - L }, { x: 10, y: 40 }, { x: Math.sqrt(2 * (0.46 * g * L + g * L)), y: 0 });
    for (let i = 0; i < 120 * 30 && !s.rope!.looped; i++) {
      const before = turnsOnRope(s);
      const v = Math.hypot(s.vel.x, s.vel.y);
      step(s);
      if (turnsOnRope(s) > before) expect(Math.hypot(s.vel.x, s.vel.y)).toBeLessThan(v * 1.05); // kein × loopBoost
    }
  });

  it('wer oben am Kreis einhakt, hat damit keinen Looping – und es ist schon ein Anlauf', () => {
    // ganz oben über dem Haken, vom Flug: noch kein echter Looping, nur pumpHigh
    const top = hang({ x: 10, y: 60 }, { x: 10, y: 55 }, { x: -15, y: 0 });
    step(top);
    expect(top.rope!.looped).toBe(false);
    expect(top.rope!.loopTries).toBe(1);
    expect(pumpAccel(top)).toBe(TUNING.pumpHigh);
    // schräg über dem Haken eingehakt: zählt als erster Anlauf, nach 3 misslungenen ist Schluss
    const g = TUNING.gravity;
    const L = 10;
    const s = hang({ x: 10 - L * 0.8, y: 40 + L * 0.6 }, { x: 10, y: 40 }, { x: 0, y: -Math.sqrt(0.9 * g * L) });
    expect(s.rope!.loopTries).toBe(1);
    for (let i = 0; i < 120 * 30 && !s.rope!.looped && s.rope!.pumpLimit !== 0; i++) step(s);
    if (!s.rope!.looped) {
      expect(s.rope!.loopTries).toBe(TUNING.maxLoopTries);
      expect(s.rope!.pumpLimit).toBe(0);
    }
  });

  it('schräg fallen lassen und neu einhaken zählt nicht mehr als Flug (Pascal 09.11.: Trick zu leicht)', () => {
    // ungünstigster Winkel: still über der Hakenhöhe, sin θ = 1/√6 – nach dem Ruck rund 0,27·g·L < flightEnergy
    const L = 10;
    const sin = 1 / Math.sqrt(6);
    const cos = Math.sqrt(1 - sin * sin);
    const s = hang({ x: 10 - L * cos, y: 40 + L * sin }, { x: 10, y: 40 });
    for (let i = 0; i < 240 && s.rope!.pumpLimit === null; i++) step(s);
    expect(swingEnergy(s)).toBeGreaterThan(0.2 * TUNING.gravity * L);
    expect(swingEnergy(s)).toBeLessThan(TUNING.flightEnergy * TUNING.gravity * L);
    expect(s.rope!.pumpLimit).toBe(0);
  });

  it('aus dem Stand endet Schwung holen auf Hakenhöhe, vom Flug erst bei der Energiegrenze', () => {
    // 5 m Seil, ganz unten: Hakenhöhe heisst Energie 0, «vom Flug» über flightEnergy·g·L (0,2 → 40)
    const still = hang({ x: 10, y: 50 }, { x: 10, y: 55 });
    expect(still.rope!.pumpLimit).toBeNull(); // erst nach dem ersten Schritt am gespannten Seil
    step(still);
    expect(still.rope!.pumpLimit).toBe(0);
    still.vel = { x: 12, y: 0 }; // Energie ½·144 − 40·5 = −128: unter Hakenhöhe
    expect(isPumping(still)).toBe(true);
    still.vel = { x: 21, y: 0 }; // ½·441 − 200 = 20,5: über Hakenhöhe
    expect(isPumping(still)).toBe(false);
    // knapp über Hakenhöhe eingehakt ist noch kein Flug, deutlich darüber schon
    const slow = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: 21, y: 0 });
    step(slow);
    expect(slow.rope!.pumpLimit).toBe(0);
    const flight = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: 26, y: 0 }); // ½·676 − 200 = 138
    step(flight);
    expect(flight.rope!.pumpLimit).toBe(energyLimit());
    expect(isPumping(flight)).toBe(true);
  });

  it('fällt es senkrecht ins Seil, kostet der Ruck den Schwung: zählt nicht als Flug', () => {
    // 5 m über dem Haken still eingehakt: fällt am Haken vorbei ins Seil
    const s = hang({ x: 10, y: 60 }, { x: 10, y: 55 });
    for (let i = 0; i < 240 && s.rope!.pumpLimit === null; i++) step(s);
    expect(s.rope!.pumpLimit).toBe(0);
  });

  it('Ruck beim Einhaken: nimmt nur das Tempo vom Haken weg', () => {
    // 5 m unter dem Haken, fällt schräg nach unten: der Teil nach unten (vom Haken weg) fällt weg
    const away = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: 5, y: -10 });
    expect(away.vel.x).toBeCloseTo(5, 9);
    expect(away.vel.y).toBeCloseTo(0, 9);
    // auf den Haken zu: kein Ruck, Tempo bleibt
    const toward = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: 0, y: 10 });
    expect(toward.vel).toEqual({ x: 0, y: 10 });
  });

  it('fällt es schräg ins Seil, bleibt nach dem Ruck höchstens rund 0,27·g·L', () => {
    // 5,1 m Seil schräg über dem Haken, still: fällt am Haken vorbei ins Seil
    const s = hang({ x: 11, y: 60 }, { x: 10, y: 55 });
    for (let i = 0; i < 240 && s.rope!.pumpLimit === null; i++) step(s);
    expect(s.rope!.pumpLimit).toBe(0);
    expect(swingEnergy(s)).toBeLessThan(0.27 * TUNING.gravity * s.rope!.length);
  });

  it('festgehalten (Frage an Pascal offen): hoch über sich einhaken gilt als «aus dem Stand», tief fallen als «vom Flug»', () => {
    // schnell fliegend 20 m über sich eingehakt: Energie ½·900 − 40·20 = −350, unter Hakenhöhe
    const high = hang({ x: 10, y: 50 }, { x: 10, y: 70 }, { x: 30, y: 0 });
    step(high);
    expect(high.rope!.pumpLimit).toBe(0);
    // 10 m gefallen (20 m/s), dann seitlich auf gleicher Höhe an 5 m Seil: ½·400 = 200 > flightEnergy·g·L (0,2 → 40)
    const fell = hang({ x: 10, y: 50 }, { x: 15, y: 50 }, { x: 0, y: -Math.sqrt(2 * TUNING.gravity * 10) });
    step(fell);
    expect(fell.rope!.pumpLimit).toBe(energyLimit());
    // Schwelle flightEnergy: knapp darunter / darüber (5 m Seil ganz unten, Energie ½v² − 200)
    const at = (e: number) => {
      const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(2 * (e + 200)), y: 0 });
      step(s);
      return s.rope!.pumpLimit;
    };
    expect(at(TUNING.flightEnergy * TUNING.gravity * 5 - 5)).toBe(0);
    expect(at(TUNING.flightEnergy * TUNING.gravity * 5 + 5)).toBe(energyLimit());
  });

  it('aus dem Stand oben lösen und knapp darunter neu einhaken gibt keinen Looping', () => {
    // breite Wand, damit überall eingehakt werden kann
    const wall: Hold[] = [{ kind: 'rect', x: -100, y: 0, w: 200, h: 100 }];
    for (const [dx, dy] of [[0, -1.5], [1, -1], [2, -1], [1, -2], [-1, -1], [3, -2], [2, -4]] as const) {
      const hook = { x: 10, y: 80 };
      const s = createState();
      s.pos = { x: 10, y: 60 };
      expect(tap(s, hook, wall, noSideWalls)).toBe('attached');
      for (let i = 0; i < 120 * 15 && s.pos.y < hook.y - 0.3; i++) step(s); // hoch bis zur Hakenhöhe
      expect(s.pos.y).toBeGreaterThan(hook.y - 1);
      expect(tap(s, hook, wall, noSideWalls)).toBe('released');
      const again = { x: s.pos.x + dx * Math.sign(s.pos.x - hook.x), y: s.pos.y + dy };
      expect(tap(s, again, wall, noSideWalls)).toBe('attached');
      // erst zählen, wenn das Seil zieht (sonst zählte die Startlage über dem Haken als Looping)
      for (let i = 0; i < 240 && s.rope!.pumpLimit === null; i++) step(s);
      expect(s.rope!.pumpLimit).toBe(0);
      expect(countLoops(s, again, 15)).toBe(0);
      expect(turnsOnRope(s)).toBe(0);
    }
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
    // ganz unten kommt man kurz vor dem Schub vorbei: Durchgang 4 hat den dritten Schub schon,
    // danach kein Zuwachs mehr (nur noch etwas Luftwiderstand)
    expect(bottom[4]!).toBeGreaterThan(bottom[3]! + 1);
    expect(bottom[5]!).toBeLessThanOrEqual(bottom[4]! + 0.5);
    // nicht extrem: höchstens Energiegrenze plus die drei Schübe
    const cap = Math.sqrt(TUNING.swingSpeedAtHookHeight ** 2 + 2 * TUNING.gravity * 5) * TUNING.loopBoost ** TUNING.maxPumpTurns;
    expect(Math.max(...bottom)).toBeLessThan(cap + 1);
  });

  it('Grenze nach Energie: oben schon bei weniger Tempo Schluss mit Schwung holen', () => {
    // 5 m Seil, Männchen ganz oben, knapp schneller als die Grenze oben erlaubt:
    // Energie darüber, obwohl das Tempo unter swingSpeedAtHookHeight liegt
    const vTop = Math.sqrt(2 * (energyLimit() - TUNING.gravity * 5)) + 1;
    expect(vTop).toBeLessThan(TUNING.swingSpeedAtHookHeight);
    const top = hang({ x: 10, y: 60 }, { x: 10, y: 55 }, { x: -vTop, y: 0 });
    step(top); // die Grenze des Seils steht nach dem ersten Schritt fest
    expect(top.rope!.pumpLimit).toBe(energyLimit());
    expect(swingEnergy(top)).toBeGreaterThan(0.5 * TUNING.swingSpeedAtHookHeight ** 2);
    expect(isPumping(top)).toBe(false);
    // Gegenfall: oben knapp langsamer, Energie unter der Grenze – holt noch Schwung
    const below = hang({ x: 10, y: 60 }, { x: 10, y: 55 }, { x: -(vTop - 2), y: 0 });
    step(below);
    expect(swingEnergy(below)).toBeLessThan(energyLimit());
    expect(isPumping(below)).toBe(true);
    // ganz unten mit genau diesem Tempo: Energie darunter, es holt noch Schwung
    const bottom = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: TUNING.swingSpeedAtHookHeight, y: 0 });
    step(bottom); // die Grenze des Seils steht nach dem ersten Schritt fest
    expect(swingEnergy(bottom)).toBeLessThan(0.5 * TUNING.swingSpeedAtHookHeight ** 2);
    expect(isPumping(bottom)).toBe(true);
  });

  it('auch beim Schwung holen ist es oben langsamer als unten – Abflug je nach Winkel', () => {
    const drag = TUNING.airDrag;
    TUNING.airDrag = 0; // ohne Luft lässt sich der Unterschied genau vorausrechnen
    const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(5.2 * TUNING.gravity * 5), y: 0 });
    let top = 0;
    let bottom = 0;
    // in der zweiten Umdrehung: erst unten (gleich nach dem Schub), dann oben
    for (let i = 0; i < 120 * 3 && top === 0; i++) {
      step(s);
      if (turnsOnRope(s) < 1) continue;
      if (bottom === 0 && s.pos.y < 50.1) bottom = Math.hypot(s.vel.x, s.vel.y);
      if (bottom > 0 && s.pos.y > 59.9) top = Math.hypot(s.vel.x, s.vel.y);
    }
    TUNING.airDrag = drag;
    expect(isPumping(s)).toBe(true);
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(bottom - 0.5); // pump 22 hebt den Unterschied fast auf, aber nicht ganz
    // unten² − oben² = 2·g·(2·L) − 2·pump·(π·L): Schwung holen auf der halben Runde verkleinert den Unterschied
    // (nach den ersten 3 Umdrehungen holt es keinen Schwung mehr, dann gilt wieder 2·g·2L)
    const L = 5;
    const expected = 2 * TUNING.gravity * 2 * L - 2 * TUNING.pump * Math.PI * L;
    const diff = bottom ** 2 - top ** 2;
    // Die Schritt-Rechnung trifft die Arbeit von Schwung holen auf wenige Prozent
    // (gemessen 145 statt 109 bei einem Schwung-holen-Anteil von 691)
    expect(Math.abs(diff - expected)).toBeLessThan(0.08 * 2 * TUNING.pump * Math.PI * L);
    expect(diff).toBeLessThan(0.9 * 2 * TUNING.gravity * 2 * L); // Schwung holen wirkt
  });

  it('Pendeln zählt nicht als Umdrehung, neu einhaken beginnt bei null', () => {
    // Pendeln ohne Schwung holen, Ausschlag unter der Hakenhöhe
    TUNING.pump = 0;
    const s = hang({ x: 10, y: 30 }, { x: 10, y: 40 }, { x: 15, y: 0 }); // 10 m Seil
    run(s, 15);
    expect(turnsOnRope(s)).toBe(0);
    TUNING.pump = pumpDefault;
    // mit Schwung holen: die erste Sekunde bleibt der Ausschlag unter dem Haken, zählt also auch nicht
    const p = hang({ x: 10, y: 30 }, { x: 10, y: 40 });
    run(p, 1);
    expect(p.pos.y).toBeLessThan(40);
    expect(turnsOnRope(p)).toBe(0);
    const loop = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(5.2 * TUNING.gravity * 5), y: 0 });
    run(loop, 8);
    expect(turnsOnRope(loop)).toBeGreaterThanOrEqual(TUNING.maxPumpTurns);
    tap(loop, loop.pos, holds, noSideWalls); // lösen …
    tap(loop, { x: loop.pos.x + 0.5, y: Math.min(79, loop.pos.y + 6) }, holds, noSideWalls); // … und neu einhaken
    expect(turnsOnRope(loop)).toBe(0);
  });

  it('nach jeder der ersten 3 Umdrehungen ein Schub (× loopBoost), danach keiner', () => {
    const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(5.2 * TUNING.gravity * 5), y: 0 });
    const ratios: number[] = [];
    for (let i = 0; i < 120 * 15 && ratios.length < 5; i++) {
      const before = turnsOnRope(s);
      const v0 = Math.hypot(s.vel.x, s.vel.y);
      step(s);
      if (turnsOnRope(s) > before) ratios.push(Math.hypot(s.vel.x, s.vel.y) / v0);
    }
    expect(ratios.length).toBe(5);
    // Umdrehung 1–3: deutlicher Sprung (ein Schritt Schwerkraft/Schwung holen ändert nur wenig)
    for (const r of ratios.slice(0, 3)) expect(r).toBeGreaterThan(1 + (TUNING.loopBoost - 1) * 0.5);
    for (const r of ratios.slice(0, 3)) expect(r).toBeLessThanOrEqual(TUNING.loopBoost + 0.01);
    // und das dreimal hintereinander: zusammen spürbar schneller
    expect(ratios[0]! * ratios[1]! * ratios[2]!).toBeGreaterThan(1.25);
    // ab der 4.: kein Sprung mehr
    for (const r of ratios.slice(3)) expect(Math.abs(r - 1)).toBeLessThan(0.01);
  });

  it('ohne Schub sind die Loopings deutlich langsamer', () => {
    const fastestBottom = () => {
      const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(5.2 * TUNING.gravity * 5), y: 0 });
      let v = 0;
      while (turnsOnRope(s) < 3 && s.time < 15) {
        step(s);
        if (s.pos.y < 50.1) v = Math.max(v, Math.hypot(s.vel.x, s.vel.y));
      }
      return v;
    };
    const withBoost = fastestBottom();
    const old = TUNING.loopBoost;
    TUNING.loopBoost = 1;
    const without = fastestBottom();
    TUNING.loopBoost = old;
    expect(withBoost).toBeGreaterThan(without + 2);
  });

  it('oben im Looping langsamer als unten – wie in echt', () => {
    // mit Luft verliert es auf der halben Runde rund 7 % (gemessen 747 statt 800) – ohne lässt sich die
    // Energie genau vergleichen. Dass die Loopings auch mit Luft zustande kommen: Test darunter.
    TUNING.airDrag = 0; // afterEach stellt zurück
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

  it('mit Luftwiderstand: vom Flug mit √(5,2·g·L) dreht es seine ersten Loopings in wenigen Sekunden', () => {
    const s = hang({ x: 10, y: 50 }, { x: 10, y: 55 }, { x: Math.sqrt(5.2 * TUNING.gravity * 5), y: 0 });
    let t = -1;
    for (let i = 0; i < 120 * 8 && t < 0; i++) {
      step(s);
      if (turnsOnRope(s) >= TUNING.maxPumpTurns) t = i / 120;
    }
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(4);
    expect(s.rope!.looped).toBe(true);
    // danach (ohne Schwung holen) oben langsamer als unten; Luft kostet auf der halben Runde etwas
    let top = 0;
    for (let i = 0; i < 120 * 2; i++) {
      step(s);
      if (s.pos.y > 59.9) top = Math.hypot(s.vel.x, s.vel.y);
      if (top > 0 && s.pos.y < 50.1) break;
    }
    const bottom = Math.hypot(s.vel.x, s.vel.y);
    const ideal = 2 * TUNING.gravity * 2 * 5;
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(bottom - 3);
    expect(bottom ** 2 - top ** 2).toBeLessThanOrEqual(ideal);
    expect(bottom ** 2 - top ** 2).toBeGreaterThan(0.85 * ideal); // gemessen rund 0,93
  });

  it('Abflug je nach Winkel: steiler gelöst fliegt höher, die Höhe folgt der Physik', () => {
    // gleicher Schwung, einmal unten (waagrecht) und einmal schräg nach oben gelöst
    const flight = (releaseAt: number) => {
      const s = hang({ x: 0, y: 60 }, { x: 0, y: 80 }, { x: 35, y: 0 });
      TUNING.pump = 0;
      run(s, releaseAt);
      tap(s, s.pos, holds, noSideWalls);
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

  it('mit vollem Schwung steil gelöst: rund 80 m hoch (Pascal), danach fällt es schwer', () => {
    // auf Hakenhöhe mit genau dem Grenztempo senkrecht nach oben gelöst
    const s = hang({ x: 10, y: 60 }, { x: 0, y: 60 }, { x: 0, y: TUNING.swingSpeedAtHookHeight });
    tap(s, s.pos, holds, noSideWalls);
    let apex = s.pos.y;
    let t = 0;
    while (s.vel.y > 0) {
      step(s);
      t++;
      apex = Math.max(apex, s.pos.y);
    }
    expect(apex - 60).toBeGreaterThan(72);
    expect(apex - 60).toBeLessThan(85);
    // fällt deutlich schneller als in echt (9.81): nach 1 s Fall über 35 m/s
    for (let i = 0; i < 120; i++) step(s);
    expect(-s.vel.y).toBeGreaterThan(35);
  });

  it('bleibt nie schräg in der Luft hängen: fast still am gespannten Seil schwingt es nach unten', () => {
    // Pascals Bild: schräg unter dem Haken, fast kein Tempo, ein wenig bergauf – auch gespiegelt und ganz still
    const cases = [
      { pos: { x: 28.1, y: 60.6 }, vel: { x: 0.4, y: 0.25 } },
      { pos: { x: 9.9 - 18.2, y: 60.6 }, vel: { x: -0.4, y: 0.25 } },
      { pos: { x: 28.1, y: 60.6 }, vel: { x: 0, y: 0 } },
    ];
    for (const c of cases) {
      const s = hang(c.pos, { x: 9.9, y: 80 });
      s.vel = { ...c.vel }; // nach dem Einhaken: genau Pascals Zustand, ohne Ruck beim Einhaken
      const y0 = s.pos.y;
      run(s, 1);
      expect(s.pos.y).toBeLessThan(y0 - 5); // fällt und schwingt nach unten
      expect(Math.hypot(s.vel.x, s.vel.y)).toBeGreaterThan(10);
    }
  });

  it('ohne Schwung holen und ohne Luft behält ein Pendel seine Energie', () => {
    const drag = TUNING.airDrag;
    TUNING.pump = 0;
    TUNING.airDrag = 0;
    try {
      for (const start of [
        { pos: { x: 30, y: 80 }, vel: { x: 0, y: 0 } }, // waagrecht auf Hakenhöhe aus dem Stand
        { pos: { x: 10, y: 60 }, vel: { x: 35, y: 0 } }, // ganz unten mit Tempo
      ]) {
        const s = hang(start.pos, { x: 10, y: 80 }, start.vel);
        const e0 = swingEnergy(s);
        run(s, 10);
        const e = swingEnergy(s);
        const scale = Math.abs(e0) + TUNING.gravity * 20; // Energie-Massstab: 20 m Seil
        expect(Math.abs(e - e0) / scale).toBeLessThan(0.02);
      }
    } finally {
      TUNING.airDrag = drag;
    }
  });

  it('sehr kurzes Seil, Höchsttempo: bleibt endlich und wird nicht schneller', () => {
    const s = hang({ x: 10, y: 79 }, { x: 10, y: 80 }, { x: 200, y: 0 }); // 1 m Seil
    for (let i = 0; i < 5; i++) {
      step(s);
      expect(Number.isFinite(s.vel.x) && Number.isFinite(s.vel.y)).toBe(true);
      expect(Math.hypot(s.vel.x, s.vel.y)).toBeLessThanOrEqual(TUNING.maxSpeed * 1.2);
    }
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
    expect(tap(s, { x: 20, y: 60 }, holds, noSideWalls)).toBe('released');
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
    tap(s, s.pos, holds, noSideWalls);
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

  it('Einflug wie im Vorbild: kurz schweben, dann gerade herunterfallen, nicht nach vorne', () => {
    const s = createState();
    run(s, TUNING.dropInDelay * 0.9);
    expect(s.pos).toEqual(TUNING.startPos);
    expect(s.phase).toBe('dropIn');
    run(s, TUNING.dropInDelay * 0.1 + 1);
    expect(s.phase).toBe('flying');
    expect(s.pos.x).toBeCloseTo(TUNING.startPos.x, 6); // fällt senkrecht
    expect(s.pos.y).toBeLessThan(TUNING.startPos.y - 10);
    run(s, 2);
    expect(s.phase).toBe('down'); // ohne Einhaken unten
  });

  it('Hinweis «Tippe auf …» nur im Einflug, bis zum ersten Einhaken', () => {
    const s = createState();
    expect(isDropIn(s)).toBe(true);
    run(s, 1);
    expect(isDropIn(s)).toBe(true); // fällt, noch nie eingehakt
    expect(tap(s, { x: 10, y: 60 }, holds, noSideWalls)).toBe('attached');
    expect(isDropIn(s)).toBe(false);
    tap(s, s.pos, holds, noSideWalls); // lösen: Hinweis kommt nicht zurück
    expect(isDropIn(s)).toBe(false);
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
    // Haken 4 m hoch, Seil 5,1 m: der tiefste Punkt liegt unter dem Boden
    const s = hang({ x: 6, y: 3 }, { x: 1, y: 4 });
    s.vel = { x: 0, y: -20 };
    for (let i = 0; i < 60 && s.phase !== 'down'; i++) step(s);
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
    expect(tap(s, { x: 0, y: 0 }, holds, noSideWalls)).toBe('restart');
    expect(s.phase).toBe('dropIn');
    expect(s.pos).toEqual(TUNING.startPos);
  });
});
