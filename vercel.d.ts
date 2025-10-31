declare module '../dist/index.js' {
  import { Express } from 'express';
  const appPromise: Promise<Express>;
  export default appPromise;
}
