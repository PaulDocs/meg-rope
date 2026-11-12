// Kulisse hinter der Stadt (B9): Himmel mit Sonne, Mond, Sternen und Wolken,
// ferne Stadt in zwei Schichten, Boden mit Strasse. Farben aus look.ts.

import { circle, type Camera, type Proj } from './canvas';
import { css, hash, mix, type Look } from './look';

const STARS = 70;
const STREET = { near: -7.5, far: -2.2, dashAt: -4.8, dashEvery: 9, dashLen: 4, dashThick: 0.32 }; // m, vor den Türmen

/** Himmel: Verlauf, Sterne, Sonne oder Mond, Wolken (ziehen langsamer vorbei). */
export function drawSky(ctx: CanvasRenderingContext2D, L: Look, cam: Camera, w: number, h: number, time: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, L.col.skyTop);
  sky.addColorStop(1, L.col.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  if (L.night > 0.05) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < STARS; i++) {
      const twinkle = 0.55 + 0.45 * Math.sin(time * 1.7 + i * 2.4);
      ctx.globalAlpha = L.night * twinkle * 0.9;
      const r = 0.8 + (hash(i, 3, 7) % 3) * 0.45;
      circle(ctx, ((i * 0.618034) % 1) * w, ((i * 0.754877) % 1) * h * 0.72, r);
    }
    ctx.globalAlpha = 1;
  }
  if (L.sunY < 1.1) {
    const x = w * 0.72;
    const y = h * L.sunY;
    const r = h * 0.055;
    const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4.5);
    glow.addColorStop(0, css(L.raw.sun, 0.55));
    glow.addColorStop(1, css(L.raw.sun, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 4.5, y - r * 4.5, r * 9, r * 9);
    ctx.fillStyle = L.col.sun;
    circle(ctx, x, y, r);
  }
  if (L.moonY < 1.1) {
    const x = w * 0.8;
    const y = h * L.moonY;
    const r = h * 0.035;
    ctx.save(); // Sichel: Scheibe, davor ein Stück Himmel – nur innerhalb der Scheibe
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#f4f1e4';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = css(mix(L.raw.skyTop, L.raw.skyBottom, Math.max(0, Math.min(1, L.moonY))));
    circle(ctx, x + r * 0.48, y - r * 0.2, r * 0.86);
    ctx.restore();
  }

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
      ctx.fillStyle = L.col.cloudShade;
      circle(ctx, cx + dx * r + r * 0.1, cy + dy * r + r * 0.14, r * k);
      ctx.fillStyle = L.col.cloud;
      circle(ctx, cx + dx * r, cy + dy * r, r * k);
    }
  }
}

/** Boden: helle Fläche, nach hinten dunkler; vorn eine Strasse mit Mittelstrichen (zeigt das Tempo). */
export function drawFloor(ctx: CanvasRenderingContext2D, L: Look, P: Proj, horizon: number, w: number, h: number): void {
  const top = P.Y(horizon);
  const g = ctx.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, L.col.floorFar);
  g.addColorStop(1, L.col.floor);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, h - top);
  if (P.Y(STREET.far) > h) return;
  ctx.fillStyle = css(L.raw.floorFar, 0.6);
  ctx.fillRect(0, P.Y(STREET.far), w, (STREET.far - STREET.near) * P.m);
  ctx.fillStyle = L.col.lane;
  const left = P.mid - w / P.m / 2;
  for (let x = Math.floor(left / STREET.dashEvery) * STREET.dashEvery; P.X(x) < w; x += STREET.dashEvery) {
    ctx.fillRect(P.X(x), P.Y(STREET.dashAt), STREET.dashLen * P.m, Math.max(1, STREET.dashThick * P.m));
  }
}

/** Ferne Stadt in zwei Schichten: Sie ziehen langsamer vorbei, greifen kann man sie nicht. Nachts brennt Licht. */
export function drawFarCity(ctx: CanvasRenderingContext2D, L: Look, cam: Camera, P: Proj, horizon: number, w: number): void {
  const m = cam.scale;
  const base = P.Y(horizon);
  // hinten: breite, blasse Blöcke
  ctx.fillStyle = L.col.far2;
  eachFar(cam.x * 0.25, 38, m, w, (x, n) => {
    const bh = (30 + ((n * 7) % 23) * 2.4) * m * 0.55;
    ctx.fillRect(x, base - bh, (12 + (n % 6) * 2) * m * 0.7, bh);
  });
  // davor: schlankere Türme mit Seite
  eachFar(cam.x * 0.45, 26, m, w, (x, n, i) => {
    const bh = (40 + n * 2) * m * 0.7;
    const bw = (6 + (n % 5)) * m * 0.7;
    ctx.fillStyle = L.col.farSide;
    ctx.fillRect(x + bw, base - bh + 0.8 * m, bw * 0.25, bh - 0.8 * m);
    ctx.fillStyle = L.col.far;
    ctx.fillRect(x, base - bh, bw, bh);
    if (L.night < 0.3) return;
    ctx.fillStyle = L.lit;
    ctx.globalAlpha = (L.night - 0.3) * 0.9;
    const dot = Math.max(1, 0.5 * m);
    for (let k = 0; k < 5; k++) {
      const hx = hash(i, k, 11);
      ctx.fillRect(x + ((hx % 80) / 100 + 0.08) * bw, base - bh + (((hx >>> 8) % 85) / 100 + 0.06) * bh, dot, dot);
    }
    ctx.globalAlpha = 1;
  });
  // Dunst über dem Horizont
  const haze = ctx.createLinearGradient(0, base - 26 * m, 0, base);
  haze.addColorStop(0, css(L.raw.skyBottom, 0));
  haze.addColorStop(1, css(L.raw.skyBottom, 0.55));
  ctx.fillStyle = haze;
  ctx.fillRect(0, base - 26 * m, w, 26 * m);
}

/** Geht die sichtbaren Plätze einer fernen Schicht durch: Bild-x, feste Zufallszahl 0–30, laufende Nummer. */
function eachFar(shift: number, step: number, m: number, w: number, each: (x: number, n: number, i: number) => void): void {
  const first = Math.floor(shift / step) - 1;
  for (let i = first; (i * step - shift) * m < w + step * m; i++) {
    const n = (((i * 53) % 31) + 31) % 31;
    each((i * step - shift + (n % 7)) * m, n, i);
  }
}
