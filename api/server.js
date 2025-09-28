const app = require('../src/app');

// Export a handler function that delegates to the Express app.
// This is the most compatible shape for @vercel/node.
function handler(req, res) {
	return app(req, res);
}

module.exports = handler;
module.exports.default = handler;
