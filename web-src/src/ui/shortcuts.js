export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const primary = document.querySelector('#send, #show');
      primary?.click();
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      const back = document.querySelector('[data-back]');
      back?.click();
    }
  });
}
