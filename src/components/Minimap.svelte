<script lang="ts">
  import { onMount } from 'svelte';
  import { rigs, selectedRig, selectedUnit } from '../lib/stores';
  import type { Rig } from '../lib/gt-client';

  let canvas: HTMLCanvasElement;
  const SIZE = 160;

  function handleMinimapClick(e: MouseEvent) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = SIZE / rect.width;
    const scaleY = SIZE / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const positions = getPositions($rigs.length);
    let closest: Rig | null = null;
    let closestDist = 20; // max click distance in canvas px

    $rigs.forEach((rig, i) => {
      const pos = positions[i];
      if (!pos) return;
      const cx = (pos.x / 100) * SIZE;
      const cy = (pos.y / 100) * SIZE;
      const dist = Math.sqrt((clickX - cx) ** 2 + (clickY - cy) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closest = rig;
      }
    });

    if (closest) {
      selectedUnit.set(null);
      selectedRig.set(closest);
    } else {
      selectedRig.set(null);
      selectedUnit.set(null);
    }
  }

  function getColor(rig: Rig): string {
    const running = rig.agents.filter(a => a.running).length;
    if (rig.polecat_count > 0) return '#4ade80';
    if (running > 0) return '#ffa500';
    return '#3a2a1a';
  }

  function getPositions(count: number): Array<{x: number, y: number}> {
    const cols = 3;
    const positions: Array<{x: number, y: number}> = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const xOffset = row % 2 === 1 ? 12 : 0;
      positions.push({
        x: 18 + col * 30 + xOffset,
        y: 15 + row * (70 / Math.ceil(count / cols)),
      });
    }
    return positions;
  }

  function draw(rigsList: Rig[]) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Green terrain background
    const bg = ctx.createRadialGradient(SIZE/2, SIZE/2, 0, SIZE/2, SIZE/2, SIZE*0.7);
    bg.addColorStop(0, '#1a3a1a');
    bg.addColorStop(1, '#0d260d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Grid lines
    ctx.strokeStyle = 'rgba(107, 86, 68, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= SIZE; i += 30) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(SIZE, i); ctx.stroke();
    }

    const positions = getPositions(rigsList.length);
    const sel = $selectedRig;
    rigsList.forEach((rig, i) => {
      const pos = positions[i];
      if (!pos) return;
      const color = getColor(rig);
      const cx = (pos.x / 100) * SIZE;
      const cy = (pos.y / 100) * SIZE;
      const isSelected = sel?.name === rig.name;

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#d4af37';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, isSelected ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = isSelected ? '#d4af37' : '#b39c7a';
      ctx.font = isSelected ? 'bold 8px serif' : '7px serif';
      ctx.textAlign = 'center';
      ctx.fillText(rig.name.slice(0, 6), cx, cy + 12);
    });

    // Brown border frame
    ctx.strokeStyle = '#6b5644';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, SIZE - 2, SIZE - 2);

    // Gold corner accents
    const corners = [[0,0],[SIZE,0],[0,SIZE],[SIZE,SIZE]];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  $: $selectedRig, draw($rigs);
  onMount(() => draw($rigs));
</script>

<div class="minimap-container">
  <div class="minimap-label">MINIMAP</div>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <canvas bind:this={canvas} width={SIZE} height={SIZE} on:click={handleMinimapClick} style="cursor: pointer"></canvas>
</div>

<style>
  .minimap-container {
    width: 220px;
    background: linear-gradient(180deg, #2d2416 0%, #1a1409 100%);
    border-right: 3px solid #6b5644;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
    position: relative;
  }

  .minimap-container::after {
    content: '';
    position: absolute;
    top: 0;
    right: -1px;
    bottom: 0;
    width: 1px;
    background: linear-gradient(180deg, transparent, #d4af37 50%, transparent);
    pointer-events: none;
  }

  .minimap-label {
    font-size: 10px;
    font-weight: 700;
    color: #d4af37;
    letter-spacing: 3px;
    text-align: center;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  canvas {
    border-radius: 2px;
    width: 100%;
    aspect-ratio: 1;
    border: 2px solid #6b5644;
  }
</style>
