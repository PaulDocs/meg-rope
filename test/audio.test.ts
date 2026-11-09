import { afterEach, describe, expect, it, vi } from 'vitest';
import { cryLevel, impactLevel, jerkLevel, jerkSpeed, loadMuted, MUTE_KEY, saveMuted, SOUND, Sound, SoundObserver, windParams } from '../src/audio';
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
    expect(jerkSpeed(10, 0.2)).toBeCloseTo(6, 6); // 10 · √(1 − 0,8²)
    expect(jerkSpeed(10, -0.5)).toBe(0); // geklemmt
    expect(jerkSpeed(10, 2)).toBeCloseTo(10, 6);
  });
});

describe('Ruf beim Wegfliegen', () => {
  it('langsam still, dann stärker bis voll', () => {
    expect(cryLevel(SOUND.cryFrom - 1)).toBe(0);
    expect(cryLevel(SOUND.cryFrom)).toBe(0);
    expect(cryLevel(50)).toBeGreaterThan(0);
    expect(cryLevel(50)).toBeLessThan(cryLevel(70));
    expect(cryLevel(1000)).toBe(1);
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

  it('kein zweites «jerk» ohne grösseren Verlust; ein neues Seil mit Ruck meldet wieder', () => {
    const { s, ob } = flying();
    s.vel = { x: 0, y: -60 };
    ob.update(s);
    tap(s, { x: 0, y: 110 }, wall, noSideWalls);
    expect(kind(ob.update(s))).toEqual(['hook', 'jerk']);
    for (let i = 0; i < 5; i++) {
      step(s);
      expect(kind(ob.update(s))).not.toContain('jerk');
    }
    tap(s, { x: 0, y: 110 }, wall, noSideWalls); // lösen
    ob.update(s);
    s.pos = { x: 0, y: 100 };
    s.vel = { x: 0, y: -60 };
    ob.update(s);
    tap(s, { x: 0, y: 110 }, wall, noSideWalls);
    expect(kind(ob.update(s))).toContain('jerk');
  });

  it('Lösen im Flug-Tempo ruft «cry», langsam oder am Boden nicht', () => {
    const { s, ob } = flying();
    tap(s, { x: 0, y: 110 }, wall, noSideWalls);
    s.time += 1;
    s.vel = { x: 40, y: 30 };
    ob.update(s);
    tap(s, { x: 0, y: 110 }, wall, noSideWalls);
    const ev = ob.update(s);
    expect(kind(ev)).toEqual(['cry', 'points']);
    expect((ev[0] as { level: number }).level).toBeCloseTo(cryLevel(50), 6);

    const slow = flying();
    tap(slow.s, { x: 0, y: 110 }, wall, noSideWalls);
    slow.s.time += 1;
    slow.s.vel = { x: 5, y: 5 };
    slow.ob.update(slow.s);
    tap(slow.s, { x: 0, y: 110 }, wall, noSideWalls);
    expect(kind(slow.ob.update(slow.s))).not.toContain('cry');
  });

  it('Aufprall mit Seil gibt «ground», aber keinen Ruf', () => {
    const { s, ob } = flying();
    tap(s, { x: 0, y: 5 }, wall, noSideWalls); // Haken knapp über dem Boden
    s.vel = { x: 0, y: -60 };
    ob.update(s);
    let heard: { type: string }[] = [];
    for (let i = 0; i < 600 && s.phase !== 'down'; i++) {
      step(s);
      heard = heard.concat(ob.update(s));
    }
    expect(kind(heard)).toContain('ground');
    expect(kind(heard)).not.toContain('cry');
  });

  it('«points» trägt Note und Folge aus dem Style-Stand, auch «out»', () => {
    const { s, ob } = flying();
    s.style.swings++;
    s.style.last = { grade: 'perfect', points: 50, strike: 3, at: 1 };
    expect(ob.update(s)).toEqual([{ type: 'points', grade: 'perfect', strike: 3 }]);
    s.style.swings++;
    s.style.last = { grade: 'out', points: 0, strike: 0, at: 2 };
    expect(ob.update(s)).toEqual([{ type: 'points', grade: 'out', strike: 0 }]);
  });

  it('guter Schwung in Folge meldet «series» mit Zahl; das Zurücksetzen meldet nichts', () => {
    const { s, ob } = flying('free');
    s.goodSwings = 1;
    expect(ob.update(s)).toEqual([{ type: 'series', count: 1 }]);
    s.goodSwings = 0;
    expect(ob.update(s)).toEqual([]);
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

describe('Sound mit Fake-AudioContext', () => {
  class FakeNode {
    onended: (() => void) | null = null;
    gain = { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} };
    frequency = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} };
    Q = { value: 0 };
    type = '';
    buffer: unknown = null;
    loop = false;
    connect(n: unknown) { return n; }
    disconnect() {}
    start() {}
    stop() {}
  }
  const made = { osc: [] as FakeNode[], src: 0 };
  class FakeContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 100;
    destination = new FakeNode();
    createGain() { return new FakeNode(); }
    createBiquadFilter() { return new FakeNode(); }
    createOscillator() { const n = new FakeNode(); made.osc.push(n); return n; }
    createBufferSource() { made.src++; return new FakeNode(); }
    createBuffer(_c: number, len: number) { const d = new Float32Array(len); return { getChannelData: () => d }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
  function ready(muted = false): Sound {
    vi.stubGlobal('window', { AudioContext: FakeContext });
    made.osc.length = 0;
    made.src = 0;
    const snd = new Sound(muted);
    snd.unlock();
    made.src = 0; // der Wind-Quell zählt nicht
    return snd;
  }
  afterEach(() => vi.unstubAllGlobals());

  it('Ruf und Aufprall nutzen Stimme und Knacken, bleiben aber unter dem Stimmenlimit', () => {
    const snd = ready();
    snd.play([{ type: 'cry', level: 1 }, { type: 'ground', level: 1 }, { type: 'loop' }]);
    expect(made.osc.length).toBeGreaterThanOrEqual(3);
    expect(made.osc.length).toBeLessThanOrEqual(SOUND.maxVoices);
  });

  it('stumm: keine Töne', () => {
    const snd = ready(true);
    snd.play([{ type: 'weak' }, { type: 'hook' }]);
    expect(made.osc).toHaveLength(0);
    expect(made.src).toBe(0);
    snd.setMuted(false);
    snd.play([{ type: 'weak' }]);
    expect(made.osc).toHaveLength(2);
  });

  it('vor unlock(): keine Töne, kein Absturz', () => {
    vi.stubGlobal('window', { AudioContext: FakeContext });
    made.osc.length = 0;
    const snd = new Sound(false);
    expect(() => snd.play([{ type: 'weak' }])).not.toThrow();
    expect(made.osc).toHaveLength(0);
  });

  it('höchstens maxVoices gleichzeitig; nach dem Ausklingen wieder Platz', () => {
    const snd = ready();
    for (let i = 0; i < 20; i++) snd.play([{ type: 'weak' }]);
    expect(made.osc).toHaveLength(SOUND.maxVoices);
    for (const o of made.osc) o.onended?.();
    snd.play([{ type: 'weak' }]);
    expect(made.osc.length).toBeGreaterThan(SOUND.maxVoices);
  });

  it('ohne Web Audio im Browser: kein Absturz', () => {
    vi.stubGlobal('window', {});
    const snd = new Sound(false);
    expect(() => snd.unlock()).not.toThrow();
    expect(() => snd.play([{ type: 'hook' }])).not.toThrow();
    expect(() => snd.setWind(50, true)).not.toThrow();
  });
});
