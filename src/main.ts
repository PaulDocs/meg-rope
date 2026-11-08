import { createState, nextSetting, resetState, settingByName, STEP, step, tap, type Setting } from './physics';
import { draw, onSideWall, onVariantButton, screenToWorld, updateCamera, type Camera } from './render';
import { createStreet } from './world';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const street = createStreet(); // Etappe 1: endlose Übungsstrasse ohne Ziel
const AHEAD = 600; // m – so weit voraus ist die Strasse immer schon gebaut
street.extendTo(AHEAD);
// Gewählte Einstellung merkt sich der Browser (darf fehlen, z. B. im privaten Fenster)
const SETTING_KEY = 'meg-rope.setting';
const OLD_VARIANT_KEY = 'meg-rope.variant'; // bis 09.11.: nur «normal»/«free»
function loadSetting(): Setting {
  try {
    const saved = localStorage.getItem(SETTING_KEY);
    if (saved === null && localStorage.getItem(OLD_VARIANT_KEY) === 'free') return settingByName('free-medium');
    return settingByName(saved);
  } catch {
    return settingByName(null);
  }
}
function saveSetting(x: Setting): void {
  try {
    localStorage.setItem(SETTING_KEY, x.name);
    localStorage.removeItem(OLD_VARIANT_KEY);
  } catch {
    // ohne Speicher gilt die Wahl nur bis zum Neuladen
  }
}
const start = loadSetting();
const state = createState(start.variant, start.level);
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
    const next = nextSetting(state);
    saveSetting(next);
    resetState(state, next.variant, next.level); // neuer Versuch mit der nächsten Einstellung
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
