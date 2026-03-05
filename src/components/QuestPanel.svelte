<script lang="ts">
  import { readyItems } from '../lib/stores';

  function priorityColor(p: number): string {
    if (p <= 1) return '#ff4444';
    if (p === 2) return '#ffa500';
    if (p === 3) return '#4ade80';
    return '#6b5644';
  }
</script>

<div class="panel">
  <div class="panel-header">
    <span class="panel-title">&#128220; QUESTS</span>
    <span class="count">{$readyItems.length}</span>
  </div>

  {#if $readyItems.length > 3}
    <div class="quest-alert">
      <span class="alert-icon">&#9888;</span>
      <span>{$readyItems.length} quests awaiting</span>
    </div>
  {/if}

  <div class="panel-body">
    {#if $readyItems.length === 0}
      <div class="empty">No quests available</div>
    {:else}
      {#each $readyItems as item}
        <div class="quest-item">
          <div class="priority-circle" style="background: {priorityColor(item.priority)}; box-shadow: 0 0 6px {priorityColor(item.priority)}"></div>
          <div class="quest-info">
            <div class="quest-title">{item.title}</div>
            <div class="quest-meta">
              <span class="quest-source">{item.source}</span>
              <span class="quest-id">{item.id}</span>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .panel {
    width: 280px;
    background: linear-gradient(180deg, #2d2416 0%, #1a1409 100%);
    border-right: 3px solid #6b5644;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: relative;
  }

  .panel::after {
    content: '';
    position: absolute;
    top: 0;
    right: -1px;
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
    color: #d4af37;
    background: rgba(212,175,55,0.15);
    padding: 2px 10px;
    border-radius: 10px;
    border: 1px solid rgba(212,175,55,0.3);
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
  }

  .quest-alert {
    background: linear-gradient(90deg, #8b2020, #6b1515);
    border-bottom: 1px solid #d4af37;
    padding: 6px 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #ffd700;
    letter-spacing: 1px;
    animation: alert-glow 2s ease-in-out infinite;
  }

  .alert-icon {
    font-size: 12px;
  }

  @keyframes alert-glow {
    0%, 100% { box-shadow: inset 0 0 10px rgba(139, 32, 32, 0.5); }
    50% { box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.2); }
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .panel-body::-webkit-scrollbar { width: 4px; }
  .panel-body::-webkit-scrollbar-track { background: transparent; }
  .panel-body::-webkit-scrollbar-thumb { background: #6b5644; border-radius: 2px; }

  .empty {
    color: #6b5644;
    text-align: center;
    padding: 32px 16px;
    font-size: 12px;
    font-style: italic;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .quest-item {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    align-items: flex-start;
    background: rgba(13, 10, 5, 0.4);
    border-left: 3px solid transparent;
    margin-bottom: 4px;
  }

  .quest-item:hover {
    background: rgba(45, 36, 22, 0.6);
    border-left-color: #d4af37;
    transform: translateX(4px);
  }

  .priority-circle {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-top: 4px;
    flex-shrink: 0;
  }

  .quest-info {
    min-width: 0;
  }

  .quest-title {
    font-size: 12px;
    color: #f4e4c1;
    line-height: 1.4;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .quest-meta {
    display: flex;
    gap: 8px;
    font-size: 10px;
  }

  .quest-source { color: #b39c7a; }
  .quest-id { color: #6b5644; font-family: monospace; }
</style>
