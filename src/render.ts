import { TUNING, type Building, type State, type Vec } from './physics';

/** Kamera: welcher Weltausschnitt auf dem Bildschirm liegt. */
export interface Camera {
  x: number; // Weltkoordinate am linken Bildrand
  y: number; // Weltkoordinate am unteren Bildrand
  scale: number; // Pixel pro Meter
}

const VIEW_HEIGHT = 60; // so viele Meter sieht man in der Höhe
const FIGURE_SCALE = 1.8; // Figur so viel grösser zeichnen als ihr Kollisionskreis

export function updateCamera(cam: Camera, s: State, w: number, h: number): void {
  cam.scale = h / VIEW_HEIGHT;
  const viewW = w / cam.scale;
  const targetX = s.pos.x - viewW * 0.35;
  const targetY = Math.max(-3, s.pos.y - VIEW_HEIGHT * 0.7); // Boden bleibt sichtbar
  // weich nachziehen, beim Neustart springen
  const k = s.phase === 'ready' ? 1 : 0.12;
  cam.x += (targetX - cam.x) * k;
  cam.y += (targetY - cam.y) * k;
}

export function screenToWorld(cam: Camera, h: number, sx: number, sy: number): Vec {
  return { x: cam.x + sx / cam.scale, y: cam.y + (h - sy) / cam.scale };
}

export function draw(ctx: CanvasRenderingContext2D, s: State, buildings: Building[], cam: Camera, w: number, h: number): void {
  const X = (x: number) => (x - cam.x) * cam.scale;
  const Y = (y: number) => h - (y - cam.y) * cam.scale;
  const m = cam.scale;

  // Himmel
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1b2238');
  sky.addColorStop(0.65, '#e0795a');
  sky.addColorStop(1, '#f4c27a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // ferne Häuserreihe (zieht langsamer vorbei)
  ctx.fillStyle = 'rgba(70, 50, 95, 0.18)';
  const offset = (cam.x * 0.4) % 23;
  const first = Math.floor((cam.x * 0.4) / 23);
  for (let i = -1; i * 23 - offset < w / m + 23; i++) {
    const n = first + i;
    const bh = 22 + (((n * 37) % 23) + 23) % 23; // 22–44 m, immer gleich je Haus
    const top = h - (bh - cam.y * 0.6) * m;
    ctx.fillRect((i * 23 - offset) * m, top, 15 * m, h - top);
  }

  // Gebäude
  for (const b of buildings) {
    const left = X(b.x);
    const right = X(b.x + b.width);
    if (right < 0 || left > w) continue;
    ctx.fillStyle = '#2b2440';
    ctx.fillRect(left, Y(b.height), right - left, Y(0) - Y(b.height));
    ctx.fillStyle = 'rgba(255, 214, 130, 0.55)';
    for (let wy = 2; wy < b.height - 1.5; wy += 3) {
      for (let wx = 1.2; wx < b.width - 1.2; wx += 2.4) {
        if (((Math.floor(b.x + wx) * 7 + wy * 3) % 5) > 1) continue; // nicht jedes Fenster brennt
        ctx.fillRect(X(b.x + wx), Y(wy + 1.2), 1 * m, 1.2 * m);
      }
    }
  }

  // Boden
  ctx.fillStyle = '#15111f';
  ctx.fillRect(0, Y(0), w, h);

  // Seil
  if (s.rope) {
    ctx.strokeStyle = '#f5f0e6';
    ctx.lineWidth = Math.max(1.5, 0.08 * m);
    ctx.beginPath();
    ctx.moveTo(X(s.pos.x), Y(s.pos.y + 0.4));
    ctx.lineTo(X(s.rope.anchor.x), Y(s.rope.anchor.y));
    ctx.stroke();
    ctx.fillStyle = '#f5f0e6';
    ctx.beginPath();
    ctx.arc(X(s.rope.anchor.x), Y(s.rope.anchor.y), 0.25 * m, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStickman(ctx, s, X, Y, m);

  // Anzeige
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${Math.round(h * 0.035)}px -apple-system, system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const dist = Math.max(0, s.maxX - TUNING.startPos.x);
  ctx.fillText(`${dist.toFixed(0)} m`, h * 0.03, h * 0.03);

  // Umschalter Wände (nur zum Ausprobieren in Etappe 1)
  const btn = toggleRect(w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${Math.round(h * 0.026)}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(TUNING.solidBuildings ? 'Häuser: fest' : 'Häuser: Kulisse', btn.x + btn.w / 2, btn.y + btn.h / 2);

  const msg =
    s.phase === 'ready' ? 'Tippe auf ein Gebäude' : s.phase === 'down' ? 'Am Boden – tippen für neuen Versuch' : '';
  if (msg) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(h * 0.045)}px -apple-system, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(msg, w / 2 + 2, h * 0.2 + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(msg, w / 2, h * 0.2);
  }
}

/** Wo der Umschalter für die Wände liegt (oben rechts). */
export function toggleRect(w: number, h: number): { x: number; y: number; w: number; h: number } {
  const bw = h * 0.3;
  const bh = h * 0.07;
  return { x: w - bw - h * 0.03, y: h * 0.03, w: bw, h: bh };
}

/** Einfaches Strichmännchen; die richtige Animation kommt in Etappe 5. */
function drawStickman(
  ctx: CanvasRenderingContext2D,
  s: State,
  X: (x: number) => number,
  Y: (y: number) => number,
  m: number,
): void {
  const cx = s.pos.x;
  const cy = s.pos.y;
  m *= FIGURE_SCALE; // Figur grösser zeichnen, damit man sie auf dem iPad gut sieht
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, 0.14 * m);
  ctx.lineCap = 'round';

  const k = FIGURE_SCALE;
  if (s.phase === 'down') {
    // liegt am Boden
    const y = 0.15 * k;
    line(ctx, X(cx - 0.8 * k), Y(y), X(cx + 0.6 * k), Y(y));
    circle(ctx, X(cx + 0.9 * k), Y(y + 0.1 * k), 0.25 * m);
    return;
  }

  // Körper zeigt Richtung Seil, sonst nach oben
  let ux = 0;
  let uy = 1;
  if (s.rope) {
    const dx = s.rope.anchor.x - cx;
    const dy = s.rope.anchor.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    ux = dx / d;
    uy = dy / d;
  } else {
    // im Flug leicht in Flugrichtung neigen
    const tilt = Math.max(-0.6, Math.min(0.6, s.vel.x * 0.02));
    ux = Math.sin(tilt);
    uy = Math.cos(tilt);
  }
  const px = -uy; // quer zum Körper
  const py = ux;

  const hip = { x: cx - ux * 0.35 * k, y: cy - uy * 0.35 * k };
  const neck = { x: cx + ux * 0.45 * k, y: cy + uy * 0.45 * k };
  const head = { x: cx + ux * 0.8 * k, y: cy + uy * 0.8 * k };

  line(ctx, X(hip.x), Y(hip.y), X(neck.x), Y(neck.y));
  circle(ctx, X(head.x), Y(head.y), 0.28 * m);

  // Beine schwingen leicht mit dem Tempo
  const swing = Math.sin(s.time * 8) * Math.min(0.4, Math.hypot(s.vel.x, s.vel.y) * 0.02);
  for (const side of [-1, 1]) {
    const spread = side * (0.25 + swing * side) * k;
    line(ctx, X(hip.x), Y(hip.y), X(hip.x - ux * 0.75 * k + px * spread), Y(hip.y - uy * 0.75 * k + py * spread));
  }

  // Arme: am Seil beide nach oben, sonst ausgebreitet
  for (const side of [-1, 1]) {
    const reach = s.rope
      ? { x: (ux * 0.7 + px * side * 0.12) * k, y: (uy * 0.7 + py * side * 0.12) * k }
      : { x: (px * side * 0.6 + ux * 0.1) * k, y: (py * side * 0.6 + uy * 0.1) * k };
    line(ctx, X(neck.x), Y(neck.y), X(neck.x + reach.x), Y(neck.y + reach.y));
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
