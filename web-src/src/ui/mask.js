import { icons } from './icons.js';
import { t } from './i18n.js';

// Applies CSS text-security masking to a target element.
export function attachMask(target, toggleBtn) {
  let masked = false;
  toggleBtn.addEventListener('click', () => {
    masked = !masked;
    target.classList.toggle('masked', masked);
    const icon = masked ? icons.eye() : icons.eyeOff();
    const label = masked ? t('compose.mask.show', 'Show') : t('compose.mask.hide', 'Hide');
    toggleBtn.innerHTML = `${icon}<span class="label">${label}</span>`;
  });
}
