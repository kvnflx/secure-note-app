const COMMON = new Set(['password', '123456', 'qwerty', 'letmein', 'hunter2', 'admin']);

export function strength(pw) {
  if (!pw) return { bits: 0, label: 'empty' };
  if (COMMON.has(pw.toLowerCase())) return { bits: 0, label: 'too_common' };
  let charset = 0;
  if (/[a-z]/.test(pw)) charset += 26;
  if (/[A-Z]/.test(pw)) charset += 26;
  if (/[0-9]/.test(pw)) charset += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) charset += 32;
  const bits = Math.floor(pw.length * Math.log2(Math.max(charset, 1)));
  const label = bits < 40 ? 'weak' : bits < 60 ? 'ok' : 'strong';
  return { bits, label };
}
