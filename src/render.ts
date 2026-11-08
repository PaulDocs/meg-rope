import { isPumping, TUNING, type State, type Vec } from './physics';
import { extentOf, SHAPE, type Prop, type World } from './world';

/** Kamera: welcher Weltausschnitt auf dem Bildschirm liegt. */
export interface Camera {
  x: number; // Weltkoordinate am linken Bildrand
  y: number; // Weltkoordinate am unteren Bildrand
  scale: number; // Pixel pro Meter
}

const VIEW_HEIGHT = 110; // so viele Meter sieht man in der Höhe – weit weg, viel Himmel
const FIGURE_SCALE = 2.3; // Figur so viel grösser zeichnen als in echt, damit man sie sieht
const DEPTH = 4; // m – so tief wirken Türme (schräg nach hinten oben gezeichnet)

// Farben: heller Taghimmel, Türme in drei gedeckten Tönen (Front, Seite, Dach)
const C = {
  skyTop: '#dfe7ee',
  skyBottom: '#f6f8fa',
  cloud: '#ffffff',
  cloudShade: 'rgba(170, 186, 200, 0.35)',
  farCity: 'rgba(150, 168, 184, 0.22)',
  ground: '#cfd6dc',
  groundLine: '#aab4bd',
  ink: '#23262d', // Männchen, Schrift
  rope: '#f2efe8',
  ropeStripe: '#3b3f47',
  crane: '#e0a93a',
  craneDark: '#a8771f',
  basket: '#8a5a33',
  eye: '#ffffff',
};
const TOWER = [
  { front: '#5f8794', side: '#46697a', top: '#86a9b4', win: 'rgba(225, 238, 242, 0.35)' }, // Schiefer
  { front: '#c7a574', side: '#a3834f', top: '#ddc29a', win: 'rgba(255, 246, 228, 0.4)' }, // Sandstein
  { front: '#b46b55', side: '#8f4f3d', top: '#cf8f7a', win: 'rgba(255, 232, 222, 0.35)' }, // Backstein
];
const BALLOON = [
  ['#e8743b', '#f6d2a8'],
  ['#3f8f8a', '#cfe7e2'],
  ['#d9a630', '#fbefc6'],
];

export function updateCamera(cam: Camera, s: State, w: number, h: number): void {
  cam.scale = h / VIEW_HEIGHT;
  const viewW = w / cam.scale;
  const targetX = s.pos.x - viewW * 0.35;
  const targetY = Math.max(-4, s.pos.y - VIEW_HEIGHT * 0.75); // Boden bleibt meist sichtbar
  const k = s.phase === 'ready' ? 1 : 0.1; // weich nachziehen, beim Neustart springen
  cam.x += (targetX - cam.x) * k;
  cam.y += (targetY - cam.y) * k;
}

export function screenToWorld(cam: Camera, h: number, sx: number, sy: number): Vec {
  return { x: cam.x + sx / cam.scale, y: cam.y + (h - sy) / cam.scale };
}

type Proj = { X: (x: number) => number; Y: (y: number) => number; m: number };

export function draw(ctx: CanvasRenderingContext2D, s: State, world: World, cam: Camera, w: number, h: number): void {
  const P: Proj = {
    X: (x) => (x - cam.x) * cam.scale,
    Y: (y) => h - (y - cam.y) * cam.scale,
    m: cam.scale,
  };
  drawSky(ctx, cam, w, h);
  const viewW = w / cam.scale;
  for (const p of world.props) {
    const { left, right } = extentOf(p);
    if (right + DEPTH < cam.x - 2 || left > cam.x + viewW + 2) continue;
    drawProp(ctx, p, P);
  }
  // Boden
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, P.Y(0), w, h);
  ctx.fillStyle = C.groundLine;
  ctx.fillRect(0, P.Y(0), w, Math.max(1, 0.25 * P.m));

  for (const r of s.looseRopes) drawRope(ctx, r.chain.points, P, 1 - r.age / TUNING.looseRopeTime);
  if (s.rope) {
    drawRope(ctx, s.rope.chain.points, P, 1);
    ctx.fillStyle = C.ink;
    circle(ctx, P.X(s.rope.anchor.x), P.Y(s.rope.anchor.y), Math.max(2, 0.3 * P.m));
  }
  drawStickman(ctx, s, P);
  drawHud(ctx, s, w, h);
}

function font(px: number): string {
  return `600 ${Math.round(px)}px -apple-system, system-ui, sans-serif`;
}

function drawHud(ctx: CanvasRenderingContext2D, s: State, w: number, h: number): void {
  ctx.fillStyle = C.ink;
  ctx.font = font(h * 0.035);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const dist = Math.max(0, s.maxX - TUNING.startPos.x);
  ctx.fillText(`${dist.toFixed(0)} m`, h * 0.03, h * 0.03);

  const msg = s.phase === 'ready' ? 'Tippe auf ein Haus, einen Kran oder einen Ballon' : s.phase === 'down' ? 'Am Boden – tippen für neuen Versuch' : '';
  if (msg) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(h * 0.04);
    ctx.fillText(msg, w / 2, h * 0.18);
  }
}

/** Heller Himmel, Wolken und eine blasse Stadt weit hinten (ziehen langsamer vorbei). */
function drawSky(ctx: CanvasRenderingContext2D, cam: Camera, w: number, h: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, C.skyTop);
  sky.addColorStop(1, C.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const m = cam.scale;

  // ferne Stadt: Parallaxe 0.3
  ctx.fillStyle = C.farCity;
  const step = 19;
  const shift = cam.x * 0.3;
  const first = Math.floor(shift / step) - 1;
  for (let i = first; (i * step - shift) * m < w + step * m; i++) {
    const bh = 25 + ((((i * 53) % 31) + 31) % 31);
    const top = h - (bh - cam.y * 0.5) * m;
    ctx.fillRect((i * step - shift) * m, top, 11 * m, h - top);
  }

  // Wolken: Parallaxe 0.5, je Wolke ein paar runde Bäusche
  const cs = 70;
  const cshift = cam.x * 0.5;
  const cfirst = Math.floor(cshift / cs) - 1;
  for (let i = cfirst; (i * cs - cshift) * m < w + cs * m; i++) {
    const n = ((i * 37) % 11 + 11) % 11;
    const cx = (i * cs - cshift + (n * 3) % 20) * m;
    const cy = h - (60 + n * 4 - cam.y * 0.6) * m;
    const r = (6 + (n % 4)) * m;
    for (const [dx, dy, k] of [[0, 0, 1], [1.1, 0.25, 0.8], [-1, 0.3, 0.75], [0.4, -0.55, 0.85]] as const) {
      ctx.fillStyle = C.cloudShade;
      circle(ctx, cx + dx * r + r * 0.12, cy + dy * r + r * 0.15, r * k);
      ctx.fillStyle = C.cloud;
      circle(ctx, cx + dx * r, cy + dy * r, r * k);
    }
  }
}

function drawProp(ctx: CanvasRenderingContext2D, p: Prop, P: Proj): void {
  if (p.kind === 'tower') drawTower(ctx, p, P);
  else if (p.kind === 'crane') drawCrane(ctx, p, P);
  else drawBalloon(ctx, p, P);
}

/** Quader mit Front, Seite und Dach, schräg nach hinten oben (Tiefe DEPTH). */
function box(ctx: CanvasRenderingContext2D, P: Proj, x: number, y: number, w: number, h: number, col: (typeof TOWER)[number]): void {
  const dx = DEPTH * 0.55;
  const dy = DEPTH * 0.45;
  // Seite rechts
  ctx.fillStyle = col.side;
  poly(ctx, [
    [P.X(x + w), P.Y(y)],
    [P.X(x + w + dx), P.Y(y + dy)],
    [P.X(x + w + dx), P.Y(y + h + dy)],
    [P.X(x + w), P.Y(y + h)],
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
}

function drawTower(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'tower' }>, P: Proj): void {
  const col = TOWER[p.color % TOWER.length]!;
  box(ctx, P, p.x, 0, p.w, p.h, col);
  // Fensterbänder: senkrechte Streifen, oben ein Gesims
  ctx.fillStyle = col.win;
  const bands = Math.max(2, Math.round(p.w / 2.6));
  const bw = p.w / bands;
  for (let i = 0; i < bands; i++) ctx.fillRect(P.X(p.x + i * bw + bw * 0.3), P.Y(p.h - 2), bw * 0.4 * P.m, (p.h - 4) * P.m);
  ctx.fillRect(P.X(p.x), P.Y(p.h - 0.6), p.w * P.m, 0.6 * P.m);

  const st = SHAPE.stepTop;
  const sp = SHAPE.spireBase;
  if (p.top === 'step') box(ctx, P, p.x + p.w * st.x, p.h, p.w * st.w, p.h * st.h, col);
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

/** Baukran: Gittermast, Ausleger mit Gegengewicht, Seil mit Haken. */
function drawCrane(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'crane' }>, P: Proj): void {
  const { X, Y, m } = P;
  ctx.strokeStyle = C.crane;
  ctx.lineWidth = Math.max(1, 0.25 * m);
  // Mast: zwei Holme und Zickzack
  const l = p.x - SHAPE.craneMastHalf;
  const r = p.x + SHAPE.craneMastHalf;
  const jh = SHAPE.craneJibHeight;
  line(ctx, X(l), Y(0), X(l), Y(p.h));
  line(ctx, X(r), Y(0), X(r), Y(p.h));
  ctx.beginPath();
  for (let y = 0, i = 0; y < p.h; y += 1.6, i++) {
    ctx.moveTo(X(i % 2 ? l : r), Y(y));
    ctx.lineTo(X(i % 2 ? r : l), Y(y + 1.6));
  }
  ctx.stroke();
  // Ausleger: Ober- und Untergurt mit Dreiecken
  const a = p.x - p.counter;
  const b = p.x + p.jib;
  line(ctx, X(a), Y(p.h), X(b), Y(p.h));
  line(ctx, X(a), Y(p.h + jh), X(b - 2), Y(p.h + jh));
  ctx.beginPath();
  for (let x = a, i = 0; x < b - 2; x += 1.6, i++) {
    ctx.moveTo(X(x), Y(i % 2 ? p.h : p.h + jh));
    ctx.lineTo(X(x + 1.6), Y(i % 2 ? p.h + jh : p.h));
  }
  ctx.stroke();
  // Turmspitze mit Abspannung
  line(ctx, X(p.x), Y(p.h + jh), X(p.x), Y(p.h + 5));
  ctx.lineWidth = Math.max(1, 0.1 * m);
  line(ctx, X(p.x), Y(p.h + 5), X(b - 2), Y(p.h + jh));
  line(ctx, X(p.x), Y(p.h + 5), X(a), Y(p.h + jh));
  // Gegengewicht und Führerhaus
  ctx.fillStyle = C.craneDark;
  ctx.fillRect(X(a), Y(p.h + 0.2), 3 * m, 2.2 * m);
  ctx.fillRect(X(p.x + 0.8), Y(p.h - 0.2), 2.2 * m, 2 * m);
  // Lastseil und Haken
  const hookX = p.x + p.jib * 0.7;
  const hookY = p.h - 14;
  ctx.strokeStyle = C.ink;
  line(ctx, X(hookX), Y(p.h), X(hookX), Y(hookY));
  ctx.fillStyle = C.ink;
  ctx.fillRect(X(hookX - 0.5), Y(hookY), 1 * m, 0.8 * m);
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
  const by = p.y - p.r * bk.below + bk.h; // Oberkante Korb
  line(ctx, X(p.x - 1.2), Y(p.y - p.r * 0.9), X(p.x - bk.w / 2 + 0.1), Y(by));
  line(ctx, X(p.x + 1.2), Y(p.y - p.r * 0.9), X(p.x + bk.w / 2 - 0.1), Y(by));
  ctx.fillStyle = C.basket;
  ctx.fillRect(X(p.x - bk.w / 2), Y(by), bk.w * m, bk.h * m);
}

/** Seil als gedrehte Schnur: helle Linie mit dunklen Streifen. */
function drawRope(ctx: CanvasRenderingContext2D, pts: Vec[], P: Proj, alpha: number): void {
  if (pts.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(P.X(pts[0]!.x), P.Y(pts[0]!.y));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(P.X(pts[i]!.x), P.Y(pts[i]!.y));
  };
  ctx.lineWidth = Math.max(2, 0.22 * P.m);
  ctx.strokeStyle = C.ropeStripe;
  path();
  ctx.stroke();
  ctx.lineWidth = Math.max(1, 0.12 * P.m);
  ctx.strokeStyle = C.rope;
  ctx.setLineDash([Math.max(2, 0.3 * P.m), Math.max(2, 0.3 * P.m)]);
  path();
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
  ctx.lineWidth = Math.max(2, 0.14 * m);
  ctx.lineCap = 'round';

  if (s.phase === 'down') {
    const y = 0.15 * k;
    line(ctx, P.X(cx - 0.8 * k), P.Y(y), P.X(cx + 0.6 * k), P.Y(y));
    circle(ctx, P.X(cx + 0.95 * k), P.Y(y + 0.15 * k), 0.28 * m);
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
  circle(ctx, P.X(head.x), P.Y(head.y), 0.3 * m);
  ctx.fillStyle = C.eye;
  circle(ctx, P.X(head.x + px * 0.1 * k * Math.sign(s.vel.x || 1)), P.Y(head.y + py * 0.1 * k), 0.08 * m);

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
