import { createState, STEP, step, tap } from './physics';
import { draw, screenToWorld, updateCamera, type Camera } from './render';
import { PRACTICE_STREET } from './world';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const street = PRACTICE_STREET; // Etappe 1: Übungsstrasse ohne Ziel
const state = createState();
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
  tap(state, screenToWorld(cam, height, e.clientX - rect.left, e.clientY - rect.top), street.holds);
});
// iPad: kein Zoomen, Scrollen oder Kontextmenü
for (const ev of ['touchstart', 'touchmove', 'gesturestart', 'contextmenu']) {
  canvas.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}

// feste Zeitschritte, unabhängig von der Bildrate des Geräts
let last = performance.now();
let acc = 0;
function frame(now: number): void {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    step(state);
    acc -= STEP;
  }
  updateCamera(cam, state, width, height);
  draw(ctx, state, street, cam, width, height);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
