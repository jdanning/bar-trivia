import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security headers (XSS protection, no MIME sniffing, frameguard, etc.)
// CSP disabled so the React app's inline scripts and styles load correctly
app.use(helmet({ contentSecurityPolicy: false }));

// Only allow same-origin, localhost, the LAN IP, and the active Cloudflare tunnel URL.
// config.publicUrl is set dynamically once the tunnel starts, so this is evaluated
// per-request and will allow the tunnel as soon as it's available.
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin requests have no Origin header
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === config.localIp) return true;
    if (config.publicUrl) {
      const tunnelHost = new URL(config.publicUrl).hostname;
      if (hostname === tunnelHost) return true;
    }
  } catch { /* malformed origin */ }
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origin not permitted'));
    }
  },
  credentials: true,
}));

// Rate limit REST API: 150 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api', apiLimiter);

// Limit JSON body size to prevent large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use('/api', routes);

// Serve React client build
const clientBuildPath = path.join(__dirname, '../../client/build');
// Static assets have hashed filenames — cache them aggressively
app.use('/static', express.static(path.join(clientBuildPath, 'static'), {
  maxAge: '1y',
  immutable: true,
}));
// Everything else (index.html etc.) — never cache
app.use(express.static(clientBuildPath, {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
    }
  },
}));
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.use(errorHandler);

export default app;
