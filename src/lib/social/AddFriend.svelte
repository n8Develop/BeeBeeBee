<script>
  import { friendsStore } from '$lib/friends.svelte.js';

  let username = $state('');
  let loading = $state(false);
  let message = $state(null);
  let isError = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim()) return;

    loading = true;
    message = null;

    try {
      await friendsStore.sendRequest(username.trim());
      message = `Friend request sent to ${username.trim()}!`;
      isError = false;
      username = '';
    } catch (err) {
      message = err.message;
      isError = true;
    } finally {
      loading = false;
    }
  }
</script>

<div class="add-friend">
  <h3>Add Friend</h3>
  <form onsubmit={handleSubmit}>
    <div class="input-row">
      <input
        type="text"
        bind:value={username}
        placeholder="Enter username"
        maxlength="50"
      />
      <button type="submit" class="send-btn" disabled={loading || !username.trim()}>
        {loading ? '...' : 'Send'}
      </button>
    </div>
  </form>
  {#if message}
    <p class="message" class:error={isError}>{message}</p>
  {/if}
</div>

<style>
  .add-friend {
    width: 100%;
  }

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #aaa;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .input-row {
    display: flex;
    gap: 8px;
  }

  input {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-deep);
    color: var(--text);
    font-size: 16px;
    font-family: inherit;
    outline: none;
  }

  input:focus {
    border-color: var(--accent);
  }

  input::placeholder {
    color: #555;
  }

  .send-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: var(--accent-btn);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .send-btn:hover:not(:disabled), .send-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .message {
    margin-top: 8px;
    font-size: 13px;
    color: #4ade80;
  }

  .message.error {
    color: #e55;
  }
</style>
