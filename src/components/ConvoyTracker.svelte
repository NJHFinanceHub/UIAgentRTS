<script lang="ts">
  import { convoys } from '../lib/stores';
  import type { Convoy } from '../lib/gt-client';

  let expandedId: string | null = null;

  function toggle(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function completionPct(c: Convoy): number {
    const total = c.total_issues ?? 0;
    const closed = c.closed_issues ?? 0;
    if (total === 0) return 0;
    return Math.round((closed / total) * 100);
  }

  function statusColor(c: Convoy): string {
    const pct = completionPct(c);
    if (pct >= 100) return '#4ade80';
    if (pct >= 50) return '#fbbf24';
    return '#f97316';
  }

  $: activeConvoys = $convoys.filter(c => c.status !== 'closed');
</script>

{#if activeConvoys.length > 0}
  <div class="convoy-section">
    <div class="convoy-header">
      <span class="convoy-label">CONVOYS</span>
      <span class="convoy-count">{activeConvoys.length}</span>
    </div>

    {#each activeConvoys as convoy (convoy.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="convoy-card" on:click={() => toggle(convoy.id)}>
        <div class="convoy-row">
          <div class="convoy-indicator" style="background: {statusColor(convoy)}; box-shadow: 0 0 6px {statusColor(convoy)}"></div>
          <div class="convoy-info">
            <div class="convoy-title">{convoy.title || convoy.id}</div>
            <div class="convoy-progress-row">
              <div class="convoy-bar">
                <div class="convoy-bar-fill" style="width: {completionPct(convoy)}%; background: {statusColor(convoy)}"></div>
              </div>
              <span class="convoy-pct">{completionPct(convoy)}%</span>
            </div>
            <div class="convoy-meta">
              <span class="meta-chip">{convoy.closed_issues ?? 0}/{convoy.total_issues ?? 0} beads</span>
              {#if convoy.owner}
                <span class="meta-chip owner">{convoy.owner}</span>
              {/if}
            </div>
          </div>
        </div>

        {#if expandedId === convoy.id && convoy.tracked_issues && convoy.tracked_issues.length > 0}
          <div class="convoy-details">
            {#each convoy.tracked_issues as issue}
              <div class="issue-row">
                <span class="issue-dot" class:closed={issue.status === 'closed'}></span>
                <span class="issue-id">{issue.id}</span>
                <span class="issue-title">{issue.title}</span>
                {#if issue.assignee}
                  <span class="issue-assignee">{issue.assignee}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .convoy-section {
    border-top: 1px solid rgba(107, 86, 68, 0.4);
    margin-top: 4px;
    padding-top: 4px;
  }

  .convoy-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px 4px;
  }

  .convoy-label {
    font-size: 9px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 3px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .convoy-count {
    font-size: 10px;
    font-weight: 700;
    color: #fbbf24;
    text-shadow: 0 0 6px rgba(251,191,36,0.3);
  }

  .convoy-card {
    padding: 8px 12px;
    background: rgba(13, 10, 5, 0.4);
    border-radius: 4px;
    margin: 0 8px 4px;
    border: 1px solid rgba(107, 86, 68, 0.3);
    cursor: pointer;
    transition: all 0.2s;
  }

  .convoy-card:hover {
    background: rgba(45, 36, 22, 0.6);
    border-color: #6b5644;
  }

  .convoy-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .convoy-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 3px;
  }

  .convoy-info {
    flex: 1;
    min-width: 0;
  }

  .convoy-title {
    font-size: 11px;
    font-weight: 700;
    color: #f4e4c1;
    margin-bottom: 4px;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .convoy-progress-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .convoy-bar {
    flex: 1;
    height: 4px;
    background: rgba(107, 86, 68, 0.4);
    border-radius: 2px;
    overflow: hidden;
  }

  .convoy-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
    box-shadow: 0 0 6px rgba(74, 222, 128, 0.3);
  }

  .convoy-pct {
    font-size: 9px;
    font-weight: 700;
    color: #b39c7a;
    min-width: 28px;
    text-align: right;
  }

  .convoy-meta {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .meta-chip {
    font-size: 9px;
    font-weight: 600;
    color: #b39c7a;
    background: rgba(107, 86, 68, 0.3);
    padding: 1px 5px;
    border-radius: 3px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .meta-chip.owner {
    color: #4fc3f7;
  }

  .convoy-details {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid rgba(107, 86, 68, 0.2);
  }

  .issue-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    font-size: 9px;
  }

  .issue-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #f97316;
    flex-shrink: 0;
  }

  .issue-dot.closed {
    background: #4ade80;
  }

  .issue-id {
    color: #6b5644;
    font-weight: 600;
    flex-shrink: 0;
  }

  .issue-title {
    color: #b39c7a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .issue-assignee {
    color: #4fc3f7;
    font-weight: 600;
    flex-shrink: 0;
  }
</style>
