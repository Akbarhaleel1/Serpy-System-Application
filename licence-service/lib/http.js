// Shared request plumbing for the licence endpoints.

// The desktop renderer runs from the app:// origin rather than a website, so
// these endpoints are called cross-origin. They are public by design and
// validate everything they act on.
function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Wrap a handler with CORS, a method check, and error handling.
 * Returns true from the guard when the request has already been answered.
 */
function handler(fn) {
  return async (req, res) => {
    applyCors(res);

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    try {
      await fn(req, res);
    } catch (err) {
      // Detail goes to the Vercel log; the caller gets a safe message
      console.error(`[${req.url}]`, err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
      }
    }
  };
}

module.exports = { handler };
