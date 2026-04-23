let strings = {};
export async function initI18n() {
  const lang = (navigator.language || 'en').slice(0, 2);
  try {
    const url = `/i18n/${lang}.json`;
    const res = await fetch(url);
    strings = await res.json();
  } catch {
    strings = {};
  }
}
export function t(key, fallback) { return strings[key] || fallback || key; }
