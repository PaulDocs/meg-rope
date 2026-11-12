import { drawFarCity, drawFloor, drawSky } from './backdrop';
import { circle, line, poly, type Camera, type Proj } from './canvas';
import { drawAnchor, drawFigure, drawRope } from './figure';
import { dimmed, fromHex, hash, isLit, lookAt, WINDOW, windowGrid, type Look, type TowerLook } from './look';
import { isDropIn, stationAt, STRENGTH, tooWeakToHook, TUNING, type State, type Vec } from './physics';
import { attemptPoints, distanceOf, isStrike, multiplier, STYLE, type Grade } from './score';
import { containerOf, extentOf, GRAB_SLACK, roofHeight, SHAPE, type Prop, type World } from './world';

export type { Camera } from './canvas';

const VIEW_HEIGHT = 70; // (Häuserhöhen in world.ts TOWER_STYLES sind darauf geeicht) so viele Meter sieht man in der Höhe – nah dran wie im Vorbild, Türme ragen oben hinaus
// Wo das Männchen im Bild steht (Anteil von links / von oben). Im Vorbild-Video
// (IMG_185322) bleibt es fast fest oben links unter der Sonne; die Welt zieht
// vorbei, beim Fallen kommen Häuser und Boden von unten herauf. Waagrecht steht
// es fest bei FIGURE_AT.x; senkrecht ist FIGURE_AT.y nur das Ziel, das Männchen
// darf weich zwischen FIGURE_Y_RANGE wandern (CAMERA_FOLLOW_Y).
export const FIGURE_AT = { x: 0.3, y: 0.25 };
export const CAMERA_FOLLOW = 0.35; // waagrecht: pro 1/60 s so viel des Abstands nachziehen – eng wie im Vorbild
// Senkrecht ruhiger (Pascal: «die Welt bewegt sich zu fest», mit der Maus schwer
// zu treffen): Die Kamera folgt dem Auf und Ab der Schwünge nur weich, hält das
// Männchen aber immer zwischen diesen Anteilen von oben im Bild.
export const CAMERA_FOLLOW_Y = 0.06;
export const FIGURE_Y_RANGE = { top: 0.12, bottom: 0.6 };
const DEPTH = 9; // m – so tief sind Türme
const PERSPECTIVE = 0.07; // wie stark man die Seiten sieht, je weiter ein Turm von der Bildmitte steht
const LIFT = 2.2; // m – Rückseite liegt so viel höher (Blick leicht von oben)
const HORIZON = LIFT * 3; // m – hier beginnt die Bodenfläche hinten; dort stehen die fernen Türme

// Feste Farben (Anzeige, Kran, Ballon, Luftschiff). Himmel, Stadt, Boden,
// Männchen und Schrift richten sich nach der Tageszeit: look.ts.
const C = {
  weak: '#c8452f', // Kraftbalken, solange Einhaken nicht geht; Warnlicht
  strike: '#c8452f', // Strike-Anzeige
  barBack: 'rgba(120, 130, 150, 0.3)',
  containerRib: 'rgba(80, 20, 10, 0.35)',
  station: 'rgba(46, 160, 92, 0.22)', // Lichtsäule der Kraftstation
  stationSign: '#2ea05c',
  stationDone: 'rgba(120, 130, 140, 0.25)', // schon vorbei
};
// Kulissen-Farben, die nachts abgedunkelt werden (dimmed)
const K = {
  crane: fromHex('#e0b13a'),
  craneDark: fromHex('#b0841f'),
  hook: fromHex('#c8452f'),
  container: fromHex('#c8452f'),
  basket: fromHex('#8a5a33'),
  airship: fromHex('#9aa3ad'),
  airshipLight: fromHex('#c3cad2'),
  airshipDark: fromHex('#6f7984'),
};
const BALLOON = [
  [fromHex('#e8743b'), fromHex('#f6d2a8')],
  [fromHex('#3f8f8a'), fromHex('#cfe7e2')],
  [fromHex('#d9a630'), fromHex('#fbefc6')],
] as const;
const ROOF = { antenna: 6, tankW: 2.4, tankH: 1.8 }; // m

/**
 * Strecke, nach der sich die Stimmung richtet: die weiteste erreichte Stelle
 * (beim Zurückschwingen läuft die Tageszeit nicht rückwärts), plus `shift`
 * Meter zum Ansehen (`?tageszeit=1300`, main.ts). Unsinniges zählt als 0.
 */
export function lookDistance(s: State, shift = 0): number {
  return Math.max(0, s.maxX - TUNING.startPos.x) + (Number.isFinite(shift) ? Math.max(0, shift) : 0);
}

/** Kamera nachziehen; `dt` ist die Zeit seit dem letzten Bild, damit es bei 60 und 120 Hz gleich wirkt. */
export function updateCamera(cam: Camera, s: State, w: number, h: number, dt: number): void {
  cam.scale = h / VIEW_HEIGHT;
  const viewW = w / cam.scale;
  const targetX = s.pos.x - viewW * FIGURE_AT.x;
  const targetY = Math.max(-8, s.pos.y - VIEW_HEIGHT * (1 - FIGURE_AT.y)); // Boden sichtbar, wenn es tief ist
  const jump = s.phase === 'dropIn'; // beim Neustart springen
  const follow = (f: number) => (jump ? 1 : 1 - Math.pow(1 - f, dt * 60));
  cam.x += (targetX - cam.x) * follow(CAMERA_FOLLOW);
  cam.y += (targetY - cam.y) * follow(CAMERA_FOLLOW_Y);
  // nie aus dem Bild: Männchen zwischen FIGURE_Y_RANGE.top und .bottom (Anteil von oben)
  const minY = s.pos.y - VIEW_HEIGHT * (1 - FIGURE_Y_RANGE.top); // tiefer: Männchen oben aus dem Bild
  const maxY = s.pos.y - VIEW_HEIGHT * (1 - FIGURE_Y_RANGE.bottom); // höher: Männchen unten aus dem Bild
  cam.y = Math.max(-8, Math.min(Math.max(cam.y, minY), maxY));
}

/**
 * Liegt ein Punkt (in Weltkoordinaten) auf einer sichtbaren Seitenwand eines
 * Turms? Die Seite hängt von der Kamera ab (Perspektive wie in box()). Pascal
 * 08.11.2026: Das Seil hakt auch an den Seitenwänden ein; das Dach bleibt Kulisse.
 */
/** Welt-x der Bildmitte: von hier aus richtet sich die Perspektive. */
function viewMid(cam: Camera, w: number): number {
  return cam.x + w / cam.scale / 2;
}

/** Sichtbare Seite eines Quaders: Versatz der Rückseite (dx) und x der Frontkante, an der die Seite ansetzt. */
function sideFace(x: number, w: number, mid: number): { dx: number; sideX: number } {
  const dx = -(x + w / 2 - mid) * PERSPECTIVE;
  return { dx, sideX: dx < 0 ? x : x + w }; // sichtbare Seite: zur Mitte hin
}

export function onSideWall(world: World, cam: Camera, w: number, pt: Vec, slack = GRAB_SLACK): boolean {
  const mid = viewMid(cam, w);
  for (const p of world.props) {
    if (p.kind !== 'tower') continue;
    for (const b of p.blocks) {
      const { dx, sideX } = sideFace(b.x, b.w, mid);
      if (Math.abs(dx) < 1e-6) continue;
      const u = (pt.x - sideX) / dx; // 0 an der Frontkante, 1 an der Hinterkante
      if (u < -slack / Math.abs(dx) || u > 1 + slack / Math.abs(dx)) continue;
      const yb = b.y + Math.min(1, Math.max(0, u)) * LIFT;
      if (pt.y >= yb - slack && pt.y <= yb + b.h + slack) return true;
    }
  }
  return false;
}

export function screenToWorld(cam: Camera, h: number, sx: number, sy: number): Vec {
  return { x: cam.x + sx / cam.scale, y: cam.y + (h - sy) / cam.scale };
}

export function draw(ctx: CanvasRenderingContext2D, s: State, world: World, cam: Camera, w: number, h: number, hud: HudInfo | null, lookShift = 0): void {
  const L = lookAt(lookDistance(s, lookShift));
  const viewW = w / cam.scale;
  const P: Proj = {
    X: (x) => (x - cam.x) * cam.scale,
    Y: (y) => h - (y - cam.y) * cam.scale,
    m: cam.scale,
    mid: viewMid(cam, w),
    lo: cam.y,
    hi: cam.y + h / cam.scale,
    look: L,
    time: s.time,
  };
  drawSky(ctx, L, cam, w, h, s.time);
  drawFarCity(ctx, L, cam, P, HORIZON, w);
  drawFloor(ctx, L, P, HORIZON, w, h);

  const visible = world.props.filter((p) => {
    const { left, right } = extentOf(p);
    return right + DEPTH > cam.x - 4 && left - DEPTH < cam.x + viewW + 4;
  });
  for (const p of visible) if (p.kind === 'tower') drawShadow(ctx, p, P);
  // Weiter von der Bildmitte zuerst, damit nähere Seiten darüber liegen
  const order = [...visible].sort((a, b) => Math.abs(centerOf(b) - P.mid) - Math.abs(centerOf(a) - P.mid));
  for (const p of order) drawProp(ctx, p, P);
  drawStations(ctx, s, cam, P, w, h);

  for (const r of s.looseRopes) drawRope(ctx, L, r.chain.points, P, 1 - r.age / TUNING.looseRopeTime);
  if (s.rope) {
    drawRope(ctx, L, s.rope.chain.points, P, 1);
    drawAnchor(ctx, L, s.rope.anchor, P);
  }
  drawFigure(ctx, L, s, P);
  if (hud) drawHud(ctx, L, s, w, h, hud); // ohne Runde (Startmenü): keine Anzeige
}

function centerOf(p: Prop): number {
  const { left, right } = extentOf(p);
  return (left + right) / 2;
}

function font(px: number): string {
  return `700 ${Math.round(px)}px -apple-system, system-ui, sans-serif`;
}

/** Schrift mit dünnem Rand in der Gegenfarbe: vor jedem Himmel lesbar. */
function label(ctx: CanvasRenderingContext2D, L: Look, text: string, x: number, y: number): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = L.paper;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

/** Rechteck in Bildschirm-Pixeln (Bedienelemente). */
export interface ScreenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Platz oben links für den Kraftbalken. */
export function strengthBox(h: number): ScreenBox {
  return { x: h * 0.03, y: h * 0.025, w: h * 0.36, h: h * 0.065 };
}

/** Was die Anzeige über die Runde wissen muss (main.ts). */
export interface HudInfo {
  name: string;
  attempt: { now: number; of: number } | null; // Versuch (nur Challenge), null im Einzelspiel
}

export const GRADE_LABEL: Record<Grade, string> = {
  perfect: 'Perfekt',
  good: 'Gut',
  ok: 'Knapp',
  out: 'Nicht im Schwung',
};

function drawHud(ctx: CanvasRenderingContext2D, L: Look, s: State, w: number, h: number, hud: HudInfo): void {
  if (s.variant === 'free') drawStrength(ctx, L, s, strengthBox(h));
  const dist = distanceOf(s.maxX, TUNING.startPos.x);
  const right = w - h * 0.03;
  ctx.fillStyle = L.ink;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = font(h * 0.045);
  label(ctx, L, `${attemptPoints(dist, s.style)}`, right, h * 0.022);
  ctx.font = font(h * 0.022);
  label(ctx, L, `${dist} m · Style ${s.style.points}`, right, h * 0.075);
  label(ctx, L, hud.attempt ? `${hud.name} · Versuch ${hud.attempt.now}/${hud.attempt.of}` : hud.name, right, h * 0.105);
  drawStyle(ctx, L, s, w, h);

  const weak = s.variant === 'free' && !s.rope && s.phase === 'flying' && tooWeakToHook(s);
  const msg = isDropIn(s)
    ? 'Tippe auf ein Haus, einen Kran, einen Ballon oder ein Luftschiff'
    : weak
      ? 'Keine Kraft mehr zum Einhaken'
      : '';
  if (msg) {
    ctx.fillStyle = L.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(h * 0.032);
    label(ctx, L, msg, w / 2, h * 0.16);
  }
}

/** Übergänge in Folge (ab strikeFrom «Strike» mit Faktor) und kurz die Note des letzten. */
function drawStyle(ctx: CanvasRenderingContext2D, L: Look, s: State, w: number, h: number): void {
  const st = s.style;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (st.strike > 0) {
    const strike = isStrike(st);
    ctx.fillStyle = strike ? C.strike : L.ink;
    ctx.font = font(h * (strike ? 0.036 : 0.026));
    const factor = multiplier(st.strike).toFixed(2).replace('.', ',');
    label(ctx, L, strike ? `STRIKE ${st.strike} · ×${factor}` : `${st.strike} in Folge`, w / 2, h * 0.05);
  }
  const last = st.last;
  if (!last || s.time - last.at > STYLE.showFor) return;
  ctx.globalAlpha = 1 - (s.time - last.at) / STYLE.showFor;
  ctx.fillStyle = last.grade === 'out' ? C.weak : L.ink;
  ctx.font = font(h * 0.034);
  label(ctx, L, last.grade === 'out' ? GRADE_LABEL.out : `${GRADE_LABEL[last.grade]} +${last.points}`, w / 2, h * 0.1);
  ctx.globalAlpha = 1;
}

/** Kraftbalken (Variante «Freier Schwung»); rot, solange es nicht einhaken kann; daneben die Serie guter Schwünge. */
function drawStrength(ctx: CanvasRenderingContext2D, L: Look, s: State, b: ScreenBox): void {
  const barH = b.h * 0.45;
  const y = b.y + (b.h - barH) / 2;
  ctx.fillStyle = L.ink;
  ctx.font = font(b.h * 0.42);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  label(ctx, L, 'Kraft', b.x, b.y + b.h / 2);
  const x = b.x + b.h * 1.3;
  const bw = b.w - b.h * 1.3;
  ctx.fillStyle = C.barBack;
  ctx.fillRect(x, y, bw, barH);
  ctx.fillStyle = tooWeakToHook(s) ? C.weak : L.ink;
  ctx.fillRect(x, y, bw * s.strength, barH);
  // gute Schwünge in Folge: ab streakFrom gibt jeder Kraft zurück
  if (s.goodSwings > 0) {
    ctx.fillStyle = L.ink;
    label(ctx, L, `Serie ${s.goodSwings}`, b.x + b.w + b.h * 0.4, b.y + b.h / 2);
  }
  // wie weit bis zur nächsten Kraftstation
  ctx.font = font(b.h * 0.34);
  label(ctx, L, `Station in ${Math.max(0, Math.ceil(stationAt(s.stations + 1) - s.pos.x))} m`, b.x, b.y + b.h * 1.35);
}

/**
 * Kraftstationen (nur im Freien Schwung): eine hohe, grüne Lichtsäule quer
 * durchs Bild mit einem Blitz oben. Vorbeifliegen füllt die Kraft (physics.ts).
 */
function drawStations(ctx: CanvasRenderingContext2D, s: State, cam: Camera, P: Proj, w: number, h: number): void {
  if (s.variant !== 'free') return;
  const viewW = w / cam.scale;
  const first = Math.max(1, Math.floor((cam.x - TUNING.startPos.x) / STRENGTH.stationEvery));
  for (let k = first; stationAt(k) < cam.x + viewW + 4; k++) {
    const x = P.X(stationAt(k));
    const passed = k <= s.stations;
    const half = Math.max(3, 0.8 * P.m);
    ctx.fillStyle = passed ? C.stationDone : C.station;
    ctx.fillRect(x - half, 0, half * 2, h);
    // Blitz-Schild oben
    const r = Math.max(12, 2.2 * P.m);
    const cy = h * 0.3;
    ctx.fillStyle = passed ? C.stationDone : C.stationSign;
    circle(ctx, x, cy, r);
    ctx.fillStyle = '#ffffff';
    poly(ctx, [
      [x + r * 0.15, cy - r * 0.7],
      [x - r * 0.4, cy + r * 0.1],
      [x - r * 0.02, cy + r * 0.1],
      [x - r * 0.15, cy + r * 0.7],
      [x + r * 0.4, cy - r * 0.1],
      [x + r * 0.02, cy - r * 0.1],
    ]);
  }
}

/** Weicher Schatten eines Turms auf dem Boden, schräg nach hinten links. */
function drawShadow(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'tower' }>, P: Proj): void {
  const L = P.look;
  const base = p.blocks[0]!; // unterster Block steht auf dem Boden
  const len = Math.min(roofHeight(p) * 0.18, 18);
  ctx.fillStyle = `rgba(60, 72, 104, ${L.shadow})`;
  poly(ctx, [
    [P.X(base.x), P.Y(0)],
    [P.X(base.x + base.w), P.Y(0)],
    [P.X(base.x + base.w - len * 0.6), P.Y(LIFT + len * 0.25)],
    [P.X(base.x - len * 0.6), P.Y(LIFT + len * 0.25)],
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
 * Greifbar sind Front (Haltepunkte in world.ts) und Seite (onSideWall); das
 * Dach ist Kulisse. So entschieden von Pascal am 08.11.2026.
 */
function box(ctx: CanvasRenderingContext2D, P: Proj, x: number, y: number, w: number, h: number, col: TowerLook, seed: number): void {
  const { dx, sideX } = sideFace(x, w, P.mid);
  const dy = LIFT;
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
  // Front mit heller Dachkante
  ctx.fillStyle = col.front;
  ctx.fillRect(P.X(x), P.Y(y + h), w * P.m, h * P.m);
  ctx.fillStyle = col.top;
  ctx.fillRect(P.X(x), P.Y(y + h), w * P.m, Math.max(1, 0.3 * P.m));
  windows(ctx, P, x, y, w, h, seed);
}

/**
 * Fensterraster auf der Front: tagsüber spiegelndes Glas, nachts brennt in
 * einem Teil davon Licht (fester Zufall je Fenster, flackert nicht). Gezeichnet
 * werden nur die Reihen im Bild, je Farbe in einem Zug.
 */
function windows(ctx: CanvasRenderingContext2D, P: Proj, x: number, y: number, w: number, h: number, seed: number): void {
  const L = P.look;
  const { cols, rows, cw } = windowGrid(w, h);
  if (rows < 1) return;
  const r0 = Math.max(0, Math.floor((P.lo - y - WINDOW.base) / WINDOW.h));
  const r1 = Math.min(rows - 1, Math.floor((P.hi - y - WINDOW.base) / WINDOW.h));
  const ww = cw * WINDOW.fillW * P.m;
  const wh = WINDOW.h * WINDOW.fillH * P.m;
  for (const lit of [false, true]) {
    if (lit && L.night <= 0) break;
    ctx.fillStyle = lit ? L.lit : L.col.glass;
    ctx.beginPath();
    for (let r = r0; r <= r1; r++) {
      const top = P.Y(y + WINDOW.base + r * WINDOW.h + WINDOW.h * WINDOW.fillH);
      for (let c = 0; c < cols; c++) {
        if (isLit(c, r, seed, L.night) !== lit) continue;
        ctx.rect(P.X(x + WINDOW.edge + c * cw + (cw * (1 - WINDOW.fillW)) / 2), top, ww, wh);
      }
    }
    ctx.fill();
  }
}

function drawTower(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'tower' }>, P: Proj): void {
  const L = P.look;
  const col = L.towers[p.color % L.towers.length]!;
  const seed = Math.round(p.blocks[0]!.x * 10);
  // Blöcke von unten nach oben, dann die Spitze
  p.blocks.forEach((b, i) => box(ctx, P, b.x, b.y, b.w, b.h, col, seed + i));
  if (p.spire) {
    const sp = p.spire;
    ctx.fillStyle = col.side;
    poly(ctx, [
      [P.X(sp.x), P.Y(sp.y)],
      [P.X(sp.x + sp.w), P.Y(sp.y)],
      [P.X(sp.x + sp.w / 2), P.Y(sp.y + sp.h)],
    ]);
    return;
  }
  // Dachaufbau (Kulisse): Antenne mit Warnlicht oder Wassertank, je Turm fest
  const roof = p.blocks[p.blocks.length - 1]!;
  const top = roof.y + roof.h + LIFT * 0.5;
  const kind = hash(seed, 5, 9) % 3;
  if (kind === 0) {
    const ax = roof.x + roof.w * 0.8;
    ctx.strokeStyle = col.side;
    ctx.lineWidth = Math.max(1, 0.18 * P.m);
    line(ctx, P.X(ax), P.Y(top), P.X(ax), P.Y(top + ROOF.antenna));
    if (L.night > 0.3 && Math.floor(P.time * 1.3 + seed) % 2 === 0) {
      ctx.fillStyle = C.weak;
      circle(ctx, P.X(ax), P.Y(top + ROOF.antenna), Math.max(1.5, 0.3 * P.m));
    }
  } else if (kind === 1 && roof.w > ROOF.tankW * 2) {
    const tx = roof.x + roof.w * 0.15;
    ctx.fillStyle = col.side;
    ctx.fillRect(P.X(tx), P.Y(top + ROOF.tankH + 0.5), ROOF.tankW * P.m, ROOF.tankH * P.m);
    ctx.fillRect(P.X(tx + 0.2), P.Y(top + 0.5), Math.max(1, 0.2 * P.m), 0.5 * P.m);
    ctx.fillRect(P.X(tx + ROOF.tankW - 0.4), P.Y(top + 0.5), Math.max(1, 0.2 * P.m), 0.5 * P.m);
  }
}

/** Baukran: Gittermast, Ausleger mit Gegengewicht, Seil mit Haken. Steht auf dem Boden oder auf einem Dach. */
function drawCrane(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'crane' }>, P: Proj): void {
  const L = P.look;
  const { X, Y, m } = P;
  const b0 = p.base;
  const top = b0 + p.h;
  const jh = SHAPE.craneJibHeight;
  ctx.strokeStyle = dimmed(L, K.crane);
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
  ctx.fillStyle = dimmed(L, K.craneDark);
  ctx.fillRect(X(a), Y(top + 0.2), 3 * m, 2.2 * m);
  ctx.fillRect(X(p.x + 0.8), Y(top - 0.2), 2.2 * m, 2 * m);
  // Lastseil mit Haken, oft mit hängendem Container
  const hookX = p.x + p.jib * SHAPE.craneHookAt;
  const load = containerOf(p);
  const hookY = load ? load.y + load.h : Math.max(b0 + 2, top - Math.min(16, p.h * 0.6));
  ctx.strokeStyle = L.ink;
  line(ctx, X(hookX), Y(top), X(hookX), Y(hookY));
  if (load) {
    ctx.fillStyle = dimmed(L, K.container);
    ctx.fillRect(X(load.x), Y(load.y + load.h), load.w * m, load.h * m);
    ctx.fillStyle = C.containerRib;
    for (let i = 1; i < 8; i++) ctx.fillRect(X(load.x + (i * load.w) / 8), Y(load.y + load.h), Math.max(1, 0.12 * m), load.h * m);
  } else {
    ctx.fillStyle = dimmed(L, K.hook);
    ctx.fillRect(X(hookX - 0.6), Y(hookY), 1.2 * m, 1 * m);
  }
}

/** Heissluftballon mit Streifen, Korb und Leinen. */
function drawBalloon(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'balloon' }>, P: Proj): void {
  const L = P.look;
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
  ctx.fillStyle = dimmed(L, main);
  env();
  ctx.fill();
  ctx.save();
  env();
  ctx.clip();
  ctx.fillStyle = dimmed(L, light);
  for (const k of [-0.55, 0.1]) ctx.fillRect(cx + k * r, cy - r, r * 0.3, r * 2.3);
  ctx.restore();
  // Leinen und Korb
  ctx.strokeStyle = L.ink;
  ctx.lineWidth = Math.max(1, 0.08 * m);
  const bk = SHAPE.basket;
  const by = p.y - p.r * bk.below + bk.h;
  line(ctx, X(p.x - 1.2), Y(p.y - p.r * 0.9), X(p.x - bk.w / 2 + 0.1), Y(by));
  line(ctx, X(p.x + 1.2), Y(p.y - p.r * 0.9), X(p.x + bk.w / 2 - 0.1), Y(by));
  ctx.fillStyle = dimmed(L, K.basket);
  ctx.fillRect(X(p.x - bk.w / 2), Y(by), bk.w * m, bk.h * m);
}

/** Luftschiff: lange Hülle mit Leitwerk und Gondel. */
function drawAirship(ctx: CanvasRenderingContext2D, p: Extract<Prop, { kind: 'airship' }>, P: Proj): void {
  const L = P.look;
  const { X, Y, m } = P;
  const hh = (p.len * SHAPE.airshipHeight) / 2;
  const cx = X(p.x);
  const cy = Y(p.y);
  // Leitwerk hinten (links), nur Kulisse
  ctx.fillStyle = dimmed(L, K.airshipDark);
  const t = SHAPE.airshipTail;
  const end = p.x - p.len / 2;
  poly(ctx, [
    [X(end + t.root), Y(p.y)],
    [X(end), Y(p.y + hh * t.span)],
    [X(end + t.inner), Y(p.y)],
    [X(end), Y(p.y - hh * t.span)],
  ]);
  // Hülle
  ctx.fillStyle = dimmed(L, K.airship);
  ctx.beginPath();
  ctx.ellipse(cx, cy, (p.len / 2) * m, hh * m, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dimmed(L, K.airshipLight);
  ctx.beginPath();
  ctx.ellipse(cx, cy - hh * m * 0.35, (p.len / 2) * m * 0.85, hh * m * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Gondel
  const g = SHAPE.gondola;
  ctx.fillStyle = dimmed(L, K.airshipDark);
  ctx.fillRect(X(p.x - (p.len * g.w) / 2), Y(p.y - hh), p.len * g.w * m, g.h * m);
}
