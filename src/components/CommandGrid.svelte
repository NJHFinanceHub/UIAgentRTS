<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { selectedRig, selectedUnit, addNotification } from '../lib/stores';
  import { runCommand } from '../lib/gt-client';

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    // Don't capture when typing in input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === 'Escape') {
      if ($selectedUnit) { selectedUnit.set(null); return; }
      if ($selectedRig) { selectedRig.set(null); return; }
    }

    const key = e.key.toUpperCase();
    const cmd = commands.find(c => c.hotkey === key);
    if (cmd) {
      e.preventDefault();
      handleClick(cmd);
    }
  }

  onMount(() => window.addEventListener('keydown', handleKeydown));
  onDestroy(() => window.removeEventListener('keydown', handleKeydown));

  interface Cmd {
    id: string;
    label: string;
    icon: string;
    hotkey: string;
    needsRig: boolean;
    color: string;
    action: () => void;
  }

  $: unit = $selectedUnit;

  // Unit-specific commands
  $: unitCommands = unit ? getUnitCommands(unit) : [];

  function getUnitCommands(u: typeof unit): Cmd[] {
    if (!u) return [];
    if (u.type === 'polecat') {
      return [
        {
          id: 'nudge-unit', label: 'Nudge', icon: '\u{1F4E2}', hotkey: 'N', needsRig: false, color: '#4fc3f7',
          action: async () => {
            const res = await runCommand(`nudge ${u.rig}/${u.name} "Check in"`, true);
            addNotification(res.success ? `Nudged ${u.name}` : (res.error ?? 'Failed'), res.success ? 'success' : 'error');
          }
        },
        {
          id: 'nuke-unit', label: 'Nuke', icon: '\u{1F4A5}', hotkey: 'K', needsRig: false, color: '#ff4444',
          action: async () => {
            const res = await runCommand(`polecat nuke ${u.rig}/${u.name} --force`, true);
            addNotification(res.success ? `Nuked ${u.name}` : (res.error ?? 'Failed'), res.success ? 'success' : 'error');
            if (res.success) selectedUnit.set(null);
          }
        },
        {
          id: 'status-unit', label: 'Status', icon: '\u{1F4CB}', hotkey: 'S', needsRig: false, color: '#4ade80',
          action: async () => {
            const res = await runCommand(`polecat status ${u.rig}/${u.name}`, false);
            addNotification(res.success ? (res.output?.slice(0, 80) ?? 'OK') : (res.error ?? 'Failed'), res.success ? 'info' : 'error');
          }
        },
        {
          id: 'deselect', label: 'Deselect', icon: '\u{274C}', hotkey: 'Esc', needsRig: false, color: '#6b5644',
          action: () => selectedUnit.set(null)
        },
      ];
    } else {
      // Crew commands
      return [
        {
          id: 'nudge-hero', label: 'Nudge', icon: '\u{1F4E2}', hotkey: 'N', needsRig: false, color: '#4fc3f7',
          action: async () => {
            const res = await runCommand(`nudge ${u.rig}/${u.name} "Orders from HQ"`, true);
            addNotification(res.success ? `Nudged ${u.name}` : (res.error ?? 'Failed'), res.success ? 'success' : 'error');
          }
        },
        {
          id: 'mail-hero', label: 'Mail', icon: '\u{1F4E8}', hotkey: 'M', needsRig: false, color: '#d4af37',
          action: async () => {
            addNotification(`Composing mail to ${u.name}...`, 'info');
          }
        },
        {
          id: 'status-hero', label: 'Status', icon: '\u{1F4CB}', hotkey: 'S', needsRig: false, color: '#4ade80',
          action: async () => {
            addNotification(`${u.name}: ${u.status} — ${u.hook_title ?? 'No assignment'}`, 'info');
          }
        },
        {
          id: 'deselect', label: 'Deselect', icon: '\u{274C}', hotkey: 'Esc', needsRig: false, color: '#6b5644',
          action: () => selectedUnit.set(null)
        },
      ];
    }
  }

  const rigCommands: Cmd[] = [
    {
      id: 'deploy', label: 'Deploy', icon: '\u{2694}', hotkey: 'D', needsRig: true, color: '#4ade80',
      action: async () => {
        if (!$selectedRig) return;
        const res = await runCommand(`rig start ${$selectedRig.name}`, true);
        addNotification(res.success ? `${$selectedRig.name} deployed` : (res.error ?? 'Failed'), res.success ? 'success' : 'error');
      }
    },
    {
      id: 'boot', label: 'Boot', icon: '\u{1F525}', hotkey: 'B', needsRig: true, color: '#ffa500',
      action: async () => {
        if (!$selectedRig) return;
        const res = await runCommand(`rig restart ${$selectedRig.name}`, true);
        addNotification(res.success ? `${$selectedRig.name} booted` : (res.error ?? 'Failed'), res.success ? 'success' : 'error');
      }
    },
    {
      id: 'stop', label: 'Stop', icon: '\u{1F6D1}', hotkey: 'S', needsRig: true, color: '#ff4444',
      action: async () => {
        if (!$selectedRig) return;
        const res = await runCommand(`rig stop ${$selectedRig.name}`, true);
        addNotification(res.success ? `${$selectedRig.name} stopped` : (res.error ?? 'Failed'), res.success ? 'success' : 'error');
      }
    },
    {
      id: 'park', label: 'Park', icon: '\u{1F3D5}', hotkey: 'P', needsRig: true, color: '#b39c7a',
      action: async () => {
        if (!$selectedRig) return;
        const res = await runCommand(`rig park ${$selectedRig.name}`, true);
        addNotification(res.success ? `${$selectedRig.name} parked` : (res.error ?? 'Failed'), res.success ? 'success' : 'error');
      }
    },
    {
      id: 'nudge', label: 'Nudge', icon: '\u{1F4E2}', hotkey: 'N', needsRig: true, color: '#4fc3f7',
      action: async () => {
        if (!$selectedRig) return;
        addNotification(`Nudge ${$selectedRig.name}`, 'info');
      }
    },
    {
      id: 'refresh', label: 'Refresh', icon: '\u{1F504}', hotkey: 'R', needsRig: false, color: '#d4af37',
      action: () => {
        addNotification('Refreshing...', 'info');
        window.dispatchEvent(new CustomEvent('gt-refresh'));
      }
    },
  ];

  $: commands = unit ? unitCommands : rigCommands;

  function handleClick(cmd: Cmd) {
    if (cmd.needsRig && !$selectedRig) {
      addNotification('Select a rig first', 'warning');
      return;
    }
    cmd.action();
  }
</script>

<div class="command-area">
  <div class="command-label">{unit ? (unit.type === 'polecat' ? 'PEON ORDERS' : 'HERO ORDERS') : 'COMMANDS'}</div>
  <div class="command-grid">
    {#each commands as cmd}
      <button
        class="cmd-btn"
        class:disabled={cmd.needsRig && !$selectedRig}
        on:click={() => handleClick(cmd)}
        style="--accent: {cmd.color}"
      >
        <div class="cmd-icon">{cmd.icon}</div>
        <span class="cmd-name">{cmd.label}</span>
        <span class="cmd-key">{cmd.hotkey}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .command-area {
    width: 280px;
    background: linear-gradient(180deg, #2d2416 0%, #1a1409 100%);
    border-left: 3px solid #6b5644;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
    position: relative;
  }

  .command-area::before {
    content: '';
    position: absolute;
    top: 0;
    left: -1px;
    bottom: 0;
    width: 1px;
    background: linear-gradient(180deg, transparent, #d4af37 50%, transparent);
    pointer-events: none;
  }

  .command-label {
    font-size: 10px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 3px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    text-align: center;
  }

  .command-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    flex: 1;
  }

  .cmd-btn {
    background: linear-gradient(180deg, #3d2e1a 0%, #2d2416 100%);
    border: 2px solid #6b5644;
    border-radius: 4px;
    padding: 6px 4px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    transition: all 0.15s;
    font-family: 'Cinzel', serif;
    position: relative;
    box-shadow: inset 0 1px 0 rgba(139,115,85,0.3);
  }

  .cmd-btn:hover:not(.disabled) {
    border-color: #d4af37;
    background: linear-gradient(180deg, #4d3e2a 0%, #3d2e1a 100%);
    box-shadow: inset 0 1px 0 rgba(212,175,55,0.3), 0 0 10px rgba(212,175,55,0.2);
  }

  .cmd-btn:active:not(.disabled) {
    transform: scale(0.95);
  }

  .cmd-btn.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .cmd-icon {
    font-size: 18px;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
  }

  .cmd-name {
    font-size: 9px;
    font-weight: 700;
    color: #f4e4c1;
    letter-spacing: 1px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .cmd-key {
    font-size: 8px;
    font-weight: 700;
    color: #6b5644;
    background: rgba(0,0,0,0.4);
    padding: 1px 6px;
    border-radius: 2px;
    border: 1px solid rgba(107,86,68,0.4);
    font-family: monospace;
  }
</style>
