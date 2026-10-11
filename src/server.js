const { createApp } = require('./app');
const { createDb } = require('./db');

const port = process.env.PORT || 3000;
const db = createDb();

createApp(db).listen(port, () => {
  console.log(`Internship API (${db.dialect}) on http://localhost:${port}`);
});
