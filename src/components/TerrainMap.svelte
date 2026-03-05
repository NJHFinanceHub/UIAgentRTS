<script lang="ts">
  import { onMount } from 'svelte';
  import { rigs, selectedRig } from '../lib/stores';
  import Building from './Building.svelte';
  import RigInterior from './RigInterior.svelte';
  import type { Rig } from '../lib/gt-client';

  let canvas: HTMLCanvasElement;

  function getPositions(count: number): Array<{x: number, y: number}> {
    const cols = 3;
    const rows = Math.ceil(count / cols);
    const positions: Array<{x: number, y: number}> = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const xOffset = row % 2 === 1 ? 12 : 0;
      positions.push({
        x: 18 + col * 30 + xOffset,
        y: 15 + row * (70 / rows),
      });
    }
    return positions;
  }

  $: positions = getPositions($rigs.length);

  function getRigStatus(rig: Rig): 'active' | 'idle' | 'docked' {
    const running = rig.agents.filter(a => a.running).length;
    if (running === 0) return 'docked';
    if (rig.polecat_count > 0) return 'active';
    return 'idle';
  }

  function selectRig(rig: Rig) {
    selectedRig.update(current => current?.name === rig.name ? null : rig);
  }

  function handleBackgroundClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.building-card')) return;
    selectedRig.set(null);
  }

  // Seeded random for consistent forest
  function seededRandom(seed: number): number {
    const x = Math.sin(seed) * 43758.5453123;
    return x - Math.floor(x);
  }

  onMount(() => {
    if (!canvas) return;
    const onResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawTerrain();
    };
    window.addEventListener('resize', onResize);
    onResize();
    initTerrainPeons();
    peonInterval = setInterval(animateTerrainPeons, 150);
    return () => {
      window.removeEventListener('resize', onResize);
      if (peonInterval) clearInterval(peonInterval);
    };
  });

  function drawTerrain() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Green terrain gradient
    const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
    bg.addColorStop(0, '#2d5a2d');
    bg.addColorStop(0.6, '#1a3a1a');
    bg.addColorStop(1, '#0d260d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Dark forest patches (50 seeded circles)
    for (let i = 0; i < 50; i++) {
      const fx = seededRandom(i * 7 + 1) * w;
      const fy = seededRandom(i * 7 + 2) * h;
      const fr = seededRandom(i * 7 + 3) * 60 + 20;
      const opacity = seededRandom(i * 7 + 4) * 0.15 + 0.05;
      ctx.fillStyle = `rgba(5, 20, 5, ${opacity})`;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Brown dirt paths between building positions
    ctx.strokeStyle = 'rgba(107, 86, 68, 0.25)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const pos = getPositions(12); // use max positions for paths
    for (let i = 0; i < pos.length - 1; i++) {
      const p1 = pos[i];
      const p2 = pos[i + 1];
      const x1 = (p1.x / 100) * w;
      const y1 = (p1.y / 100) * h;
      const x2 = (p2.x / 100) * w;
      const y2 = (p2.y / 100) * h;
      const cx = (x1 + x2) / 2 + (seededRandom(i * 13) - 0.5) * 40;
      const cy = (y1 + y2) / 2 + (seededRandom(i * 17) - 0.5) * 40;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
    }

    // Warm lighting overlay
    const warm = ctx.createRadialGradient(w * 0.4, h * 0.3, 0, w * 0.4, h * 0.3, w * 0.5);
    warm.addColorStop(0, 'rgba(212, 175, 55, 0.04)');
    warm.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, h);
  }

  // ---- Terrain Peon Animation System ----
  // Small animated sprites near buildings on the terrain map.
  // Busy peons swing a hammer (bounce), idle peons wander randomly.

  interface TerrainPeon {
    id: string;
    name: string;
    rigIndex: number;    // which rig/building this peon belongs to
    x: number;           // current position (% of terrain)
    y: number;
    targetX: number;
    targetY: number;
    speed: number;
    busy: boolean;
    paused: boolean;
    pauseUntil: number;
  }

  let terrainPeons: TerrainPeon[] = [];
  let peonInterval: ReturnType<typeof setInterval>;

  function initTerrainPeons() {
    const anims: TerrainPeon[] = [];
    const pos = positions;

    $rigs.forEach((rig, rigIdx) => {
      if (rigIdx >= pos.length) return;
      const bx = pos[rigIdx].x;
      const by = pos[rigIdx].y;
      const count = rig.polecat_count || 0;

      // Use actual polecat data if available, otherwise generate from count
      const pList = rig.polecats && rig.polecats.length > 0
        ? rig.polecats
        : Array.from({ length: count }, (_, i) => ({
            name: `peon-${i + 1}`, status: 'idle', rig: rig.name, hook: undefined
          }));

      pList.forEach((p, i) => {
        const busy = p.status === 'busy' || p.status === 'running';
        const globalIdx = anims.length;
        // Scatter peons around the building position (offset below/around building)
        const jx = seededRandom(globalIdx * 17 + 1) * 8 - 4;
        const jy = seededRandom(globalIdx * 17 + 2) * 6 + 3; // slightly below building
        const tx = bx + seededRandom(globalIdx * 17 + 3) * 8 - 4;
        const ty = by + seededRandom(globalIdx * 17 + 4) * 6 + 3;

        anims.push({
          id: `tp-${rigIdx}-${i}`,
          name: p.name,
          rigIndex: rigIdx,
          x: bx + jx,
          y: by + jy,
          targetX: tx,
          targetY: ty,
          speed: 0.02 + seededRandom(globalIdx * 17 + 5) * 0.015,
          busy,
          paused: false,
          pauseUntil: 0,
        });
      });
    });

    terrainPeons = anims;
  }

  function animateTerrainPeons() {
    if (terrainPeons.length === 0) return;
    const now = performance.now();
    const pos = positions;

    for (const p of terrainPeons) {
      if (p.rigIndex >= pos.length) continue;
      const bx = pos[p.rigIndex].x;
      const by = pos[p.rigIndex].y;

      if (p.paused) {
        if (now < p.pauseUntil) continue;
        p.paused = false;
        // Pick new wander target near building
        p.targetX = bx + (Math.random() - 0.5) * 10;
        p.targetY = by + Math.random() * 6 + 2;
        continue;
      }

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.8) {
        p.paused = true;
        p.pauseUntil = now + (p.busy ? 600 + Math.random() * 800 : 1200 + Math.random() * 2000);
      } else {
        const step = p.speed * 150;
        p.x += (dx / dist) * Math.min(step, dist);
        p.y += (dy / dist) * Math.min(step, dist);
      }
    }

    terrainPeons = terrainPeons;
  }

  // Re-init peons when rig data changes
  let lastPeonKey = '';
  $: {
    const key = $rigs.map(r => `${r.name}:${r.polecat_count}:${(r.polecats || []).map(p => p.status).join('/')}`).join(',');
    if (key !== lastPeonKey) {
      lastPeonKey = key;
      initTerrainPeons();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="terrain" on:click={handleBackgroundClick}>
  <canvas bind:this={canvas}></canvas>
  <div class="building-layer" class:hidden={!!$selectedRig}>
    {#each $rigs as rig, i}
      <Building
        {rig}
        status={getRigStatus(rig)}
        x={positions[i]?.x ?? 50}
        y={positions[i]?.y ?? 50}
        selected={$selectedRig?.name === rig.name}
        on:select={() => selectRig(rig)}
      />
    {/each}
    <!-- Terrain Peon Sprites -->
    {#each terrainPeons as peon (peon.id)}
      <div
        class="terrain-peon"
        class:busy={peon.busy}
        style="left: {peon.x}%; top: {peon.y}%"
      >
        <span class="tp-emoji">{peon.busy ? '⛏️' : '🚶'}</span>
        <span class="tp-name">{peon.name}</span>
      </div>
    {/each}
  </div>
  {#if $rigs.length === 0}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <span>Summoning the Town...</span>
    </div>
  {/if}
  <RigInterior />
</div>

<style>
  .terrain {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #0d260d;
  }

  canvas {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .building-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: opacity 0.3s ease;
  }

  .building-layer.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .loading-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: #b39c7a;
    font-size: 14px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    letter-spacing: 2px;
  }

  .loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #6b5644;
    border-top-color: #d4af37;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ---- Terrain Peon Sprites ---- */
  .terrain-peon {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 5;
    pointer-events: none;
    transition: left 150ms linear, top 150ms linear;
    text-align: center;
  }

  .tp-emoji {
    font-size: 14px;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.8));
    display: block;
  }

  .terrain-peon.busy .tp-emoji {
    animation: tp-bounce 0.8s ease-in-out infinite;
  }

  @keyframes tp-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  .tp-name {
    display: block;
    font-size: 6px;
    font-weight: 700;
    color: #f4e4c1;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.8);
    white-space: nowrap;
    font-family: 'Cinzel', serif;
    letter-spacing: 0.3px;
    opacity: 0.8;
  }
</style>
