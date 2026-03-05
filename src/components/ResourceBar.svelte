<script lang="ts">
  import { totalAgents, unreadMail, runningAgents, totalPolecats, connected, townStatus } from '../lib/stores';

  $: rigCount = $townStatus?.rigs?.length ?? 0;
  $: activeRigs = ($townStatus?.rigs ?? []).filter(r => r.agents.some(a => a.running)).length;
</script>

<div class="resource-bar">
  <div class="gold-line"></div>

  <div class="title">
    <span class="title-icon">&#9881;</span>
    <span class="title-text">GAS TOWN</span>
  </div>

  <div class="resource-group">
    <div class="resource">
      <span class="resource-icon gold">&#9884;</span>
      <span class="resource-value gold">{activeRigs}<span class="resource-dim">/{rigCount}</span></span>
      <span class="resource-label">GOLD</span>
    </div>
    <div class="divider"></div>
    <div class="resource">
      <span class="resource-icon lumber">&#127794;</span>
      <span class="resource-value lumber">{$unreadMail}</span>
      <span class="resource-label">LUMBER</span>
    </div>
    <div class="divider"></div>
    <div class="resource">
      <span class="resource-icon food">&#127830;</span>
      <span class="resource-value food">{$runningAgents}<span class="resource-dim">/{$totalAgents}</span></span>
      <span class="resource-label">FOOD</span>
    </div>
    <div class="divider"></div>
    <div class="resource">
      <span class="resource-icon polecats">&#9876;</span>
      <span class="resource-value polecats">{$totalPolecats}</span>
      <span class="resource-label">PEONS</span>
    </div>
  </div>

  <div class="connection" class:online={$connected} class:offline={!$connected}>
    <span class="dot"></span>
    <span>{$connected ? 'ONLINE' : 'OFFLINE'}</span>
  </div>
</div>

<style>
  .resource-bar {
    height: 50px;
    background: linear-gradient(180deg, #2d2416 0%, #1a1409 100%);
    border-bottom: 3px solid #8b7355;
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 28px;
    flex-shrink: 0;
    position: relative;
  }

  .gold-line {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #d4af37, transparent);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 16px;
  }

  .title-icon {
    font-size: 18px;
    color: #d4af37;
    text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
  }

  .title-text {
    font-size: 15px;
    font-weight: 800;
    color: #d4af37;
    letter-spacing: 4px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .resource-group {
    display: flex;
    align-items: center;
    gap: 20px;
    flex: 1;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: linear-gradient(180deg, transparent, #6b5644, transparent);
  }

  .resource {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .resource-icon {
    font-size: 16px;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.6);
  }

  .resource-icon.gold { color: #ffd700; }
  .resource-icon.lumber { color: #8b4513; }
  .resource-icon.food { color: #ff6b6b; }
  .resource-icon.polecats { color: #4fc3f7; }

  .resource-label {
    font-size: 9px;
    font-weight: 600;
    color: #b39c7a;
    letter-spacing: 2px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }

  .resource-value {
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .resource-value.gold { color: #ffd700; }
  .resource-value.lumber { color: #8b4513; }
  .resource-value.food { color: #ff6b6b; }
  .resource-value.polecats { color: #4fc3f7; }

  .resource-dim {
    color: #6b5644;
    font-weight: 400;
  }

  .connection {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .connection.online { color: #4ade80; }
  .connection.offline { color: #ff4444; }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .online .dot {
    background: #4ade80;
    box-shadow: 0 0 10px #4ade80;
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .offline .dot {
    background: #ff4444;
    box-shadow: 0 0 8px #ff4444;
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 10px #4ade80; }
    50% { box-shadow: 0 0 20px #4ade80, 0 0 30px rgba(74,222,128,0.3); }
  }
</style>
