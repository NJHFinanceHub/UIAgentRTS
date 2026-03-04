<script lang="ts">
  import { onMount } from 'svelte';
  import { selectedRig, rigBeads, selectedUnit } from '../lib/stores';
  import type { SelectedUnit } from '../lib/stores';
  import { getRigBeads } from '../lib/gt-client';
  import type { RigBead } from '../lib/gt-client';

  $: rig = $selectedRig;
  $: beads = $rigBeads;
  $: activeHooks = rig?.hooks?.filter(h => h.has_work).length ?? 0;

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

  function goBack() {
    selectedRig.set(null);
    rigBeads.set([]);
    selectedUnit.set(null);
  }

  function selectPolecat(polecat: { name: string; status: string; hook?: string; rig: string }) {
    selectedUnit.update(cur =>
      cur?.name === polecat.name && cur?.type === 'polecat' ? null : {
        type: 'polecat',
        name: polecat.name,
        status: polecat.status,
        hook: polecat.hook,
        rig: polecat.rig,
      }
    );
  }

  function selectCrew(crew: { name: string; state: string; hook?: string; hook_title?: string; last_active: string; rig: string }) {
    selectedUnit.update(cur =>
      cur?.name === crew.name && cur?.type === 'crew' ? null : {
        type: 'crew',
        name: crew.name,
        status: crew.state,
        hook: crew.hook,
        hook_title: crew.hook_title,
        last_active: crew.last_active,
        rig: crew.rig,
      }
    );
  }

  $: currentUnit = $selectedUnit;

  function relativeTime(iso: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function priorityColor(p: number): string {
    if (p <= 1) return '#ff4444';
    if (p === 2) return '#ffa500';
    if (p === 3) return '#4ade80';
    return '#6b5644';
  }

  // Fetch beads when rig changes
  $: if (rig) {
    getRigBeads(rig.name).then(items => rigBeads.set(items));
  }

  let canvas: HTMLCanvasElement;

  function seededRandom(seed: number): number {
    const x = Math.sin(seed) * 43758.5453123;
    return x - Math.floor(x);
  }

  function drawInteriorTerrain() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Lighter interior terrain
    const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
    bg.addColorStop(0, '#2d5a2d');
    bg.addColorStop(0.6, '#1a3a1a');
    bg.addColorStop(1, '#152e15');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle grass texture (no dark forest patches)
    for (let i = 0; i < 30; i++) {
      const fx = seededRandom(i * 11 + 1) * w;
      const fy = seededRandom(i * 11 + 2) * h;
      const fr = seededRandom(i * 11 + 3) * 40 + 15;
      const opacity = seededRandom(i * 11 + 4) * 0.08 + 0.02;
      ctx.fillStyle = `rgba(40, 80, 40, ${opacity})`;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Warm interior lighting
    const warm = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.6);
    warm.addColorStop(0, 'rgba(212, 175, 55, 0.06)');
    warm.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, h);
  }

  onMount(() => {
    if (!canvas) return;
    const onResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawInteriorTerrain();
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  });
</script>

{#if rig}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="interior" on:click|stopPropagation>
    <canvas bind:this={canvas}></canvas>
    <div class="interior-content">
      <!-- Header -->
      <div class="interior-header">
        <button class="back-btn" on:click={goBack}>&#8592; Back to Town</button>
        <span class="rig-icon">{buildingIcons[rig.name] ?? '\u{1F3E0}'}</span>
        <span class="rig-name">{rig.name.toUpperCase()}</span>
        <span class="agent-count">{rig.agents.filter(a => a.running).length} agents</span>
      </div>

      <div class="interior-body">
        <!-- Infrastructure -->
        <div class="section">
          <div class="section-header">INFRASTRUCTURE</div>
          <div class="infra-grid">
            <div class="infra-card">
              <div class="infra-icon">&#128065;</div>
              <div class="infra-label">WITNESS</div>
              <div class="infra-status">
                <span class="status-dot" class:on={rig.has_witness}></span>
                {rig.has_witness ? 'Running' : 'Off'}
              </div>
            </div>
            <div class="infra-card">
              <div class="infra-icon">&#9879;&#65039;</div>
              <div class="infra-label">REFINERY</div>
              <div class="infra-status">
                <span class="status-dot refinery" class:on={rig.has_refinery}></span>
                {rig.has_refinery ? 'Running' : 'Off'}
              </div>
            </div>
            <div class="infra-card">
              <div class="infra-icon">&#128203;</div>
              <div class="infra-label">HOOKS</div>
              <div class="infra-status">
                <span class="status-dot" class:on={activeHooks > 0}></span>
                {activeHooks} active
              </div>
            </div>
          </div>
        </div>

        <!-- Peons (Polecats) -->
        <div class="section">
          <div class="section-header">PEONS (Polecats)</div>
          {#if rig.polecats && rig.polecats.length > 0}
            <div class="peon-grid">
              {#each rig.polecats as polecat}
                {@const busy = polecat.status === 'busy' || polecat.status === 'running'}
                {@const selected = currentUnit?.type === 'polecat' && currentUnit?.name === polecat.name}
                <div class="peon-card" class:busy class:selected on:click|stopPropagation={() => selectPolecat(polecat)}>
                  <div class="peon-icon">{busy ? '\u{1F528}' : '\u{1F6CC}'}</div>
                  <div class="peon-name">{polecat.name}</div>
                  <div class="peon-status" class:busy>{busy ? 'BUSY' : 'IDLE'}</div>
                  <div class="peon-hook">{polecat.hook ?? '\u2014'}</div>
                </div>
              {/each}
            </div>
          {:else if rig.polecat_count > 0}
            <div class="peon-grid">
              {#each Array(rig.polecat_count) as _, i}
                <div class="peon-card busy">
                  <div class="peon-icon">&#128296;</div>
                  <div class="peon-name">polecat-{i + 1}</div>
                  <div class="peon-status busy">ACTIVE</div>
                  <div class="peon-hook">&mdash;</div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">No peons deployed</div>
          {/if}
        </div>

        <!-- Heroes (Crew) -->
        <div class="section">
          <div class="section-header">HEROES (Crew)</div>
          {#if rig.crews && rig.crews.length > 0}
            <div class="hero-grid">
              {#each rig.crews as crew}
                {@const isThrall = crew.name.toLowerCase() === 'thrall'}
                {@const heroSelected = currentUnit?.type === 'crew' && currentUnit?.name === crew.name}
                <div class="hero-card" class:thrall={isThrall} class:selected={heroSelected} on:click|stopPropagation={() => selectCrew(crew)}>
                  <div class="hero-portrait" class:thrall={isThrall}>
                    {#if isThrall}
                      <img src="/portraits/thrall-dismounted.png" alt="Thrall" class="thrall-portrait" />
                    {:else}
                      <span class="hero-emoji">{crew.name.toLowerCase() === 'majortom' ? '\u{1F680}' : '\u{1F6E1}\u{FE0F}'}</span>
                    {/if}
                  </div>
                  <div class="hero-info">
                    <div class="hero-name" class:thrall={isThrall}>{crew.name}</div>
                    <div class="hero-hook">{crew.hook_title ?? crew.state ?? ''}</div>
                    {#if crew.last_active}
                      <div class="hero-time">{relativeTime(crew.last_active)}</div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">No heroes assigned</div>
          {/if}
        </div>

        <!-- Gold Mine (Open Beads) -->
        <div class="section">
          <div class="section-header">GOLD MINE (Open Beads)</div>
          {#if beads.length > 0}
            <div class="beads-list">
              {#each beads as bead}
                <div class="bead-item">
                  <div class="priority-pip" style="background: {priorityColor(bead.priority)}; box-shadow: 0 0 6px {priorityColor(bead.priority)}"></div>
                  <div class="bead-title">{bead.title}</div>
                  <div class="bead-meta">
                    <span class="bead-priority">P{bead.priority}</span>
                    <span class="bead-type">{bead.type}</span>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">No open beads</div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .interior {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 50;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  canvas {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .interior-content {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .interior-header {
    padding: 12px 20px;
    background: linear-gradient(180deg, rgba(61,46,26,0.95) 0%, rgba(45,36,22,0.9) 100%);
    border-bottom: 2px solid #6b5644;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    position: relative;
  }

  .interior-header::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #d4af37, transparent);
  }

  .back-btn {
    background: rgba(107,86,68,0.4);
    border: 1px solid #6b5644;
    color: #d4af37;
    font-family: 'Cinzel', serif;
    font-size: 11px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: all 0.15s;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .back-btn:hover {
    background: rgba(212,175,55,0.2);
    border-color: #d4af37;
  }

  .rig-icon {
    font-size: 28px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }

  .rig-name {
    font-size: 18px;
    font-weight: 800;
    color: #d4af37;
    letter-spacing: 3px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    flex: 1;
  }

  .agent-count {
    font-size: 11px;
    color: #b39c7a;
    letter-spacing: 1px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .interior-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .interior-body::-webkit-scrollbar { width: 6px; }
  .interior-body::-webkit-scrollbar-track { background: transparent; }
  .interior-body::-webkit-scrollbar-thumb { background: #6b5644; border-radius: 3px; }

  .section { }

  .section-header {
    font-size: 11px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 3px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(107,86,68,0.5);
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  /* Infrastructure */
  .infra-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .infra-card {
    background: linear-gradient(180deg, rgba(45,36,22,0.8) 0%, rgba(26,20,9,0.8) 100%);
    border: 2px solid #6b5644;
    border-radius: 6px;
    padding: 14px 18px;
    min-width: 140px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    position: relative;
  }

  .infra-card::after {
    content: '';
    position: absolute;
    top: 2px; left: 2px; right: 2px; bottom: 2px;
    border: 1px solid rgba(212,175,55,0.15);
    border-radius: 4px;
    pointer-events: none;
  }

  .infra-icon {
    font-size: 24px;
    margin-bottom: 6px;
    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
  }

  .infra-label {
    font-size: 10px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 2px;
    margin-bottom: 8px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .infra-status {
    font-size: 11px;
    color: #b39c7a;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6b5644;
    flex-shrink: 0;
  }

  .status-dot.on {
    background: #4ade80;
    box-shadow: 0 0 8px #4ade80;
  }

  .status-dot.refinery.on {
    background: #a78bfa;
    box-shadow: 0 0 8px #a78bfa;
  }

  /* Peons */
  .peon-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .peon-card {
    background: linear-gradient(180deg, rgba(45,36,22,0.8) 0%, rgba(26,20,9,0.8) 100%);
    border: 2px solid #6b5644;
    border-radius: 6px;
    padding: 12px 16px;
    min-width: 150px;
    max-width: 200px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    transition: all 0.2s;
  }

  .peon-card {
    cursor: pointer;
  }

  .peon-card.selected {
    border-color: #d4af37 !important;
    box-shadow: 0 0 16px rgba(212,175,55,0.4), 0 4px 12px rgba(0,0,0,0.4) !important;
  }

  .peon-card.busy {
    border-color: rgba(74,222,128,0.5);
    box-shadow: 0 0 12px rgba(74,222,128,0.15), 0 4px 12px rgba(0,0,0,0.4);
    animation: wiggle 1.5s ease-in-out infinite;
  }

  @keyframes wiggle {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(3px); }
  }

  .peon-card:not(.busy) {
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .peon-icon {
    font-size: 20px;
    margin-bottom: 6px;
  }

  .peon-name {
    font-size: 12px;
    font-weight: 700;
    color: #f4e4c1;
    margin-bottom: 4px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .peon-status {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #6b5644;
    margin-bottom: 6px;
  }

  .peon-status.busy {
    color: #4ade80;
    text-shadow: 0 0 4px rgba(74,222,128,0.3);
  }

  .peon-hook {
    font-size: 10px;
    color: #b39c7a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  /* Heroes */
  .hero-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .hero-card {
    background: linear-gradient(180deg, rgba(45,36,22,0.8) 0%, rgba(26,20,9,0.8) 100%);
    border: 2px solid #d4af37;
    border-radius: 6px;
    padding: 12px 16px;
    min-width: 180px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    box-shadow: 0 0 8px rgba(212,175,55,0.15), 0 4px 12px rgba(0,0,0,0.4);
  }

  .hero-portrait {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: rgba(13,10,5,0.5);
    border: 1px solid #6b5644;
  }

  .hero-portrait.thrall {
    border-color: #d4af37;
    box-shadow: 0 0 8px rgba(212,175,55,0.3);
    background: rgba(26,20,9,0.8);
  }

  .thrall-portrait {
    width: 44px;
    height: 44px;
    object-fit: cover;
    object-position: top center;
    border-radius: 3px;
  }

  .hero-emoji {
    font-size: 24px;
  }

  .hero-info {
    min-width: 0;
  }

  .hero-card {
    cursor: pointer;
    transition: all 0.15s;
  }

  .hero-card.selected {
    border-color: #ffd700 !important;
    box-shadow: 0 0 20px rgba(255,215,0,0.35), 0 4px 12px rgba(0,0,0,0.4) !important;
    transform: scale(1.02);
  }

  .hero-card.thrall {
    border-color: #d4af37;
    box-shadow: 0 0 12px rgba(212,175,55,0.25), 0 4px 12px rgba(0,0,0,0.4);
    background: linear-gradient(180deg, rgba(61,46,26,0.9) 0%, rgba(26,20,9,0.9) 100%);
  }

  .hero-name {
    font-size: 13px;
    font-weight: 700;
    color: #d4af37;
    margin-bottom: 4px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .hero-name.thrall {
    color: #4ade80;
    text-shadow: 0 0 6px rgba(74,222,128,0.3), 1px 1px 2px rgba(0,0,0,0.8);
    letter-spacing: 1px;
  }

  .hero-hook {
    font-size: 10px;
    color: #f4e4c1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .hero-time {
    font-size: 9px;
    color: #6b5644;
    margin-top: 4px;
  }

  /* Gold Mine (Beads) */
  .beads-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bead-item {
    display: flex;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 4px;
    background: rgba(13, 10, 5, 0.4);
    border-left: 3px solid transparent;
    align-items: center;
    transition: all 0.2s;
    cursor: default;
  }

  .bead-item:hover {
    background: rgba(45, 36, 22, 0.6);
    border-left-color: #d4af37;
    transform: translateX(4px);
  }

  .priority-pip {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .bead-title {
    flex: 1;
    font-size: 12px;
    color: #f4e4c1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .bead-meta {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .bead-priority {
    font-size: 10px;
    font-weight: 700;
    color: #b39c7a;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  }

  .bead-type {
    font-size: 10px;
    color: #6b5644;
    font-style: italic;
  }

  .empty-state {
    color: #6b5644;
    font-size: 12px;
    font-style: italic;
    padding: 16px;
    text-align: center;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }
</style>
