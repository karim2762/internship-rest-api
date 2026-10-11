const WORK_MODES = ['remote', 'hybrid', 'onsite'];
const STATUSES = ['draft', 'open', 'closed'];
const SORTABLE = ['id', 'deadline', 'company', 'stipend_monthly', 'created_at'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(s) {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function checkString(v, min, max) {
  if (typeof v !== 'string') return 'must be a string';
  const len = v.trim().length;
  if (len < min) return 'must not be empty';
  if (len > max) return `must be at most ${max} characters`;
  return null;
}

const FIELDS = {
  company: (v) => checkString(v, 1, 100),
  title: (v) => checkString(v, 1, 120),
  location: (v) => checkString(v, 1, 100),
  work_mode: (v) => (WORK_MODES.includes(v) ? null : `must be one of: ${WORK_MODES.join(', ')}`),
  status: (v) => (STATUSES.includes(v) ? null : `must be one of: ${STATUSES.join(', ')}`),
  stipend_monthly: (v) =>
    v === null || (Number.isInteger(v) && v >= 0) ? null : 'must be a non-negative integer or null',
  deadline: (v) => (isRealDate(v) ? null : 'must be a valid date in YYYY-MM-DD format'),
  description: (v) =>
    typeof v === 'string' && v.length <= 2000 ? null : 'must be a string up to 2000 characters',
};

const REQUIRED = ['company', 'title', 'location', 'deadline'];
const DEFAULTS = { work_mode: 'onsite', status: 'open', stipend_monthly: null, description: '' };

function validateBody(body, mode) {
  const details = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: [{ field: 'body', message: 'must be a JSON object' }] };
  }

  for (const key of Object.keys(body)) {
    if (!FIELDS[key]) {
      details.push({ field: key, message: 'is not a recognised field' });
    }
  }

  if (mode !== 'patch') {
    for (const field of REQUIRED) {
      if (body[field] === undefined) {
        details.push({ field, message: 'is required' });
      }
    }
  } else if (!Object.keys(body).some((k) => FIELDS[k])) {
    details.push({ field: 'body', message: 'must include at least one updatable field' });
  }

  const clean = {};
  for (const [field, check] of Object.entries(FIELDS)) {
    const value = body[field];
    if (value === undefined) continue;

    const msg = check(value);
    if (msg) {
      details.push({ field, message: msg });
    } else if (typeof value === 'string' && field !== 'description') {
      clean[field] = value.trim();
    } else {
      clean[field] = value;
    }
  }

  if (details.length) return { errors: details };
  return { value: mode === 'patch' ? clean : { ...DEFAULTS, ...clean } };
}

function validateListQuery(q) {
  const details = [];
  const out = { page: 1, limit: 10, sort: 'id', order: 'asc' };

  function oneOf(field, list) {
    if (q[field] === undefined) return;
    if (!list.includes(q[field])) {
      details.push({ field, message: `must be one of: ${list.join(', ')}` });
    } else {
      out[field] = q[field];
    }
  }

  if (q.page !== undefined) {
    const n = Number(q.page);
    if (!Number.isInteger(n) || n < 1) {
      details.push({ field: 'page', message: 'must be an integer >= 1' });
    } else {
      out.page = n;
    }
  }

  if (q.limit !== undefined) {
    const n = Number(q.limit);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      details.push({ field: 'limit', message: 'must be an integer between 1 and 100' });
    } else {
      out.limit = n;
    }
  }

  oneOf('status', STATUSES);
  oneOf('work_mode', WORK_MODES);
  oneOf('sort', SORTABLE);
  oneOf('order', ['asc', 'desc']);

  if (q.q !== undefined) {
    if (typeof q.q !== 'string' || !q.q.trim() || q.q.length > 100) {
      details.push({ field: 'q', message: 'must be a non-empty string up to 100 characters' });
    } else {
      out.q = q.q.trim();
    }
  }

  return details.length ? { errors: details } : { value: out };
}

function parseId(raw) {
  return /^[1-9]\d{0,15}$/.test(raw) ? Number(raw) : null;
}

module.exports = { validateBody, validateListQuery, parseId };
