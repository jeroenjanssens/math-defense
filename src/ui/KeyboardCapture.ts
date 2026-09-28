/**
 * An invisible text field that holds keyboard focus during a game. Browser extensions with
 * single-key shortcuts (such as Vimium) leave keys alone while a text field has focus, so answers
 * can always be typed.
 */
export class KeyboardCapture {
  private readonly el: HTMLInputElement;
  private active = true;

  /** `onText` receives characters that reached the field without being handled on keydown. */
  constructor(onText: (text: string) => void) {
    const el = document.createElement('input');
    el.type = 'text';
    el.inputMode = 'none';
    el.autocomplete = 'off';
    el.spellcheck = false;
    el.tabIndex = -1;
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '1px',
      height: '1px',
      opacity: '0',
      border: '0',
      padding: '0',
      pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    // Handled keys are prevented on keydown, so anything that shows up here was missed.
    el.addEventListener('input', () => {
      const text = el.value;
      el.value = '';
      if (text) onText(text);
    });
    el.addEventListener('blur', this.refocus);
    document.body.append(el);
    this.el = el;
    this.focus();
  }

  private refocus = (): void => {
    setTimeout(() => {
      if (this.active) this.focus();
    }, 0);
  };

  focus(): void {
    this.el.focus({ preventScroll: true });
  }

  destroy(): void {
    this.active = false;
    this.el.removeEventListener('blur', this.refocus);
    this.el.remove();
  }
}
