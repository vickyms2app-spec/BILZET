import app from '../BILZET_backend/src/app.mjs';

/**
 * Vercel Serverless Function entry point for full-stack Express backend
 * Normalizes rewritten URLs and shields against unhandled function crash
 */
export default function handler(req, res) {
  // Normalize URL if Vercel internal rewrite points to /api/index.mjs
  if (req.url === '/api/index.mjs' || req.url === '/api/index' || req.url?.startsWith('/api/index.mjs?')) {
    const originalPath =
      req.headers['x-matched-path'] ||
      req.headers['x-vercel-matched-path'] ||
      req.headers['x-forwarded-uri'];
    if (originalPath && originalPath !== '/api/index.mjs') {
      req.url = originalPath;
    }
  }

  try {
    return app(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Gateway Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error in API gateway',
      });
    }
  }
}
