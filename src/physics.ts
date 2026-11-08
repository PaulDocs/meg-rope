// Physik von Meg Rope – reine Rechnung ohne Bildschirm, damit sie testbar ist.
// Einheiten: Meter und Sekunden. y zeigt nach oben, der Boden liegt bei y = 0.

export interface Vec {
  x: number;
  y: number;
}

/** Ein Gebäude: Rechteck, das auf dem Boden steht. */
export interface Building {
  x: number; // linke Kante
  width: number;
  height: number;
}

/** Stellschrauben für das Spielgefühl. Pascals Rückmeldungen landen hier. */
export const TUNING = {
  // true: Gebäude sind fest, man prallt ab, das Seil braucht freie Sicht.
  // false: Gebäude sind Kulisse, man fliegt davor durch und hakt genau dort
  // ein, wo man tippt. Pascal probiert beides auf dem iPad.
  solidBuildings: false,
  gravity: 22, // m/s² – stärker als echt (9.81), damit es zackig wirkt
  bodyRadius: 0.45, // Kollisionskreis des Männchens
  minRopeLength: 1, // kürzer wird ein Seil nie, auch wenn man ganz nah tippt
  // Schwung holen: Hängt das Männchen am gespannten Seil, bewegt es die Beine
  // wie auf einer Schaukel. Das gibt eine kleine Beschleunigung in Schwungrichtung.
  pump: 2.2, // m/s²
  pumpStartSpeed: 0.3, // m/s – langsamer gilt als «hängt still», dann stösst es sich nach vorne ab
  tautTolerance: 0.02, // m – so knapp unter der Seillänge gilt das Seil als gespannt
  ropeDamping: 0.995, // Anteil Tempo, den ein Seil-Glied pro Schritt behält
  ropeSegment: 0.8, // m – Länge eines Seil-Glieds (nur für die Darstellung)
  looseRopeTime: 1.5, // s – so lange fällt ein gelöstes Seil, bevor es verschwindet
  bounce: 0.35, // 0 = klebt an der Wand, 1 = prallt voll zurück
  wallFriction: 0.9, // Anteil Tempo entlang der Wand pro Aufprall
  airDrag: 0.02, // Luftwiderstand pro Sekunde (Anteil)
  maxSpeed: 60, // m/s – Obergrenze, damit nichts explodiert
  startPos: { x: 4, y: 52 } as Vec,
  startVel: { x: 8, y: 2 } as Vec,
};

export const STEP = 1 / 120; // feste Zeitschritte: überall gleiche Ergebnisse

export type Phase = 'ready' | 'flying' | 'down';

/**
 * Glieder-Kette, die zeigt, wie ein Seil durchhängt oder fällt.
 * Nur Darstellung: Sie läuft im Physik-Takt mit, damit sie ruhig aussieht,
 * beeinflusst das Männchen aber nicht und gehört nicht zum Spielstand
 * (Distanz, Versuche, Punkte). Für einen Vergleich übers Netz weglassen.
 */
export interface Chain {
  points: Vec[]; // vom Haken (0) bis zum Männchen (letztes)
  prev: Vec[]; // Stellen im letzten Schritt (Verlet)
  seg: number; // Länge eines Glieds
}

/**
 * Ein Seil hat eine feste Länge. Es kann durchhängen, aber nie länger werden.
 * Für das Männchen zählt nur die Länge (masseloses Seil).
 */
export interface Rope {
  anchor: Vec;
  length: number;
  chain: Chain;
}

/** Ein gelöstes Seil, das herunterfällt und dann verschwindet. */
export interface LooseRope {
  chain: Chain;
  age: number;
}

export interface State {
  phase: Phase;
  pos: Vec;
  vel: Vec;
  rope: Rope | null;
  looseRopes: LooseRope[];
  maxX: number; // weiteste erreichte Stelle
  time: number;
}

export function createState(): State {
  return {
    phase: 'ready',
    pos: { ...TUNING.startPos },
    vel: { x: 0, y: 0 },
    rope: null,
    looseRopes: [],
    maxX: TUNING.startPos.x,
    time: 0,
  };
}

/**
 * Strahl vom Männchen Richtung Tipp-Punkt. Liefert die erste Stelle, an der
 * er ein Gebäude trifft – aber nur, wenn das nicht hinter dem Tipp-Punkt liegt
 * (mit etwas Spielraum). Tippen in den leeren Himmel trifft also nichts.
 */
export function findAnchor(from: Vec, target: Vec, buildings: Building[], slack = 0.6): Vec | null {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return null;
  const maxT = (dist + slack) / dist;
  let best: number | null = null;
  for (const b of buildings) {
    const t = rayBox(from, dx, dy, b.x, 0, b.x + b.width, b.height);
    if (t !== null && t <= maxT && (best === null || t < best)) best = t;
  }
  if (best === null) return null;
  return { x: from.x + dx * best, y: from.y + dy * best };
}

/** Schnitt Strahl–Rechteck (Slab-Verfahren). t in Vielfachen von (dx, dy). */
function rayBox(o: Vec, dx: number, dy: number, x0: number, y0: number, x1: number, y1: number): number | null {
  let tMin = 0;
  let tMax = Infinity;
  for (const [p, d, lo, hi] of [
    [o.x, dx, x0, x1],
    [o.y, dy, y0, y1],
  ] as const) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return null;
    } else {
      let t1 = (lo - p) / d;
      let t2 = (hi - p) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }
  return tMin;
}

/** Alles auf den Anfang: neuer Versuch. */
export function resetState(s: State): void {
  Object.assign(s, createState());
}

/** Wo das Seil einhakt – hängt davon ab, ob Häuser fest oder Kulisse sind. */
function pickAnchor(from: Vec, target: Vec, buildings: Building[]): Vec | null {
  if (TUNING.solidBuildings) return findAnchor(from, target, buildings);
  if (buildings.some((b) => isOnBuilding(target, b))) return { ...target };
  return null;
}

/** Liegt der Punkt auf dem Gebäude (mit etwas Spielraum für Finger)? */
export function isOnBuilding(p: Vec, b: Building, slack = 0.6): boolean {
  return p.x >= b.x - slack && p.x <= b.x + b.width + slack && p.y >= 0 && p.y <= b.height + slack;
}

/**
 * Ein Tippen auf die Welt. Wechselt zwischen Einhaken und Lösen.
 * Gibt zurück, was passiert ist (für Anzeige und Tests).
 */
export function tap(s: State, target: Vec, buildings: Building[]): 'attached' | 'released' | 'missed' | 'restart' {
  if (s.phase === 'down') {
    resetState(s);
    return 'restart';
  }
  if (s.rope) {
    releaseRope(s);
    return 'released';
  }
  const anchor = pickAnchor(s.pos, target, buildings);
  if (!anchor) return 'missed';
  if (s.phase === 'ready') {
    s.phase = 'flying';
    s.vel = { ...TUNING.startVel };
  }
  const length = Math.max(TUNING.minRopeLength, Math.hypot(s.pos.x - anchor.x, s.pos.y - anchor.y));
  const n = Math.max(4, Math.round(length / TUNING.ropeSegment));
  const points: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    points.push({ x: anchor.x + (s.pos.x - anchor.x) * t, y: anchor.y + (s.pos.y - anchor.y) * t });
  }
  s.rope = { anchor, length, chain: { points, prev: points.map((p) => ({ ...p })), seg: length / n } };
  return 'attached';
}

/** Das Seil löst sich am Haken und fällt mit dem Schwung herunter. */
function releaseRope(s: State): void {
  if (!s.rope) return;
  s.looseRopes.push({ chain: s.rope.chain, age: 0 });
  s.rope = null;
}

/** Gelöste Seile fallen weiter, auch wenn der Versuch schon vorbei ist. */
function stepLooseRopes(s: State, dt: number): void {
  for (const r of s.looseRopes) {
    r.age += dt;
    stepChain(r.chain, dt, null, null);
  }
  s.looseRopes = s.looseRopes.filter((r) => r.age < TUNING.looseRopeTime);
}

/** Einen festen Zeitschritt weiterrechnen. */
export function step(s: State, buildings: Building[], dt = STEP): void {
  stepLooseRopes(s, dt);
  if (s.phase !== 'flying') return;
  s.time += dt;

  // Schwerkraft und Luftwiderstand
  s.vel.y -= TUNING.gravity * dt;
  const drag = 1 - TUNING.airDrag * dt;
  s.vel.x *= drag;
  s.vel.y *= drag;

  const speed = Math.hypot(s.vel.x, s.vel.y);
  if (speed > TUNING.maxSpeed) {
    s.vel.x *= TUNING.maxSpeed / speed;
    s.vel.y *= TUNING.maxSpeed / speed;
  }

  s.pos.x += s.vel.x * dt;
  s.pos.y += s.vel.y * dt;

  if (s.rope) pump(s, dt);

  // Seil und Gebäude ziehen gegeneinander, wenn das Männchen an einer Wand
  // hängt. Ein paar Durchgänge, damit beide Bedingungen fast genau stimmen.
  for (let i = 0; i < 4; i++) {
    applyRope(s);
    if (TUNING.solidBuildings) for (const b of buildings) collide(s, b);
  }

  if (s.rope) stepChain(s.rope.chain, dt, s.rope.anchor, s.pos);

  if (s.pos.x > s.maxX) s.maxX = s.pos.x;

  if (s.pos.y - TUNING.bodyRadius <= 0) {
    s.pos.y = TUNING.bodyRadius;
    s.vel = { x: 0, y: 0 };
    releaseRope(s);
    s.phase = 'down';
  }
}

/** Ist das Seil gespannt (Männchen am äussersten Punkt)? */
export function isTaut(s: State): boolean {
  if (!s.rope) return false;
  return Math.hypot(s.pos.x - s.rope.anchor.x, s.pos.y - s.rope.anchor.y) >= s.rope.length - TUNING.tautTolerance;
}

/** Holt das Männchen gerade Schwung? Nur am gespannten Seil, unterhalb des Hakens. */
export function isPumping(s: State): boolean {
  return s.rope !== null && isTaut(s) && s.pos.y < s.rope.anchor.y;
}

/**
 * Schwung holen wie auf einer Schaukel: Nur am gespannten Seil und unterhalb
 * des Hakens, immer in die Richtung, in die das Männchen gerade schwingt.
 * Hängt es fast still, stösst es sich nach vorne (rechts) ab.
 */
function pump(s: State, dt: number): void {
  if (!s.rope || !isPumping(s)) return;
  const dx = s.pos.x - s.rope.anchor.x;
  const dy = s.pos.y - s.rope.anchor.y;
  const d = Math.hypot(dx, dy);
  // Tangente an den Kreis um den Haken, zeigt nach rechts unten/oben
  let tx = -dy / d;
  let ty = dx / d;
  if (tx < 0) [tx, ty] = [-tx, -ty];
  const vt = s.vel.x * tx + s.vel.y * ty;
  const dir = Math.abs(vt) < TUNING.pumpStartSpeed ? 1 : Math.sign(vt);
  s.vel.x += tx * dir * TUNING.pump * dt;
  s.vel.y += ty * dir * TUNING.pump * dt;
}

/**
 * Seil-Glieder als Kette weiterrechnen (Verlet). Sie fallen mit der
 * Schwerkraft und halten den Abstand zueinander. Anfang und Ende hängen am
 * Haken und am Männchen, wenn angegeben.
 */
const CHAIN_ITERATIONS = 12; // Durchgänge pro Schritt, damit die Glieder ihren Abstand halten

function stepChain(chain: Chain, dt: number, start: Vec | null, end: Vec | null): void {
  const { points: pts, prev, seg } = chain;
  const g = TUNING.gravity * dt * dt;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = prev[i]!;
    const vx = (p.x - q.x) * TUNING.ropeDamping;
    const vy = (p.y - q.y) * TUNING.ropeDamping;
    q.x = p.x;
    q.y = p.y;
    p.x += vx;
    p.y += vy - g;
  }
  for (let k = 0; k < CHAIN_ITERATIONS; k++) {
    if (start) Object.assign(pts[0]!, start);
    if (end) Object.assign(pts[pts.length - 1]!, end);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-9;
      const diff = (d - seg) / d / 2;
      a.x += dx * diff;
      a.y += dy * diff;
      b.x -= dx * diff;
      b.y -= dy * diff;
    }
  }
  if (start) Object.assign(pts[0]!, start);
  if (end) Object.assign(pts[pts.length - 1]!, end);
  for (const p of pts) if (p.y < 0) p.y = 0; // liegt auf dem Boden
}

/** Seil-Länge erzwingen: zurück auf den Kreis, Tempo nach aussen wegnehmen. */
function applyRope(s: State): void {
  if (!s.rope) return;
  const dx = s.pos.x - s.rope.anchor.x;
  const dy = s.pos.y - s.rope.anchor.y;
  const d = Math.hypot(dx, dy);
  if (d <= s.rope.length) return;
  const nx = dx / d;
  const ny = dy / d;
  s.pos.x = s.rope.anchor.x + nx * s.rope.length;
  s.pos.y = s.rope.anchor.y + ny * s.rope.length;
  const radial = s.vel.x * nx + s.vel.y * ny;
  if (radial > 0) {
    s.vel.x -= radial * nx;
    s.vel.y -= radial * ny;
  }
}

/** Kreis gegen Gebäude: herausschieben, abprallen, entlangrutschen. */
function collide(s: State, b: Building): void {
  const r = TUNING.bodyRadius;
  const cx = Math.min(Math.max(s.pos.x, b.x), b.x + b.width);
  const cy = Math.min(Math.max(s.pos.y, 0), b.height);
  let nx = s.pos.x - cx;
  let ny = s.pos.y - cy;
  let d = Math.hypot(nx, ny);
  if (d >= r) return;

  if (d < 1e-9) {
    // Mittelpunkt steckt im Gebäude: zur nächsten Kante hinaus
    const left = s.pos.x - b.x;
    const right = b.x + b.width - s.pos.x;
    const top = b.height - s.pos.y;
    const m = Math.min(left, right, top);
    if (m === top) [nx, ny, d] = [0, 1, -top];
    else if (m === left) [nx, ny, d] = [-1, 0, -left];
    else [nx, ny, d] = [1, 0, -right];
  } else {
    nx /= d;
    ny /= d;
  }

  const push = r - d;
  s.pos.x += nx * push;
  s.pos.y += ny * push;

  const vn = s.vel.x * nx + s.vel.y * ny;
  if (vn < 0) {
    const tx = s.vel.x - vn * nx;
    const ty = s.vel.y - vn * ny;
    s.vel.x = tx * TUNING.wallFriction - vn * TUNING.bounce * nx;
    s.vel.y = ty * TUNING.wallFriction - vn * TUNING.bounce * ny;
  }
}
