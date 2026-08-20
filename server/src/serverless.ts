import type { NextFunction, Request, Response } from 'express';
import { createApp } from './app';

const app = createApp();

export default function handler(req: Request, res: Response, next: NextFunction = () => undefined): void {
  const url = req.url ?? '/';
  if (url.startsWith('/api/index')) {
    const rest = url.slice('/api/index'.length);
    req.url = rest === '' || rest === '/' ? '/api' : `/api${rest.startsWith('/') ? '' : '/'}${rest}`;
  }
  app(req, res, next);
}