# Internship  API

REST API for internship records built with **Node.js, Express and SQLite (local) / PostgreSQL (Vercel)**.
It has validation, pagination, filtering, JSON error responses, seed data and tests.

## Setup

```bash
git clone https://github.com/karim2762/internship-rest-api.git && cd internship-api
npm install --omit=optional
cp .env.example .env
npm run seed
npm start
npm test
```

You need Node.js 18 or newer. `npm run seed` creates `./data/internships.db` with 12 sample records, and `npm start` runs the server on http://localhost:3000. Without `DATABASE_URL` the app uses SQLite, and with it the app uses PostgreSQL.

## Deploy to Vercel (PostgreSQL)

SQLite can't persist on Vercel because the filesystem is read-only, so use a hosted Postgres instead.

1. **Create a database**: in the Vercel dashboard go to *Storage -> Create -> Neon (Postgres)* and connect it to your project (this adds `DATABASE_URL`), or create one at neon.tech / supabase.com and copy the connection string.
2. **Push the repo to GitHub**, then *Vercel -> Add New -> Project -> import the repo*. No build settings needed (`vercel.json` routes everything to `api/index.js`).
3. **Set the env var** `DATABASE_URL` in *Project -> Settings -> Environment Variables* if the integration did not add it. Redeploy.
4. **Seed the database once** from your machine:
   ```bash
   DATABASE_URL="postgres://user:pass@host/db?sslmode=require" npm run seed
   ```
5. Test: `https://<your-project>.vercel.app/api/internships` and `/health`.

The schema (`schema.pg.sql`) is created automatically on the first request.

## Data model (`schema.sql`)

| Field | Type | Rules |
|---|---|---|
| id | integer | auto-generated |
| company | string | required, 1-100 chars |
| title | string | required, 1-120 chars |
| location | string | required, 1-100 chars |
| work_mode | string | `remote` \| `hybrid` \| `onsite` (default `onsite`) |
| status | string | `draft` \| `open` \| `closed` (default `open`) |
| stipend_monthly | integer \| null | >= 0 (default `null`) |
| deadline | string | required, real date `YYYY-MM-DD` |
| description | string | max 2000 chars (default `""`) |
| created_at / updated_at | ISO timestamp | set by the server |

## Response format

Success: `{ "data": <object | array>, "meta": { ... } }` (`meta` on list only).
Error: `{ "error": { "code": "...", "message": "...", "details": [{ "field": "...", "message": "..." }] } }`

| Status | When | `error.code` |
|---|---|---|
| 200 | read / update OK | |
| 201 | created (+ `Location` header) | |
| 204 | deleted (no body) | |
| 400 | invalid body, query or id | `VALIDATION_ERROR`, `INVALID_JSON` |
| 404 | record or route not found | `NOT_FOUND` |
| 413 | body over 50 KB | `PAYLOAD_TOO_LARGE` |
| 500 | unexpected error | `INTERNAL_ERROR` |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/internships` | List with pagination, filters, search, sort |
| GET | `/api/internships/:id` | Detail |
| POST | `/api/internships` | Create |
| PUT | `/api/internships/:id` | Replace (all required fields needed) |
| PATCH | `/api/internships/:id` | Partial update (at least one field) |
| DELETE | `/api/internships/:id` | Delete |
| GET | `/health` | Health check |

List query params: `page` (default 1), `limit` (1-100, default 10), `status`, `work_mode`,
`q` (search company/title/location), `sort` (`id|deadline|company|stipend_monthly|created_at`), `order` (`asc|desc`).

## Examples

```bash
curl "http://localhost:3000/api/internships?status=open&sort=deadline&limit=5&page=1"

curl http://localhost:3000/api/internships/1

curl -X POST http://localhost:3000/api/internships \
  -H "Content-Type: application/json" \
  -d '{"company":"Acme","title":"Data Intern","location":"Paris","deadline":"2026-12-31","work_mode":"hybrid","stipend_monthly":1200}'

curl -X PATCH http://localhost:3000/api/internships/13 \
  -H "Content-Type: application/json" -d '{"status":"closed"}'

curl -X DELETE http://localhost:3000/api/internships/13

curl -X POST http://localhost:3000/api/internships \
  -H "Content-Type: application/json" -d '{"title":"x","deadline":"2026-02-30"}'
```

## Project layout

```
schema.sql          table + indexes (SQLite)
schema.pg.sql       same table for PostgreSQL
api/index.js        Vercel serverless entry
vercel.json         routes all paths to the Express app
data/seed.json      sample records
scripts/seed.js     resets and loads seed data
src/app.js          routes + error handler
src/validation.js   body/query validation
src/db.js           SQLite / PostgreSQL adapter
tests/api.test.js   integration tests
```

## Design notes

- SQL uses bound parameters and sort columns are whitelisted.
- Unknown body fields are rejected.
- `PUT` replaces the record, `PATCH` updates part of it. Both are validated.
