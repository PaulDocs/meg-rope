// Intro beim Laden: zuerst das Label «megene games», dann gibt es den Blick
// auf die Stadt frei und das Titelschild fällt an seinen Seilen ins Bild.
// Tippen überspringt. Nur einmal je Laden, nicht bei der Rückkehr ins Menü.

import { studioBadge } from './brand';

export const INTRO = {
  studio: 2100, // ms – so lange steht das Label (gleich wie in index.html, #intro .studio-card)
  fade: 700, // ms – danach blendet die dunkle Fläche aus (gleich wie in index.html, #intro.out)
};

/** Intro zeigen? Nicht mit ?intro=0 und nicht, wenn das Gerät wenig Bewegung wünscht. */
export function introWanted(search: string, reducedMotion: boolean): boolean {
  return !reducedMotion && new URLSearchParams(search).get('intro') !== '0';
}

/**
 * Spielt das Intro in `root` (deckt das Bild zu). `onReveal` kommt genau
 * einmal: wenn das Label fertig ist oder jemand tippt.
 */
export function runIntro(root: HTMLElement, onReveal: () => void, timer: Pick<typeof globalThis, 'setTimeout'> = globalThis): void {
  const presents = document.createElement('p');
  presents.textContent = 'präsentiert';
  const card = document.createElement('div');
  card.className = 'studio-card';
  card.append(studioBadge(72), presents);
  root.replaceChildren(card);
  root.hidden = false;
  let revealed = false;
  const reveal = (): void => {
    if (revealed) return;
    revealed = true;
    root.classList.add('out');
    onReveal();
    timer.setTimeout(() => {
      root.hidden = true;
      root.replaceChildren();
    }, INTRO.fade);
  };
  root.addEventListener('click', reveal, { once: true }); // click, nicht pointerdown: erst dann gibt das iPad den Ton frei
  timer.setTimeout(reveal, INTRO.studio);
}
