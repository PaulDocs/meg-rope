import { isPumping, TUNING, type State, type Vec } from './physics';
import { extentOf, SHAPE, type Prop, type World } from './world';

/** Kamera: welcher Weltausschnitt auf dem Bildschirm liegt. */
export interface Camera {
  x: number; // Weltkoordinate am linken Bildrand
  y: number; // Weltkoordinate am unteren Bildrand
  scale: number; // Pixel pro Meter
}

const VIEW_HEIGHT = 120; // so viele Meter sieht man in der Höhe – weit weg, viel Himmel
const FIGURE_SCALE = 2; // Figur so viel grösser zeichnen als in echt, damit man sie sieht
const DEPTH = 9; // m – so tief sind Türme
const PERSPECTIVE = 0.07; // wie stark man die Seiten sieht, je weiter ein Turm von der Bildmitte steht
const LIFT = 2.2; // m – Rückseite liegt so viel höher (Blick leicht von oben)
const HORIZON = LIFT * 3; // m – hier beginnt die Bodenfläche hinten; dort stehen die fernen Türme

// Farben: helle, fast weisse Welt, Stadt in einem kühlen Schiefer-Ton
const C = {
  skyTop: '#e4e8ec',
  skyBottom: '#f7f8f9',
  cloud: '#ffffff',
  cloudShade: 'rgba(160, 172, 186, 0.28)',
  farTower: '#d3dae2',
  farTowerSide: '#c4ccd6',
  floor: '#e9ecef',
  floorFar: '#dde1e6',
  shadow: 'rgba(90, 104, 122, 0.16)',
  ink: '#262a31', // Männchen, Seil, Schrift
  crane: '#e0b13a',
  craneDark: '#b0841f',
  hook: '#c8452f',
  basket: '#8a5a33',
  airship: '#9aa3ad',
  airshipLight: '#c3cad2',
  airshipDark: '#6f7984',
  eye: '#ffffff',
  towerRib: 'rgba(40, 56, 78, 0.18)',
};
// Türme: drei nahe Töne derselben Familie (Front, Seite, Dach)
const TOWER = [
  { front: '#7189a6', side: '#566d8a', top: '#93a8c1' },
  { front: '#6a82a0', side: '#506784', top: '#8ca2bc' },
  { front: '#7891ad', side: '#5d7592', top: '#9aaec6' },
];
const BALLOON = [
  ['#e8743b', '#f6d2a8'],
  ['#3f8f8a', '#cfe7e2'],
  ['#d9a630', '#fbefc6'],
];

export function updateCamera(cam: Camera, s: State, w: number, h: number): void {
  cam.scale = h / VIEW_HEIGHT;
  const viewW = w / cam.scale;
  const targetX = s.pos.x - viewW * 0.4;
  const targetY = Math.max(-8, s.pos.y - VIEW_HEIGHT * 0.8); // Boden meist sichtbar
  const k = s.phase === 'ready' ? 1 : 0.1; // weich nachziehen, beim Neustart springen
  cam.x += (targetX - cam.x) * k;
  cam.y += (targetY - cam.y) * k;
}

export function screenToWorld(cam: Camera, h: number, sx: number, sy: number): Vec {
  return { x: cam.x + sx / cam.scale, y: cam.y + (h - sy) / cam.scale };
}

type Proj = { X: (x: number) => number; Y: (y: number) => number; m: number; mid: number };

export function draw(ctx: CanvasRenderingContext2D, s: State, world: World, cam: Camera, w: number, h: number): void {
  const viewW = w / cam.scale;
  const P: Proj = {
    X: (x) => (x - cam.x) * cam.scale,
    Y: (y) => h - (y - cam.y) * cam.scale,
    m: cam.scale,
    mid: cam.x + viewW / 2,
  };
  drawSky(ctx, cam, w, h);
  drawFloor(ctx, P, w, h);
  drawFarCity(ctx, cam, P, w);

  const visible = world.props.filter((p) => {
    const { left, right } = extentOf(p);
    return right + DEPTH > cam.x - 4 && left - DEPTH < cam.x + viewW + 4;
  });
  for (const p of visible) if (p.kind === 'tower') drawShadow(ctx, p, P);
  // Weiter von der Bildmitte zuerst, damit nähere Seiten darüber liegen
  const order = [...visible].sort((a, b) => Math.abs(centerOf(b) - P.mid) - Math.abs(centerOf(a) - P.mid));
  for (const p of order) drawProp(ctx, p, P);

  for (const r of s.looseRopes) drawRope(ctx, r.chain.points, P, 1 - r.age / TUNING.looseRopeTime);
  if (s.rope) {
    drawRope(ctx, s.rope.chain.points, P, 1);
    ctx.fillStyle = C.ink;
    circle(ctx, P.X(s.rope.anchor.x), P.Y(s.rope.anchor.y), Math.max(1.5, 0.3 * P.m));
  }
  drawStickman(ctx, s, P);
  drawHud(ctx, s, w, h);
}

function centerOf(p: Prop): number {
  const { left, right } = extentOf(p);
  return (left + right) / 2;
}

function font(px: number): string {
  return `700 ${Math.round(px)}px -apple-system, system-ui, sans-serif`;
}

function drawHud(ctx: CanvasRenderingContext2D, s: State, w: number, h: number): void {
  ctx.fillStyle = C.ink;
  ctx.font = font(h * 0.04);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';
  const dist = Math.max(0, s.maxX - TUNING.startPos.x);
  ctx.fillText(`${dist.toFixed(0)}`, w - h * 0.03, h * 0.025);

  const msg = s.phase === 'ready' ? 'Tippe auf ein Haus, einen Kran, einen Ballon oder ein Luftschiff' : s.phase === 'down' ? 'Am Boden – tippen für neuen Versuch' : '';
  if (msg) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(h * 0.032);
    ctx.fillText(msg, w / 2, h * 0.16);
  }
}

/** Heller Himmel und Wolken (ziehen langsamer vorbei). */
function drawSky(ctx: CanvasRenderingContext2D, cam: Camera, w: number, h: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, C.skyTop);
  sky.addColorStop(1, C.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const m = cam.scale;
  const cs = 80;
  const cshift = cam.x * 0.5;
  const cfirst = Math.floor(cshift / cs) - 1;
  for (let i = cfirst; (i * cs - cshift) * m < w + cs * m; i++) {
    const n = (((i * 37) % 11) + 11) % 11;
    const cx = (i * cs - cshift + ((n * 3) % 20)) * m;
    const cy = h - (55 + n * 6 - cam.y * 0.6) * m;
    const r = (6 + (n % 4)) * m;
    for (const [dx, dy, k] of [[0, 0, 1], [1.1, 0.25, 0.8], [-1, 0.3, 0.75], [0.4, -0.55, 0.85], [-0.4, -0.4, 0.7]] as const) {
      ctx.fillStyle = C.cloudShade;
      circle(ctx, cx + dx * r + r * 0.1, cy + dy * r + r * 0.14, r * k);
      ctx.fillStyle = C.cloud;
      circle(ctx, cx + dx * r, cy + dy * r, r * k);
    }
  }
}

/** Boden als helle Fläche, nach hinten etwas dunkler (Blick leicht von oben). */
function drawFloor(ctx: CanvasRenderingContext2D, P: Proj, w: number, h: number): void {
  const top = P.Y(HORIZON);
  const g = ctx.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, C.floorFar);
  g.addColorStop(1, C.floor);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, h - top);
}

/** Blasse Türme weit hinten: ziehen langsamer vorbei, man kann sie nicht greifen. */
function drawFarCity(ctx: CanvasRenderingContext2D, cam: Camera, P: Proj, w: number): void {
  const m = cam.scale;
  const step = 26;
  const shift = cam.x * 0.45;
  const first = Math.floor(shift / step) - 1;
  const base = P.Y(HORIZON);
  for (let i = first; (i * step - shift) * m < w + step * m; i++) {
    const n = (((i * 53) % 31) + 31) % 31;
    const bh = (40 + n * 2) * m * 0.7;
    const x = (i * step - shift + (n % 7)) * m;
    const bw = (6 + (n % 5)) * m * 0.7;
    ctx.fillStyle = C.farTowerSide;
    ctx.fillRect(x + bw, base - bh + 0.8 * m, bw * 0.25, bh - 0.8 * m);
    ctx.fillStyle = C.farTower;
    ctx.fillRect(x, base - bh, bw, bh);
  }
}

/** Weicher Schatten eines Turms auf dem Boden, schräg nach hinten links. */
function drawShadow(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'tower' }>, P: Proj): void {
  const len = Math.min(p.h * 0.18, 18);
  ctx.fillStyle = C.shadow;
  poly(ctx, [
    [P.X(p.x), P.Y(0)],
    [P.X(p.x + p.w), P.Y(0)],
    [P.X(p.x + p.w - len * 0.6), P.Y(LIFT + len * 0.25)],
    [P.X(p.x - len * 0.6), P.Y(LIFT + len * 0.25)],
  ]);
}

function drawProp(ctx: CanvasRenderingContext2D, p: Prop, P: Proj): void {
  if (p.kind === 'tower') drawTower(ctx, p, P);
  else if (p.kind === 'crane') drawCrane(ctx, p, P);
  else if (p.kind === 'balloon') drawBalloon(ctx, p, P);
  else drawAirship(ctx, p, P);
}

/**
 * Quader in einfacher Perspektive: Die Rückseite ist zur Bildmitte hin
 * verschoben und etwas angehoben. So sieht man bei Türmen rechts der Mitte
 * die linke Seite, links der Mitte die rechte – wie mit einer echten Kamera.
 * Seite und Dach sind nur Kulisse: greifbar ist die Front (Haltepunkte in
 * world.ts). So entschieden von Pascal am 08.11.2026.
 */
function box(ctx: CanvasRenderingContext2D, P: Proj, x: number, y: number, w: number, h: number, col: (typeof TOWER)[number]): void {
  const dx = -(x + w / 2 - P.mid) * PERSPECTIVE;
  const dy = LIFT;
  const sideX = dx < 0 ? x : x + w; // sichtbare Seite: zur Mitte hin
  // Seite
  ctx.fillStyle = col.side;
  poly(ctx, [
    [P.X(sideX), P.Y(y)],
    [P.X(sideX + dx), P.Y(y + dy)],
    [P.X(sideX + dx), P.Y(y + h + dy)],
    [P.X(sideX), P.Y(y + h)],
  ]);
  // Dach
  ctx.fillStyle = col.top;
  poly(ctx, [
    [P.X(x), P.Y(y + h)],
    [P.X(x + w), P.Y(y + h)],
    [P.X(x + w + dx), P.Y(y + h + dy)],
    [P.X(x + dx), P.Y(y + h + dy)],
  ]);
  // Front
  ctx.fillStyle = col.front;
  ctx.fillRect(P.X(x), P.Y(y + h), w * P.m, h * P.m);
  // senkrechte Rillen auf der Front
  ctx.fillStyle = C.towerRib;
  const ribs = Math.max(2, Math.round(w / 1.6));
  for (let i = 1; i < ribs; i++) ctx.fillRect(P.X(x + (i * w) / ribs), P.Y(y + h), Math.max(1, 0.18 * P.m), h * P.m);
}

function drawTower(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'tower' }>, P: Proj): void {
  const col = TOWER[p.color % TOWER.length]!;
  // Schaft
  box(ctx, P, p.x, 0, p.w, p.h, col);
  const st = SHAPE.stepTop;
  const s2 = SHAPE.stepTop2;
  const sp = SHAPE.spireBase;
  if (p.top === 'step') {
    box(ctx, P, p.x + p.w * st.x, p.h, p.w * st.w, p.h * st.h, col);
    box(ctx, P, p.x + p.w * s2.x, p.h * (1 + st.h), p.w * s2.w, p.h * s2.h, col);
  }
  if (p.top === 'spire') {
    box(ctx, P, p.x + p.w * sp.x, p.h, p.w * sp.w, p.h * sp.h, col);
    ctx.fillStyle = col.side;
    poly(ctx, [
      [P.X(p.x + p.w * sp.x), P.Y(p.h * (1 + sp.h))],
      [P.X(p.x + p.w * (sp.x + sp.w)), P.Y(p.h * (1 + sp.h))],
      [P.X(p.x + p.w * (sp.x + sp.w / 2)), P.Y(p.h * (1 + SHAPE.spireTip))],
    ]);
  }
}

/** Baukran: Gittermast, Ausleger mit Gegengewicht, Seil mit Haken. Steht auf dem Boden oder auf einem Dach. */
function drawCrane(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'crane' }>, P: Proj): void {
  const { X, Y, m } = P;
  const b0 = p.base;
  const top = b0 + p.h;
  const jh = SHAPE.craneJibHeight;
  ctx.strokeStyle = C.crane;
  ctx.lineWidth = Math.max(1, 0.25 * m);
  // Mast: zwei Holme und Zickzack
  const l = p.x - SHAPE.craneMastHalf;
  const r = p.x + SHAPE.craneMastHalf;
  line(ctx, X(l), Y(b0), X(l), Y(top));
  line(ctx, X(r), Y(b0), X(r), Y(top));
  ctx.beginPath();
  for (let y = b0, i = 0; y < top; y += 1.6, i++) {
    ctx.moveTo(X(i % 2 ? l : r), Y(y));
    ctx.lineTo(X(i % 2 ? r : l), Y(Math.min(top, y + 1.6)));
  }
  ctx.stroke();
  // Ausleger: Ober- und Untergurt mit Dreiecken
  const a = p.x - p.counter;
  const b = p.x + p.jib;
  line(ctx, X(a), Y(top), X(b), Y(top));
  line(ctx, X(a), Y(top + jh), X(b - 2), Y(top + jh));
  ctx.beginPath();
  for (let x = a, i = 0; x < b - 2; x += 1.6, i++) {
    ctx.moveTo(X(x), Y(i % 2 ? top : top + jh));
    ctx.lineTo(X(x + 1.6), Y(i % 2 ? top + jh : top));
  }
  ctx.stroke();
  // Turmspitze mit Abspannung
  line(ctx, X(p.x), Y(top + jh), X(p.x), Y(top + 5));
  ctx.lineWidth = Math.max(1, 0.1 * m);
  line(ctx, X(p.x), Y(top + 5), X(b - 2), Y(top + jh));
  line(ctx, X(p.x), Y(top + 5), X(a), Y(top + jh));
  // Gegengewicht und Führerhaus
  ctx.fillStyle = C.craneDark;
  ctx.fillRect(X(a), Y(top + 0.2), 3 * m, 2.2 * m);
  ctx.fillRect(X(p.x + 0.8), Y(top - 0.2), 2.2 * m, 2 * m);
  // Lastseil mit rotem Haken
  const hookX = p.x + p.jib * 0.75;
  const hookY = Math.max(b0 + 2, top - Math.min(16, p.h * 0.6));
  ctx.strokeStyle = C.ink;
  line(ctx, X(hookX), Y(top), X(hookX), Y(hookY));
  ctx.fillStyle = C.hook;
  ctx.fillRect(X(hookX - 0.6), Y(hookY), 1.2 * m, 1 * m);
}

/** Heissluftballon mit Streifen, Korb und Leinen. */
function drawBalloon(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'balloon' }>, P: Proj): void {
  const { X, Y, m } = P;
  const [main, light] = BALLOON[p.color % BALLOON.length]!;
  const cx = X(p.x);
  const cy = Y(p.y);
  const r = p.r * m;
  // Hülle: Kreis, unten spitz zulaufend
  const env = () => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(cx + r * 0.3, cy + r * 1.15);
    ctx.lineTo(cx - r * 0.3, cy + r * 1.15);
    ctx.closePath();
  };
  ctx.fillStyle = main!;
  env();
  ctx.fill();
  ctx.save();
  env();
  ctx.clip();
  ctx.fillStyle = light!;
  for (const k of [-0.55, 0.1]) ctx.fillRect(cx + k * r, cy - r, r * 0.3, r * 2.3);
  ctx.restore();
  // Leinen und Korb
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(1, 0.08 * m);
  const bk = SHAPE.basket;
  const by = p.y - p.r * bk.below + bk.h;
  line(ctx, X(p.x - 1.2), Y(p.y - p.r * 0.9), X(p.x - bk.w / 2 + 0.1), Y(by));
  line(ctx, X(p.x + 1.2), Y(p.y - p.r * 0.9), X(p.x + bk.w / 2 - 0.1), Y(by));
  ctx.fillStyle = C.basket;
  ctx.fillRect(X(p.x - bk.w / 2), Y(by), bk.w * m, bk.h * m);
}

/** Luftschiff: lange Hülle mit Leitwerk und Gondel. */
function drawAirship(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'airship' }>, P: Proj): void {
  const { X, Y, m } = P;
  const hh = (p.len * SHAPE.airshipHeight) / 2;
  const cx = X(p.x);
  const cy = Y(p.y);
  // Leitwerk hinten (links), nur Kulisse
  ctx.fillStyle = C.airshipDark;
  const t = SHAPE.airshipTail;
  const end = p.x - p.len / 2;
  poly(ctx, [
    [X(end + t.root), Y(p.y)],
    [X(end), Y(p.y + hh * t.span)],
    [X(end + t.inner), Y(p.y)],
    [X(end), Y(p.y - hh * t.span)],
  ]);
  // Hülle
  ctx.fillStyle = C.airship;
  ctx.beginPath();
  ctx.ellipse(cx, cy, (p.len / 2) * m, hh * m, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.airshipLight;
  ctx.beginPath();
  ctx.ellipse(cx, cy - hh * m * 0.35, (p.len / 2) * m * 0.85, hh * m * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Gondel
  const g = SHAPE.gondola;
  ctx.fillStyle = C.airshipDark;
  ctx.fillRect(X(p.x - (p.len * g.w) / 2), Y(p.y - hh), p.len * g.w * m, g.h * m);
}

/** Seil: dünne dunkle Schnur. */
function drawRope(ctx: CanvasRenderingContext2D, pts: Vec[], P: Proj, alpha: number): void {
  if (pts.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.2, 0.12 * P.m);
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(P.X(pts[0]!.x), P.Y(pts[0]!.y));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(P.X(pts[i]!.x), P.Y(pts[i]!.y));
  ctx.stroke();
  ctx.restore();
}

/** Strichmännchen, gedreht nach state.angle; holt am Seil mit den Beinen Schwung. */
function drawStickman(ctx: CanvasRenderingContext2D, s: State, P: Proj): void {
  const k = FIGURE_SCALE;
  const m = P.m * k;
  const cx = s.pos.x;
  const cy = s.pos.y;
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.ink;
  ctx.lineWidth = Math.max(1.5, 0.13 * m);
  ctx.lineCap = 'round';

  if (s.phase === 'down') {
    const y = 0.15 * k;
    line(ctx, P.X(cx - 0.8 * k), P.Y(y), P.X(cx + 0.6 * k), P.Y(y));
    circle(ctx, P.X(cx + 0.95 * k), P.Y(y + 0.15 * k), 0.3 * m);
    return;
  }

  // Körperachse: Kopf zeigt in Richtung (ux, uy)
  const ux = -Math.sin(s.angle);
  const uy = Math.cos(s.angle);
  const px = -uy; // quer zum Körper
  const py = ux;
  const hip = { x: cx - ux * 0.35 * k, y: cy - uy * 0.35 * k };
  const neck = { x: cx + ux * 0.45 * k, y: cy + uy * 0.45 * k };
  const head = { x: cx + ux * 0.85 * k, y: cy + uy * 0.85 * k };

  line(ctx, P.X(hip.x), P.Y(hip.y), P.X(neck.x), P.Y(neck.y));
  circle(ctx, P.X(head.x), P.Y(head.y), 0.32 * m);
  ctx.fillStyle = C.eye;
  circle(ctx, P.X(head.x + px * 0.1 * k * Math.sign(s.vel.x || 1)), P.Y(head.y + py * 0.1 * k), 0.09 * m);

  // Beine: beim Schwungholen kräftig vor und zurück, sonst leicht pendeln
  const kick = isPumping(s) ? Math.sin(s.time * 9) * 0.6 : Math.sin(s.time * 6) * 0.15;
  for (const side of [-1, 1]) {
    const spread = (side * 0.22 + kick) * k;
    line(ctx, P.X(hip.x), P.Y(hip.y), P.X(hip.x - ux * 0.8 * k + px * spread), P.Y(hip.y - uy * 0.8 * k + py * spread));
  }
  // Arme: am Seil nach oben zum Haken, im Flug ausgebreitet
  for (const side of [-1, 1]) {
    const reach = s.rope
      ? { x: (ux * 0.75 + px * side * 0.1) * k, y: (uy * 0.75 + py * side * 0.1) * k }
      : { x: (px * side * 0.65 + ux * 0.15) * k, y: (py * side * 0.65 + uy * 0.15) * k };
    line(ctx, P.X(neck.x), P.Y(neck.y), P.X(neck.x + reach.x), P.Y(neck.y + reach.y));
  }
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}
