import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { onRequestGet, onRequestPost, type Database, type Statement } from '../functions/api/scores';
import { forgetKeys } from '../server/access';
import { BOARD, isSetting, nameKey, parseBoard, parseSubmission, type Board } from '../src/board';
import { CLOUD, CLOUD_TIMEOUT, loadBoard, SCORES_URL, sendResult, submissionOf } from '../src/cloud';
import { cleanName, createRound, endAttempt } from '../src/game';
import { saveRound, type KeyValue, type Result } from '../src/store';
import { rankText } from '../src/ui';
import { makeAccess, type TestAccess } from './access-helper';

/** D1-Ersatz auf echtem SQLite: Die Abfragen laufen wirklich. */
function memoryDb(): Database {
  const db = new DatabaseSync(':memory:');
  const statement = (sql: string, values: unknown[]): Statement => ({
    bind: (...v) => statement(sql, v),
    all: async <T>() => ({ results: db.prepare(sql).all(...values) as T[] }),
    run: async () => void db.prepare(sql).all(...values),
  });
  return {
    prepare: (sql) => statement(sql, []),
    batch: async <T>(list: Statement[]) => Promise.all(list.map((s) => s.all<T>())),
  };
}

// Jede Anfrage trägt ein gültiges Token, wie hinter Cloudflare Access; die Schlüssel-Adresse ist ersetzt.
let access: TestAccess;
let token = '';
beforeAll(async () => {
  access = await makeAccess();
  token = await access.token({ exp: Date.now() / 1000 + 3600, nbf: Date.now() / 1000 - 10 });
  forgetKeys();
  vi.stubGlobal('fetch', access.certs);
});
afterAll(() => vi.unstubAllGlobals());

const URL_ = 'https://spiel.example/api/scores';
const post = (db: Database | undefined, body: unknown, type = 'application/json', auth = token): Promise<Response> =>
  onRequestPost({ env: { ...access.env, DB: db }, request: new Request(URL_, { method: 'POST', headers: { 'content-type': type, 'cf-access-jwt-assertion': auth }, body: typeof body === 'string' ? body : JSON.stringify(body) }) });
const get = (db: Database | undefined, query: string, auth = token): Promise<Response> =>
  onRequestGet({ env: { ...access.env, DB: db }, request: new Request(`${URL_}${query}`, { headers: { 'cf-access-jwt-assertion': auth } }) });
const result = (name: string, score: number, distance = score, setting = 'normal') => ({ name, setting, score, distance, bestStrike: 2 });

describe('Regeln der Online-Bestenliste', () => {
  it('nimmt saubere Meldungen und säubert den Namen', () => {
    expect(parseSubmission({ name: '  Anna   B. ', setting: 'free-hard', score: 900, distance: 400, bestStrike: 3 }))
      .toEqual({ name: 'Anna B.', setting: 'free-hard', score: 900, distance: 400, bestStrike: 3 });
    expect(parseSubmission({ ...result('Anna', 5), extra: '<b>' })).toEqual(result('Anna', 5)); // Unbekanntes fällt weg
    expect(parseSubmission(result('Anna Lena Meier Bx', 5))!.name).toBe('Anna Lena Meier'); // gekürzt, ohne Leerzeichen am Ende
    expect(cleanName(`x'); DROP TABLE scores;--`)).toBe(`x'); DROP TABLE`);
  });

  it('weist Unsinn ab', () => {
    for (const bad of [
      null, 'x', [], {}, result('', 5), result('   ', 5), { ...result('A', 5), setting: 'turbo' }, { ...result('A', 5), setting: 7 },
      result('A', -1), result('A', 1.5), result('A', Number.NaN), result('A', BOARD.maxScore + 1), { ...result('A', 5), score: '5' },
      { ...result('A', 5), distance: BOARD.maxDistance + 1 }, { ...result('A', 5), bestStrike: -2 }, { ...result('A', 5), name: 12 },
    ]) expect(parseSubmission(bad)).toBeNull();
  });

  it('kennt nur die Einstellungen des Spiels; ein Name zählt ohne Gross/Klein und Leerraum', () => {
    expect(isSetting('normal')).toBe(true);
    expect(isSetting('free-medium')).toBe(true);
    expect(isSetting('Normal')).toBe(false);
    expect(isSetting(null)).toBe(false);
    expect(nameKey('  ANNA  b ')).toBe('anna b');
    expect(nameKey('ZOË')).toBe('zoë');
    expect(nameKey('JÜRG')).toBe(nameKey('Jürg'));
  });

  it('prüft die Antwort des Speichers', () => {
    const ok = { best: [{ name: 'Anna', score: 5, distance: 4, bestStrike: 1, date: '2026-11-12T10:00:00.000Z' }], players: 1, rank: 1 };
    expect(parseBoard(ok)).toEqual(ok);
    expect(parseBoard({ ...ok, rank: undefined })!.rank).toBeNull();
    expect(parseBoard({ ...ok, rank: 0 })!.rank).toBeNull();
    for (const bad of [null, '<html>', {}, { ...ok, best: 'x' }, { ...ok, players: -1 }, { ...ok, best: [{ name: 'A' }] }, { ...ok, best: [{ ...ok.best[0], score: '9' }] }]) {
      expect(parseBoard(bad)).toBeNull();
    }
    const long = { ...ok, best: Array.from({ length: BOARD.top + 5 }, () => ok.best[0]) };
    expect(parseBoard(long)!.best).toHaveLength(BOARD.top);
  });
});

describe('Was das Spiel meldet und zeigt', () => {
  const saved = (over: Partial<Result> = {}): Result => ({ round: 'r', mode: 'single', name: 'Anna', setting: 'normal', score: 512, distance: 300, style: 212, attempts: 1, bestStrike: 4, date: '2026-11-12T10:00:00.000Z', ...over });

  it('meldet nur das Einzelspiel mit Punkten, als ganze Zahlen und ohne Runde, Style und Datum', () => {
    expect(submissionOf(saved())).toEqual({ name: 'Anna', setting: 'normal', score: 512, distance: 300, bestStrike: 4 });
    expect(submissionOf(saved({ score: 512.4, distance: 299.6 }))).toMatchObject({ score: 512, distance: 300 });
    expect(submissionOf(saved({ mode: 'challenge' }))).toBeNull();
    expect(submissionOf(saved({ score: 0 }))).toBeNull();
    expect(submissionOf(saved({ setting: 'alt-und-unbekannt' }))).toBeNull();
    expect(submissionOf(undefined)).toBeNull();
  });

  it('die echte Kette: Runde spielen, speichern, das Ergebnis dieser Runde melden', () => {
    const store = new Map<string, string>();
    const kv: KeyValue = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) };
    const old = createRound('single', ['Anna'], 'normal', 'r0');
    endAttempt(old, { points: 900, distance: 500, style: 400, bestStrike: 5 });
    saveRound(kv, old, new Date('2026-11-11T10:00:00Z'));
    const r = createRound('single', [' Anna '], 'free-easy', 'r1');
    endAttempt(r, { points: 640, distance: 410, style: 230, bestStrike: 3 });
    const all = saveRound(kv, r, new Date('2026-11-12T10:00:00Z'));
    // wie showResult() in main.ts: das Ergebnis dieser Runde, nicht das beste oder das erste
    expect(submissionOf(all.find((x) => x.round === r.id))).toEqual({ name: 'Anna', setting: 'free-easy', score: 640, distance: 410, bestStrike: 3 });
    const c = createRound('challenge', ['Anna', 'Ben'], 'normal', 'r2');
    for (let i = 0; i < 6; i++) endAttempt(c, { points: 300, distance: 200, style: 100, bestStrike: 1 });
    const withChallenge = saveRound(kv, c, new Date('2026-11-12T11:00:00Z'));
    expect(submissionOf(withChallenge.find((x) => x.round === c.id))).toBeNull(); // Challenges bleiben auf dem Gerät
  });

  it('nennt den Rang, die Spielerzahl oder dass die Liste nicht erreichbar ist', () => {
    expect(rankText({ best: [], players: 12, rank: 3 })).toBe('Online: Platz 3 von 12');
    expect(rankText({ best: [], players: 12, rank: null })).toBe('Online: 12 Spieler');
    expect(rankText(null)).toBe('Online-Bestenliste gerade nicht erreichbar.');
  });
});

describe('Funktion /api/scores (auf echtem SQLite)', () => {
  it('leere Liste, dann melden: Rang nach Punkten, dann Metern', async () => {
    const db = memoryDb();
    expect(await (await get(db, '?setting=normal')).json()).toEqual({ best: [], players: 0, rank: null });
    await post(db, result('Anna', 500, 300));
    await post(db, result('Ben', 900, 500));
    const res = await post(db, result('Cem', 500, 400));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const b = (await res.json()) as Board;
    expect(b.best.map((e) => e.name)).toEqual(['Ben', 'Cem', 'Anna']);
    expect(b.players).toBe(3);
    expect(b.rank).toBe(2);
    expect(parseBoard(b)).not.toBeNull(); // die Antwort besteht die Prüfung des Spiels
    expect(Number.isNaN(Date.parse(b.best[0]!.date))).toBe(false);
  });

  it('je Spieler bleibt nur die Bestleistung; Schlechteres ändert nichts, der Rang kommt trotzdem', async () => {
    const db = memoryDb();
    await post(db, result('Anna', 500));
    await post(db, result('Ben', 700));
    let b = (await (await post(db, result('anna ', 300))).json()) as Board;
    expect(b.best).toHaveLength(2);
    expect(b.best[1]).toMatchObject({ name: 'Anna', score: 500 });
    expect(b.rank).toBe(2);
    b = (await (await post(db, result('ANNA', 800))).json()) as Board;
    expect(b.best[0]).toMatchObject({ name: 'ANNA', score: 800 }); // neue Bestleistung, Schreibweise der letzten Meldung
    expect(b.players).toBe(2);
    expect(b.rank).toBe(1);
  });

  it('gleiche Punkte: mehr Meter liegt vorne; dasselbe nochmals ändert nichts, mehr Meter verbessert', async () => {
    const db = memoryDb();
    await post(db, result('Anna', 500, 300));
    const first = ((await (await post(db, result('Cem', 500, 400))).json()) as Board).best.find((e) => e.name === 'Anna')!.date;
    await new Promise((r) => setTimeout(r, 5));
    let b = (await (await post(db, result('Anna', 500, 300))).json()) as Board;
    expect(b.best.map((e) => e.name)).toEqual(['Cem', 'Anna']);
    expect(b.rank).toBe(2); // Cem hat gleich viele Punkte, aber mehr Meter
    expect(b.best[1]!.date).toBe(first); // Zeitpunkt bleibt: keine neue Bestleistung
    b = (await (await post(db, result('Anna', 500, 450))).json()) as Board;
    expect(b.best[0]).toMatchObject({ name: 'Anna', distance: 450 });
    expect(b.rank).toBe(1);
    b = (await (await post(db, result('Anna', 500, 100))).json()) as Board;
    expect(b.best[0]).toMatchObject({ name: 'Anna', distance: 450 });
  });

  it('Umlaute: «Jürg» und «JÜRG» sind ein Spieler', async () => {
    const db = memoryDb();
    await post(db, result('Jürg', 500));
    const b = (await (await post(db, result('JÜRG', 300))).json()) as Board;
    expect(b.players).toBe(1);
    expect(b.best[0]).toMatchObject({ name: 'Jürg', score: 500 });
  });

  it('keine offene Route: ohne gültiges Token 403, nichts wird gelesen oder gespeichert', async () => {
    const db = memoryDb();
    await post(db, result('Anna', 500));
    for (const bad of ['', 'kein.token.hier', await access.token({ exp: 1 })]) {
      expect((await get(db, '?setting=normal', bad)).status).toBe(403);
      const res = await post(db, result('Fremd', 999), 'application/json', bad);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Kein Zugang' }); // keine Liste in der Absage
    }
    const noSetup = await onRequestGet({ env: { DB: db }, request: new Request(`${URL_}?setting=normal`, { headers: { 'cf-access-jwt-assertion': token } }) });
    expect(noSetup.status).toBe(403); // ACCESS_TEAM/ACCESS_AUD fehlen: zu, auch mit gültigem Token
    const b = (await (await get(db, '?setting=normal')).json()) as Board;
    expect(b.best.map((e) => e.name)).toEqual(['Anna']);
  });

  it('Antworten tragen die Schutz-Kopfzeilen selbst', async () => {
    const res = await get(memoryDb(), '?setting=normal');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
  });

  it('zu grosse Meldungen fallen weg, bevor sie ganz gelesen sind', async () => {
    const db = memoryDb();
    const declared = await onRequestPost({ env: { ...access.env, DB: db }, request: new Request(URL_, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-access-jwt-assertion': token, 'content-length': String(BOARD.maxBody + 1) }, body: '{}' }) });
    expect(declared.status).toBe(413);
    let sent = 0;
    const endless = new ReadableStream<Uint8Array>({ pull: (c) => { sent++; c.enqueue(new Uint8Array(500).fill(32)); } });
    const stream = await onRequestPost({ env: { ...access.env, DB: db }, request: new Request(URL_, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-access-jwt-assertion': token }, body: endless, duplex: 'half' } as RequestInit) });
    expect(stream.status).toBe(413);
    expect(sent).toBeLessThan(20); // abgebrochen, nicht endlos gelesen
  });

  it('gleich viele Punkte und Meter: wer es zuerst geschafft hat, steht vorne', async () => {
    const db = memoryDb();
    await post(db, result('Erste', 400));
    await new Promise((r) => setTimeout(r, 5));
    const b = (await (await post(db, result('Zweite', 400))).json()) as Board;
    expect(b.best.map((e) => e.name)).toEqual(['Erste', 'Zweite']);
    expect(b.rank).toBe(2);
  });

  it('jede Einstellung hat ihre eigene Liste', async () => {
    const db = memoryDb();
    await post(db, result('Anna', 500, 500, 'normal'));
    await post(db, result('Anna', 90, 90, 'free-hard'));
    const hard = (await (await get(db, '?setting=free-hard')).json()) as Board;
    expect(hard.best).toHaveLength(1);
    expect(hard.best[0]!.score).toBe(90);
  });

  it('die Liste zeigt höchstens die besten Plätze, zählt aber alle Spieler', async () => {
    const db = memoryDb();
    for (let i = 0; i < BOARD.top + 3; i++) await post(db, result(`S${i}`, 100 + i));
    const b = (await (await post(db, result('Letzte', 1))).json()) as Board;
    expect(b.best).toHaveLength(BOARD.top);
    expect(b.players).toBe(BOARD.top + 4);
    expect(b.rank).toBe(BOARD.top + 4);
  });

  it('ist die Liste voll, kommen keine neuen Namen dazu, Bekannte dürfen sich verbessern', async () => {
    const max = BOARD.maxPlayers;
    BOARD.maxPlayers = 2;
    try {
      const db = memoryDb();
      await post(db, result('Anna', 5));
      await post(db, result('Ben', 6));
      expect((await post(db, result('Cem', 7))).status).toBe(409);
      expect((await post(db, result('Anna', 9))).status).toBe(200);
      expect((await post(db, result('Cem', 7, 7, 'free-easy'))).status).toBe(200); // andere Einstellung, eigene Grenze
    } finally {
      BOARD.maxPlayers = max;
    }
  });

  it('weist ab: unbekannte Einstellung, kein JSON, falscher Inhaltstyp, zu gross, ohne Speicher', async () => {
    const db = memoryDb();
    expect((await get(db, '?setting=turbo')).status).toBe(400);
    expect((await get(db, '')).status).toBe(400);
    expect((await post(db, '{kaputt')).status).toBe(400);
    expect((await post(db, { name: 'A' })).status).toBe(400);
    expect((await post(db, result('A', 5), 'text/plain')).status).toBe(415);
    expect((await post(db, { ...result('A', 5), pad: 'x'.repeat(BOARD.maxBody) })).status).toBe(413);
    expect((await get(undefined, '?setting=normal')).status).toBe(503);
    expect((await post(undefined, result('A', 5))).status).toBe(503);
    expect(((await (await get(db, '?setting=normal')).json()) as Board).players).toBe(0); // nichts davon wurde gespeichert
  });

  it('Namen mit SQL- und HTML-Zeichen bleiben Text', async () => {
    const db = memoryDb();
    const evil = `x'); DROP TABLE scores;--`;
    await post(db, result(evil, 5));
    const b = (await (await post(db, result('<img src=x>', 6))).json()) as Board;
    expect(b.best.map((e) => e.name)).toEqual(['<img src=x>', `x'); DROP TABLE`]); // auf 16 Zeichen gekürzt, als Text gespeichert
    expect(b.players).toBe(2);
  });
});

describe('Anbindung im Spiel (src/cloud.ts)', () => {
  const board: Board = { best: [{ name: 'Anna', score: 5, distance: 4, bestStrike: 1, date: '2026-11-12T10:00:00.000Z' }], players: 1, rank: null };

  it('ist im normalen Bau und in den Tests ausgeschaltet; nur VITE_CLOUD=1 schaltet ein', async () => {
    expect(CLOUD).toBe(false);
    try {
      for (const [value, on] of [['1', true], ['0', false], ['true', false], ['', false]] as const) {
        vi.stubEnv('VITE_CLOUD', value);
        vi.resetModules();
        expect((await import('../src/cloud')).CLOUD).toBe(on);
      }
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it('holt die Liste der Einstellung und meldet Ergebnisse als JSON an dieselbe Adresse', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const f = async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(board));
    };
    expect(await loadBoard('free-easy', f)).toEqual(board);
    expect(calls[0]!.url).toBe(`${SCORES_URL}?setting=free-easy`);
    expect(calls[0]!.init!.signal).toBeInstanceOf(AbortSignal); // wartet höchstens CLOUD_TIMEOUT
    expect(CLOUD_TIMEOUT).toBeLessThanOrEqual(10_000);
    expect(calls[0]!.init!.credentials).toBe('same-origin');
    expect(await sendResult(result('Anna', 5), f)).toEqual(board);
    expect(calls[1]!.url).toBe(SCORES_URL);
    expect(calls[1]!.init!.method).toBe('POST');
    expect(JSON.parse(calls[1]!.init!.body as string)).toEqual(result('Anna', 5));
    expect(new Headers(calls[1]!.init!.headers).get('content-type')).toBe('application/json');
  });

  it('gibt null statt Fehler: kein Netz, Fehlerstatus, HTML statt JSON, falsche Form', async () => {
    expect(await loadBoard('normal', async () => { throw new Error('offline'); })).toBeNull();
    expect(await loadBoard('normal', async () => new Response('{}', { status: 503 }))).toBeNull();
    expect(await loadBoard('normal', async () => new Response('<!doctype html>'))).toBeNull();
    expect(await sendResult(result('A', 1), async () => new Response('{"best":"x"}'))).toBeNull();
  });
});
