const express = require('express');
const { createDb } = require('./db');
const { ApiError, badRequest, notFound } = require('./errors');
const { validateBody, validateListQuery, parseId } = require('./validation');

function createApp(db = createDb()) {
  const app = express();
  app.use(express.json({ limit: '50kb' }));
  app.use((_req, _res, next) => db.ready().then(() => next(), next));

  function idParam(req) {
    const id = parseId(req.params.id);
    if (id === null) {
      throw badRequest('Invalid id', [{ field: 'id', message: 'must be a positive integer' }]);
    }
    return id;
  }

  function getById(id) {
    return db.get('SELECT * FROM internships WHERE id = ?', [id]);
  }

  app.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));

  app.get('/api/internships', async (req, res) => {
    const { errors, value: q } = validateListQuery(req.query);
    if (errors) throw badRequest('Invalid query parameters', errors);

    const where = [];
    const params = [];

    if (q.status) {
      where.push('status = ?');
      params.push(q.status);
    }
    if (q.work_mode) {
      where.push('work_mode = ?');
      params.push(q.work_mode);
    }
    if (q.q) {
      where.push('(LOWER(company) LIKE LOWER(?) OR LOWER(title) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?))');
      const like = `%${q.q.replace(/[%_\\]/g, '')}%`;
      params.push(like, like, like);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.get(`SELECT COUNT(*) AS n FROM internships ${clause}`, params);
    const total = Number(countRow.n);

    const rows = await db.all(
      `SELECT * FROM internships ${clause} ORDER BY ${q.sort} ${q.order}, id ASC LIMIT ? OFFSET ?`,
      [...params, q.limit, (q.page - 1) * q.limit]
    );

    res.json({
      data: rows,
      meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    });
  });

  app.get('/api/internships/:id', async (req, res) => {
    const row = await getById(idParam(req));
    if (!row) throw notFound('Internship not found');
    res.json({ data: row });
  });

  app.post('/api/internships', async (req, res) => {
    const { errors, value: v } = validateBody(req.body, 'create');
    if (errors) throw badRequest('Validation failed', errors);

    const row = await db.get(
      `INSERT INTO internships (company, title, location, work_mode, status, stipend_monthly, deadline, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [v.company, v.title, v.location, v.work_mode, v.status, v.stipend_monthly, v.deadline, v.description]
    );

    res.status(201).location(`/api/internships/${row.id}`).json({ data: row });
  });

  function update(mode) {
    return async (req, res) => {
      const id = idParam(req);
      if (!(await getById(id))) throw notFound('Internship not found');

      const { errors, value } = validateBody(req.body, mode);
      if (errors) throw badRequest('Validation failed', errors);

      const keys = Object.keys(value);
      const setClause = keys.map((k) => `${k} = ?`).join(', ');
      const row = await db.get(
        `UPDATE internships SET ${setClause}, updated_at = ? WHERE id = ? RETURNING *`,
        [...keys.map((k) => value[k]), new Date().toISOString(), id]
      );

      res.json({ data: row });
    };
  }

  app.put('/api/internships/:id', update('replace'));
  app.patch('/api/internships/:id', update('patch'));

  app.delete('/api/internships/:id', async (req, res) => {
    const gone = await db.get('DELETE FROM internships WHERE id = ? RETURNING id', [idParam(req)]);
    if (!gone) throw notFound('Internship not found');
    res.status(204).end();
  });

  app.use((_req, _res, next) => next(notFound('Route not found')));

  app.use((err, _req, res, _next) => {
    if (err instanceof ApiError) {
      const body = { code: err.code, message: err.message };
      if (err.details) body.details = err.details;
      return res.status(err.status).json({ error: body });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
    }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  });

  return app;
}

module.exports = { createApp };
