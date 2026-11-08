import { describe, expect, it } from 'vitest';
import {
  attemptNumber, bestAttempt, bonusFor, cleanName, createRound, currentTurn, endAttempt, isRoundOver, ranking, ROUND,
  stopTurn, turnScore, type Attempt,
} from '../src/game';
import { bestSingles, KEYS, loadNames, loadResults, MAX_RESULTS, personalBest, recentChallenges, saveNames, saveRound, type KeyValue } from '../src/store';

// Runde, Challenge, Speicher (B5)

const att = (points: number, distance = points): Attempt => ({ distance, style: points - distance, points, bestStrike: 0 });

function memory(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('Runde', () => {
  it('Namen werden aufgeräumt, leere fallen weg', () => {
    expect(cleanName('  Anna   Lena ')).toBe('Anna Lena');
    expect(cleanName('x'.repeat(40))).toHaveLength(ROUND.maxName);
    expect(() => createRound('single', ['  '], 'normal', 'r')).toThrow();
  });

  it('Challenge braucht 2 bis 6 Spieler, Einzelspiel genau einen', () => {
    expect(() => createRound('challenge', ['Anna'], 'normal', 'r')).toThrow();
    expect(createRound('challenge', ['Anna', 'Ben'], 'normal', 'r').turns).toHaveLength(2);
    const six = ['A', 'B', 'C', 'D', 'E', 'F'];
    expect(createRound('challenge', six, 'normal', 'r').turns).toHaveLength(6);
    expect(() => createRound('challenge', [...six, 'G'], 'normal', 'r')).toThrow();
    expect(() => createRound('single', ['Anna', 'Ben'], 'normal', 'r')).toThrow();
  });

  it('derselbe Name zweimal geht nicht, auch mit anderen Leerzeichen', () => {
    expect(() => createRound('challenge', ['Anna  Lena', 'Anna Lena'], 'normal', 'r')).toThrow();
  });

  it('nach dem dritten Versuch ist der nächste Spieler dran', () => {
    const r = createRound('challenge', ['Anna', 'Ben'], 'normal', 'r');
    expect(attemptNumber(currentTurn(r)!)).toBe(1);
    endAttempt(r, att(100));
    endAttempt(r, att(300));
    expect(currentTurn(r)!.name).toBe('Anna');
    expect(attemptNumber(currentTurn(r)!)).toBe(3);
    endAttempt(r, att(200));
    expect(currentTurn(r)!.name).toBe('Ben');
    expect(turnScore(r.turns[0]!)).toBe(300); // bester Versuch, drei gebraucht: kein Bonus
  });

  it('früher werten gibt Bonus: + 50 % nach dem 1., + 25 % nach dem 2. Versuch', () => {
    expect(bonusFor(1)).toBe(0.5);
    expect(bonusFor(2)).toBe(0.25);
    expect(bonusFor(3)).toBe(0);
    expect(bonusFor(0)).toBe(0);
    expect(turnScore({ name: 'A', attempts: [], done: false })).toBe(0);
    const r = createRound('challenge', ['Anna', 'Ben'], 'normal', 'r');
    endAttempt(r, att(400));
    stopTurn(r);
    expect(turnScore(r.turns[0]!)).toBe(600);
    endAttempt(r, att(300));
    endAttempt(r, att(500));
    stopTurn(r);
    expect(turnScore(r.turns[1]!)).toBe(625);
    expect(isRoundOver(r)).toBe(true);
    expect(ranking(r).map((x) => x.name)).toEqual(['Ben', 'Anna']);
  });

  it('werten geht erst nach einem Versuch', () => {
    const r = createRound('single', ['Anna'], 'normal', 'r');
    stopTurn(r);
    expect(isRoundOver(r)).toBe(false);
  });

  it('Gleichstand: die weitere Distanz liegt vorne', () => {
    const r = createRound('challenge', ['Anna', 'Ben'], 'normal', 'r');
    endAttempt(r, att(300, 200));
    stopTurn(r);
    endAttempt(r, att(300, 250));
    stopTurn(r);
    expect(ranking(r)[0]!.name).toBe('Ben');
    expect(bestAttempt(r.turns[1]!)!.distance).toBe(250);
  });
});

describe('Speicher', () => {
  it('Einzelspiel: Bestenliste je Einstellung und Bestleistung je Spieler', () => {
    const kv = memory();
    for (const [name, pts, setting] of [['Anna', 400, 'normal'], ['Ben', 700, 'normal'], ['Anna', 900, 'free-hard']] as const) {
      const r = createRound('single', [name], setting, `${name}${pts}`);
      endAttempt(r, att(pts));
      endAttempt(r, att(1));
      endAttempt(r, att(1));
      saveRound(kv, r, new Date('2026-11-09T10:00:00Z'));
    }
    const all = loadResults(kv);
    expect(all).toHaveLength(3);
    expect(bestSingles(all, 'normal').map((x) => x.name)).toEqual(['Ben', 'Anna']);
    expect(personalBest(all, 'Anna', 'normal')?.score).toBe(400);
    expect(personalBest(all, 'Anna', 'free-hard')?.score).toBe(900);
    expect(personalBest(all, 'Cleo', 'normal')).toBeNull();
  });

  it('Bestenliste: bei gleichen Punkten liegt das ältere Ergebnis vorne', () => {
    const kv = memory();
    for (const [name, iso] of [['Ben', '2026-11-08T23:30:00Z'], ['Anna', '2026-11-09T00:30:00Z']] as const) {
      const r = createRound('single', [name], 'normal', name);
      endAttempt(r, att(500));
      endAttempt(r, att(1));
      endAttempt(r, att(1));
      saveRound(kv, r, new Date(iso));
    }
    expect(bestSingles(loadResults(kv), 'normal').map((x) => x.name)).toEqual(['Ben', 'Anna']);
  });

  it('Challenge: alle Spieler einer Runde zusammen, neueste zuerst', () => {
    const kv = memory();
    for (const [id, day] of [['a', '08'], ['b', '09']]) {
      const r = createRound('challenge', ['Anna', 'Ben'], 'normal', id!);
      endAttempt(r, att(id === 'a' ? 100 : 900));
      stopTurn(r);
      endAttempt(r, att(500));
      stopTurn(r);
      saveRound(kv, r, new Date(`2026-11-${day}T10:00:00Z`));
    }
    const ch = recentChallenges(loadResults(kv));
    expect(ch.map((c) => c.round)).toEqual(['b', 'a']);
    expect(ch[0]!.ranks.map((x) => x.name)).toEqual(['Anna', 'Ben']);
    expect(ch[1]!.ranks.map((x) => x.name)).toEqual(['Ben', 'Anna']);
  });

  it('Kaputtes im Speicher fällt weg, ohne Speicher geht es trotzdem', () => {
    const kv = memory();
    kv.data.set(KEYS.results, '{kaputt');
    expect(loadResults(kv)).toEqual([]);
    kv.data.set(KEYS.results, JSON.stringify([{ name: 'x' }, 5]));
    expect(loadResults(kv)).toEqual([]);
    expect(loadResults(null)).toEqual([]);
    const r = createRound('single', ['Anna'], 'normal', 'r');
    endAttempt(r, att(10));
    stopTurn(r);
    expect(saveRound(null, r, new Date())).toHaveLength(1);
  });

  it('hält höchstens MAX_RESULTS Ergebnisse, die ältesten fallen weg', () => {
    const kv = memory();
    for (let i = 0; i < MAX_RESULTS + 5; i++) {
      const r = createRound('single', ['Anna'], 'normal', `r${i}`);
      endAttempt(r, att(i));
      stopTurn(r);
      saveRound(kv, r, new Date());
    }
    const all = loadResults(kv);
    expect(all).toHaveLength(MAX_RESULTS);
    expect(all[0]!.round).toBe('r5');
  });

  it('Namen: zuletzt gewählte zuerst, ohne Doppelte', () => {
    const kv = memory();
    saveNames(kv, ['Anna', 'Ben']);
    saveNames(kv, ['Cleo', 'Anna']);
    expect(loadNames(kv)).toEqual(['Cleo', 'Anna', 'Ben']);
  });
});
