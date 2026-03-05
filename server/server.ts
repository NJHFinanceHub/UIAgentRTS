import express from 'express';
import { createConnection } from 'mysql2/promise';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// Helper: run a gt command and return stdout
function runGt(args: string[], timeoutMs = 25000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('gt', args, {
      cwd: '/home/njh/gt',
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

app.use(express.json());

// CORS for dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Run gt commands directly
app.post('/api/run', async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: 'Missing command' });
  }
  const start = Date.now();
  try {
    const args = command.split(/\s+/);
    const output = await runGt(args);
    res.json({ success: true, output, duration_ms: Date.now() - start, command });
  } catch (err: any) {
    res.json({ success: false, error: err.message, duration_ms: Date.now() - start, command });
  }
});

// Mail send — direct gt command
app.post('/api/mail/send', async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ success: false, error: 'Missing to, subject, or body' });
  }
  try {
    await runGt(['mail', 'send', to, '-s', subject, '-m', body], 10000);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mail inbox — direct gt command
app.get('/api/mail/inbox', async (_req, res) => {
  try {
    const output = await runGt(['mail', 'inbox', '--json'], 8000);
    try {
      const data = JSON.parse(output);
      res.json(data);
    } catch {
      // Non-JSON output — return as messages array
      res.json({ messages: [], unread_count: 0, total: 0 });
    }
  } catch (err: any) {
    res.json({ messages: [], unread_count: 0, total: 0 });
  }
});

// Ready work items — direct gt command
app.get('/api/ready', async (_req, res) => {
  try {
    const output = await runGt(['bd', 'ready', '--json'], 8000);
    try {
      const data = JSON.parse(output);
      res.json(data);
    } catch {
      res.json({ items: [], by_source: {}, summary: { total: 0, p1_count: 0, p2_count: 0, p3_count: 0 } });
    }
  } catch {
    res.json({ items: [], by_source: {}, summary: { total: 0, p1_count: 0, p2_count: 0, p3_count: 0 } });
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
    // Fallback: use bd ready directly
    try {
      const output = await runGt(['bd', 'ready', '--json'], 8000);
      const data = JSON.parse(output);
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
      res.json({ items: [], rig: req.params.rig });
    }
  }
});

// Convoy list — gt convoy list --json
app.get('/api/convoys', async (_req, res) => {
  try {
    const output = await runGt(['convoy', 'list', '--json'], 8000);
    try {
      const data = JSON.parse(output);
      // data is an array of convoy objects
      res.json({ convoys: Array.isArray(data) ? data : [] });
    } catch {
      res.json({ convoys: [] });
    }
  } catch {
    res.json({ convoys: [] });
  }
});

// Convoy status — gt convoy status [id] --json
app.get('/api/convoys/:id', async (req, res) => {
  try {
    const output = await runGt(['convoy', 'status', req.params.id, '--json'], 8000);
    try {
      const data = JSON.parse(output);
      res.json(data);
    } catch {
      res.json({ error: 'Failed to parse convoy status' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SSE — emit periodic refresh events (no dashboard dependency)
app.get('/api/events', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('event: connected\ndata: ok\n\n');

  // Send periodic heartbeat
  const interval = setInterval(() => {
    res.write('event: dashboard-update\ndata: refresh\n\n');
  }, 10000);

  _req.on('close', () => {
    clearInterval(interval);
  });
});

// Serve static built app
app.use(express.static(join(__dirname, '..', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[gas-town-rts] Server running on http://localhost:${PORT}`);
});
