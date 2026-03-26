import express from 'express';
import cors from 'cors';
import { expressHandler } from '@genkit-ai/express';

import { jwtContextProvider } from './middleware/verifyJwt.js';
import { searchMedia } from './flows/catalog/searchMedia.js';
import { searchBooks } from './flows/catalog/searchBooks.js';
import { searchGames } from './flows/catalog/searchGames.js';
import { searchAll } from './flows/catalog/searchAll.js';
import { searchWeb } from './flows/catalog/searchWeb.js';
import { getMovieDetail } from './flows/catalog/getMovieDetail.js';
import { getTvDetail } from './flows/catalog/getTvDetail.js';
import { orchestratorFlow } from './flows/agent/orchestratorFlow.js';
import { feedbackFlow } from './flows/feedback/feedbackFlow.js';
import './prompts/index.js';
import './evals/index.js';

export function createApp(corsOrigins: string[] | string): express.Express {
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: corsOrigins }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const protect = { contextProvider: jwtContextProvider };
  app.post('/searchMedia', expressHandler(searchMedia, protect));
  app.post('/searchBooks', expressHandler(searchBooks, protect));
  app.post('/searchGames', expressHandler(searchGames, protect));
  app.post('/searchAll', expressHandler(searchAll, protect));
  app.post('/searchWeb', expressHandler(searchWeb, protect));
  app.post('/getMovieDetail', expressHandler(getMovieDetail, protect));
  app.post('/getTvDetail', expressHandler(getTvDetail, protect));
  app.post('/orchestratorFlow', expressHandler(orchestratorFlow, protect));
  app.post('/feedback', expressHandler(feedbackFlow, protect));

  return app;
}
