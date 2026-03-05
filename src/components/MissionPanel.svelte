<script lang="ts">
  import { townStatus, selectedRig, selectedUnit, convoys } from '../lib/stores';
  import type { Rig } from '../lib/gt-client';
  import ConvoyTracker from './ConvoyTracker.svelte';

  function selectRig(rig: Rig) {
    selectedUnit.set(null);
    selectedRig.set(rig);
  }

  $: allRigs = [...($townStatus?.rigs ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  $: activeRigs = allRigs.filter(r => r.agents.some(a => a.running));
  $: dockedRigs = allRigs.filter(r => !r.agents.some(a => a.running));

  function priorityColor(rig: any): string {
    if (rig.polecat_count > 0) return '#ff4444';
    if (rig.agents.some((a: any) => a.has_work)) return '#ffa500';
    return '#4ade80';
  }
</script>

<div class="panel">
  <div class="panel-header">
    <span class="panel-title">&#9889; ACTIVE MISSIONS</span>
    <span class="count">{activeRigs.length}</span>
  </div>
  <div class="panel-body">
    {#if activeRigs.length > 0}
      {#each activeRigs as rig}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="mission-card" on:click={() => selectRig(rig)}>
          <div class="priority-circle" style="background: {priorityColor(rig)}; box-shadow: 0 0 8px {priorityColor(rig)}"></div>
          <div class="mission-info">
            <div class="mission-name">{rig.name}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {rig.agents.length > 0 ? (rig.agents.filter((a: any) => a.running).length / rig.agents.length) * 100 : 0}%"></div>
            </div>
            <div class="mission-agents">
              <span class="agent-chip">{rig.agents.filter((a: any) => a.running).length} agents</span>
              {#if rig.polecat_count > 0}
                <span class="agent-chip polecat">{rig.polecat_count} peons</span>
              {/if}
              {#if rig.crew_count > 0}
                <span class="agent-chip crew">{rig.crew_count} crew</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}

    <ConvoyTracker />

    {#if dockedRigs.length > 0}
      <div class="section-label">DOCKED</div>
      {#each dockedRigs as rig}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="rig-row docked" on:click={() => selectRig(rig)}>
          <span class="rig-dot"></span>
          <span class="rig-name">{rig.name}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .panel {
    width: 280px;
    background: linear-gradient(180deg, #2d2416 0%, #1a1409 100%);
    border-left: 3px solid #6b5644;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: relative;
  }

  .panel::before {
    content: '';
    position: absolute;
    top: 0;
    left: -1px;
    bottom: 0;
    width: 1px;
    background: linear-gradient(180deg, transparent, #d4af37 50%, transparent);
    pointer-events: none;
  }

  .panel-header {
    padding: 14px 16px;
    border-bottom: 2px solid #6b5644;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    background: linear-gradient(180deg, #3d2e1a 0%, #2d2416 100%);
  }

  .panel-title {
    font-size: 13px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 3px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .count {
    font-size: 13px;
    font-weight: 700;
    color: #4ade80;
    text-shadow: 0 0 6px rgba(74,222,128,0.3);
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .panel-body::-webkit-scrollbar { width: 4px; }
  .panel-body::-webkit-scrollbar-track { background: transparent; }
  .panel-body::-webkit-scrollbar-thumb { background: #6b5644; border-radius: 2px; }

  .mission-card {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(13, 10, 5, 0.4);
    border-radius: 4px;
    margin-bottom: 6px;
    align-items: flex-start;
    border: 1px solid rgba(107, 86, 68, 0.3);
    transition: all 0.2s;
    cursor: pointer;
  }

  .mission-card:hover {
    background: rgba(45, 36, 22, 0.6);
    border-color: #6b5644;
  }

  .priority-circle {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .mission-info {
    flex: 1;
    min-width: 0;
  }

  .mission-name {
    font-size: 13px;
    font-weight: 700;
    color: #d4af37;
    margin-bottom: 6px;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
  }

  .progress-bar {
    height: 4px;
    background: rgba(107, 86, 68, 0.4);
    border-radius: 2px;
    margin-bottom: 6px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #4ade80;
    border-radius: 2px;
    transition: width 0.5s ease;
    box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
  }

  .mission-agents {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .agent-chip {
    font-size: 9px;
    font-weight: 600;
    color: #b39c7a;
    background: rgba(107, 86, 68, 0.3);
    padding: 2px 6px;
    border-radius: 3px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .agent-chip.polecat { color: #4fc3f7; }
  .agent-chip.crew { color: #ce93d8; }

  .section-label {
    font-size: 9px;
    font-weight: 700;
    color: #6b5644;
    letter-spacing: 3px;
    padding: 16px 12px 6px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .rig-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    transition: background 0.15s;
  }

  .rig-row.docked {
    opacity: 0.4;
  }

  .rig-row:hover {
    background: rgba(45, 36, 22, 0.4);
  }

  .rig-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #6b5644;
    flex-shrink: 0;
  }

  .rig-name {
    color: #b39c7a;
    font-weight: 500;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }
</style>
