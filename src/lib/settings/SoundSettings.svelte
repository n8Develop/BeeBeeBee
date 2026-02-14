<script>
  import { settings } from '$lib/settings.svelte.js';
  import { onMount } from 'svelte';

  let saving = $state(false);
  let message = $state(null);
  let isError = $state(false);

  onMount(async () => {
    if (!settings.loaded) {
      try {
        await settings.load();
      } catch {
        // Settings may not exist yet, use defaults
      }
    }
  });

  async function handleSave() {
    saving = true;
    message = null;
    try {
      await settings.save();
      message = 'Sound settings saved!';
      isError = false;
    } catch (err) {
      message = err.message;
      isError = true;
    } finally {
      saving = false;
    }
  }
</script>

<div class="sound-settings">
  <label class="slider-row">
    <span class="slider-label">Master Volume</span>
    <input type="range" min="0" max="1" step="0.05" bind:value={settings.masterVolume} />
    <span class="slider-value">{Math.round(settings.masterVolume * 100)}%</span>
  </label>

  <label class="slider-row">
    <span class="slider-label">Input Sounds</span>
    <input type="range" min="0" max="1" step="0.05" bind:value={settings.inputVolume} />
    <span class="slider-value">{Math.round(settings.inputVolume * 100)}%</span>
  </label>

  <label class="slider-row">
    <span class="slider-label">Send Sounds</span>
    <input type="range" min="0" max="1" step="0.05" bind:value={settings.sendVolume} />
    <span class="slider-value">{Math.round(settings.sendVolume * 100)}%</span>
  </label>

  <label class="slider-row">
    <span class="slider-label">Notifications</span>
    <input type="range" min="0" max="1" step="0.05" bind:value={settings.notificationVolume} />
    <span class="slider-value">{Math.round(settings.notificationVolume * 100)}%</span>
  </label>

  <button class="save-btn" onclick={handleSave} disabled={saving}>
    {saving ? 'Saving...' : 'Save'}
  </button>

  {#if message}
    <p class="message" class:error={isError}>{message}</p>
  {/if}
</div>

<style>
  .sound-settings {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .slider-label {
    width: 110px;
    font-size: 13px;
    color: #aaa;
    flex-shrink: 0;
  }

  input[type="range"] {
    flex: 1;
    accent-color: var(--accent);
    height: 4px;
  }

  .slider-value {
    width: 40px;
    font-size: 12px;
    color: var(--text-muted);
    text-align: right;
    flex-shrink: 0;
  }

  .save-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    background: var(--accent-btn);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
    align-self: flex-start;
  }

  .save-btn:hover:not(:disabled), .save-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .save-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .message {
    font-size: 13px;
    color: #4ade80;
  }

  .message.error {
    color: #e55;
  }
</style>
