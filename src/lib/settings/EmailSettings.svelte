<script>
  import { auth } from '$lib/auth.svelte.js';
  import { api } from '$lib/api.js';

  let email = $state('');
  let loading = $state(false);
  let message = $state(null);
  let isError = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;

    loading = true;
    message = null;

    try {
      await api.put('/api/settings/email', { email: email.trim() });
      message = 'Email updated! Check your inbox for verification.';
      isError = false;
      if (auth.user) {
        auth.user.email = email.trim();
        auth.user.emailVerified = false;
      }
    } catch (err) {
      message = err.message;
      isError = true;
    } finally {
      loading = false;
    }
  }
</script>

<div class="email-settings">
  <h3>Email</h3>

  <div class="current-email">
    {#if auth.user?.email}
      <span class="email-addr">{auth.user.email}</span>
      <span class="verified-badge" class:verified={auth.user.emailVerified}>
        {auth.user.emailVerified ? 'Verified' : 'Not verified'}
      </span>
    {:else}
      <span class="no-email">No email set</span>
    {/if}
  </div>

  <form onsubmit={handleSubmit}>
    <label class="field">
      <span class="label">New Email</span>
      <div class="input-row">
        <input type="email" bind:value={email} placeholder="your@email.com" required />
        <button type="submit" class="submit-btn" disabled={loading || !email.trim()}>
          {loading ? '...' : 'Update'}
        </button>
      </div>
    </label>
  </form>

  {#if message}
    <p class="message" class:error={isError}>{message}</p>
  {/if}
</div>

<style>
  .email-settings {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #aaa;
  }

  .current-email {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .email-addr {
    color: #eee;
  }

  .no-email {
    color: #888;
  }

  .verified-badge {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    background: #3a1a1a;
    color: #e55;
  }

  .verified-badge.verified {
    background: #1a3a2a;
    color: #4ade80;
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

  .input-row {
    display: flex;
    gap: 8px;
  }

  input {
    flex: 1;
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

  .submit-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: #2a5a8a;
    color: #eee;
    font-size: 13px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .submit-btn:hover:not(:disabled) {
    background: #3a7aba;
  }

  .submit-btn:disabled {
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
