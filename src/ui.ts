// Menüs über dem Spiel (B-neu-1): Startmenü mit Spielername und Einstellung,
// Challenge-Spieler, Zwischenstand nach jedem Versuch, Wertung und Ranglisten.
// Nur Darstellung und Buttons; was passiert, entscheidet main.ts.
// Namen kommen nur als Text ins Bild (textContent), nie als HTML.

import { attemptNumber, bonusFor, ranking, ROUND, turnScore, type Attempt, type Round, type Turn } from './game';
import { SETTINGS, type Setting } from './physics';
import type { Result } from './store';

export const SETTING_LABEL: Record<Setting['name'], string> = {
  normal: 'Normal',
  'free-easy': 'Frei · leicht',
  'free-medium': 'Frei · mittel',
  'free-hard': 'Frei · schwer',
};

/** Bezeichnung einer gespeicherten Einstellung (Unbekanntes so, wie es ist). */
export function settingLabel(name: string): string {
  return (SETTING_LABEL as Record<string, string>)[name] ?? name;
}

type Child = Node | string | null | false;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, ...children: Child[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const c of children) if (c !== null && c !== false) e.append(c);
  return e;
}

function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function pct(x: number): string {
  return `+ ${Math.round(x * 100)} %`;
}

/** Tabelle mit Rang, Name und Werten. */
function table(head: string[], rows: (string | number)[][]): HTMLElement {
  const t = el('table', '');
  t.append(el('tr', '', ...head.map((x) => el('th', '', x))));
  for (const r of rows) t.append(el('tr', '', ...r.map((x) => el('td', '', String(x)))));
  return t;
}

function day(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

export class Menu {
  constructor(private root: HTMLElement) {}

  get open(): boolean {
    return !this.root.hidden;
  }

  hide(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  private show(...children: Child[]): void {
    this.root.replaceChildren(el('div', 'card', ...children));
    this.root.hidden = false;
  }

  /** Startmenü: Name, Einstellung, Einzelspiel oder Challenge, Bestenliste und letzte Challenges. */
  start(o: {
    name: string;
    setting: Setting;
    results: { best: Result[]; challenges: { setting: string; date: string; ranks: Result[] }[] };
    onSetting: (x: Setting, name: string) => void;
    onSingle: (name: string) => void;
    onChallenge: (name: string) => void;
  }): void {
    const name = el('input', '');
    name.type = 'text';
    name.placeholder = 'Dein Name';
    name.maxLength = ROUND.maxName;
    name.value = o.name;
    name.autocomplete = 'off';
    const warn = el('p', 'warn');
    const go = (f: (n: string) => void) => () => {
      if (name.value.trim() === '') {
        warn.textContent = 'Bitte zuerst einen Namen eingeben.';
        name.focus();
        return;
      }
      f(name.value);
    };
    const settings = el('div', 'row', ...SETTINGS.map((x) =>
      button(SETTING_LABEL[x.name], () => o.onSetting(x, name.value), x.name === o.setting.name ? 'chosen' : ''),
    ));
    const best = o.results.best.length
      ? table(['#', 'Name', 'Punkte', 'm', 'Strike'], o.results.best.map((x, i) => [i + 1, x.name, x.score, x.distance, x.bestStrike]))
      : el('p', 'quiet', 'Noch keine Ergebnisse in dieser Einstellung.');
    const challenges = o.results.challenges.map((c) =>
      el('div', 'challenge',
        el('p', 'quiet', `${day(c.date)} · ${settingLabel(c.setting)}`),
        table(['#', 'Name', 'Punkte', 'm'], c.ranks.map((x, i) => [i + 1, x.name, x.score, x.distance])),
      ),
    );
    this.show(
      el('h1', '', 'Meg Rope'),
      el('label', '', 'Spielername', name),
      warn,
      el('p', 'label', 'Einstellung'),
      settings,
      el('div', 'row big', button('Einzelspiel', go(o.onSingle), 'main'), button('Challenge', go(o.onChallenge), 'main')),
      el('h2', '', `Bestenliste Einzelspiel · ${SETTING_LABEL[o.setting.name]}`),
      best,
      challenges.length > 0 && el('h2', '', 'Letzte Challenges'),
      ...challenges,
    );
  }

  /** Challenge: Spieler eintragen (der erste ist der eigene Name), dann los. */
  players(o: { first: string; known: string[]; setting: Setting; onStart: (names: string[]) => void; onBack: () => void }): void {
    const list = el('div', 'players');
    const datalist = el('datalist', '', ...o.known.map((n) => {
      const opt = document.createElement('option');
      opt.value = n;
      return opt;
    }));
    datalist.id = 'known-names';
    const add = (value: string) => {
      if (list.children.length >= ROUND.maxPlayers) return;
      const input = el('input', '');
      input.type = 'text';
      input.maxLength = ROUND.maxName;
      input.placeholder = `Spieler ${list.children.length + 1}`;
      input.value = value;
      input.setAttribute('list', 'known-names');
      list.append(input);
    };
    add(o.first);
    add('');
    const warn = el('p', 'warn');
    const start = () => {
      const names = [...list.querySelectorAll('input')].map((i) => i.value.trim()).filter((n) => n !== '');
      if (names.length < ROUND.minPlayers) {
        warn.textContent = `Eine Challenge braucht mindestens ${ROUND.minPlayers} Spieler.`;
        return;
      }
      if (new Set(names).size !== names.length) {
        warn.textContent = 'Jeder Name nur einmal, bitte.';
        return;
      }
      o.onStart(names);
    };
    this.show(
      el('h1', '', 'Challenge'),
      el('p', 'quiet', `Ihr spielt nacheinander auf diesem Gerät, alle auf derselben Strasse (${SETTING_LABEL[o.setting.name]}). Wer kommt weiter? Je ${ROUND.attempts} Versuche.`),
      list,
      datalist,
      button('+ Spieler', () => add(''), 'small'),
      warn,
      el('div', 'row big', button('Zurück', o.onBack), button('Los', start, 'main')),
    );
  }

  /** Vor dem Spiel eines Spielers (Challenge: Gerät weitergeben). */
  ready(o: { r: Round; turn: Turn; onGo: () => void }): void {
    const challenge = o.r.mode === 'challenge';
    this.show(
      el('h1', '', challenge ? `Jetzt spielt ${o.turn.name}` : o.turn.name),
      challenge && el('p', 'quiet', 'Gerät weitergeben.'),
      el('p', '', `${ROUND.attempts} Versuche. Nach jedem darfst du werten lassen: nach dem 1. gibt es ${pct(bonusFor(1))}, nach dem 2. ${pct(bonusFor(2))} auf deinen besten Versuch.`),
      el('div', 'row big', button('Los', o.onGo, 'main')),
    );
  }

  /** Nach einem Versuch: Ergebnis, dann weiter oder werten lassen. */
  afterAttempt(o: { r: Round; turn: Turn; attempt: Attempt; onNext: () => void; onStop: () => void }): void {
    const t = o.turn;
    const used = t.attempts.length;
    const over = t.done;
    const best = Math.max(...t.attempts.map((a) => a.points));
    this.show(
      el('h1', '', `Versuch ${used}/${ROUND.attempts}: ${o.attempt.points}`),
      el('p', '', `${o.attempt.distance} m + Style ${o.attempt.style} · bester Strike ${o.attempt.bestStrike}`),
      used > 1 && el('p', 'quiet', `Bester Versuch bisher: ${best}`),
      over
        ? el('div', 'row big', button('Weiter', o.onNext, 'main'))
        : el('div', 'row big',
            button(`Werten: ${turnScore(t)} (${pct(bonusFor(used))})`, o.onStop),
            button(`Versuch ${attemptNumber(t)}`, o.onNext, 'main'),
          ),
    );
  }

  /** Ende der Runde: Wertung, Bestleistung bzw. Rangliste. */
  result(o: { r: Round; best: Result[]; personal: Result | null; onAgain: () => void; onMenu: () => void }): void {
    const ranks = ranking(o.r);
    const setting = settingLabel(o.r.setting);
    if (o.r.mode === 'single') {
      const me = ranks[0]!;
      const record = me.score > 0 && o.personal !== null && o.personal.round === o.r.id;
      this.show(
        el('h1', '', `${me.name}: ${me.score}`),
        el('p', '', `${me.distance} m im besten Versuch, ${me.attempts} ${me.attempts === 1 ? 'Versuch' : 'Versuche'}`),
        record ? el('p', 'news', 'Neue Bestleistung!') : o.personal && el('p', 'quiet', `Deine Bestleistung: ${o.personal.score}`),
        el('h2', '', `Bestenliste · ${setting}`),
        table(['#', 'Name', 'Punkte', 'm', 'Strike'], o.best.map((x, i) => [i + 1, x.name, x.score, x.distance, x.bestStrike])),
        el('div', 'row big', button('Menü', o.onMenu), button('Nochmal', o.onAgain, 'main')),
      );
      return;
    }
    const tie = ranks[1]!.score === ranks[0]!.score && ranks[1]!.distance === ranks[0]!.distance;
    this.show(
      el('h1', '', tie ? 'Gleichstand' : `${ranks[0]!.name} gewinnt`),
      el('p', 'quiet', setting),
      table(['#', 'Name', 'Punkte', 'm', 'Versuche'], ranks.map((x, i) => [i + 1, x.name, x.score, x.distance, x.attempts])),
      el('div', 'row big', button('Menü', o.onMenu), button('Revanche', o.onAgain, 'main')),
    );
  }
}
