// Gas Town API Client
// Talks to the proxy server which handles CSRF and Dolt queries

const API_BASE = '/api';

// Client-side fetch with timeout to prevent UI freezes
function timedFetch(url: string, opts: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export interface TownStatus {
  name: string;
  location: string;
  overseer: {
    name: string;
    username: string;
    unread_mail: number;
  };
  daemon: { running: boolean; pid: number };
  dolt: { running: boolean; pid: number; port: number };
  tmux: { running: boolean; session_count: number };
  agents: Agent[];
  rigs: Rig[];
}

export interface Agent {
  name: string;
  address: string;
  session: string;
  role: string;
  running: boolean;
  has_work: boolean;
  unread_mail: number;
  first_subject?: string;
  agent_alias?: string;
}

export interface Rig {
  name: string;
  polecat_count: number;
  crew_count: number;
  has_witness: boolean;
  has_refinery: boolean;
  polecats: Polecat[] | null;
  crews: CrewMember[] | null;
  hooks: HookInfo[];
  agents: Agent[];
}

export interface Polecat {
  name: string;
  rig: string;
  status: string;
  hook?: string;
}

export interface CrewMember {
  name: string;
  rig: string;
  state: string;
  hook?: string;
  hook_title?: string;
  session: string;
  last_active: string;
}

export interface HookInfo {
  agent: string;
  role: string;
  has_work: boolean;
}

export interface MailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body?: string;
  timestamp: string;
  read: boolean;
  priority?: string;
}

export interface MailInbox {
  messages: MailMessage[];
  unread_count: number;
  total: number;
}

export interface ReadyItem {
  id: string;
  title: string;
  priority: number;
  source: string;
  type: string;
}

export interface ReadyResponse {
  items: ReadyItem[];
  by_source: Record<string, ReadyItem[]>;
  summary: {
    total: number;
    p1_count: number;
    p2_count: number;
    p3_count: number;
  };
}

export interface CommandResponse {
  success: boolean;
  output?: string;
  error?: string;
  duration_ms: number;
  command: string;
}

export interface OptionsResponse {
  rigs?: string[];
  polecats?: string[];
  convoys?: string[];
  agents?: Array<{ name: string; status?: string; running?: boolean }>;
  hooks?: string[];
  messages?: string[];
  crew?: string[];
  escalations?: string[];
}

// Extract JSON from output that may have trailing warnings
function extractJSON(raw: string): any {
  // Find the last closing brace that completes the top-level object
  let depth = 0;
  let start = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (raw[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        return JSON.parse(raw.substring(start, i + 1));
      }
    }
  }
  throw new Error('No valid JSON found in output');
}

// Fetch town status
export async function getStatus(): Promise<TownStatus> {
  const res = await timedFetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'status --json' }),
  }, 25000);
  const data: CommandResponse = await res.json();
  if (data.success && data.output) {
    return extractJSON(data.output);
  }
  throw new Error(data.error || 'Failed to get status');
}

// Fetch mail inbox
export async function getMailInbox(): Promise<MailInbox> {
  try {
    const res = await timedFetch(`${API_BASE}/mail/inbox`);
    const data = await res.json();
    // API may return error wrapper instead of mail data
    if (data.messages) return data;
    return { messages: [], unread_count: 0, total: 0 };
  } catch {
    return { messages: [], unread_count: 0, total: 0 };
  }
}

// Read a specific mail message
export async function readMail(id: string): Promise<MailMessage> {
  const res = await timedFetch(`${API_BASE}/mail/read?id=${encodeURIComponent(id)}`);
  return res.json();
}

// Get ready work items
export async function getReady(): Promise<ReadyResponse> {
  try {
    const res = await timedFetch(`${API_BASE}/ready`);
    return await res.json();
  } catch {
    return { items: [], by_source: {}, summary: { total: 0, p1_count: 0, p2_count: 0, p3_count: 0 } };
  }
}

// Get autocomplete options (rigs, polecats, etc)
export async function getOptions(): Promise<OptionsResponse> {
  const res = await timedFetch(`${API_BASE}/options`);
  return res.json();
}

// Get crew status
export async function getCrew(): Promise<{ crew: CrewMember[]; by_rig: Record<string, CrewMember[]>; total: number }> {
  const res = await timedFetch(`${API_BASE}/crew`);
  return res.json();
}

// Execute a whitelisted gt command
export async function runCommand(command: string, confirmed = false): Promise<CommandResponse> {
  const res = await timedFetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, confirmed }),
  }, 20000);
  return res.json();
}

// Bead (issue) from rig beads query
export interface RigBead {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: number;
  owner?: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch open beads for a specific rig
export async function getRigBeads(rig: string): Promise<RigBead[]> {
  try {
    const res = await timedFetch(`${API_BASE}/beads/${encodeURIComponent(rig)}`);
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

// Send mail via JSON endpoint (not shell command)
export async function sendMail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await timedFetch(`${API_BASE}/mail/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Connect to SSE event stream
export function connectSSE(onUpdate: () => void, onError?: (err: Event) => void): EventSource {
  const es = new EventSource(`${API_BASE}/events`);

  es.addEventListener('dashboard-update', () => {
    onUpdate();
  });

  es.addEventListener('connected', () => {
    console.log('[sse] Connected to Gas Town dashboard');
  });

  es.onerror = (err) => {
    console.warn('[sse] Connection error, will auto-reconnect');
    onError?.(err);
  };

  return es;
}
