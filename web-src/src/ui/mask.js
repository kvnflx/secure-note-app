// Applies CSS text-security masking to a target element.
export function attachMask(target, toggleBtn) {
  let masked = false;
  toggleBtn.addEventListener('click', () => {
    masked = !masked;
    target.classList.toggle('masked', masked);
    toggleBtn.textContent = masked ? '👁 Show' : '👁 Hide';
  });
}
