import { Router, Request, Response } from 'express';
import { gameStore } from '../models/GameStore';
import { generateQRCode } from '../services/qrService';
import { config } from '../config';
import { getTunnelState } from '../services/tunnelService';

const router = Router();

router.get('/games/:id', (req: Request, res: Response) => {
  const game = gameStore.getGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  res.json(game);
});

router.get('/games/:id/qr', async (req: Request, res: Response) => {
  const game = gameStore.getGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  const qrCode = await generateQRCode(game.code);
  res.json({ qrCode, code: game.code });
});

router.get('/tunnel', (_req: Request, res: Response) => {
  res.json(getTunnelState());
});

router.get('/games/:id/scoreboard', (req: Request, res: Response) => {
  const scoreboard = gameStore.getScoreboard(req.params.id);
  res.json(scoreboard);
});

router.get('/games/:id/answers/:questionId', (req: Request, res: Response) => {
  const answers = gameStore.getAnswersForQuestion(req.params.id, req.params.questionId);
  res.json(answers);
});

router.get('/games/:id/wagers/:playerId/:roundNumber', (req: Request, res: Response) => {
  const usedWagers = gameStore.getUsedWagers(
    req.params.id,
    req.params.playerId,
    parseInt(req.params.roundNumber, 10)
  );
  const roundNum = parseInt(req.params.roundNumber, 10);
  const allWagers = config.getWagersForRound(roundNum);
  res.json({ usedWagers, availableWagers: allWagers.filter((w) => !usedWagers.includes(w)) });
});

// ---- TEMPLATES ----

router.get('/templates', (_req: Request, res: Response) => {
  res.json(gameStore.listTemplates());
});

router.post('/templates', (req: Request, res: Response) => {
  const { name, gameId } = req.body;
  if (!name || !gameId) {
    res.status(400).json({ error: 'name and gameId are required' });
    return;
  }
  const template = gameStore.saveTemplate(name, gameId);
  if (!template) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  res.json(template);
});

router.delete('/templates/:id', (req: Request, res: Response) => {
  const ok = gameStore.deleteTemplate(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Template not found or cannot be deleted' });
    return;
  }
  res.json({ success: true });
});

export default router;
