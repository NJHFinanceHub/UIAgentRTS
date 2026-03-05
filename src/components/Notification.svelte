<script lang="ts">
  import { notifications } from '../lib/stores';
</script>

{#if $notifications.length > 0}
  <div class="notif-container">
    {#each $notifications as notif (notif.id)}
      <div class="notif {notif.type}">
        {notif.message}
      </div>
    {/each}
  </div>
{/if}

<style>
  .notif-container {
    position: fixed;
    top: 58px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
  }

  .notif {
    padding: 10px 24px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    animation: slideDown 0.3s ease;
    white-space: nowrap;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  }

  .notif.info {
    background: linear-gradient(90deg, #2d2416, #3d2e1a, #2d2416);
    border: 2px solid #6b5644;
    color: #f4e4c1;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }

  .notif.success {
    background: linear-gradient(90deg, #1a3a1a, #2d5a2d, #1a3a1a);
    border: 2px solid #4ade80;
    color: #4ade80;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 10px rgba(74,222,128,0.2);
  }

  .notif.warning {
    background: linear-gradient(90deg, #3a2a0a, #4d3a1a, #3a2a0a);
    border: 2px solid #d4af37;
    color: #d4af37;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 10px rgba(212,175,55,0.2);
  }

  .notif.error {
    background: linear-gradient(90deg, #3a0a0a, #4d1a1a, #3a0a0a);
    border: 2px solid #ff4444;
    color: #ff4444;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 10px rgba(255,68,68,0.2);
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
