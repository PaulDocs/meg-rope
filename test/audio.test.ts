import { describe, expect, it } from 'vitest';
import { impactLevel, jerkLevel, jerkSpeed, loadMuted, MUTE_KEY, saveMuted, SOUND, SoundObserver, windParams } from '../src/audio';
import { createState, noSideWalls, STEP, step, STRENGTH, tap, TUNING, type State } from '../src/physics';
import type { Hold } from '../src/world';

// Töne (reine Logik, ohne AudioContext)

const wall: Hold[] = [{ kind: 'rect', x: -500, y: 0, w: 1000, h: 300 }];

function kind(events: { type: string }[]): string[] {
  return events.map((e) => e.type);
}

describe('Wind folgt dem Tempo', () => {
  it('ist bei Stillstand und langsam still', () => {
    expect(windParams(0).gain).toBe(0);
    expect(windParams(SOUND.windFrom).gain).toBe(0);
    expect(windParams(NaN).gain).toBe(0);
  });
  it('wird mit dem Tempo lauter und höher, aber nie über die Grenzen', () => {
    const a = windParams(20);
    const b = windParams(60);
    const c = windParams(TUNING.maxSpeed);
    expect(b.gain).toBeGreaterThan(a.gain);
    expect(c.gain).toBeGreaterThan(b.gain);
    expect(b.freq).toBeGreaterThan(a.freq);
    expect(c.freq).toBeGreaterThan(b.freq);
    expect(c.gain).toBeCloseTo(SOUND.wind.maxGain, 6);
    expect(c.freq).toBeCloseTo(SOUND.wind.maxFreq, 6);
    expect(windParams(1000).gain).toBeCloseTo(SOUND.wind.maxGain, 6); // darüber nicht lauter
  });
});

describe('Stärke von Ruck und Aufprall', () => {
  it('Ruck: 0 bis 1, voll beim vollen Ruck', () => {
    expect(jerkLevel(0)).toBe(0);
    expect(jerkLevel(STRENGTH.fullJerk / 2)).toBeCloseTo(0.5, 6);
    expect(jerkLevel(STRENGTH.fullJerk)).toBe(1);
    expect(jerkLevel(500)).toBe(1);
  });
  it('Aufprall: wächst mit dem Tempo und bleibt bei 1', () => {
    expect(impactLevel(0)).toBe(0);
    expect(impactLevel(20)).toBeLessThan(impactLevel(40));
    expect(impactLevel(1000)).toBe(1);
  });
});

describe('Ruck aus dem Anteil des verlorenen Tempos', () => {
  it('kein Verlust: kein Ruck; voller Verlust: das ganze Tempo; dazwischen mehr bei mehr Verlust', () => {
    expect(jerkSpeed(50, 0)).toBe(0);
    expect(jerkSpeed(50, 1)).toBeCloseTo(50, 6);
    expect(jerkSpeed(50, 0.3)).toBeLessThan(jerkSpeed(50, 0.7));
    expect(jerkSpeed(0, 0.9)).toBe(0);
  });
});

describe('Stummschalter wird gemerkt', () => {
  it('Standard: Ton an; gespeichert gilt die Wahl', () => {
    const mem = new Map<string, string>();
    const kv = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    expect(loadMuted(kv)).toBe(false);
    saveMuted(kv, true);
    expect(mem.get(MUTE_KEY)).toBe('1');
    expect(loadMuted(kv)).toBe(true);
    saveMuted(kv, false);
    expect(loadMuted(kv)).toBe(false);
  });
  it('ohne Speicher oder bei Fehler: kein Absturz, Ton an', () => {
    expect(loadMuted(null)).toBe(false);
    expect(() => saveMuted(null, true)).not.toThrow();
    const broken = { getItem: () => { throw new Error('gesperrt'); }, setItem: () => { throw new Error('gesperrt'); } };
    expect(loadMuted(broken)).toBe(false);
    expect(() => saveMuted(broken, true)).not.toThrow();
  });
});

describe('SoundObserver meldet Ereignisse aus dem Spielzustand', () => {
  /** Zustand mitten im Flug, mit Beobachter, der das erste Bild schon gesehen hat. */
  function flying(variant: 'normal' | 'free' = 'normal'): { s: State; ob: SoundObserver } {
    const s = createState(variant);
    s.phase = 'flying';
    s.pos = { x: 0, y: 100 };
    s.vel = { x: 0, y: 0 };
    const ob = new SoundObserver();
    ob.update(s);
    return { s, ob };
  }

  it('der erste Aufruf meldet nichts', () => {
    const s = createState();
    expect(new SoundObserver().update(s)).toEqual([]);
  });

  it('Einhaken meldet «hook», ein starker Ruck dazu «jerk» mit Stärke', () => {
    const { s, ob } = flying();
    s.vel = { x: 0, y: -60 };
    ob.update(s); // Tempo vor dem Ruck
    expect(tap(s, { x: 0, y: 110 }, wall, noSideWalls)).toBe('attached');
    step(s);
    const ev = ob.update(s);
    expect(kind(ev)).toEqual(['hook', 'jerk']);
    const jerk = ev.find((e) => e.type === 'jerk') as { level: number };
    expect(jerk.level).toBeGreaterThan(0.5);
    expect(jerk.level).toBeLessThanOrEqual(1);
  });

  it('Einhaken ohne Ruck: nur «hook»; später kein zweites «hook»', () => {
    const { s, ob } = flying();
    expect(tap(s, { x: 0, y: 110 }, wall, noSideWalls)).toBe('attached');
    expect(kind(ob.update(s))).toEqual(['hook']);
    step(s);
    expect(kind(ob.update(s))).toEqual([]);
  });

  it('kleiner Ruck unter der Schwelle bleibt lautlos', () => {
    const { s, ob } = flying();
    s.vel = { x: 0, y: -SOUND.jerkMin / 2 };
    ob.update(s);
    tap(s, { x: 0, y: 110 }, wall, noSideWalls);
    expect(kind(ob.update(s))).toEqual(['hook']);
  });

  it('Aufprall meldet «ground» einmal, mit Stärke nach dem Tempo davor', () => {
    const { s, ob } = flying();
    s.pos.y = 5;
    s.vel = { x: 0, y: -60 };
    let heard: ReturnType<SoundObserver['update']> = [];
    for (let i = 0; i < 600 && s.phase !== 'down'; i++) {
      step(s);
      heard = heard.concat(ob.update(s));
    }
    expect(s.phase).toBe('down');
    const ground = heard.filter((e) => e.type === 'ground') as { level: number }[];
    expect(ground).toHaveLength(1);
    expect(ground[0]!.level).toBeGreaterThan(0.5);
    step(s);
    expect(kind(ob.update(s))).toEqual([]); // am Boden nichts mehr
  });

  it('Lösen meldet «points» mit Note und Folge', () => {
    const { s, ob } = flying();
    tap(s, { x: 0, y: 110 }, wall, noSideWalls);
    ob.update(s);
    s.time += 1; // lange genug gehalten
    s.vel = { x: 30, y: 25 };
    expect(tap(s, { x: 0, y: 110 }, wall, noSideWalls)).toBe('released');
    const ev = ob.update(s);
    expect(kind(ev)).toEqual(['points']);
    expect(ev[0]).toMatchObject({ type: 'points', grade: expect.any(String), strike: expect.any(Number) });
  });

  it('eine volle Umdrehung um den Haken meldet «loop», nur einmal je Umdrehung', () => {
    const { s, ob } = flying();
    tap(s, { x: 0, y: 110 }, wall, noSideWalls);
    ob.update(s);
    s.rope!.turned = 2 * Math.PI + 0.1;
    expect(kind(ob.update(s))).toEqual(['loop']);
    s.rope!.turned += 1;
    expect(kind(ob.update(s))).toEqual([]);
    s.rope!.turned = 4 * Math.PI + 0.1;
    expect(kind(ob.update(s))).toEqual(['loop']);
  });

  it('Kraftstation meldet «station»', () => {
    const { s, ob } = flying('free');
    s.pos.x = TUNING.startPos.x + STRENGTH.stationEvery + 1;
    step(s);
    expect(kind(ob.update(s))).toContain('station');
  });

  it('Warnton bei wenig Kraft: einmal beim Unterschreiten, nicht dauernd', () => {
    const { s, ob } = flying('free');
    s.strength = SOUND.weak.below + 0.05;
    expect(kind(ob.update(s))).toEqual([]);
    s.strength = SOUND.weak.below - 0.01;
    expect(kind(ob.update(s))).toEqual(['weak']);
    s.strength = SOUND.weak.below - 0.05;
    expect(kind(ob.update(s))).toEqual([]);
    expect(kind(ob.update(s))).toEqual([]);
  });

  it('Warnton kommt erst wieder, wenn sich die Kraft erholt hat', () => {
    const { s, ob } = flying('free');
    s.strength = 0.1;
    expect(kind(ob.update(s))).toEqual(['weak']);
    s.strength = SOUND.weak.rearm - 0.05; // erholt, aber noch nicht genug
    ob.update(s);
    s.strength = 0.1;
    expect(kind(ob.update(s))).toEqual([]);
    s.strength = SOUND.weak.rearm + 0.05;
    ob.update(s);
    s.strength = 0.1;
    expect(kind(ob.update(s))).toEqual(['weak']);
  });

  it('Warnton nur in der Variante «Freier Schwung»', () => {
    const { s, ob } = flying('normal');
    s.strength = 0;
    expect(kind(ob.update(s))).toEqual([]);
  });

  it('neuer Versuch (Zeit zurück) macht den Warnton wieder scharf und meldet nichts', () => {
    const { s, ob } = flying('free');
    s.time = 5;
    ob.update(s);
    s.strength = 0.1;
    expect(kind(ob.update(s))).toEqual(['weak']);
    const fresh = createState('free');
    fresh.strength = 0.1;
    expect(ob.update(fresh)).toEqual([]);
    fresh.time += STEP;
    expect(kind(ob.update(fresh))).toEqual(['weak']);
  });
});
