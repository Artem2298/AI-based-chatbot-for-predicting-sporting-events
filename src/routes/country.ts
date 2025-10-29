import { Router, Request, Response } from 'express';
import { countryService } from '../services/leaguesService';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  console.log('[ROUTE] GET /country');
  try {
    const countries = await countryService();
    res.json(countries);
  } catch (error) {
    console.error('[ROUTE] Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

export default router;
