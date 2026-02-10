<script>
  import { api } from '$lib/api.js';

  let { onClose, onCreated } = $props();

  let name = $state('');
  let password = $state('');
  let roomType = $state('invite');
  let loading = $state(false);
  let error = $state(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    loading = true;
    error = null;

    try {
      const body = { name: name.trim(), type: roomType };
      if (password.trim()) {
        body.password = password.trim();
      }
      const room = await api.post('/api/rooms', body);
      onCreated(room);
    } catch (err) {
      error = err.message;
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
      <h3>Create Room</h3>
      <button class="close-btn" onclick={onClose}>x</button>
    </div>

    <form onsubmit={handleSubmit}>
      <label class="field">
        <span class="label">Room Name</span>
        <input
          type="text"
          bind:value={name}
          placeholder="My awesome room"
          required
          maxlength="50"
          autofocus
        />
      </label>

      <div class="field">
        <span class="label">Room Type</span>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" bind:group={roomType} value="invite" />
            <span>Invite Only</span>
          </label>
          <label class="radio-option">
            <input type="radio" bind:group={roomType} value="named" />
            <span>Named <span class="optional">(findable by search)</span></span>
          </label>
        </div>
      </div>

      <label class="field">
        <span class="label">Password <span class="optional">(optional)</span></span>
        <input
          type="password"
          bind:value={password}
          placeholder="Leave empty for no password"
        />
      </label>

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <div class="actions">
        <button type="button" class="cancel-btn" onclick={onClose}>Cancel</button>
        <button type="submit" class="submit-btn" disabled={loading || !name.trim()}>
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
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
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
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

  .optional {
    color: #666;
    font-size: 11px;
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

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #eee;
    cursor: pointer;
  }

  .radio-option input[type="radio"] {
    accent-color: #7eb8da;
  }
</style>
