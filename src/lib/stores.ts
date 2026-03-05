import { writable, derived } from 'svelte/store';
import type { TownStatus, Rig, MailInbox, ReadyItem, MailMessage, RigBead, Convoy } from './gt-client';

// Core state
export const townStatus = writable<TownStatus | null>(null);
export const mailInbox = writable<MailInbox | null>(null);
export const readyItems = writable<ReadyItem[]>([]);
export const selectedRig = writable<Rig | null>(null);
export const rigBeads = writable<RigBead[]>([]);
export const convoys = writable<Convoy[]>([]);
export const connected = writable(false);

// Selected unit inside a rig interior (peon or hero)
export interface SelectedUnit {
  type: 'polecat' | 'crew';
  name: string;
  status: string;
  hook?: string;
  hook_title?: string;
  last_active?: string;
  rig: string;
}
export const selectedUnit = writable<SelectedUnit | null>(null);

// Chat messages
export interface ChatMessage {
  id: number;
  from: 'user' | 'system' | 'mayor';
  text: string;
  timestamp: number;
}
let chatMsgId = 0;
export const chatMessages = writable<ChatMessage[]>([]);
export function addChatMessage(from: ChatMessage['from'], text: string) {
  const id = ++chatMsgId;
  chatMessages.update(msgs => [...msgs, { id, from, text, timestamp: Date.now() }]);
}

// Notification system
export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

let notifId = 0;
export const notifications = writable<Notification[]>([]);

export function addNotification(message: string, type: Notification['type'] = 'info') {
  const id = ++notifId;
  notifications.update(n => [...n, { id, message, type, timestamp: Date.now() }]);
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notifications.update(n => n.filter(x => x.id !== id));
  }, 3000);
}

// Derived stores
export const rigs = derived(townStatus, $s =>
  [...($s?.rigs ?? [])].sort((a, b) => a.name.localeCompare(b.name))
);
export const unreadMail = derived(mailInbox, $m => $m?.unread_count ?? 0);
export const totalAgents = derived(townStatus, $s => {
  if (!$s) return 0;
  let count = $s.agents.length;
  for (const rig of $s.rigs) {
    count += rig.agents.length;
    count += rig.polecat_count;
  }
  return count;
});
export const runningAgents = derived(townStatus, $s => {
  if (!$s) return 0;
  let count = $s.agents.filter(a => a.running).length;
  for (const rig of $s.rigs) {
    count += rig.agents.filter(a => a.running).length;
    count += rig.polecat_count;
  }
  return count;
});
export const totalPolecats = derived(townStatus, $s => {
  if (!$s) return 0;
  return $s.rigs.reduce((sum, r) => sum + r.polecat_count, 0);
});
