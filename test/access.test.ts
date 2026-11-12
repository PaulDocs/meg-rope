import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ACCESS, forgetKeys, hasAccess, issuerOf } from '../server/access';
import { makeAccess, type TestAccess } from './access-helper';

let a: TestAccess;
beforeAll(async () => {
  a = await makeAccess();
});
beforeEach(() => {
  forgetKeys();
  a.certs.calls.length = 0;
});
const req = (token?: string): Request => new Request('https://spiel.example/api/scores', { headers: token === undefined ? {} : { 'cf-access-jwt-assertion': token } });
const check = async (token: string | undefined, env: object = a.env, now = a.now): Promise<boolean> => hasAccess(req(token), env, a.certs, now);

describe('Zugangsprüfung der Funktion (Token von Cloudflare Access)', () => {
  it('lässt ein gültiges Token durch und holt die Schlüssel beim Aussteller', async () => {
    expect(await check(await a.token())).toBe(true);
    expect(a.certs.calls).toEqual(['https://freunde.cloudflareaccess.com/cdn-cgi/access/certs']);
    expect(await check(await a.token({ aud: a.env.ACCESS_AUD }))).toBe(true); // AUD auch als einzelner Text
    expect(a.certs.calls).toHaveLength(1); // Schlüssel gemerkt
  });

  it('ohne Token, mit Unsinn oder mit blossem Kopf ohne Unterschrift: kein Zugang', async () => {
    for (const t of [undefined, '', 'x', 'a.b', 'a.b.c', 'a.b.c.d']) expect(await check(t)).toBe(false);
    const [h, c] = (await a.token()).split('.');
    expect(await check(`${h}.${c}.`)).toBe(false);
    expect(await check(`${h}.${c}.AAAA`)).toBe(false);
  });

  it('weist ab: verändert, abgelaufen, noch nicht gültig, falsche Anwendung, falscher Aussteller', async () => {
    const [h, c, s] = (await a.token()).split('.');
    const other = (await a.token({ email: 'fremd@example.org' })).split('.')[1];
    expect(await check(`${h}.${other}.${s}`)).toBe(false); // Inhalt getauscht, alte Unterschrift
    expect(await check(`${h}.${c}.${s!.slice(0, -4)}AAAA`)).toBe(false);
    expect(await check(await a.token({ exp: a.now / 1000 - 1 }))).toBe(false);
    expect(await check(await a.token({ exp: undefined }))).toBe(false);
    expect(await check(await a.token({ nbf: a.now / 1000 + ACCESS.leeway + 5 }))).toBe(false);
    expect(await check(await a.token({ aud: ['andere-anwendung'] }))).toBe(false);
    expect(await check(await a.token({ iss: 'https://fremd.cloudflareaccess.com' }))).toBe(false);
    expect(await check(await a.token(), a.env, a.now + 2 * 3600 * 1000)).toBe(false); // später: abgelaufen
  });

  it('weist ab: anderes Verfahren, unbekannter Schlüssel, Token eines fremden Schlüssels', async () => {
    expect(await check(await a.token({}, { alg: 'none' }))).toBe(false);
    expect(await check(await a.token({}, { alg: 'HS256' }))).toBe(false);
    expect(await check(await a.token({}, { kid: 'gibt-es-nicht' }))).toBe(false);
    expect(a.certs.calls).toHaveLength(1); // eben erst geholt: kein zweiter Abruf für die unbekannte Kennung
    const stranger = await makeAccess('freunde', 'k1'); // gleicher Name und Kennung, anderer Schlüssel
    expect(await check(await stranger.token())).toBe(false);
  });

  it('ohne Einrichtung bleibt alles zu – auch mit gültigem Token', async () => {
    const t = await a.token();
    expect(await check(t, {})).toBe(false);
    expect(await check(t, { ACCESS_TEAM: 'freunde' })).toBe(false);
    expect(await check(t, { ACCESS_AUD: a.env.ACCESS_AUD })).toBe(false);
    expect(await check(t, { ACCESS_TEAM: 'freunde', ACCESS_AUD: '  ' })).toBe(false);
    expect(await check(t, { ACCESS_TEAM: 'böse.example/x?', ACCESS_AUD: a.env.ACCESS_AUD })).toBe(false);
    expect(a.certs.calls).toHaveLength(0); // dafür wird nichts abgerufen
  });

  it('sind die Schlüssel nicht erreichbar oder kaputt: kein Zugang, kein Absturz', async () => {
    const t = await a.token();
    expect(await hasAccess(req(t), a.env, async () => { throw new Error('offline'); }, a.now)).toBe(false);
    expect(await hasAccess(req(t), a.env, async () => new Response('nein', { status: 500 }), a.now)).toBe(false);
    expect(await hasAccess(req(t), a.env, async () => new Response('{"keys":"x"}'), a.now)).toBe(false);
  });

  it('holt die Schlüssel neu, wenn die Kennung unbekannt ist oder die Merkzeit um ist', async () => {
    const t = await a.token();
    expect(await check(t)).toBe(true);
    const unknown = await a.token({}, { kid: 'neu' });
    expect(await check(unknown, a.env, a.now + 1000)).toBe(false);
    expect(a.certs.calls).toHaveLength(2); // einmal frisch nachgefragt
    for (let i = 2; i < 12; i++) expect(await check(unknown, a.env, a.now + i * 1000)).toBe(false);
    expect(a.certs.calls).toHaveLength(2); // erfundene Tokens erzwingen keine weiteren Abrufe …
    expect(await check(unknown, a.env, a.now + 1000 + ACCESS.refreshEvery)).toBe(false);
    expect(a.certs.calls).toHaveLength(3); // … erst nach der Sperrfrist wieder einer
    expect(await check(t, a.env, a.now + ACCESS.keyTtl + ACCESS.refreshEvery + 2000)).toBe(true);
    expect(a.certs.calls).toHaveLength(4); // Merkzeit um: normal neu geholt
  });

  it('bildet die Aussteller-Adresse aus dem Team-Namen, auch aus der ganzen Adresse', () => {
    expect(issuerOf('MeinTeam')).toBe('https://meinteam.cloudflareaccess.com');
    expect(issuerOf(' https://mein-team.cloudflareaccess.com/ ')).toBe('https://mein-team.cloudflareaccess.com');
    for (const bad of [undefined, '', 'a b', 'a.b', 'x/../y', '-x']) expect(issuerOf(bad)).toBeNull();
  });
});
