<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Rig } from '../lib/gt-client';

  export let rig: Rig;
  export let status: 'active' | 'idle' | 'docked';
  export let x: number;
  export let y: number;
  export let selected: boolean = false;

  const dispatch = createEventDispatcher();

  $: runningCount = rig.agents.filter(a => a.running).length;
  $: totalCount = rig.agents.length;
  $: hasWork = rig.agents.some(a => a.has_work);
  $: hasMail = rig.agents.some(a => a.unread_mail > 0);

  const buildingIcons: Record<string, string> = {
    traingame: '\u{1F3F0}',
    thenazerene: '\u{26EA}',
    uiagentrts: '\u{1F5FC}',
    beads: '\u{1F48E}',
    gastown: '\u{26FD}',
    brokerbuster: '\u{1F4B0}',
    intent2software: '\u{1F4A1}',
    giftwebsite: '\u{1F381}',
    ofspcalc: '\u{1F9EE}',
    ofspfarmassistant: '\u{1F33E}',
    slipmap: '\u{1F5FA}',
    lancepoint: '\u{1F3AF}',
  };

  $: icon = buildingIcons[rig.name] ?? '\u{1F3E0}';
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="building-card {status}"
  class:selected
  style="left: {x}%; top: {y}%;"
  on:click|stopPropagation={() => dispatch('select')}
>
  <div class="building-icon">{icon}</div>

  <div class="building-label">
    <span class="rig-name">{rig.name}</span>
  </div>

  <div class="status-badge {status}">
    <span class="status-dot"></span>
    <span class="status-text">{status.toUpperCase()}</span>
  </div>

  {#if rig.polecat_count > 0}
    <div class="polecat-badge">{rig.polecat_count}</div>
  {/if}

  {#if hasMail}
    <div class="mail-alert">!</div>
  {/if}

  <div class="stats">
    <span class="stat">{runningCount}/{totalCount}</span>
    {#if rig.crew_count > 0}
      <span class="stat crew">{rig.crew_count}c</span>
    {/if}
  </div>
</div>

<style>
  .building-card {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 140px;
    background: linear-gradient(180deg, #2d2416 0%, #1a1409 100%);
    border: 3px solid #6b5644;
    border-radius: 6px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    text-align: center;
    box-shadow: inset 0 1px 0 rgba(139,115,85,0.3), 0 4px 12px rgba(0,0,0,0.5);
    animation: building-float 3s ease-in-out infinite;
  }

  @keyframes building-float {
    0%, 100% { transform: translate(-50%, -50%) translateY(0); }
    50% { transform: translate(-50%, -50%) translateY(-5px); }
  }

  .building-card:hover {
    border-color: #8b7355;
    box-shadow: inset 0 1px 0 rgba(139,115,85,0.3), 0 6px 24px rgba(0,0,0,0.6);
  }

  .building-card.selected {
    border-color: #d4af37;
    filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.5));
    animation: none;
  }

  .building-card.active {
    border-color: #4ade80;
    box-shadow: inset 0 1px 0 rgba(139,115,85,0.3), 0 0 20px rgba(74, 222, 128, 0.15);
  }

  .building-card.docked {
    opacity: 0.5;
    animation: none;
  }

  .building-card.docked:hover {
    opacity: 0.7;
  }

  .building-icon {
    font-size: 40px;
    line-height: 1;
    margin-bottom: 4px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }

  .building-label {
    background: linear-gradient(180deg, #3d2e1a 0%, #2d2416 100%);
    border-radius: 3px;
    padding: 2px 6px;
    margin-bottom: 4px;
  }

  .rig-name {
    font-size: 11px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 1px;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  .status-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-bottom: 2px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-badge.active .status-dot {
    background: #4ade80;
    box-shadow: 0 0 8px #4ade80;
  }

  .status-badge.idle .status-dot {
    background: #ffa500;
    box-shadow: 0 0 8px #ffa500;
  }

  .status-badge.docked .status-dot {
    background: #6b5644;
  }

  .status-text {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #b39c7a;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .polecat-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #0891b2;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 2px solid #1a1409;
    box-shadow: 0 0 6px rgba(8, 145, 178, 0.5);
  }

  .mail-alert {
    position: absolute;
    top: -6px;
    left: -6px;
    background: #ff4444;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #1a1409;
    animation: pulse 2s infinite;
  }

  .stats {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-top: 2px;
  }

  .stat {
    font-size: 9px;
    color: #b39c7a;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .stat.crew { color: #ce93d8; }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.1); }
  }
</style>
