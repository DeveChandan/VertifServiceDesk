
import { Express } from 'express';
import { Server } from 'http';
import express from 'express';
import path from 'path';

import { fileURLToPath } from 'url';

// Setup Vite development server
export async function setupVite(app: Express, server: Server) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });
  app.use(vite.middlewares);
}

// Serve static files in production
export function serveStatic(app: Express) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientDistPath = path.resolve(__dirname, 'public');

  app.use(express.static(clientDistPath));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
}

// Simple logging function
export function log(message: string) {
  console.log(`[SERVER] ${message}`);
}