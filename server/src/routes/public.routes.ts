import { Router } from 'express';
import { publicLanding } from '../services/public.service';

export const publicRouter = Router();

publicRouter.get('/landing', async (req, res) => {
  const data = await publicLanding();
  res.json({ data });
});
