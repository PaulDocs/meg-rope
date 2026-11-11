import { describe, expect, it } from 'vitest';
import { css, DARK_FROM, DAY_CYCLE, dimmed, fromHex, hash, lookAt, mix } from '../src/look';

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

  it('wird stetig dunkler vom Tag zur Nacht und wechselt die Schriftfarbe genau an der Schwelle', () => {
    let before = -1;
    for (let d = DAY_CYCLE * 0.17; d <= DAY_CYCLE * 0.46; d += 10) {
      const l = lookAt(d);
      expect(l.night).toBeGreaterThanOrEqual(before);
      expect(l.dark).toBe(l.night >= DARK_FROM);
      before = l.night;
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
