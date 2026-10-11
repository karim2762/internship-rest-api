const test = require('node:test');
const assert = require('node:assert/strict');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

let server, base;
const valid = { company: 'Acme', title: 'Intern', location: 'Paris', deadline: '2026-12-31' };

test.before(() => {
  server = createApp(createDb({ sqlitePath: ':memory:' })).listen(0);
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const call = (method, path, body) =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

test('create applies defaults and returns 201 + Location', async () => {
  const res = await call('POST', '/api/internships', valid);
  assert.equal(res.status, 201);
  assert.match(res.headers.get('location'), /^\/api\/internships\/\d+$/);
  const { data } = await res.json();
  assert.equal(data.status, 'open');
  assert.equal(data.work_mode, 'onsite');
});

test('create rejects invalid input with 400 and field details', async () => {
  const res = await call('POST', '/api/internships', { company: '', deadline: '2026-02-30', work_mode: 'moon' });
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
  const fields = error.details.map((d) => d.field);
  for (const f of ['company', 'title', 'location', 'deadline', 'work_mode']) assert.ok(fields.includes(f), f);
});

test('malformed JSON returns 400 INVALID_JSON', async () => {
  const res = await call('POST', '/api/internships', '{bad');
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_JSON');
});

test('detail: 200, 404, and 400 for bad id', async () => {
  const { data } = await (await call('POST', '/api/internships', valid)).json();
  assert.equal((await call('GET', `/api/internships/${data.id}`)).status, 200);
  assert.equal((await call('GET', '/api/internships/999999')).status, 404);
  assert.equal((await call('GET', '/api/internships/abc')).status, 400);
});

test('list paginates and filters', async () => {
  for (let i = 0; i < 5; i++) await call('POST', '/api/internships', { ...valid, status: 'closed' });
  const res = await call('GET', '/api/internships?status=closed&limit=2&page=2');
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.length, 2);
  assert.equal(body.meta.page, 2);
  assert.equal(body.meta.total, 5);
  assert.equal(body.meta.totalPages, 3);
  assert.equal((await call('GET', '/api/internships?limit=1000')).status, 400);
});

test('PUT replaces, PATCH partially updates, both validate', async () => {
  const { data } = await (await call('POST', '/api/internships', valid)).json();
  const put = await call('PUT', `/api/internships/${data.id}`, { ...valid, title: 'Senior Intern' });
  assert.equal((await put.json()).data.title, 'Senior Intern');
  const patch = await call('PATCH', `/api/internships/${data.id}`, { status: 'closed' });
  const p = (await patch.json()).data;
  assert.equal(p.status, 'closed');
  assert.equal(p.title, 'Senior Intern');
  assert.equal((await call('PATCH', `/api/internships/${data.id}`, {})).status, 400);
  assert.equal((await call('PUT', `/api/internships/${data.id}`, { title: 'x' })).status, 400);
  assert.equal((await call('PATCH', '/api/internships/999999', { status: 'open' })).status, 404);
});

test('delete returns 204 then 404', async () => {
  const { data } = await (await call('POST', '/api/internships', valid)).json();
  assert.equal((await call('DELETE', `/api/internships/${data.id}`)).status, 204);
  assert.equal((await call('DELETE', `/api/internships/${data.id}`)).status, 404);
});

test('unknown route returns JSON 404', async () => {
  const res = await call('GET', '/nope');
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'NOT_FOUND');
});
