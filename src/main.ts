import { createState, resetState, STEP, step, tap, type Variant } from './physics';
import { draw, onSideWall, onVariantButton, screenToWorld, updateCamera, type Camera } from './render';
import { createStreet } from './world';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const street = createStreet(); // Etappe 1: endlose Übungsstrasse ohne Ziel
const AHEAD = 600; // m – so weit voraus ist die Strasse immer schon gebaut
street.extendTo(AHEAD);
// Gewählte Spielvariante merkt sich der Browser (darf fehlen, z. B. im privaten Fenster)
const VARIANT_KEY = 'meg-rope.variant';
function loadVariant(): Variant {
  try {
    return localStorage.getItem(VARIANT_KEY) === 'free' ? 'free' : 'normal';
  } catch {
    return 'normal';
  }
}
function saveVariant(v: Variant): void {
  try {
    localStorage.setItem(VARIANT_KEY, v);
  } catch {
    // ohne Speicher gilt die Wahl nur bis zum Neuladen
  }
}
const state = createState(loadVariant());
const cam: Camera = { x: 0, y: 0, scale: 1 };

let width = 0;
let height = 0;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  if (onVariantButton(state, height, sx, sy)) {
    const next: Variant = state.variant === 'free' ? 'normal' : 'free';
    saveVariant(next);
    resetState(state, next); // neuer Versuch in der anderen Variante
    return;
  }
  const target = screenToWorld(cam, height, sx, sy);
  tap(state, target, street.holds, (p) => onSideWall(street, cam, width, p));
});
// iPad: kein Zoomen, Scrollen oder Kontextmenü
for (const ev of ['touchstart', 'touchmove', 'gesturestart', 'contextmenu']) {
  canvas.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}

// feste Zeitschritte, unabhängig von der Bildrate des Geräts
let last = performance.now();
let acc = 0;
function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  acc += dt;
  last = now;
  while (acc >= STEP) {
    step(state);
    acc -= STEP;
  }
  street.extendTo(state.pos.x + AHEAD);
  updateCamera(cam, state, width, height, dt);
  draw(ctx, state, street, cam, width, height);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
