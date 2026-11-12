// Zugangsprüfung für die Cloudflare-Funktion (B12). Läuft nur bei Cloudflare,
// nie im Spiel. Cloudflare Access setzt bei jeder Anfrage eines angemeldeten
// Besuchers den Kopf `Cf-Access-Jwt-Assertion` (ein signiertes Token). Diese
// Prüfung verlässt sich nicht darauf, dass Access vor jeder Adresse steht: Sie
// prüft Unterschrift, Aussteller, Anwendung (AUD) und Ablauf selbst. Fehlt die
// Einrichtung (ACCESS_TEAM, ACCESS_AUD) oder geht etwas schief: kein Zugang.
// Ablauf nach der Cloudflare-Doku «Validate JWTs» (aus dem Gedächtnis,
// 12.11.2026; bei Cloudflare selbst noch nicht gelaufen).

export interface AccessEnv {
  ACCESS_TEAM?: string; // Team-Name von Zero Trust, z. B. «meinteam» (→ meinteam.cloudflareaccess.com)
  ACCESS_AUD?: string; // «Application Audience (AUD) Tag» der Access-Anwendung
}

type Fetch = (url: string) => Promise<Response>;
type Key = JsonWebKey & { kid?: string };

export const ACCESS = {
  keyTtl: 10 * 60 * 1000, // ms – so lange gelten die geholten Schlüssel
  leeway: 60, // s – so viel dürfen die Uhren auseinandergehen
  refreshEvery: 30 * 1000, // ms – unbekannte Schlüssel-Kennung: höchstens so oft frisch nachfragen (erfundene Tokens sollen keine Abrufe erzwingen)
};

let cached: { issuer: string; at: number; keys: Key[] } | null = null;
let lastRefresh = -Infinity; // wann zuletzt wegen einer unbekannten Kennung frisch geholt wurde

/** Nur für Tests: gemerkte Schlüssel vergessen. */
export function forgetKeys(): void {
  cached = null;
  lastRefresh = -Infinity;
}

/** Aussteller-Adresse aus dem Team-Namen; null, wenn der Name nicht sein kann. */
export function issuerOf(team: string | undefined): string | null {
  const name = (team ?? '').trim().toLowerCase().replace(/^https:\/\//, '').replace(/\.cloudflareaccess\.com\/?$/, '');
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(name) ? `https://${name}.cloudflareaccess.com` : null;
}

function bytes(part: string): Uint8Array {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

function claims(part: string): Record<string, unknown> {
  const x: unknown = JSON.parse(new TextDecoder().decode(bytes(part)));
  if (typeof x !== 'object' || x === null) throw new Error('kein Objekt');
  return x as Record<string, unknown>;
}

async function keysOf(issuer: string, f: Fetch, now: number, fresh: boolean): Promise<Key[]> {
  if (!fresh && cached && cached.issuer === issuer && now - cached.at < ACCESS.keyTtl) return cached.keys;
  const res = await f(`${issuer}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('Schlüssel nicht erreichbar');
  const body = (await res.json()) as { keys?: unknown };
  const keys = Array.isArray(body.keys) ? (body.keys as Key[]) : [];
  cached = { issuer, at: now, keys };
  return keys;
}

/** Kommt diese Anfrage von jemandem, den Access für diese Anwendung angemeldet hat? */
export async function hasAccess(request: Request, env: AccessEnv, f: Fetch = fetch, now: number = Date.now()): Promise<boolean> {
  try {
    const issuer = issuerOf(env.ACCESS_TEAM);
    const aud = (env.ACCESS_AUD ?? '').trim();
    if (!issuer || aud === '') return false; // nicht eingerichtet: zu
    const [head, body, sig, ...more] = (request.headers.get('cf-access-jwt-assertion') ?? '').split('.');
    if (!head || !body || !sig || more.length > 0) return false;
    const h = claims(head);
    const c = claims(body);
    if (h.alg !== 'RS256' || typeof h.kid !== 'string') return false;
    const auds: unknown[] = Array.isArray(c.aud) ? c.aud : [c.aud];
    if (c.iss !== issuer || !auds.includes(aud)) return false;
    const s = now / 1000;
    if (typeof c.exp !== 'number' || c.exp <= s) return false;
    if (typeof c.nbf === 'number' && c.nbf > s + ACCESS.leeway) return false;
    // Schlüssel wechseln von Zeit zu Zeit: unbekannte Kennung → frisch holen, aber nicht bei jeder Anfrage
    let jwk = (await keysOf(issuer, f, now, false)).find((k) => k.kid === h.kid);
    if (!jwk && cached && cached.at !== now && now - lastRefresh >= ACCESS.refreshEvery) {
      lastRefresh = now;
      jwk = (await keysOf(issuer, f, now, true)).find((k) => k.kid === h.kid);
    }
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(sig) as BufferSource, new TextEncoder().encode(`${head}.${body}`));
  } catch {
    return false;
  }
}
