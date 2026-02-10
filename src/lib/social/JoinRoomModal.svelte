<script>
  import { api } from '$lib/api.js';
  import BrowseRooms from './BrowseRooms.svelte';

  let { onClose, onJoined } = $props();

  let activeTab = $state('code');
  let inviteCode = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state(null);
  let needsPassword = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    loading = true;
    error = null;

    try {
      const body = { inviteCode: inviteCode.trim() };
      if (password.trim()) {
        body.password = password.trim();
      }
      const room = await api.post('/api/rooms/join-by-code', body);
      onJoined(room);
    } catch (err) {
      if (err.status === 401 || (err.message && err.message.toLowerCase().includes('password'))) {
        needsPassword = true;
        error = 'This room requires a password.';
      } else {
        error = err.message;
      }
    } finally {
      loading = false;
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-header">
      <h3>Join Room</h3>
      <button class="close-btn" onclick={onClose}>x</button>
    </div>

    <div class="tabs">
      <button class="tab" class:active={activeTab === 'code'} onclick={() => { activeTab = 'code'; }}>Invite Code</button>
      <button class="tab" class:active={activeTab === 'browse'} onclick={() => { activeTab = 'browse'; }}>Browse</button>
    </div>

    {#if activeTab === 'code'}
      <form onsubmit={handleSubmit}>
        <label class="field">
          <span class="label">Invite Code</span>
          <input
            type="text"
            bind:value={inviteCode}
            placeholder="Enter invite code"
            required
            autofocus
          />
        </label>

        {#if needsPassword}
          <label class="field">
            <span class="label">Password</span>
            <input
              type="password"
              bind:value={password}
              placeholder="Enter room password"
            />
          </label>
        {/if}

        {#if error}
          <p class="error">{error}</p>
        {/if}

        <div class="actions">
          <button type="button" class="cancel-btn" onclick={onClose}>Cancel</button>
          <button type="submit" class="submit-btn" disabled={loading || !inviteCode.trim()}>
            {loading ? 'Joining...' : 'Join'}
          </button>
        </div>
      </form>
    {:else}
      <BrowseRooms onJoined={onJoined} />
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: #16213e;
    border: 1px solid #334;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #eee;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #888;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: #2a2a4e;
    color: #eee;
  }

  .tabs {
    display: flex;
    gap: 0;
    margin-bottom: 16px;
    border-bottom: 1px solid #334;
  }

  .tab {
    flex: 1;
    padding: 8px;
    border: none;
    background: transparent;
    color: #888;
    font-size: 13px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab.active {
    color: #7eb8da;
    border-bottom-color: #7eb8da;
  }

  .tab:hover:not(.active) {
    color: #aaa;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 13px;
    color: #aaa;
  }

  input {
    padding: 8px 10px;
    border: 1px solid #334;
    border-radius: 6px;
    background: #1a1a2e;
    color: #eee;
    font-size: 14px;
    font-family: inherit;
    outline: none;
  }

  input:focus {
    border-color: #7eb8da;
  }

  input::placeholder {
    color: #555;
  }

  .error {
    color: #e55;
    font-size: 13px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }

  .cancel-btn {
    padding: 8px 16px;
    border: 1px solid #334;
    border-radius: 4px;
    background: transparent;
    color: #aaa;
    font-size: 13px;
    cursor: pointer;
  }

  .cancel-btn:hover {
    background: #2a2a4e;
    color: #eee;
  }

  .submit-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    background: #2a5a8a;
    color: #eee;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .submit-btn:hover:not(:disabled) {
    background: #3a7aba;
  }

  .submit-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
