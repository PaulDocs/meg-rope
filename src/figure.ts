// Männchen und Seil (B9). Das Männchen trägt einen korallenroten Schal, der
// hinter ihm herflattert und so das Tempo zeigt. Ein heller (nachts dunkler)
// Rand hält es vor jedem Hintergrund sichtbar.

import { circle, line, type Proj } from './canvas';
import type { Look } from './look';
import { pumpShare, type State, type Vec } from './physics';

const LEG_FULL_SPEED = 4; // m/s quer zum Körper: ab diesem Tempo sind die Beine beim Schwung holen ganz gestreckt
const FIGURE_SCALE = 1.6; // Figur so viel grösser zeichnen als in echt, damit man sie sieht
const SCARF = { len: 1.9, segments: 7, sag: 6, flutterFrom: 12, wave: 0.2, speed: 13 }; // Länge in m (× Figur), Durchhang als Tempo in m/s
const STREAK = { from: 28, perSpeed: 0.12, max: 4 }; // Tempostriche im Flug ab so viel m/s

type Seg = [number, number, number, number];

/** Seil: dünne Schnur in der Farbe des Männchens. */
export function drawRope(ctx: CanvasRenderingContext2D, L: Look, pts: Vec[], P: Proj, alpha: number): void {
  if (pts.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.2, 0.12 * P.m);
  ctx.strokeStyle = L.ink;
  ctx.beginPath();
  ctx.moveTo(P.X(pts[0]!.x), P.Y(pts[0]!.y));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(P.X(pts[i]!.x), P.Y(pts[i]!.y));
  ctx.stroke();
  ctx.restore();
}

/** Haken: Punkt mit Ring, damit man sieht, wo das Seil hält. */
export function drawAnchor(ctx: CanvasRenderingContext2D, L: Look, at: Vec, P: Proj): void {
  const r = Math.max(1.5, 0.3 * P.m);
  ctx.fillStyle = L.paper;
  circle(ctx, P.X(at.x), P.Y(at.y), r * 1.7);
  ctx.fillStyle = L.scarf;
  circle(ctx, P.X(at.x), P.Y(at.y), r);
}

/** Schal: Band ab `from`, weht entgegen der Bewegung und hängt bei wenig Tempo herunter. */
function scarfTail(ctx: CanvasRenderingContext2D, s: State, P: Proj, from: Vec, k: number, len: number, phase: number): void {
  const speed = Math.hypot(s.vel.x, s.vel.y);
  let dx = -s.vel.x;
  let dy = -s.vel.y - SCARF.sag;
  const n = Math.hypot(dx, dy) || 1;
  dx /= n;
  dy /= n;
  const flutter = 0.25 + 0.75 * Math.min(1, speed / SCARF.flutterFrom);
  ctx.beginPath();
  ctx.moveTo(P.X(from.x), P.Y(from.y));
  for (let i = 1; i <= SCARF.segments; i++) {
    const t = i / SCARF.segments;
    const wob = Math.sin(s.time * SCARF.speed - i * 1.1 + phase) * SCARF.wave * k * t * flutter;
    ctx.lineTo(P.X(from.x + dx * t * len * k - dy * wob), P.Y(from.y + dy * t * len * k + dx * wob));
  }
  ctx.stroke();
}

/** Strichmännchen, gedreht nach state.angle; holt am Seil mit den Beinen Schwung. */
export function drawFigure(ctx: CanvasRenderingContext2D, L: Look, s: State, P: Proj): void {
  const k = FIGURE_SCALE;
  const m = P.m * k;
  const cx = s.pos.x;
  const cy = s.pos.y;
  const body = Math.max(2, 0.15 * m);
  const halo = body + Math.max(2, 0.1 * m);
  const headR = 0.34 * m;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (s.phase === 'down') {
    const y = 0.15 * k;
    const lying: Seg = [P.X(cx - 0.8 * k), P.Y(y), P.X(cx + 0.6 * k), P.Y(y)];
    const hx = P.X(cx + 0.95 * k);
    const hy = P.Y(y + 0.15 * k);
    strokeBody(ctx, [lying], hx, hy, headR + (halo - body) / 2, L.paper, halo);
    strokeBody(ctx, [lying], hx, hy, headR, L.ink, body);
    ctx.strokeStyle = L.scarf; // Schal liegt neben ihm am Boden
    ctx.lineWidth = Math.max(2, 0.2 * m);
    line(ctx, P.X(cx + 0.55 * k), P.Y(y), P.X(cx - 0.4 * k), P.Y(y - 0.12 * k));
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
  const segs: Seg[] = [[P.X(hip.x), P.Y(hip.y), P.X(neck.x), P.Y(neck.y)]];

  // Beine: beim Schwungholen in die Schwungrichtung gestreckt wie auf einer
  // Schaukel – so kräftig, wie es gerade Schwung holt (pumpShare: beim Anlauf
  // sacht, bei Looping-Versuchen über Hakenhöhe mässig); sonst leicht pendeln
  const share = pumpShare(s);
  const across = s.vel.x * px + s.vel.y * py;
  const kick = share > 0 ? Math.max(-1, Math.min(1, across / LEG_FULL_SPEED)) * (0.2 + 0.5 * share) : Math.sin(s.time * 6) * 0.15;
  for (const side of [-1, 1]) {
    const spread = (side * 0.22 + kick) * k;
    segs.push([P.X(hip.x), P.Y(hip.y), P.X(hip.x - ux * 0.8 * k + px * spread), P.Y(hip.y - uy * 0.8 * k + py * spread)]);
  }
  // Arme: am Seil nach oben zum Haken, im Flug ausgebreitet
  for (const side of [-1, 1]) {
    const reach = s.rope
      ? { x: (ux * 0.75 + px * side * 0.1) * k, y: (uy * 0.75 + py * side * 0.1) * k }
      : { x: (px * side * 0.65 + ux * 0.15) * k, y: (py * side * 0.65 + uy * 0.15) * k };
    segs.push([P.X(neck.x), P.Y(neck.y), P.X(neck.x + reach.x), P.Y(neck.y + reach.y)]);
  }

  // Tempostriche hinter dem Männchen, wenn es schnell fliegt
  const speed = Math.hypot(s.vel.x, s.vel.y);
  if (!s.rope && speed > STREAK.from) {
    const dx = s.vel.x / speed;
    const dy = s.vel.y / speed;
    const len = Math.min(STREAK.max, (speed - STREAK.from) * STREAK.perSpeed) * k;
    ctx.strokeStyle = L.ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, 0.07 * m);
    for (const off of [-0.55, 0, 0.55]) {
      const sx = cx - dx * 1.3 * k - dy * off * k;
      const sy = cy - dy * 1.3 * k + dx * off * k;
      line(ctx, P.X(sx), P.Y(sy), P.X(sx - dx * len), P.Y(sy - dy * len));
    }
    ctx.globalAlpha = 1;
  }

  const hx = P.X(head.x);
  const hy = P.Y(head.y);
  strokeBody(ctx, segs, hx, hy, headR + (halo - body) / 2, L.paper, halo);
  // Schal: zwei Enden hinter dem Körper
  ctx.strokeStyle = L.scarf;
  ctx.lineWidth = Math.max(2, 0.2 * m);
  scarfTail(ctx, s, P, neck, k, SCARF.len, 0);
  scarfTail(ctx, s, P, neck, k, SCARF.len * 0.6, 1.7);
  strokeBody(ctx, segs, hx, hy, headR, L.ink, body);
  // Schal um den Hals
  ctx.strokeStyle = L.scarf;
  ctx.lineWidth = Math.max(2.5, 0.24 * m);
  line(ctx, P.X(neck.x - px * 0.16 * k), P.Y(neck.y - py * 0.16 * k), P.X(neck.x + px * 0.16 * k), P.Y(neck.y + py * 0.16 * k));
  // Auge schaut in Flugrichtung
  ctx.fillStyle = L.paper;
  circle(ctx, P.X(head.x + px * 0.1 * k * Math.sign(s.vel.x || 1)), P.Y(head.y + py * 0.1 * k), 0.1 * m);
}

/** Körperstriche und Kopf in einer Farbe (einmal breit als Rand, einmal als Körper). */
function strokeBody(ctx: CanvasRenderingContext2D, segs: Seg[], hx: number, hy: number, headR: number, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of segs) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  circle(ctx, hx, hy, headR);
}
