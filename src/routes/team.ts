import { Router, Request, Response } from 'express';
import { teamService } from '../services/leaguesService';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { country, league } = req.query;

  if (
    !country ||
    typeof country !== 'string' ||
    !league ||
    typeof league !== 'string'
  ) {
    res.status(400).json({ error: 'Missing or invalid country or league ID' });
    return;
  }

  try {
    const countryId = parseInt(country);
    // const leagueId = parseInt(league);

    const teams = await teamService(countryId);
    res.json(teams);
  } catch (error) {
    console.error('[ROUTE] Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

export default router;
