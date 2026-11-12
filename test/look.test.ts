import { describe, expect, it } from 'vitest';
import { css, DAY_CYCLE, dimmed, fromHex, hash, isLit, lookAt, mix, windowGrid } from '../src/look';
import { createState, resetState, TUNING } from '../src/physics';
import { lookDistance } from '../src/render';

describe('Tageszeit nach Strecke', () => {
  it('beginnt am hellen Tag: keine Nacht, dunkles Männchen auf hellem Rand', () => {
    const l = lookAt(0);
    expect(l.night).toBe(0);
    expect(l.dark).toBe(false);
    expect(l.ink).not.toBe(l.paper);
    expect(l.sunY).toBeLessThan(0.5); // Sonne steht hoch
  });

  it('wird nach rund der halben Strecke Nacht: Männchen und Schrift hell, Sonne weg, Mond da', () => {
    const l = lookAt(DAY_CYCLE * 0.6);
    expect(l.night).toBe(1);
    expect(l.dark).toBe(true);
    expect(l.ink).not.toBe(lookAt(0).ink);
    expect(l.sunY).toBeGreaterThan(1);
    expect(l.moonY).toBeLessThan(0.5);
    expect(l.dim).toBeGreaterThan(0.5);
  });

  it('wird stetig dunkler vom Tag zur Nacht und wieder stetig heller bis zum Morgen', () => {
    let before = -1;
    for (let d = DAY_CYCLE * 0.17; d <= DAY_CYCLE * 0.46; d += 10) {
      const l = lookAt(d);
      expect(l.night).toBeGreaterThanOrEqual(before);
      before = l.night;
    }
    before = 2;
    for (let d = DAY_CYCLE * 0.78; d <= DAY_CYCLE - 0.5; d += 10) {
      const l = lookAt(d);
      expect(l.night).toBeLessThanOrEqual(before);
      expect(l.night).toBeGreaterThanOrEqual(0);
      expect(l.night).toBeLessThanOrEqual(1);
      before = l.night;
    }
  });

  it('wechselt bei rund 864 m von dunkler auf helle Schrift, Rand und Schal wechseln mit', () => {
    const day = lookAt(0);
    const before = lookAt(850);
    const after = lookAt(880);
    expect(before.dark).toBe(false);
    expect(before.ink).toBe(day.ink);
    expect(before.paper).toBe(day.paper);
    expect(after.dark).toBe(true);
    expect(after.ink).not.toBe(day.ink);
    expect(after.paper).not.toBe(day.paper);
    expect(after.scarf).not.toBe(day.scarf);
    expect(after.ink).not.toBe(after.paper);
  });

  it('zeigt am Morgen die Sonne ohne Mond und endet ohne Sprung wieder am Tag', () => {
    const dawn = lookAt(DAY_CYCLE * 0.88);
    expect(dawn.dark).toBe(false);
    expect(dawn.sunY).toBeLessThan(1);
    expect(dawn.moonY).toBeGreaterThan(1.1);
    const end = lookAt(DAY_CYCLE - 0.5);
    expect(end.night).toBeLessThan(0.01);
    expect(Math.abs(end.sunY - lookAt(0).sunY)).toBeLessThan(0.01);
  });

  it('bleibt bei riesigen und unsinnigen Strecken gültig', () => {
    for (const d of [1e308, Infinity, NaN]) {
      const l = lookAt(d);
      expect(l.night).toBeGreaterThanOrEqual(0);
      expect(l.col.skyTop).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    }
  });

  it('wiederholt sich nach einem ganzen Tag und rechnet negative Strecke als Start', () => {
    expect(lookAt(DAY_CYCLE + 300).col).toEqual(lookAt(300).col);
    expect(lookAt(-50).col).toEqual(lookAt(0).col);
  });

  it('liefert überall gültige Farben und drei verschiedene Turmtöne', () => {
    for (let d = 0; d < DAY_CYCLE; d += 37) {
      const l = lookAt(d);
      for (const c of Object.values(l.col)) expect(c).toMatch(/^rgba?\(\d+,\d+,\d+(,0\.3)?\)$/);
      expect(new Set(l.towers.map((t) => t.front)).size).toBe(3);
    }
  });
});

describe('Farbhelfer', () => {
  it('mischt, begrenzt und liest Farben', () => {
    expect(mix([0, 0, 0], [100, 200, 50], 0.5)).toEqual([50, 100, 25]);
    expect(css([300, -5, 12.4])).toBe('rgb(255,0,12)');
    expect(css([1, 2, 3], 0.5)).toBe('rgba(1,2,3,0.5)');
    expect(fromHex('#e0b13a')).toEqual([224, 177, 58]);
  });

  it('dunkelt feste Farben nur nachts ab', () => {
    const yellow = fromHex('#e0b13a');
    expect(dimmed(lookAt(0), yellow)).toBe(css(yellow));
    expect(dimmed(lookAt(DAY_CYCLE * 0.6), yellow)).not.toBe(css(yellow));
  });

  it('gibt für dieselben Zahlen denselben Zufall und verteilt ihn breit', () => {
    expect(hash(3, 7, 120)).toBe(hash(3, 7, 120));
    const lit = Array.from({ length: 400 }, (_, i) => hash(i % 20, Math.floor(i / 20), 55) % 100 < 45).filter(Boolean).length;
    expect(lit).toBeGreaterThan(140);
    expect(lit).toBeLessThan(220);
  });
});

describe('Strecke für die Stimmung', () => {
  it('zählt die weiteste erreichte Stelle, nicht die jetzige, und beginnt nach dem Neustart am Tag', () => {
    const s = createState();
    s.maxX = TUNING.startPos.x + 1300;
    s.pos.x = TUNING.startPos.x;
    expect(lookDistance(s)).toBe(1300);
    resetState(s);
    expect(lookDistance(s)).toBe(0);
  });

  it('verschiebt nur um sinnvolle Werte', () => {
    const s = createState();
    expect(lookDistance(s, 1300)).toBe(1300);
    expect(lookDistance(s, NaN)).toBe(0);
    expect(lookDistance(s, -500)).toBe(0);
  });
});

describe('Fenster', () => {
  it('teilt die Front in Spalten und Reihen; zu niedrige Blöcke haben keine Fenster', () => {
    expect(windowGrid(4.2, 30).cols).toBe(1);
    expect(windowGrid(12, 30).cols).toBe(5);
    expect(windowGrid(12, 30).rows).toBe(9);
    expect(windowGrid(12, 2.4).rows).toBe(0);
  });

  it('brennt am Tag nirgends und in tiefer Nacht in rund 45 % der Fenster', () => {
    const count = (night: number) => Array.from({ length: 400 }, (_, i) => isLit(i % 20, Math.floor(i / 20), 55, night)).filter(Boolean).length;
    expect(count(0)).toBe(0);
    expect(count(1)).toBeGreaterThan(140);
    expect(count(1)).toBeLessThan(220);
  });
});
