<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getStatus, getMailInbox, getReady, connectSSE } from './lib/gt-client';
  import type { TownStatus } from './lib/gt-client';
  import { townStatus, mailInbox, readyItems, connected, addNotification } from './lib/stores';

  // Enrich rig data with demo polecats and crew for visual testing
  function enrichWithDemoData(status: TownStatus): TownStatus {
    return {
      ...status,
      rigs: status.rigs.map(rig => {
        if (rig.name !== 'uiagentrts') return rig;
        return {
          ...rig,
          polecats: [
            ...(rig.polecats ?? []),
            { name: 'chrome', rig: 'uiagentrts', status: 'busy', hook: 'ui-nfl: Draw peon sprites' },
            { name: 'rust', rig: 'uiagentrts', status: 'busy', hook: 'ui-19k: Parallax scrolling' },
            { name: 'nitro', rig: 'uiagentrts', status: 'idle' },
          ],
          polecat_count: (rig.polecat_count || 0) + 3,
          crews: [
            ...(rig.crews ?? []),
            {
              name: 'Thrall',
              rig: 'uiagentrts',
              state: 'commanding',
              hook: 'ui-pse',
              hook_title: 'Overseeing particle effects',
              session: 'thrall-warchief',
              last_active: new Date(Date.now() - 120000).toISOString(),
            },
          ],
          crew_count: (rig.crew_count || 0) + 1,
        };
      }),
    };
  }
  import ResourceBar from './components/ResourceBar.svelte';
  import TerrainMap from './components/TerrainMap.svelte';
  import QuestPanel from './components/QuestPanel.svelte';
  import MissionPanel from './components/MissionPanel.svelte';
  import CommandGrid from './components/CommandGrid.svelte';
  import Minimap from './components/Minimap.svelte';
  import AgentPortrait from './components/AgentPortrait.svelte';
  import ChatPanel from './components/ChatPanel.svelte';
  import InfoPanel from './components/InfoPanel.svelte';
  import Notification from './components/Notification.svelte';

  let eventSource: EventSource | null = null;
  let refreshTimer: ReturnType<typeof setInterval>;

  async function refresh() {
    try {
      const status = enrichWithDemoData(await getStatus());
      townStatus.set(status);
      connected.set(true);
    } catch (err: any) {
      console.error('[refresh] Status failed:', err);
      connected.set(false);
    }
    try {
      const mail = await getMailInbox();
      mailInbox.set(mail);
    } catch {}
    try {
      const ready = await getReady();
      readyItems.set(ready.items ?? []);
    } catch {}
  }

  function handleRefresh() {
    refresh();
  }

  onMount(() => {
    refresh();
    eventSource = connectSSE(
      () => refresh(),
      () => connected.set(false)
    );
    refreshTimer = setInterval(refresh, 15000);
    window.addEventListener('gt-refresh', handleRefresh);
  });

  onDestroy(() => {
    eventSource?.close();
    clearInterval(refreshTimer);
    window.removeEventListener('gt-refresh', handleRefresh);
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

  <InfoPanel />
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
</style>
