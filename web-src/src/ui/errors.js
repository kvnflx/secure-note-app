import { t } from './i18n.js';

const MAP = {
  'pow_failed':   'errors.pow_failed',
  'bad_request':  'errors.bad_request',
  'gone':         'errors.gone',
  'forbidden':    'errors.forbidden',
  'internal':     'errors.internal'
};

const DEFAULTS = {
  'errors.pow_failed':  'Proof-of-work failed. Please retry.',
  'errors.bad_request': 'Request was invalid.',
  'errors.gone':        'This note is gone.',
  'errors.forbidden':   'Not allowed.',
  'errors.internal':    'Server error. Please retry later.'
};

export function formatError(e) {
  const code = MAP[e.message];
  if (code) return t(code, DEFAULTS[code]);
  return e.message || 'Unknown error';
}
