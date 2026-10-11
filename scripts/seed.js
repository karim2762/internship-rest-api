const fs = require('fs');
const path = require('path');
const { createDb } = require('../src/db');

async function main() {
  const db = createDb();
  await db.ready();

  const file = path.join(__dirname, '..', 'data', 'seed.json');
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));

  await db.reset();

  for (const r of records) {
    await db.get(
      `INSERT INTO internships (company, title, location, work_mode, status, stipend_monthly, deadline, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [r.company, r.title, r.location, r.work_mode, r.status, r.stipend_monthly, r.deadline, r.description]
    );
  }

  console.log(`Seeded ${records.length} internships into ${db.dialect}.`);
  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
