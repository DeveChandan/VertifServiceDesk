import type { VercelRequest, VercelResponse } from '@vercel/node';
import appPromise from '../dist/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await appPromise;
  app(req, res);
}
