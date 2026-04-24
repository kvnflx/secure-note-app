let strings = {};
export async function initI18n() {
  // Force English across the site — brand is English.
  try {
    const res = await fetch('/i18n/en.json');
    strings = await res.json();
  } catch {
    strings = {};
  }
}
export function t(key, fallback) { return strings[key] || fallback || key; }
