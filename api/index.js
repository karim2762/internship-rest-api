const { createApp } = require('../src/app');
const { createDb } = require('../src/db');

module.exports = createApp(createDb());
