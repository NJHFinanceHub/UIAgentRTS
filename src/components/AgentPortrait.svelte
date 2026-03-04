<script lang="ts">
  import { townStatus, selectedRig, selectedUnit } from '../lib/stores';
  import type { Agent } from '../lib/gt-client';

  $: unit = $selectedUnit;
  $: displayAgents = $selectedRig
    ? $selectedRig.agents
    : ($townStatus?.agents ?? []);

  $: label = unit
    ? `${unit.type === 'polecat' ? '\u{1F528}' : '\u{1F451}'} ${unit.name.toUpperCase()}`
    : ($selectedRig ? $selectedRig.name.toUpperCase() : 'HQ AGENTS');

  function statusClass(agent: Agent): string {
    if (!agent.running) return 'off';
    if (agent.has_work) return 'busy';
    return 'idle';
  }

  function statusText(agent: Agent): string {
    if (!agent.running) return 'OFF';
    if (agent.has_work) return 'BUSY';
    return 'IDLE';
  }

  const roleColors: Record<string, string> = {
    coordinator: '#d4af37',
    witness: '#4fc3f7',
    refinery: '#ce93d8',
    'health-check': '#4ade80',
    crew: '#ff8a65',
  };

  const roleIcons: Record<string, string> = {
    coordinator: '\u{1F451}',
    witness: '\u{1F441}',
    refinery: '\u{2697}',
    'health-check': '\u{1F49A}',
    crew: '\u{1F6E1}',
  };
</script>

<div class="portrait-area">
  <div class="portrait-label">{label}</div>
  {#if unit}
    <div class="unit-detail">
      <div class="unit-portrait">
        {#if unit.type === 'crew' && unit.name.toLowerCase() === 'thrall'}
          <img src="/portraits/thrall-dismounted.png" alt="Thrall" class="unit-img" />
        {:else}
          <span class="unit-emoji">{unit.type === 'polecat' ? '\u{1F528}' : '\u{1F451}'}</span>
        {/if}
      </div>
      <div class="unit-info">
        <div class="unit-name">{unit.name}</div>
        <div class="unit-type">{unit.type === 'polecat' ? 'PEON' : 'HERO'} — {unit.status.toUpperCase()}</div>
        {#if unit.hook_title || unit.hook}
          <div class="unit-task">{unit.hook_title ?? unit.hook}</div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="portrait-grid">
      {#each displayAgents as agent}
        <div class="agent-card">
          <div class="agent-role-bar" style="background: {roleColors[agent.role] ?? '#6b5644'}"></div>
          <div class="agent-icon">{roleIcons[agent.role] ?? '\u{1F464}'}</div>
          <div class="agent-name">{agent.name}</div>
          <div class="agent-role">{agent.role}</div>
          <div class="agent-status {statusClass(agent)}">
            {statusText(agent)}
          </div>
          {#if agent.unread_mail > 0}
            <div class="agent-mail">{agent.unread_mail}</div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .portrait-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    min-width: 0;
    overflow: hidden;
  }

  .portrait-label {
    font-size: 10px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 3px;
    margin-bottom: 8px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .portrait-grid {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    flex: 1;
    align-items: flex-start;
  }

  .portrait-grid::-webkit-scrollbar { height: 3px; }
  .portrait-grid::-webkit-scrollbar-track { background: transparent; }
  .portrait-grid::-webkit-scrollbar-thumb { background: #6b5644; border-radius: 2px; }

  .agent-card {
    background: linear-gradient(180deg, #2d2416 0%, #1a1409 100%);
    border: 3px solid #6b5644;
    border-radius: 4px;
    padding: 8px 10px;
    min-width: 95px;
    position: relative;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
    text-align: center;
    box-shadow: inset 0 1px 0 rgba(139,115,85,0.3);
  }

  .agent-card:hover {
    border-color: #d4af37;
    box-shadow: inset 0 1px 0 rgba(212,175,55,0.3), 0 0 12px rgba(212,175,55,0.2);
  }

  .agent-role-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 2px 2px 0 0;
  }

  .agent-icon {
    font-size: 22px;
    margin-bottom: 2px;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
  }

  .agent-name {
    font-size: 11px;
    font-weight: 700;
    color: #f4e4c1;
    margin-bottom: 2px;
    white-space: nowrap;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
  }

  .agent-role {
    font-size: 8px;
    color: #b39c7a;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .agent-status {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 2px 6px;
    border-radius: 3px;
    display: inline-block;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .agent-status.busy {
    background: rgba(74,222,128,0.2);
    color: #4ade80;
    border: 1px solid rgba(74,222,128,0.3);
  }

  .agent-status.idle {
    background: rgba(255,165,0,0.2);
    color: #ffa500;
    border: 1px solid rgba(255,165,0,0.3);
  }

  .agent-status.off {
    background: rgba(107,86,68,0.2);
    color: #6b5644;
    border: 1px solid rgba(107,86,68,0.3);
  }

  .unit-detail {
    display: flex;
    gap: 12px;
    align-items: center;
    flex: 1;
    padding: 4px 0;
  }

  .unit-portrait {
    width: 64px;
    height: 64px;
    border: 2px solid #d4af37;
    border-radius: 4px;
    background: rgba(13,10,5,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 0 12px rgba(212,175,55,0.2);
    overflow: hidden;
  }

  .unit-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }

  .unit-emoji {
    font-size: 28px;
  }

  .unit-info {
    min-width: 0;
  }

  .unit-name {
    font-size: 14px;
    font-weight: 800;
    color: #d4af37;
    letter-spacing: 1px;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
  }

  .unit-type {
    font-size: 9px;
    color: #b39c7a;
    letter-spacing: 2px;
    margin-top: 2px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .unit-task {
    font-size: 10px;
    color: #4ade80;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .agent-mail {
    position: absolute;
    top: 6px;
    right: 6px;
    background: #ff4444;
    color: #fff;
    font-size: 8px;
    font-weight: 700;
    min-width: 14px;
    height: 14px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    border: 1px solid #1a1409;
    box-shadow: 0 0 4px rgba(255, 68, 68, 0.5);
  }
</style>
