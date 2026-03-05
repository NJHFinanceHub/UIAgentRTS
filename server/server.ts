import express from 'express';
import { createConnection } from 'mysql2/promise';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const GT_DASHBOARD = 'http://localhost:8080';

let csrfToken: string | null = null;

// Upstream fetch with timeout (prevents hanging when dashboard is down)
function timedFetch(url: string, opts: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Fetch CSRF token from gt dashboard HTML
async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  try {
    const res = await timedFetch(GT_DASHBOARD, {}, 3000);
    const html = await res.text();
    // <meta name="dashboard-token" content="...">
    const match = html.match(/name="dashboard-token"\s+content="([^"]+)"/);
    if (match) {
      csrfToken = match[1];
      console.log(`[csrf] Token acquired: ${csrfToken.slice(0, 8)}...`);
      return csrfToken;
    }
    // Fallback patterns
    const altMatch = html.match(/data-csrf-token="([^"]+)"/);
    if (altMatch) {
      csrfToken = altMatch[1];
      return csrfToken;
    }
    throw new Error('CSRF token not found in dashboard HTML');
  } catch (err) {
    console.error('[csrf] Failed to fetch token:', err);
    throw err;
  }
}

// Refresh token periodically (every 10 minutes)
setInterval(() => {
  csrfToken = null;
  fetchCsrfToken().catch(() => {});
}, 10 * 60 * 1000);

app.use(express.json());

// CORS for dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Run gt commands directly (no dashboard dependency)
app.post('/api/run', async (req, res) => {
  const { command, confirmed } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: 'Missing command' });
  }
  const start = Date.now();
  try {
    const output = await new Promise<string>((resolve, reject) => {
      // Split command into args — command comes without 'gt ' prefix
      const args = command.split(/\s+/);
      execFile('gt', args, {
        cwd: '/home/njh/gt',
        timeout: 15000,
        maxBuffer: 1024 * 1024,
      }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    });
    res.json({
      success: true,
      output,
      duration_ms: Date.now() - start,
      command,
    });
  } catch (err: any) {
    res.json({
      success: false,
      error: err.message,
      duration_ms: Date.now() - start,
      command,
    });
  }
});

// Mail send — shell out to gt directly (no dashboard dependency)
app.post('/api/mail/send', async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ success: false, error: 'Missing to, subject, or body' });
  }
  try {
    await new Promise<void>((resolve, reject) => {
      execFile('gt', ['mail', 'send', to, '-s', subject, '-m', body], {
        cwd: '/home/njh/gt',
        timeout: 10000,
      }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Proxy POST /api/issues/* → gt dashboard with CSRF token
app.post('/api/issues/:action', async (req, res) => {
  try {
    const token = await fetchCsrfToken();
    const upstream = await timedFetch(`${GT_DASHBOARD}/api/issues/${req.params.action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dashboard-Token': token,
      },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SSE proxy: pass through /api/events from gt dashboard
app.get('/api/events', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const upstream = await timedFetch(`${GT_DASHBOARD}/api/events`, {}, 5000);
    if (!upstream.body) {
      res.write('event: error\ndata: no upstream body\n\n');
      return res.end();
    }
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch {
        // upstream closed
      }
      res.end();
    };
    pump();

    req.on('close', () => {
      reader.cancel().catch(() => {});
    });
  } catch (err: any) {
    res.write(`event: error\ndata: ${err.message}\n\n`);
    res.end();
  }
});

// Dolt SQL endpoint for direct bead queries
app.get('/api/beads/:rig', async (req, res) => {
  try {
    const conn = await createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      database: 'beads',
    });
    const [rows] = await conn.execute(
      `SELECT id, title, type, status, priority, owner, created_at, updated_at
       FROM issues
       WHERE status != 'closed'
       ORDER BY priority ASC, created_at DESC
       LIMIT 50`
    );
    await conn.end();
    res.json({ items: rows, rig: req.params.rig });
  } catch (err: any) {
    // Fallback: use bd ready via gt dashboard, map to RigBead[] shape
    try {
      const upstream = await timedFetch(`${GT_DASHBOARD}/api/ready`);
      const data = await upstream.json();
      const items = (data.items ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.type ?? 'task',
        status: 'open',
        priority: item.priority ?? 3,
        owner: item.owner ?? null,
      }));
      res.json({ items, rig: req.params.rig });
    } catch {
      res.status(500).json({ error: err.message });
    }
  }
});

// Proxy all other GET /api/* → gt dashboard
app.get('/api/*', async (req, res) => {
  try {
    const url = new URL(req.url, GT_DASHBOARD);
    const upstream = await timedFetch(url.toString());
    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      const data = await upstream.json();
      res.json(data);
    } else {
      const text = await upstream.text();
      res.type(contentType).send(text);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static built app
app.use(express.static(join(__dirname, '..', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[gas-town-rts] Server running on http://localhost:${PORT}`);
  fetchCsrfToken().catch(err => {
    console.warn('[csrf] Initial token fetch failed (dashboard may not be running):', err.message);
  });
});
