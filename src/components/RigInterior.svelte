<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { selectedRig, rigBeads, selectedUnit } from '../lib/stores';
  import type { SelectedUnit } from '../lib/stores';
  import { getRigBeads } from '../lib/gt-client';
  import type { RigBead, Polecat } from '../lib/gt-client';

  $: rig = $selectedRig;
  $: beads = $rigBeads;
  $: activeHooks = rig?.hooks?.filter(h => h.has_work).length ?? 0;
  $: polecatCount = rig?.polecat_count ?? 0;
  $: polecats = rig?.polecats ?? [];
  $: crews = rig?.crews ?? [];
  $: busyPolecats = polecats.filter(p => p.status === 'busy' || p.status === 'running');
  $: idlePolecats = polecats.filter(p => p.status !== 'busy' && p.status !== 'running');

  // ---- Building Layout ----
  // Work pipeline: Gold Mine → Hooks Post → Refinery (the assembly line)
  const MINE     = { x: 82, y: 62 };
  const HOOKS    = { x: 50, y: 42 };
  const REFINERY = { x: 78, y: 20 };
  const BARRACKS = { x: 18, y: 55 };
  const WITNESS  = { x: 15, y: 20 };
  const TOWNHALL = { x: 50, y: 8 };

  const buildings = [
    { id: 'townhall', label: 'TOWN HALL',  icon: '\u{1F3DB}', ...TOWNHALL, glowColor: '#d4af37' },
    { id: 'witness',  label: 'WITNESS',    icon: '\u{1F441}', ...WITNESS,  glowColor: '#4ade80' },
    { id: 'refinery', label: 'REFINERY',   icon: '\u{2697}\u{FE0F}', ...REFINERY, glowColor: '#a78bfa' },
    { id: 'hooks',    label: 'HOOKS POST', icon: '\u{1FA9D}', ...HOOKS,    glowColor: '#ffa500' },
    { id: 'barracks', label: 'BARRACKS',   icon: '\u{1F3DA}', ...BARRACKS, glowColor: '#4fc3f7' },
    { id: 'goldmine', label: 'GOLD MINE',  icon: '\u{26CF}\u{FE0F}', ...MINE, glowColor: '#ffd700' },
  ];

  // SVG paths — the work pipeline is the main road
  const paths = [
    // Pipeline: Mine → Hooks → Refinery
    { x1: MINE.x, y1: MINE.y, x2: HOOKS.x, y2: HOOKS.y, main: true },
    { x1: HOOKS.x, y1: HOOKS.y, x2: REFINERY.x, y2: REFINERY.y, main: true },
    // Secondary roads
    { x1: TOWNHALL.x, y1: TOWNHALL.y, x2: HOOKS.x, y2: HOOKS.y, main: false },
    { x1: TOWNHALL.x, y1: TOWNHALL.y, x2: WITNESS.x, y2: WITNESS.y, main: false },
    { x1: TOWNHALL.x, y1: TOWNHALL.y, x2: REFINERY.x, y2: REFINERY.y, main: false },
    { x1: WITNESS.x, y1: WITNESS.y, x2: BARRACKS.x, y2: BARRACKS.y, main: false },
    { x1: BARRACKS.x, y1: BARRACKS.y, x2: HOOKS.x, y2: HOOKS.y, main: false },
    { x1: BARRACKS.x, y1: BARRACKS.y, x2: MINE.x, y2: MINE.y, main: false },
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

  // ---- Tooltip ----
  let tooltip: { x: number; y: number; lines: string[] } | null = null;

  function showTooltip(b: typeof buildings[0], e: MouseEvent) {
    const lines: string[] = [b.label];
    if (b.id === 'witness') lines.push(rig?.has_witness ? 'Active — monitoring polecats' : 'Offline');
    if (b.id === 'refinery') lines.push(rig?.has_refinery ? 'Active — processing merge queue' : 'Offline');
    if (b.id === 'goldmine') {
      lines.push(`${beads.length} open bead${beads.length !== 1 ? 's' : ''}`);
      beads.slice(0, 5).forEach(bd => {
        const pips = '\u{2B50}'.repeat(Math.max(1, 4 - bd.priority));
        lines.push(`${pips} ${bd.title.slice(0, 35)}`);
      });
    }
    if (b.id === 'barracks') {
      lines.push(`${busyPolecats.length} busy / ${idlePolecats.length} idle`);
      polecats.slice(0, 4).forEach(p => {
        const icon = (p.status === 'busy' || p.status === 'running') ? '\u{1F528}' : '\u{1F4A4}';
        lines.push(`${icon} ${p.name}: ${p.hook?.slice(0, 25) ?? 'idle'}`);
      });
    }
    if (b.id === 'hooks') lines.push(`${activeHooks} active hook${activeHooks !== 1 ? 's' : ''}`);
    if (b.id === 'townhall') lines.push(rig?.name ?? 'HQ');
    tooltip = { x: e.clientX, y: e.clientY, lines };
  }

  function hideTooltip() { tooltip = null; }

  // ---- Unit Selection ----
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

  // ---- Canvas Background ----
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

    const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
    bg.addColorStop(0, '#2d5a2d');
    bg.addColorStop(0.6, '#1a3a1a');
    bg.addColorStop(1, '#152e15');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 40; i++) {
      const fx = seededRandom(i * 11 + 1) * w;
      const fy = seededRandom(i * 11 + 2) * h;
      const fr = seededRandom(i * 11 + 3) * 40 + 15;
      const opacity = seededRandom(i * 11 + 4) * 0.08 + 0.02;
      ctx.fillStyle = `rgba(40, 80, 40, ${opacity})`;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cleared ground under buildings
    const spots = [TOWNHALL, WITNESS, REFINERY, HOOKS, BARRACKS, MINE, { x: 50, y: 80 }];
    for (const spot of spots) {
      const sx = (spot.x / 100) * w;
      const sy = (spot.y / 100) * h;
      const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 55);
      gr.addColorStop(0, 'rgba(90, 70, 40, 0.3)');
      gr.addColorStop(1, 'rgba(90, 70, 40, 0)');
      ctx.fillStyle = gr;
      ctx.fillRect(sx - 65, sy - 65, 130, 130);
    }

    // Warm lighting
    const warm = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.6);
    warm.addColorStop(0, 'rgba(212, 175, 55, 0.06)');
    warm.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, h);
  }

  // ---- Peon Animation System ----
  // Busy polecats follow the work pipeline: Mine → Hooks → Refinery → Mine (loop)
  // Idle polecats wander near Barracks
  interface PeonAnim {
    id: string;
    name: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    speed: number;
    busy: boolean;
    carrying: string | null; // bead title being carried
    paused: boolean;
    pauseUntil: number;
    waypointIdx: number; // index into waypoints array
  }

  // The assembly line waypoints for busy polecats
  const PIPELINE = [
    { x: MINE.x,     y: MINE.y,     pause: 1500 }, // pick up bead
    { x: HOOKS.x,    y: HOOKS.y,    pause: 1000 }, // hook assignment
    { x: REFINERY.x, y: REFINERY.y, pause: 2000 }, // deliver to refinery
  ];

  let peonAnims: PeonAnim[] = [];
  let animFrame: number;

  function initPeons() {
    const anims: PeonAnim[] = [];
    const pList: Polecat[] = polecats.length > 0 ? polecats : (polecatCount > 0
      ? Array.from({ length: polecatCount }, (_, i) => ({
          name: `polecat-${i + 1}`, status: 'active', rig: rig?.name ?? '', hook: undefined
        }))
      : []);

    pList.forEach((p, i) => {
      const busy = p.status === 'busy' || p.status === 'running';
      const hookTitle = p.hook?.replace(/^[a-z]+-[a-z0-9]+:\s*/i, '') ?? null;
      // Stagger peons along the pipeline based on index
      const startWaypoint = busy ? (i % PIPELINE.length) : 0;
      const startPos = busy ? PIPELINE[startWaypoint] : { x: BARRACKS.x, y: BARRACKS.y };
      const jitterX = seededRandom(i * 13 + 1) * 6 - 3;
      const jitterY = seededRandom(i * 13 + 2) * 6 - 3;

      const nextWaypoint = busy ? ((startWaypoint + 1) % PIPELINE.length) : 0;
      const target = busy ? PIPELINE[nextWaypoint] : {
        x: BARRACKS.x + seededRandom(i * 13 + 5) * 14 - 7,
        y: BARRACKS.y + seededRandom(i * 13 + 6) * 14 - 7,
      };

      anims.push({
        id: `peon-${i}`,
        name: p.name,
        x: startPos.x + jitterX,
        y: startPos.y + jitterY,
        targetX: target.x + seededRandom(i * 13 + 3) * 4 - 2,
        targetY: target.y + seededRandom(i * 13 + 4) * 4 - 2,
        speed: 0.018 + seededRandom(i * 13 + 7) * 0.012,
        busy,
        carrying: busy ? hookTitle : null,
        paused: false,
        pauseUntil: 0,
        waypointIdx: startWaypoint,
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

        if (p.busy) {
          // Advance to next waypoint on the pipeline
          p.waypointIdx = (p.waypointIdx + 1) % PIPELINE.length;
          const wp = PIPELINE[p.waypointIdx];
          p.targetX = wp.x + (Math.random() - 0.5) * 6;
          p.targetY = wp.y + (Math.random() - 0.5) * 6;
        } else {
          // Idle: wander near barracks
          p.targetX = BARRACKS.x + (Math.random() - 0.5) * 18;
          p.targetY = BARRACKS.y + (Math.random() - 0.5) * 18;
        }
        changed = true;
        continue;
      }

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1.5) {
        p.paused = true;
        if (p.busy) {
          p.pauseUntil = now + PIPELINE[p.waypointIdx].pause + Math.random() * 800;
        } else {
          p.pauseUntil = now + 1500 + Math.random() * 2000;
        }
        changed = true;
      } else {
        const step = p.speed * 16;
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        changed = true;
      }
    }

    if (changed) peonAnims = peonAnims;
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
        <button class="back-btn" on:click={goBack}>&#8592; TOWN MAP</button>
        <span class="rig-icon">{rig.name.toUpperCase()}</span>
        <div class="header-stats">
          <span class="stat"><span class="stat-val">{polecatCount}</span> peons</span>
          <span class="stat"><span class="stat-val">{busyPolecats.length}</span> busy</span>
          <span class="stat"><span class="stat-val">{beads.length}</span> beads</span>
          <span class="stat"><span class="stat-val">{crews.length}</span> heroes</span>
        </div>
      </div>

      <!-- Spatial Map -->
      <div class="spatial-map">
        <!-- SVG Roads -->
        <svg class="path-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          {#each paths as p}
            <line
              x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
              stroke={p.main ? '#B8860B' : '#6B4F1A'}
              stroke-width={p.main ? '0.5' : '0.25'}
              stroke-dasharray={p.main ? '2,1' : '1,1.5'}
              opacity={p.main ? 0.5 : 0.25}
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

        <!-- Bead items stacked at the Gold Mine -->
        {#each beads.slice(0, 6) as bead, i}
          <div
            class="bead-nugget"
            style="left: {MINE.x - 8 + (i % 3) * 5}%; top: {MINE.y + 6 + Math.floor(i / 3) * 4}%;
                   --pip-color: {priorityColor(bead.priority)}"
            title="{bead.title}"
          >
            <span class="nugget-icon">&#128142;</span>
            <span class="nugget-label">{bead.title.slice(0, 12)}</span>
          </div>
        {/each}

        <!-- Peon Sprites (Polecats) -->
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
            <span class="peon-emoji">{peon.busy ? '🔨' : '🚶'}</span>
            <!-- Name label -->
            <span class="peon-name-label">{peon.name}</span>
            <!-- Carrying indicator -->
            {#if peon.carrying}
              <span class="peon-cargo">&#128142; {peon.carrying.slice(0, 18)}</span>
            {/if}
          </div>
        {/each}

        <!-- Hero Units at Rally Point -->
        <div class="rally-point">
          {#if crews.length > 0}
            {#each crews as crew, i}
              {@const isThrall = crew.name.toLowerCase() === 'thrall'}
              {@const heroSelected = currentUnit?.type === 'crew' && currentUnit?.name === crew.name}
              <div
                class="hero-unit"
                class:selected={heroSelected}
                style="left: {35 + i * 14}%"
                on:click|stopPropagation={() => selectCrew(crew)}
              >
                <div class="hero-circle" class:selected={heroSelected}></div>
                <div class="hero-portrait-spatial" class:thrall={isThrall}>
                  {#if isThrall}
                    <img src="/portraits/thrall-dismounted.png" alt="Thrall" class="thrall-img" />
                  {:else}
                    <span class="hero-emoji-spatial">{crew.name.toLowerCase() === 'majortom' ? '🚀' : '🛡️'}</span>
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

        <!-- Refinery Smoke -->
        {#if rig.has_refinery}
          {#each Array(5) as _, i}
            <div class="smoke-particle" style="left: {REFINERY.x - 2 + i * 1.2}%; top: {REFINERY.y - 3}%; animation-delay: {i * 0.5}s"></div>
          {/each}
        {/if}

        <!-- Gold Mine Sparkles -->
        {#if beads.length > 0}
          {#each Array(4) as _, i}
            <div class="sparkle-particle" style="left: {MINE.x - 1 + i * 1.5}%; top: {MINE.y - 4 + i}%; animation-delay: {i * 0.6}s"></div>
          {/each}
        {/if}

        <!-- Production Queue -->
        {#if polecatCount > 0}
          <div class="production-bar" style="left: {BARRACKS.x}%; top: {BARRACKS.y + 8}%">
            <div class="prod-fill" style="width: {polecatCount > 0 ? (busyPolecats.length / polecatCount) * 100 : 0}%"></div>
            <span class="prod-text">{busyPolecats.length}/{polecatCount} working</span>
          </div>
        {/if}

        <!-- Pipeline status label -->
        <div class="pipeline-label">
          PIPELINE: Mine &#8594; Hooks &#8594; Refinery
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    {#if tooltip}
      <div class="tooltip" style="left: {tooltip.x + 14}px; top: {tooltip.y - 10}px">
        {#each tooltip.lines as line, i}
          <div class:tooltip-title={i === 0}>{line}</div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .interior {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 50;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  canvas {
    width: 100%; height: 100%;
    position: absolute;
    top: 0; left: 0;
  }

  .interior-content {
    position: relative;
    z-index: 1;
    width: 100%; height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ---- Header ---- */
  .interior-header {
    padding: 8px 16px;
    background: linear-gradient(180deg, rgba(61,46,26,0.95) 0%, rgba(45,36,22,0.9) 100%);
    border-bottom: 2px solid #6b5644;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
    position: relative;
  }

  .interior-header::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #d4af37, transparent);
  }

  .back-btn {
    background: rgba(107,86,68,0.4);
    border: 1px solid #6b5644;
    color: #d4af37;
    font-family: 'Cinzel', serif;
    font-size: 10px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 3px;
    cursor: pointer;
    letter-spacing: 2px;
    transition: all 0.15s;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .back-btn:hover {
    background: rgba(212,175,55,0.2);
    border-color: #d4af37;
  }

  .rig-icon {
    font-size: 14px;
    font-weight: 800;
    color: #d4af37;
    letter-spacing: 3px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .header-stats {
    display: flex;
    gap: 14px;
    margin-left: auto;
  }

  .stat {
    font-size: 9px;
    color: #6b5644;
    letter-spacing: 1px;
  }

  .stat-val {
    color: #f4e4c1;
    font-weight: 700;
  }

  /* ---- Spatial Map ---- */
  .spatial-map {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .path-overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
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

  .building:hover { filter: brightness(1.3); }

  .building.active .building-icon {
    filter: drop-shadow(0 0 12px var(--glow-color));
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { filter: drop-shadow(0 0 8px var(--glow-color)); }
    50% { filter: drop-shadow(0 0 22px var(--glow-color)); }
  }

  .building-icon {
    font-size: 44px;
    filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7));
  }

  .building-label {
    font-size: 8px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 2px;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.9);
    margin-top: 2px;
    white-space: nowrap;
    font-family: 'Cinzel', serif;
  }

  .building-badge {
    position: absolute;
    top: -6px; right: -10px;
    background: #d4af37;
    color: #1a1409;
    font-size: 10px;
    font-weight: 800;
    min-width: 18px; height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
    font-family: monospace;
  }

  /* ---- Bead Nuggets at Gold Mine ---- */
  .bead-nugget {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 8;
    pointer-events: none;
    text-align: center;
  }

  .nugget-icon {
    font-size: 14px;
    filter: drop-shadow(0 0 4px var(--pip-color));
  }

  .nugget-label {
    display: block;
    font-size: 6px;
    color: #b39c7a;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
    font-family: 'Cinzel', serif;
  }

  /* ---- Peon Sprites ---- */
  .peon-sprite {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 15;
    cursor: pointer;
    transition: left 60ms linear, top 60ms linear;
    text-align: center;
  }

  .peon-emoji {
    font-size: 20px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));
    display: block;
  }

  .peon-name-label {
    display: block;
    font-size: 7px;
    font-weight: 700;
    color: #f4e4c1;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.8);
    white-space: nowrap;
    font-family: 'Cinzel', serif;
    letter-spacing: 0.5px;
  }

  .peon-cargo {
    display: block;
    font-size: 7px;
    color: #ffd700;
    text-shadow: 0 0 4px rgba(255,215,0,0.4), 1px 1px 2px rgba(0,0,0,0.9);
    white-space: nowrap;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'Cinzel', serif;
    animation: cargo-glow 1.5s ease-in-out infinite alternate;
  }

  @keyframes cargo-glow {
    0% { opacity: 0.8; }
    100% { opacity: 1; }
  }

  .peon-circle {
    position: absolute;
    width: 30px; height: 30px;
    border-radius: 50%;
    top: 8px; left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    opacity: 0;
  }

  .peon-circle.selected {
    opacity: 1;
    border: 2px solid #4ade80;
    box-shadow: 0 0 12px rgba(74,222,128,0.5);
    animation: sel-pulse 1.2s ease-in-out infinite;
  }

  @keyframes sel-pulse {
    0%, 100% { box-shadow: 0 0 8px rgba(74,222,128,0.4); }
    50% { box-shadow: 0 0 18px rgba(74,222,128,0.7); }
  }

  /* ---- Heroes ---- */
  .rally-point {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 20%;
    z-index: 12;
    padding-top: 1%;
  }

  .hero-unit {
    position: absolute;
    transform: translate(-50%, 0);
    text-align: center;
    cursor: pointer;
    z-index: 15;
    transition: transform 0.15s;
  }

  .hero-unit:hover { transform: translate(-50%, -3px); }

  .hero-circle {
    position: absolute;
    width: 52px; height: 52px;
    border-radius: 50%;
    top: 50%; left: 50%;
    transform: translate(-50%, -60%);
    pointer-events: none;
    opacity: 0;
  }

  .hero-circle.selected {
    opacity: 1;
    border: 2px solid #ffd700;
    box-shadow: 0 0 16px rgba(255,215,0,0.5);
    animation: hero-sel-pulse 1.2s ease-in-out infinite;
  }

  @keyframes hero-sel-pulse {
    0%, 100% { box-shadow: 0 0 10px rgba(255,215,0,0.4); }
    50% { box-shadow: 0 0 24px rgba(255,215,0,0.7); }
  }

  .hero-portrait-spatial {
    width: 42px; height: 42px;
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
    width: 38px; height: 38px;
    object-fit: cover;
    object-position: top center;
  }

  .hero-emoji-spatial { font-size: 20px; }

  .hero-nameplate {
    font-size: 8px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 1px;
    margin-top: 3px;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
    white-space: nowrap;
    font-family: 'Cinzel', serif;
  }

  .hero-task {
    font-size: 7px;
    color: #b39c7a;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .empty-rally {
    position: absolute;
    left: 50%; top: 30%;
    transform: translateX(-50%);
    color: #6b5644;
    font-size: 10px;
    font-style: italic;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  /* ---- Particles ---- */
  .smoke-particle {
    position: absolute;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: rgba(167, 139, 250, 0.5);
    z-index: 8;
    pointer-events: none;
    animation: smoke-rise 3s ease-out infinite;
  }

  @keyframes smoke-rise {
    0%   { opacity: 0.6; transform: translate(0, 0) scale(0.5); }
    50%  { opacity: 0.3; transform: translate(8px, -30px) scale(1.2); }
    100% { opacity: 0;   transform: translate(15px, -60px) scale(2); }
  }

  .sparkle-particle {
    position: absolute;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #ffd700;
    z-index: 8;
    pointer-events: none;
    animation: sparkle-float 2.5s ease-in-out infinite;
  }

  @keyframes sparkle-float {
    0%   { opacity: 0; transform: translate(0, 0) scale(0.3); }
    30%  { opacity: 1; transform: translate(-3px, -10px) scale(1); }
    70%  { opacity: 0.7; transform: translate(5px, -20px) scale(0.8); }
    100% { opacity: 0; transform: translate(2px, -30px) scale(0.3); }
  }

  /* ---- Production Bar ---- */
  .production-bar {
    position: absolute;
    transform: translate(-50%, 0);
    width: 80px; height: 10px;
    background: rgba(13, 10, 5, 0.8);
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
    top: -1px; left: 0; right: 0;
    text-align: center;
    font-size: 7px;
    font-weight: 700;
    color: #f4e4c1;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
    line-height: 10px;
  }

  /* ---- Pipeline Label ---- */
  .pipeline-label {
    position: absolute;
    bottom: 22%; left: 50%;
    transform: translateX(-50%);
    font-size: 8px;
    color: rgba(212,175,55,0.35);
    letter-spacing: 3px;
    font-weight: 700;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
    z-index: 5;
    font-family: 'Cinzel', serif;
    pointer-events: none;
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
    max-width: 280px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.6);
    line-height: 1.5;
  }

  .tooltip-title {
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 1px;
    margin-bottom: 3px;
    font-size: 11px;
  }
</style>
