import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO, demoShift, demoStart } from '../src/demo';
import { createRound, endAttempt, type Round } from '../src/game';
import { INTRO, introWanted, runIntro } from '../src/intro';
import { createState, step, tap } from '../src/physics';
import type { Result } from '../src/store';
import { COUNT_UP, countUpValue, resultFx } from '../src/ui';
import { createStreet, isOnHold } from '../src/world';

describe('Titelbild (Demo hinter dem Startmenü)', () => {
  const street = createStreet();
  street.extendTo(600);

  it('hängt am ersten hohen Haus: Haken auf dem Haus, Seil gespannt, genug Luft darunter', () => {
    const d = demoStart(street.holds)!;
    expect(d).not.toBeNull();
    expect(street.holds.some((h) => isOnHold(d.anchor, h, 0))).toBe(true);
    expect(Math.hypot(d.pos.x - d.anchor.x, d.pos.y - d.anchor.y)).toBeCloseTo(DEMO.rope, 9);
    expect(d.anchor.y - DEMO.rope).toBeGreaterThanOrEqual(DEMO.clearance);
  });

  it('ohne passendes Haus gibt es keinen Platz', () => {
    expect(demoStart([])).toBeNull();
    expect(demoStart([{ kind: 'rect', x: 0, y: 0, w: 10, h: 12 }, { kind: 'circle', x: 5, y: 90, r: 3 }])).toBeNull();
  });

  it('das Männchen schwingt eine Minute ohne Ruck, Sturz und Looping', () => {
    const s = createState('normal');
    const d = demoStart(street.holds)!;
    s.pos = d.pos;
    expect(tap(s, d.anchor, street.holds, () => false)).toBe('attached');
    let moved = 0;
    for (let i = 0; i < 120 * 60; i++) {
      step(s);
      moved = Math.max(moved, Math.abs(s.vel.x));
    }
    expect(s.phase).toBe('flying');
    expect(s.rope).not.toBeNull();
    expect(s.rope!.looped).toBe(false);
    expect(s.rope!.lost).toBe(0); // kein Ruck
    expect(moved).toBeGreaterThan(10);
  });

  it('die Tageszeit beginnt am Nachmittag und läuft gleichmässig weiter', () => {
    expect(demoShift(0)).toBe(DEMO.dayStart);
    expect(demoShift(10)).toBe(DEMO.dayStart + 10 * DEMO.daySpeed);
    expect(demoShift(-3)).toBe(DEMO.dayStart);
  });
});

describe('Intro', () => {
  it('läuft normal, aber nicht mit ?intro=0 und nicht bei «weniger Bewegung»', () => {
    expect(introWanted('', false)).toBe(true);
    expect(introWanted('?tageszeit=900', false)).toBe(true);
    expect(introWanted('?intro=0', false)).toBe(false);
    expect(introWanted('', true)).toBe(false);
    expect(INTRO.studio).toBeGreaterThan(INTRO.fade);
  });

  /** Kleinster Ersatz für das DOM, das runIntro braucht. */
  class FakeEl {
    className = '';
    textContent = '';
    hidden = true;
    children: unknown[] = [];
    classes = new Set<string>();
    classList = { add: (c: string) => void this.classes.add(c) };
    listeners: Record<string, () => void> = {};
    append(...c: unknown[]) { this.children.push(...c); }
    replaceChildren(...c: unknown[]) { this.children = c; }
    setAttribute() {}
    addEventListener(type: string, f: () => void) { this.listeners[type] = f; }
  }
  function play() {
    vi.stubGlobal('document', { createElement: () => new FakeEl(), createElementNS: () => new FakeEl() });
    const root = new FakeEl();
    const timers: { f: () => void; ms: number }[] = [];
    let reveals = 0;
    runIntro(root as unknown as HTMLElement, () => reveals++, { setTimeout: ((f: () => void, ms: number) => timers.push({ f, ms })) as unknown as typeof setTimeout });
    return { root, timers, count: () => reveals };
  }
  afterEach(() => vi.unstubAllGlobals());

  it('zeigt das Label, gibt nach der Label-Zeit frei und räumt nach dem Ausblenden auf', () => {
    const { root, timers, count } = play();
    expect(root.hidden).toBe(false);
    expect(root.children).toHaveLength(1);
    expect(count()).toBe(0);
    expect(timers.map((t) => t.ms)).toEqual([INTRO.studio]);
    timers[0]!.f();
    expect(count()).toBe(1);
    expect(root.classes.has('out')).toBe(true);
    expect(root.hidden).toBe(false); // blendet noch aus
    expect(timers[1]!.ms).toBe(INTRO.fade);
    timers[1]!.f();
    expect(root.hidden).toBe(true);
    expect(root.children).toHaveLength(0);
  });

  it('Tippen überspringt; danach gibt die Label-Zeit nicht ein zweites Mal frei', () => {
    const { root, timers, count } = play();
    root.listeners.click!();
    expect(count()).toBe(1);
    timers[0]!.f(); // die Label-Zeit läuft trotzdem ab
    root.listeners.click!();
    expect(count()).toBe(1);
    expect(timers.filter((t) => t.ms === INTRO.fade)).toHaveLength(1);
  });
});

describe('Fanfare zur Wertung', () => {
  const attempt = (points: number, distance = points) => ({ points, distance, style: 0, bestStrike: 0 });
  function single(points: number): Round {
    const r = createRound('single', ['Anna'], 'normal', 'r1');
    endAttempt(r, attempt(points));
    return r;
  }
  function challenge(a: number, b: number): Round {
    const r = createRound('challenge', ['Anna', 'Ben'], 'normal', 'r2');
    for (const p of [a, b]) for (let i = 0; i < 3; i++) endAttempt(r, attempt(p));
    return r;
  }
  const best = (round: string): Result => ({ round, mode: 'single', name: 'Anna', setting: 'normal', score: 500, distance: 500, style: 0, attempts: 1, bestStrike: 0, date: '2026-11-12T10:00:00.000Z' });

  it('Einzelspiel: nur bei neuer Bestleistung aus dieser Runde, nie für 0 Punkte', () => {
    expect(resultFx(single(500), best('r1'))).toBe('record');
    expect(resultFx(single(300), best('alt'))).toBeNull();
    expect(resultFx(single(300), null)).toBeNull();
    expect(resultFx(single(0), best('r1'))).toBeNull();
  });

  it('Challenge: für den Sieg, nicht bei Gleichstand und nicht, wenn alle 0 Punkte haben', () => {
    expect(resultFx(challenge(400, 300), null)).toBe('record');
    expect(resultFx(challenge(300, 300), null)).toBeNull();
    expect(resultFx(challenge(0, 0), null)).toBeNull();
  });
});

describe('Punkte hochzählen in der Wertung', () => {
  it('beginnt bei 0, steigt nie zurück und endet genau auf dem Wert', () => {
    expect(countUpValue(1234, 0)).toBe(0);
    let last = 0;
    for (let t = 0; t <= COUNT_UP; t += 30) {
      const v = countUpValue(1234, t);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
    expect(countUpValue(1234, COUNT_UP)).toBe(1234);
    expect(countUpValue(1234, COUNT_UP * 5)).toBe(1234);
    expect(countUpValue(1234, -50)).toBe(0);
    expect(countUpValue(0, 300)).toBe(0);
  });
});
