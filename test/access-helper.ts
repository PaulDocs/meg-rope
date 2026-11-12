// Für Tests: ein eigenes Schlüsselpaar und Tokens, wie Cloudflare Access sie ausstellt.
import { issuerOf } from '../server/access';

const b64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (x: unknown): string => b64(new TextEncoder().encode(JSON.stringify(x)));

export interface TestAccess {
  env: { ACCESS_TEAM: string; ACCESS_AUD: string };
  now: number;
  /** Signiertes Token; `claims` und `head` überschreiben die gültigen Werte. */
  token(claims?: Record<string, unknown>, head?: Record<string, unknown>): Promise<string>;
  /** Antwortet wie die Schlüssel-Adresse von Access; zählt die Abrufe. */
  certs: ((url: string) => Promise<Response>) & { calls: string[] };
}

export async function makeAccess(team = 'freunde', kid = 'k1'): Promise<TestAccess> {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'],
  );
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid, alg: 'RS256', use: 'sig' };
  const env = { ACCESS_TEAM: team, ACCESS_AUD: 'aud-meg-rope' };
  const now = Date.parse('2026-11-12T12:00:00Z');
  const calls: string[] = [];
  const certs = Object.assign(async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ keys: [{ kid: 'alt', kty: 'RSA', n: 'AQAB', e: 'AQAB' }, jwk] }));
  }, { calls });
  return {
    env,
    now,
    certs,
    async token(claims = {}, head = {}) {
      const h = enc({ alg: 'RS256', kid, typ: 'JWT', ...head });
      const c = enc({ iss: issuerOf(team), aud: [env.ACCESS_AUD], exp: now / 1000 + 3600, iat: now / 1000 - 10, nbf: now / 1000 - 10, email: 'freund@example.org', ...claims });
      const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(`${h}.${c}`)));
      return `${h}.${c}.${b64(sig)}`;
    },
  };
}
