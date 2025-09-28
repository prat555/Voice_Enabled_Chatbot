const app = require('../src/app');

// Vercel's Node runtime uses the exported default handler from a module.
// Express app is already configured; just export the app as the handler.
module.exports = app;
module.exports.default = app;
