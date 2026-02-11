import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = typeof import.meta?.url === 'string'
    ? path.dirname(fileURLToPath(import.meta.url))
    : process.cwd();

/**
 * Configure static file serving for the frontend
 * This middleware should be applied after API routes but before the final error handler
 */
export function serveStatic(app: express.Application) {
    // Path to the built frontend assets
    // In production (Docker), this will be at /app/dist/client
    // In development, we might not use this locally (Vite dev server instead)
    const distPath = process.env.CLIENT_DIST_PATH || path.join(__dirname, '..', 'client');

    if (!fs.existsSync(distPath)) {
        console.warn(`Static files not found at ${distPath}. Skipping static file serving.`);
        return;
    }

    // Serve static files with aggressive caching for hashed assets
    app.use(express.static(distPath, {
        maxAge: '1y',
        setHeaders: (res, path) => {
            if (path.endsWith('.html')) {
                // Don't cache HTML files so updates are seen immediately
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));

    // SPA fallback: serve index.html for any unknown routes
    // This supports client-side routing (e.g., /exercises, /profile)
    app.get(/(.*)/, (req, res, next) => {
        // Skip if request wants JSON (API 404s should return JSON, not HTML)
        if (req.accepts('html') || req.accepts('json') === 'html') {
            res.sendFile(path.join(distPath, 'index.html'));
        } else {
            next();
        }
    });
}
