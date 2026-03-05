<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { selectedRig, rigBeads, selectedUnit } from '../lib/stores';
  import type { SelectedUnit } from '../lib/stores';
  import { getRigBeads } from '../lib/gt-client';
  import type { RigBead } from '../lib/gt-client';

  $: rig = $selectedRig;
  $: beads = $rigBeads;
  $: activeHooks = rig?.hooks?.filter(h => h.has_work).length ?? 0;
  $: polecatCount = rig?.polecat_count ?? 0;
  $: polecats = rig?.polecats ?? [];
  $: crews = rig?.crews ?? [];
  $: busyCount = polecats.filter(p => p.status === 'busy' || p.status === 'running').length;

  const buildingIcons: Record<string, string> = {
    traingame: '\u{1F3F0}', thenazerene: '\u{26EA}', uiagentrts: '\u{1F5FC}',
    beads: '\u{1F48E}', gastown: '\u{26FD}', brokerbuster: '\u{1F4B0}',
    intent2software: '\u{1F4A1}', giftwebsite: '\u{1F381}', ofspcalc: '\u{1F9EE}',
    ofspfarmassistant: '\u{1F33E}', slipmap: '\u{1F5FA}', lancepoint: '\u{1F3AF}',
  };

  // Building positions (percentage-based)
  const buildings = [
    { id: 'townhall', label: 'TOWN HALL', icon: '\u{1F3DB}', x: 50, y: 12, glowColor: '#d4af37' },
    { id: 'witness', label: 'WITNESS', icon: '\u{1F441}', x: 15, y: 22, glowColor: '#4ade80' },
    { id: 'refinery', label: 'REFINERY', icon: '\u{2697}\u{FE0F}', x: 78, y: 25, glowColor: '#a78bfa' },
    { id: 'hooks', label: 'HOOKS POST', icon: '\u{1FA9D}', x: 50, y: 45, glowColor: '#ffa500' },
    { id: 'barracks', label: 'BARRACKS', icon: '\u{1F3DA}', x: 22, y: 58, glowColor: '#4fc3f7' },
    { id: 'goldmine', label: 'GOLD MINE', icon: '\u{26CF}\u{FE0F}', x: 82, y: 68, glowColor: '#ffd700' },
  ];

  // SVG paths connecting buildings
  const paths = [
    { x1: 50, y1: 12, x2: 15, y2: 22 }, // townhall → witness
    { x1: 50, y1: 12, x2: 78, y2: 25 }, // townhall → refinery
    { x1: 50, y1: 12, x2: 50, y2: 45 }, // townhall → hooks
    { x1: 15, y1: 22, x2: 22, y2: 58 }, // witness → barracks
    { x1: 78, y1: 25, x2: 82, y2: 68 }, // refinery → goldmine
    { x1: 50, y1: 45, x2: 22, y2: 58 }, // hooks → barracks
    { x1: 50, y1: 45, x2: 82, y2: 68 }, // hooks → goldmine
    { x1: 22, y1: 58, x2: 82, y2: 68 }, // barracks → goldmine (peon route)
  ];

  function isActive(id: string): boolean {
    if (!rig) return false;
    if (id === 'witness') return rig.has_witness;
    if (id === 'refinery') return rig.has_refinery;
    if (id === 'hooks') return activeHooks > 0;
    if (id === 'barracks') return polecatCount > 0;
    if (id === 'goldmine') return beads.length > 0;
    if (id === 'townhall') return true;
    return false;
  }

  function getBadge(id: string): string | null {
    if (id === 'barracks' && polecatCount > 0) return String(polecatCount);
    if (id === 'goldmine' && beads.length > 0) return String(beads.length);
    if (id === 'hooks' && activeHooks > 0) return String(activeHooks);
    return null;
  }

  // Tooltip
  let tooltip: { x: number; y: number; lines: string[] } | null = null;

  function showTooltip(b: typeof buildings[0], e: MouseEvent) {
    const lines: string[] = [b.label];
    if (b.id === 'witness') lines.push(rig?.has_witness ? 'Active' : 'Offline');
    if (b.id === 'refinery') lines.push(rig?.has_refinery ? 'Processing' : 'Offline');
    if (b.id === 'goldmine') {
      beads.slice(0, 5).forEach(bd => {
        lines.push(`${'*'.repeat(Math.max(1, 4 - bd.priority))} ${bd.title.slice(0, 30)}`);
      });
      if (beads.length === 0) lines.push('No open beads');
    }
    if (b.id === 'barracks') lines.push(`${polecatCount} polecat${polecatCount !== 1 ? 's' : ''} (${busyCount} busy)`);
    if (b.id === 'hooks') lines.push(`${activeHooks} active hook${activeHooks !== 1 ? 's' : ''}`);
    if (b.id === 'townhall') lines.push(rig?.name ?? 'HQ');
    tooltip = { x: e.clientX, y: e.clientY, lines };
  }

  function hideTooltip() { tooltip = null; }

  function goBack() {
    selectedRig.set(null);
    rigBeads.set([]);
    selectedUnit.set(null);
  }

  function selectPolecat(polecat: { name: string; status: string; hook?: string; rig: string }) {
    selectedUnit.update(cur =>
      cur?.name === polecat.name && cur?.type === 'polecat' ? null : {
        type: 'polecat', name: polecat.name, status: polecat.status,
        hook: polecat.hook, rig: polecat.rig,
      }
    );
  }

  function selectCrew(crew: { name: string; state: string; hook?: string; hook_title?: string; last_active: string; rig: string }) {
    selectedUnit.update(cur =>
      cur?.name === crew.name && cur?.type === 'crew' ? null : {
        type: 'crew', name: crew.name, status: crew.state,
        hook: crew.hook, hook_title: crew.hook_title,
        last_active: crew.last_active, rig: crew.rig,
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

  // ---- Canvas ----
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

    // Base green terrain
    const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
    bg.addColorStop(0, '#2d5a2d');
    bg.addColorStop(0.6, '#1a3a1a');
    bg.addColorStop(1, '#152e15');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Grass texture
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

    // Light brown patches under building positions
    const buildingSpots = [
      { x: 0.50, y: 0.12 }, { x: 0.15, y: 0.22 }, { x: 0.78, y: 0.25 },
      { x: 0.50, y: 0.45 }, { x: 0.22, y: 0.58 }, { x: 0.82, y: 0.68 },
      { x: 0.50, y: 0.78 },
    ];
    for (const spot of buildingSpots) {
      const sx = spot.x * w;
      const sy = spot.y * h;
      const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 50);
      gr.addColorStop(0, 'rgba(90, 70, 40, 0.25)');
      gr.addColorStop(1, 'rgba(90, 70, 40, 0)');
      ctx.fillStyle = gr;
      ctx.fillRect(sx - 60, sy - 60, 120, 120);
    }

    // Warm interior lighting
    const warm = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.6);
    warm.addColorStop(0, 'rgba(212, 175, 55, 0.06)');
    warm.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, h);
  }

  // ---- Peon Movement System ----
  interface PeonAnim {
    id: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    speed: number;
    busy: boolean;
    paused: boolean;
    pauseUntil: number;
    phase: number; // 0=toMine, 1=toBarracks for busy; random for idle
    name: string;
  }

  let peonAnims: PeonAnim[] = [];
  let animFrame: number;

  function initPeons() {
    const anims: PeonAnim[] = [];
    const pList = polecats.length > 0 ? polecats : (polecatCount > 0 ? Array.from({ length: polecatCount }, (_, i) => ({
      name: `polecat-${i + 1}`, status: 'active', rig: rig?.name ?? '', hook: undefined
    })) : []);

    pList.forEach((p, i) => {
      const busy = p.status === 'busy' || p.status === 'running';
      // Spread peons between barracks and gold mine
      const startX = busy ? 22 + seededRandom(i * 7 + 1) * 60 : 18 + seededRandom(i * 7 + 2) * 12;
      const startY = busy ? 58 + seededRandom(i * 7 + 3) * 10 : 54 + seededRandom(i * 7 + 4) * 12;
      anims.push({
        id: `peon-${i}`,
        x: startX,
        y: startY,
        targetX: busy ? 82 : 18 + seededRandom(i * 7 + 5) * 12,
        targetY: busy ? 68 : 54 + seededRandom(i * 7 + 6) * 12,
        speed: 0.02 + seededRandom(i * 7 + 7) * 0.015,
        busy,
        paused: false,
        pauseUntil: 0,
        phase: 0,
        name: p.name,
      });
    });
    peonAnims = anims;
  }

  function animatePeons() {
    const now = performance.now();
    let changed = false;

    for (const p of peonAnims) {
      if (p.paused) {
        if (now < p.pauseUntil) continue;
        p.paused = false;
        // Pick next target
        if (p.busy) {
          p.phase = p.phase === 0 ? 1 : 0;
          if (p.phase === 0) {
            p.targetX = 82 + (Math.random() - 0.5) * 6;
            p.targetY = 68 + (Math.random() - 0.5) * 6;
          } else {
            p.targetX = 22 + (Math.random() - 0.5) * 6;
            p.targetY = 58 + (Math.random() - 0.5) * 6;
          }
        } else {
          p.targetX = 18 + Math.random() * 12;
          p.targetY = 54 + Math.random() * 12;
        }
        changed = true;
        continue;
      }

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) {
        // Arrived — pause
        p.paused = true;
        p.pauseUntil = now + 800 + Math.random() * 1200;
        changed = true;
      } else {
        p.x += (dx / dist) * p.speed * 16;
        p.y += (dy / dist) * p.speed * 16;
        changed = true;
      }
    }

    if (changed) peonAnims = peonAnims; // trigger reactivity
    animFrame = requestAnimationFrame(animatePeons);
  }

  // ---- Lifecycle ----
  onMount(() => {
    if (!canvas) return;
    const onResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawInteriorTerrain();
    };
    window.addEventListener('resize', onResize);
    onResize();
    initPeons();
    animFrame = requestAnimationFrame(animatePeons);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrame);
    };
  });

  onDestroy(() => {
    if (animFrame) cancelAnimationFrame(animFrame);
  });

  // Re-init peons when rig data changes
  $: if (rig && polecats) {
    initPeons();
  }
</script>

{#if rig}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="interior" on:click|stopPropagation={() => { tooltip = null; }}>
    <canvas bind:this={canvas}></canvas>

    <div class="interior-content">
      <!-- Header -->
      <div class="interior-header">
        <button class="back-btn" on:click={goBack}>&#8592; Back to Town</button>
        <span class="rig-icon">{buildingIcons[rig.name] ?? '\u{1F3E0}'}</span>
        <span class="rig-name">{rig.name.toUpperCase()}</span>
        <span class="agent-count">{rig.agents.filter(a => a.running).length} agents</span>
      </div>

      <!-- Spatial Map Area -->
      <div class="spatial-map">
        <!-- SVG Dirt Paths -->
        <svg class="path-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          {#each paths as p}
            <line
              x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
              stroke="#8B6914" stroke-width="0.3" stroke-dasharray="1,1"
              opacity="0.35"
            />
          {/each}
        </svg>

        <!-- Buildings -->
        {#each buildings as b}
          {@const active = isActive(b.id)}
          {@const badge = getBadge(b.id)}
          <div
            class="building"
            class:active
            style="left: {b.x}%; top: {b.y}%; --glow-color: {b.glowColor}"
            on:mouseenter={(e) => showTooltip(b, e)}
            on:mouseleave={hideTooltip}
          >
            <div class="building-icon">{b.icon}</div>
            <div class="building-label">{b.label}</div>
            {#if badge}
              <div class="building-badge">{badge}</div>
            {/if}
          </div>
        {/each}

        <!-- Peon Sprites -->
        {#each peonAnims as peon}
          {@const selected = currentUnit?.type === 'polecat' && currentUnit?.name === peon.name}
          <div
            class="peon-sprite"
            class:busy={peon.busy}
            class:selected
            style="left: {peon.x}%; top: {peon.y}%"
            on:click|stopPropagation={() => {
              const p = polecats.find(pl => pl.name === peon.name) ?? {
                name: peon.name, status: peon.busy ? 'busy' : 'idle',
                rig: rig?.name ?? '', hook: undefined
              };
              selectPolecat(p);
            }}
          >
            <div class="peon-circle" class:selected></div>
            <span class="peon-emoji">{peon.busy ? '\u{1F528}' : '\u{1F6B6}'}</span>
          </div>
        {/each}

        <!-- Hero Units at Rally Point (bottom center) -->
        <div class="rally-point">
          {#if crews.length > 0}
            {#each crews as crew, i}
              {@const isThrall = crew.name.toLowerCase() === 'thrall'}
              {@const heroSelected = currentUnit?.type === 'crew' && currentUnit?.name === crew.name}
              <div
                class="hero-unit"
                class:selected={heroSelected}
                style="left: {40 + i * 12}%"
                on:click|stopPropagation={() => selectCrew(crew)}
              >
                <div class="hero-circle" class:selected={heroSelected}></div>
                <div class="hero-portrait-spatial" class:thrall={isThrall}>
                  {#if isThrall}
                    <img src="/portraits/thrall-dismounted.png" alt="Thrall" class="thrall-img" />
                  {:else}
                    <span class="hero-emoji-spatial">{crew.name.toLowerCase() === 'majortom' ? '\u{1F680}' : '\u{1F6E1}\u{FE0F}'}</span>
                  {/if}
                </div>
                <div class="hero-nameplate">{crew.name}</div>
                <div class="hero-task">{crew.hook_title ?? crew.state ?? ''}</div>
              </div>
            {/each}
          {:else}
            <div class="empty-rally">No heroes assigned</div>
          {/if}
        </div>

        <!-- Refinery Smoke Particles -->
        {#if rig.has_refinery}
          {#each Array(5) as _, i}
            <div
              class="smoke-particle"
              style="left: {76 + i * 1.5}%; top: {22}%; animation-delay: {i * 0.6}s"
            ></div>
          {/each}
        {/if}

        <!-- Gold Mine Sparkles -->
        {#if beads.length > 0}
          {#each Array(4) as _, i}
            <div
              class="sparkle-particle"
              style="left: {80 + i * 1.5}%; top: {65 + i * 1.5}%; animation-delay: {i * 0.7}s"
            ></div>
          {/each}
        {/if}

        <!-- Production Queue Bar -->
        {#if polecatCount > 0}
          <div class="production-bar" style="left: 22%; top: 68%">
            <div class="prod-fill" style="width: {polecatCount > 0 ? (busyCount / polecatCount) * 100 : 0}%"></div>
            <span class="prod-text">{busyCount} working</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Tooltip -->
    {#if tooltip}
      <div class="tooltip" style="left: {tooltip.x + 12}px; top: {tooltip.y - 10}px">
        {#each tooltip.lines as line}
          <div>{line}</div>
        {/each}
      </div>
    {/if}
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

  /* ---- Spatial Map ---- */
  .spatial-map {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .path-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  /* ---- Buildings ---- */
  .building {
    position: absolute;
    transform: translate(-50%, -50%);
    text-align: center;
    cursor: pointer;
    z-index: 10;
    transition: filter 0.2s;
  }

  .building:hover {
    filter: brightness(1.3);
  }

  .building.active .building-icon {
    filter: drop-shadow(0 0 12px var(--glow-color));
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { filter: drop-shadow(0 0 8px var(--glow-color)); }
    50% { filter: drop-shadow(0 0 20px var(--glow-color)); }
  }

  .building-icon {
    font-size: 48px;
    filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7));
    transition: filter 0.3s;
  }

  .building-label {
    font-size: 9px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 2px;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.8);
    margin-top: 4px;
    white-space: nowrap;
    font-family: 'Cinzel', serif;
  }

  .building-badge {
    position: absolute;
    top: -4px;
    right: -8px;
    background: #d4af37;
    color: #1a1409;
    font-size: 10px;
    font-weight: 800;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
    font-family: monospace;
  }

  /* ---- Peon Sprites ---- */
  .peon-sprite {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 15;
    cursor: pointer;
    transition: left 50ms linear, top 50ms linear;
  }

  .peon-emoji {
    font-size: 18px;
    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6));
    display: block;
  }

  .peon-circle {
    position: absolute;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    opacity: 0;
  }

  .peon-circle.selected {
    opacity: 1;
    border: 2px solid #4ade80;
    box-shadow: 0 0 10px rgba(74,222,128,0.5);
    animation: sel-pulse 1.2s ease-in-out infinite;
  }

  @keyframes sel-pulse {
    0%, 100% { box-shadow: 0 0 8px rgba(74,222,128,0.4); }
    50% { box-shadow: 0 0 16px rgba(74,222,128,0.7); }
  }

  /* ---- Hero Units ---- */
  .rally-point {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 22%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 12;
    padding-top: 2%;
  }

  .hero-unit {
    position: absolute;
    transform: translate(-50%, 0);
    text-align: center;
    cursor: pointer;
    z-index: 15;
    transition: transform 0.15s;
  }

  .hero-unit:hover {
    transform: translate(-50%, -3px);
  }

  .hero-circle {
    position: absolute;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%);
    pointer-events: none;
    opacity: 0;
  }

  .hero-circle.selected {
    opacity: 1;
    border: 2px solid #ffd700;
    box-shadow: 0 0 14px rgba(255,215,0,0.5);
    animation: hero-sel-pulse 1.2s ease-in-out infinite;
  }

  @keyframes hero-sel-pulse {
    0%, 100% { box-shadow: 0 0 10px rgba(255,215,0,0.4); }
    50% { box-shadow: 0 0 22px rgba(255,215,0,0.7); }
  }

  .hero-portrait-spatial {
    width: 44px;
    height: 44px;
    border-radius: 4px;
    background: rgba(26,20,9,0.8);
    border: 2px solid #d4af37;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    box-shadow: 0 0 8px rgba(212,175,55,0.2);
    overflow: hidden;
  }

  .hero-portrait-spatial.thrall {
    border-color: #ffd700;
    box-shadow: 0 0 12px rgba(255,215,0,0.3);
  }

  .thrall-img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    object-position: top center;
  }

  .hero-emoji-spatial {
    font-size: 22px;
  }

  .hero-nameplate {
    font-size: 9px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 1px;
    margin-top: 4px;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
    white-space: nowrap;
    font-family: 'Cinzel', serif;
  }

  .hero-task {
    font-size: 8px;
    color: #b39c7a;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .empty-rally {
    color: #6b5644;
    font-size: 11px;
    font-style: italic;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  /* ---- Smoke Particles ---- */
  .smoke-particle {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(167, 139, 250, 0.5);
    z-index: 8;
    pointer-events: none;
    animation: smoke-rise 3s ease-out infinite;
  }

  @keyframes smoke-rise {
    0% {
      opacity: 0.6;
      transform: translate(0, 0) scale(0.5);
    }
    50% {
      opacity: 0.3;
      transform: translate(8px, -30px) scale(1.2);
    }
    100% {
      opacity: 0;
      transform: translate(15px, -60px) scale(2);
    }
  }

  /* ---- Sparkle Particles ---- */
  .sparkle-particle {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffd700;
    z-index: 8;
    pointer-events: none;
    animation: sparkle-float 2.5s ease-in-out infinite;
  }

  @keyframes sparkle-float {
    0% {
      opacity: 0;
      transform: translate(0, 0) scale(0.3);
    }
    30% {
      opacity: 1;
      transform: translate(-3px, -10px) scale(1);
    }
    70% {
      opacity: 0.7;
      transform: translate(5px, -20px) scale(0.8);
    }
    100% {
      opacity: 0;
      transform: translate(2px, -30px) scale(0.3);
    }
  }

  /* ---- Production Queue Bar ---- */
  .production-bar {
    position: absolute;
    transform: translate(-50%, 0);
    width: 70px;
    height: 10px;
    background: rgba(13, 10, 5, 0.7);
    border: 1px solid #6b5644;
    border-radius: 3px;
    z-index: 11;
    overflow: hidden;
  }

  .prod-fill {
    height: 100%;
    background: linear-gradient(90deg, #4ade80, #22c55e);
    border-radius: 2px;
    transition: width 0.5s;
  }

  .prod-text {
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 7px;
    font-weight: 700;
    color: #f4e4c1;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
    line-height: 10px;
  }

  /* ---- Tooltip ---- */
  .tooltip {
    position: fixed;
    background: rgba(26, 20, 9, 0.95);
    border: 1px solid #d4af37;
    border-radius: 4px;
    padding: 8px 12px;
    z-index: 100;
    pointer-events: none;
    font-size: 10px;
    color: #f4e4c1;
    font-family: 'Cinzel', serif;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
    max-width: 250px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.6);
    line-height: 1.5;
  }

  .tooltip div:first-child {
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }
</style>
