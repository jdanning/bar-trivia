import express from 'express';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    // and any origin on the local network
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use('/api', routes);

// Serve React client build
const clientBuildPath = path.join(__dirname, '../../client/build');
app.use(express.static(clientBuildPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.use(errorHandler);

export default app;
