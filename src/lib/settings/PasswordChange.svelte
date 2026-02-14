<script>
  import { api } from '$lib/api.js';

  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let loading = $state(false);
  let message = $state(null);
  let isError = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      message = 'Passwords do not match.';
      isError = true;
      return;
    }

    if (newPassword.length < 6) {
      message = 'New password must be at least 6 characters.';
      isError = true;
      return;
    }

    loading = true;
    message = null;

    try {
      await api.put('/api/settings/password', { currentPassword, newPassword });
      message = 'Password updated!';
      isError = false;
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (err) {
      message = err.message;
      isError = true;
    } finally {
      loading = false;
    }
  }
</script>

<form class="password-form" onsubmit={handleSubmit}>
  <h3>Change Password</h3>

  <label class="field">
    <span class="label">Current Password</span>
    <input type="password" bind:value={currentPassword} required />
  </label>

  <label class="field">
    <span class="label">New Password</span>
    <input type="password" bind:value={newPassword} required minlength="6" />
  </label>

  <label class="field">
    <span class="label">Confirm New Password</span>
    <input type="password" bind:value={confirmPassword} required />
  </label>

  {#if message}
    <p class="message" class:error={isError}>{message}</p>
  {/if}

  <button type="submit" class="submit-btn" disabled={loading || !currentPassword || !newPassword || !confirmPassword}>
    {loading ? 'Updating...' : 'Update Password'}
  </button>
</form>

<style>
  .password-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #aaa;
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

  .message {
    font-size: 13px;
    color: #4ade80;
  }

  .message.error {
    color: #e55;
  }

  .submit-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    background: var(--accent-btn);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
    align-self: flex-start;
  }

  .submit-btn:hover:not(:disabled), .submit-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .submit-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
