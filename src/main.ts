import { attemptNumber, createRound, currentTurn, endAttempt, isRoundOver, ROUND, stopTurn, type Mode, type Round } from './game';
import { createState, resetState, settingByName, STEP, step, tap, TUNING, type Setting } from './physics';
import { draw, onSideWall, screenToWorld, updateCamera, type Camera } from './render';
import { attemptPoints, distanceOf } from './score';
import { bestSingles, loadNames, loadResults, personalBest, recentChallenges, saveNames, saveRound, type KeyValue } from './store';
import { Menu } from './ui';
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
let setting = loadSetting();
const state = createState(setting.variant, setting.level);
const cam: Camera = { x: 0, y: 0, scale: 1 };
const menu = new Menu(document.getElementById('menu')!);
function storage(): KeyValue | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
const kv = storage();

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

// Ablauf: Startmenü → (Challenge: Spieler) → je Spieler bis 3 Versuche → Wertung
let round: Round | null = null;
let downFor = 0; // s am Boden, bevor der Zwischenstand kommt
const DOWN_PAUSE = 0.8; // s – kurz zeigen, wo es gelandet ist

function newAttempt(): void {
  resetState(state, setting.variant, setting.level);
  downFor = 0;
  menu.hide();
}

function showStart(name = loadNames(kv)[0] ?? ''): void {
  round = null;
  resetState(state, setting.variant, setting.level);
  const all = loadResults(kv);
  menu.start({
    name,
    setting,
    results: { best: bestSingles(all, setting.name), challenges: recentChallenges(all, 3) },
    onSetting: (x, typed) => {
      setting = x;
      saveSetting(x);
      showStart(typed); // eingetippter Name bleibt stehen
    },
    onSingle: (name) => begin('single', [name]),
    onChallenge: (name) =>
      menu.players({
        first: name.trim(),
        known: loadNames(kv),
        setting,
        onStart: (names) => begin('challenge', names),
        onBack: () => showStart(),
      }),
  });
}

function begin(mode: Mode, names: string[]): void {
  round = createRound(mode, names, setting.name, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  saveNames(kv, round.turns.map((t) => t.name));
  showReady();
}

function showReady(): void {
  const r = round!;
  const turn = currentTurn(r);
  if (!turn) return showResult();
  menu.ready({ r, turn, onGo: newAttempt });
}

function showResult(): void {
  const r = round!;
  const all = saveRound(kv, r, new Date());
  const me = r.turns[0]!.name;
  menu.result({
    r,
    best: bestSingles(all, r.setting),
    personal: r.mode === 'single' ? personalBest(all, me, r.setting) : null,
    onAgain: () => begin(r.mode, r.turns.map((t) => t.name)),
    onMenu: () => showStart(),
  });
}

/** Am Boden: Versuch werten, dann Zwischenstand mit «weiter» oder «werten». */
function attemptOver(): void {
  const r = round!;
  const turn = currentTurn(r)!;
  const distance = distanceOf(state.maxX, TUNING.startPos.x);
  const attempt = { distance, style: state.style.points, points: attemptPoints(distance, state.style), bestStrike: state.style.bestStrike };
  endAttempt(r, attempt);
  menu.afterAttempt({
    r,
    turn,
    attempt,
    onNext: () => (turn.done ? (isRoundOver(r) ? showResult() : showReady()) : newAttempt()),
    onStop: () => {
      stopTurn(r);
      if (isRoundOver(r)) showResult();
      else showReady();
    },
  });
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (menu.open || !round || state.phase === 'down') return; // am Boden kommt gleich der Zwischenstand
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
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
    if (!menu.open) step(state); // hinter dem Menü steht das Spiel still
    acc -= STEP;
  }
  if (round && !menu.open && state.phase === 'down') {
    downFor += dt;
    if (downFor >= DOWN_PAUSE) attemptOver();
  }
  street.extendTo(state.pos.x + AHEAD);
  updateCamera(cam, state, width, height, dt);
  const turn = round ? currentTurn(round) : null;
  draw(ctx, state, street, cam, width, height, turn && { name: turn.name, attempt: attemptNumber(turn), attempts: ROUND.attempts });
  requestAnimationFrame(frame);
}
showStart();
requestAnimationFrame(frame);
