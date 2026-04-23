async function req(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'omit',
    cache: 'no-store'
  });
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch {}
    const e = new Error(body.error || `http_${res.status}`);
    e.status = res.status;
    e.reason = body.reason;
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
}

export function getPOWChallenge() { return req('/api/pow/challenge'); }

export function createNote(payload) {
  return req('/api/notes', { method: 'POST', body: JSON.stringify(payload) });
}

export function revealNote(id) {
  return req(`/api/notes/${encodeURIComponent(id)}/reveal`, { method: 'POST' });
}

export function killNote(id, killToken) {
  return req(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ kill_token: killToken })
  });
}
