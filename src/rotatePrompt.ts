import { onLanguageChange, t } from './i18n/i18n';

/** A plain HTML overlay asking tablet users to turn their device to landscape. */
export const initRotatePrompt = (): void => {
  const el = document.createElement('div');
  el.id = 'rotate';
  const icon = document.createElement('div');
  icon.className = 'rotate-icon';
  const text = document.createElement('p');
  el.append(icon, text);
  document.body.append(el);
  const update = () => (text.textContent = t('rotate.message'));
  update();
  onLanguageChange(update);
};
