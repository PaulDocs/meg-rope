import { describe, expect, it } from 'vitest';
import { createState, noSideWalls, stationAt, step, STRENGTH, tap, tempoLost, TUNING, type State } from '../src/physics';
import {
  angleGrade, attemptOf, attemptPoints, breakStrike, createStyle, distanceOf, gradeSwing, isStrike, lostGrade, multiplier,
  rateSwing, releaseAngle, STYLE, type SwingEnd,
} from '../src/score';
import type { Hold } from '../src/world';

// Wertung: Distanz plus Style, Strike (B5)

const wall: Hold[] = [{ kind: 'rect', x: -500, y: 0, w: 2000, h: 300 }];
const g = TUNING.gravity;

/** Ein Übergang mit Abflug unter `deg` Grad und Tempo v. */
function swing(deg: number, v = 30, lost = 0, hold = 1, loops = 0): SwingEnd {
  const r = (deg * Math.PI) / 180;
  return { lost, hold, vx: v * Math.cos(r), vy: v * Math.sin(r), loops };
}

describe('Noten', () => {
  it('verlorener Schwung: perfekt, gut, knapp, raus erst über 70 % des Tempos', () => {
    expect(STYLE.lost.ok).toBe(0.7); // Pascal 09.11.
    expect(lostGrade(0)).toBe('perfect');
    expect(lostGrade(STYLE.lost.perfect)).toBe('perfect');
    expect(lostGrade(0.3)).toBe('good');
    expect(lostGrade(0.6)).toBe('ok');
    expect(lostGrade(0.7)).toBe('ok');
    expect(lostGrade(0.71)).toBe('out');
  });

  it('Anteil des Tempos, den ein Ruck wegnahm', () => {
    expect(tempoLost(30, 0)).toBe(0);
    expect(tempoLost(30, 40)).toBeCloseTo(0.4, 9); // vorher 50, nachher 30
    expect(tempoLost(0, 25)).toBe(1); // alles weg
    expect(tempoLost(3, 4)).toBeCloseTo(0.4, 9); // 3-4-5: vorher 5, nachher 3
    expect(tempoLost(10, -5)).toBe(0); // kein Ruck
    expect(tempoLost(60, 18)).toBeLessThan(0.05); // schnell: derselbe Ruck fällt kaum ins Gewicht
  });

  it('Lösen nach dem Abflug-Winkel: schräg nach vorne oben ist perfekt, rückwärts raus', () => {
    expect(releaseAngle(1, 1)).toBeCloseTo(45);
    expect(angleGrade(40)).toBe('perfect');
    expect(angleGrade(65)).toBe('good');
    expect(angleGrade(-10)).toBe('ok');
    expect(angleGrade(-30)).toBe('ok'); // steil nach unten: nur «knapp», aber noch im Schwung
    expect(angleGrade(120)).toBe('ok'); // rückwärts ebenso
  });

  it('die schlechtere Note zählt; zu kurz, zu langsam oder über 70 % Schwung verloren ist raus', () => {
    expect(gradeSwing(swing(40))).toBe('perfect');
    expect(gradeSwing(swing(40, 30, 0.6))).toBe('ok');
    expect(gradeSwing(swing(40, 30, 0.75))).toBe('out');
    expect(gradeSwing(swing(-40))).toBe('ok'); // Winkel allein wirft nicht raus
    expect(gradeSwing(swing(65, 30, 0.05))).toBe('good');
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
    expect(rateSwing(st, swing(40, 30, 0.9), 4)).toBe('out');
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
    expect(s.rope!.lost).toBeGreaterThan(STYLE.lost.ok);
    for (let i = 0; i < 120; i++) step(s);
    tap(s, s.pos, wall, noSideWalls);
    expect(s.style.last?.grade).toBe('out');
    expect(s.style.strike).toBe(0);
    expect(s.style.bestStrike).toBe(2);
  });

  it('schnell eingehakt: derselbe Ruck wiegt wenig, der Strike bleibt (früher «out» ab 18 m/s Ruck)', () => {
    const s = createState();
    s.phase = 'flying';
    s.hooked = true;
    s.pos = { x: 0, y: 100 };
    s.vel = { x: 60, y: -25 }; // 25 m/s vom Haken weg, aber 60 m/s quer dazu
    tap(s, { x: 0, y: 110 }, wall, noSideWalls);
    expect(s.rope!.lost).toBeLessThan(0.1);
    for (let i = 0; i < 120; i++) step(s);
    expect(s.rope!.lost).toBeLessThan(STYLE.lost.good);
    tap(s, s.pos, wall, noSideWalls);
    expect(s.style.last?.grade).not.toBe('out');
    expect(s.style.strike).toBe(1);
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

describe('Versuch aus dem Spielstand', () => {
  it('Meter ab der weitesten Stelle, Style-Punkte und bester Strike', () => {
    const s = createState();
    smoothSwing(s, 0, 35);
    smoothSwing(s, 0, 35);
    s.maxX = TUNING.startPos.x + 50.7;
    const a = attemptOf(s.maxX, TUNING.startPos.x, s.style);
    expect(a.distance).toBe(50);
    expect(a.style).toBe(s.style.points);
    expect(a.points).toBe(50 + s.style.points);
    expect(a.bestStrike).toBe(2);
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
