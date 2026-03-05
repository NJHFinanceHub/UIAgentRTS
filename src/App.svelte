<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getStatus, getMailInbox, getReady, connectSSE } from './lib/gt-client';
  import { townStatus, selectedRig, selectedUnit, mailInbox, readyItems, connected, addNotification } from './lib/stores';

  import ResourceBar from './components/ResourceBar.svelte';
  import TerrainMap from './components/TerrainMap.svelte';
  import QuestPanel from './components/QuestPanel.svelte';
  import MissionPanel from './components/MissionPanel.svelte';
  import CommandGrid from './components/CommandGrid.svelte';
  import Minimap from './components/Minimap.svelte';
  import AgentPortrait from './components/AgentPortrait.svelte';
  import ChatPanel from './components/ChatPanel.svelte';
  import Notification from './components/Notification.svelte';

  import { totalPolecats } from './lib/stores';

  let eventSource: EventSource | null = null;
  let refreshTimer: ReturnType<typeof setInterval>;
  let lastRefreshAgo = '—';
  let lastRefreshTime = 0;
  let refreshFlash = '';

  // Update "Xs ago" display
  function updateRefreshAgo() {
    if (!lastRefreshTime) { lastRefreshAgo = '—'; return; }
    const secs = Math.floor((Date.now() - lastRefreshTime) / 1000);
    lastRefreshAgo = secs < 2 ? 'just now' : `${secs}s ago`;
  }

  let refreshing = false;

  async function refresh() {
    if (refreshing) return; // prevent stacking
    refreshing = true;
    try {
      // Run all fetches in parallel — don't let one block the others
      const [statusResult, mailResult, readyResult] = await Promise.allSettled([
        getStatus(),
        getMailInbox(),
        getReady(),
      ]);

      if (statusResult.status === 'fulfilled') {
        townStatus.set(statusResult.value);
        connected.set(true);
        lastRefreshTime = Date.now();
        refreshFlash = 'success';
        setTimeout(() => { refreshFlash = ''; }, 600);
      } else {
        console.error('[refresh] Status failed:', statusResult.reason);
        connected.set(false);
        refreshFlash = 'error';
        setTimeout(() => { refreshFlash = ''; }, 600);
      }

      if (mailResult.status === 'fulfilled') {
        mailInbox.set(mailResult.value);
      }

      if (readyResult.status === 'fulfilled') {
        readyItems.set(readyResult.value.items ?? []);
      }
    } finally {
      refreshing = false;
    }
  }

  function handleRefresh() {
    refresh();
  }

  // Global Escape key handler
  function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'Escape') {
      if ($selectedUnit) { selectedUnit.set(null); return; }
      if ($selectedRig) { selectedRig.set(null); return; }
    }
  }

  let agoTimer: ReturnType<typeof setInterval>;

  onMount(() => {
    refresh();
    eventSource = connectSSE(
      () => refresh(),
      () => connected.set(false)
    );
    refreshTimer = setInterval(refresh, 30000);
    agoTimer = setInterval(updateRefreshAgo, 1000);
    window.addEventListener('gt-refresh', handleRefresh);
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    eventSource?.close();
    clearInterval(refreshTimer);
    clearInterval(agoTimer);
    window.removeEventListener('gt-refresh', handleRefresh);
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="game-container">
  <ResourceBar />

  <div class="main-game-area">
    <QuestPanel />
    <TerrainMap />
    <MissionPanel />
  </div>

  <div class="command-panel">
    <Minimap />
    <AgentPortrait />
    <ChatPanel />
    <CommandGrid />
  </div>

  <div class="status-bar" class:flash-success={refreshFlash === 'success'} class:flash-error={refreshFlash === 'error'}>
    <span>Last refresh: {lastRefreshAgo}</span>
    <span>Polecats: {$totalPolecats}</span>
    <span>Beads: {$readyItems.length}</span>
  </div>

  <Notification />
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&display=swap');

  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: 'Cinzel', serif;
    background: #0a1a0a;
    overflow: hidden;
    color: #f4e4c1;
  }

  .game-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #0d1a0d;
  }

  .main-game-area {
    flex: 1;
    display: flex;
    gap: 0;
    overflow: hidden;
    min-height: 0;
  }

  .command-panel {
    height: 180px;
    background: linear-gradient(180deg, #2d2416 0%, #1a1409 100%);
    border-top: 3px solid #6b5644;
    display: flex;
    gap: 0;
    flex-shrink: 0;
    position: relative;
  }

  .command-panel::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #d4af37, transparent);
  }

  .status-bar {
    height: 20px;
    background: #1a1409;
    border-top: 1px solid #6b5644;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 24px;
    font-size: 9px;
    color: #6b5644;
    letter-spacing: 1px;
    flex-shrink: 0;
    transition: background 0.3s;
  }

  .status-bar.flash-success {
    background: rgba(74,222,128,0.1);
  }

  .status-bar.flash-error {
    background: rgba(255,68,68,0.1);
  }
</style>
