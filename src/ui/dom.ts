/**
 * Where HTML elements that belong to the game go. This is also the element that goes fullscreen:
 * browsers hide everything outside it then, and don't let it take keyboard focus.
 */
export const GAME_ELEMENT_ID = 'game';

export const gameElement = (): HTMLElement => document.getElementById(GAME_ELEMENT_ID) ?? document.body;
