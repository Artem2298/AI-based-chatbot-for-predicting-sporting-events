import { Router, Request, Response } from 'express';

import {
  leaguesService,
  fetchLeaguesByCountry,
  getSeasonIdByLeague,
} from '../services/leaguesService';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const leagues = await leaguesService();
    res.json(leagues);
  } catch (error) {
    console.error('[ROUTE] Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

router.get(
  '/by-country',
  async (req: Request, res: Response): Promise<void> => {
    const id = req.query.id;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Missing or invalid country ID' });
    }

    try {
      const leagues = await fetchLeaguesByCountry(parseInt(id));
      res.json(leagues);
    } catch (error) {
      console.error('[ROUTE] Error fetching leagues by country:', error);
      res.status(500).json({ error: 'Failed to fetch leagues by country' });
    }
  }
);

router.get('/season', async (req: Request, res: Response): Promise<void> => {
  const id = req.query.id;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Missing or invalid league ID' });
    return;
  }

  try {
    const seasonId = await getSeasonIdByLeague(parseInt(id));
    res.json({ season_id: seasonId });
  } catch (error) {
    console.error('[ROUTE] Error fetching season ID:', error);
    res.status(500).json({ error: 'Failed to fetch current season' });
  }
});

export default router;
