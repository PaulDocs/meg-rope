import { describe, expect, it } from 'vitest';
import { createState, noSideWalls, stationAt, step, STRENGTH, tap, TUNING, type State } from '../src/physics';
import {
  angleGrade, attemptPoints, breakStrike, createStyle, distanceOf, gradeSwing, isStrike, jerkGrade, multiplier,
  rateSwing, releaseAngle, STYLE, type SwingEnd,
} from '../src/score';
import type { Hold } from '../src/world';

// Wertung: Distanz plus Style, Strike (B-neu-1)

const wall: Hold[] = [{ kind: 'rect', x: -500, y: 0, w: 2000, h: 300 }];
const g = TUNING.gravity;

/** Ein Übergang mit Abflug unter `deg` Grad und Tempo v. */
function swing(deg: number, v = 30, jerk = 0, hold = 1, loops = 0): SwingEnd {
  const r = (deg * Math.PI) / 180;
  return { jerk, hold, vx: v * Math.cos(r), vy: v * Math.sin(r), loops };
}

describe('Noten', () => {
  it('Einhaken nach dem Ruck: perfekt, gut, knapp, raus', () => {
    expect(jerkGrade(0)).toBe('perfect');
    expect(jerkGrade(STYLE.jerk.perfect)).toBe('perfect');
    expect(jerkGrade(8)).toBe('good');
    expect(jerkGrade(15)).toBe('ok');
    expect(jerkGrade(STYLE.jerk.ok + 0.1)).toBe('out');
  });

  it('Lösen nach dem Abflug-Winkel: schräg nach vorne oben ist perfekt, rückwärts raus', () => {
    expect(releaseAngle(1, 1)).toBeCloseTo(45);
    expect(angleGrade(40)).toBe('perfect');
    expect(angleGrade(65)).toBe('good');
    expect(angleGrade(-10)).toBe('ok');
    expect(angleGrade(-30)).toBe('out'); // steil nach unten
    expect(angleGrade(120)).toBe('out'); // rückwärts
  });

  it('die schlechtere Note zählt; zu kurz oder zu langsam ist raus', () => {
    expect(gradeSwing(swing(40))).toBe('perfect');
    expect(gradeSwing(swing(40, 30, 12))).toBe('ok');
    expect(gradeSwing(swing(65, 30, 1))).toBe('good');
    expect(gradeSwing(swing(40, 30, 0, STYLE.minHold - 0.01))).toBe('out');
    expect(gradeSwing(swing(40, STYLE.minSpeed - 1))).toBe('out');
  });
});

describe('Strike', () => {
  it('Übergänge in Folge erhöhen den Faktor, bis zur Obergrenze', () => {
    expect(multiplier(1)).toBe(1);
    expect(multiplier(2)).toBe(1 + STYLE.multiStep);
    expect(multiplier(100)).toBe(STYLE.multiMax);
  });

  it('zählt im Schwung weiter, «raus» beendet ihn', () => {
    const st = createStyle();
    rateSwing(st, swing(40), 1);
    rateSwing(st, swing(65), 2);
    expect(isStrike(st)).toBe(false);
    rateSwing(st, swing(-10), 3); // knapp: bleibt im Strike
    expect(st.strike).toBe(3);
    expect(isStrike(st)).toBe(true);
    expect(rateSwing(st, swing(40, 30, 25), 4)).toBe('out');
    expect(st.strike).toBe(0);
    expect(st.bestStrike).toBe(3);
    expect(st.swings).toBe(4);
    expect(st.last).toMatchObject({ grade: 'out', points: 0 });
  });

  it('Punkte: Note plus Tempo plus Loopings, mal Faktor', () => {
    const st = createStyle();
    rateSwing(st, swing(40, 20), 0); // perfekt, ohne Tempo-Bonus
    expect(st.points).toBe(STYLE.points.perfect);
    rateSwing(st, swing(40, 40, 0, 1, 2), 0); // 2. in Folge, 20 m/s über speedFrom, 2 Loopings
    const second = (STYLE.points.perfect + 20 * STYLE.speedPoints + 2 * STYLE.loopPoints) * multiplier(2);
    expect(st.points).toBe(STYLE.points.perfect + Math.round(second));
  });

  it('ein Strike über viele Übergänge bringt viel mehr als dieselben einzeln', () => {
    const chain = createStyle();
    const single = createStyle();
    for (let i = 0; i < 8; i++) {
      rateSwing(chain, swing(40), i);
      rateSwing(single, swing(40), i);
      breakStrike(single);
    }
    expect(chain.points).toBeGreaterThan(1.8 * single.points); // Faktor 1 … 2,75
  });

  it('Versuch: 1 Punkt je Meter plus Style', () => {
    const st = createStyle();
    rateSwing(st, swing(40, 20), 0);
    expect(distanceOf(TUNING.startPos.x + 123.9, TUNING.startPos.x)).toBe(123);
    expect(distanceOf(TUNING.startPos.x - 5, TUNING.startPos.x)).toBe(0);
    expect(attemptPoints(123, st)).toBe(123 + STYLE.points.perfect);
  });
});

/** Quer zum Seil ohne Ruck einhaken (10-m-Seil, 20 m/s) und lösen, sobald es unter `deg` Grad nach oben fliegt. */
function smoothSwing(s: State, x: number, deg: number): ReturnType<typeof tap> {
  s.phase = 'flying';
  s.hooked = true;
  s.pos = { x, y: 140 };
  s.vel = { x: 20, y: 0 };
  expect(tap(s, { x, y: 150 }, wall, noSideWalls)).toBe('attached');
  for (let i = 0; i < 120 * 3; i++) {
    step(s);
    if (s.rope!.age >= STYLE.minHold && releaseAngle(s.vel.x, s.vel.y) >= deg) break;
  }
  return tap(s, s.pos, wall, noSideWalls);
}

describe('Style im Spiel', () => {
  it('sauber eingehakt und schräg nach oben gelöst: perfekt', () => {
    const s = createState();
    expect(smoothSwing(s, 0, 35)).toBe('released');
    expect(s.style.last?.grade).toBe('perfect');
    expect(s.style.strike).toBe(1);
  });

  it('nach freiem Fall ins Seil (Ruck) ist der Strike vorbei – auch im normalen Spiel', () => {
    const s = createState();
    smoothSwing(s, 0, 35);
    smoothSwing(s, 0, 35);
    expect(s.style.strike).toBe(2);
    s.pos = { x: 0, y: 100 };
    s.vel = { x: 0, y: -Math.sqrt(2 * g * 11) };
    tap(s, { x: 0, y: 110 }, wall, noSideWalls);
    expect(s.rope!.jerk).toBeGreaterThan(STYLE.jerk.ok);
    for (let i = 0; i < 120; i++) step(s);
    tap(s, s.pos, wall, noSideWalls);
    expect(s.style.last?.grade).toBe('out');
    expect(s.style.strike).toBe(0);
    expect(s.style.bestStrike).toBe(2);
  });

  it('am Boden ist der Strike vorbei, ein neuer Versuch beginnt bei null', () => {
    const s = createState();
    smoothSwing(s, 0, 35);
    s.pos = { x: 0, y: 1 };
    s.vel = { x: 0, y: -10 };
    for (let i = 0; i < 120 && s.phase !== 'down'; i++) step(s);
    expect(s.phase).toBe('down');
    expect(s.style.strike).toBe(0);
    expect(s.style.points).toBeGreaterThan(0); // Punkte bleiben bis zur Wertung
    tap(s, { x: 0, y: 0 }, wall, noSideWalls);
    expect(s.style.points).toBe(0);
  });
});

describe('Kraftstation', () => {
  it('im Freien Schwung: vorbeifliegen gibt volle Kraft, einmal je Station', () => {
    const s = createState('free');
    s.phase = 'flying';
    s.hooked = true;
    s.strength = 0.3;
    s.pos = { x: stationAt(1) - 0.1, y: 100 };
    s.vel = { x: 30, y: 0 };
    step(s);
    expect(s.stations).toBe(1);
    expect(s.strength).toBe(1);
    s.strength = 0.3;
    step(s);
    expect(s.strength).toBe(0.3); // dieselbe Station zählt nicht zweimal
  });

  it('alle stationEvery Meter ab dem Start', () => {
    expect(stationAt(2) - stationAt(1)).toBe(STRENGTH.stationEvery);
    expect(stationAt(1)).toBe(TUNING.startPos.x + STRENGTH.stationEvery);
  });

  it('im normalen Spiel bleibt die Kraft voll und unverändert', () => {
    const s = createState('normal');
    s.phase = 'flying';
    s.pos = { x: stationAt(1) + 1, y: 100 };
    step(s);
    expect(s.stations).toBe(1);
    expect(s.strength).toBe(1);
  });
});
