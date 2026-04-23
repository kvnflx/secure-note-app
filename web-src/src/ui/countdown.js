export function startCountdown(displayEl, seconds, onExpire) {
  let remaining = seconds;
  displayEl.textContent = format(remaining);
  const id = setInterval(() => {
    remaining--;
    displayEl.textContent = format(remaining);
    if (remaining <= 0) {
      clearInterval(id);
      onExpire();
    }
  }, 1000);
  return { stop: () => clearInterval(id), extend: (s) => { remaining += s; } };
}

function format(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(Math.max(0, r)).padStart(2, '0')}`;
}
