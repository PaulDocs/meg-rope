// Kleine Zeichenhelfer und die Abbildung Welt → Bildschirm, geteilt von
// render.ts, backdrop.ts und figure.ts.

/** Abbildung Welt → Bildschirm für ein Bild. */
export type Proj = {
  X: (x: number) => number;
  Y: (y: number) => number;
  m: number; // Pixel pro Meter
  mid: number; // Welt-x der Bildmitte
  lo: number; // Welt-y am unteren Bildrand
  hi: number; // Welt-y am oberen Bildrand
};

export function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function poly(ctx: CanvasRenderingContext2D, pts: [number, number][]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}
