<script>
  import { page } from '$app/state';
  import { api } from '$lib/api.js';

  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let success = $state(false);
  let submitting = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    const token = page.url.searchParams.get('token');
    if (!token) {
      error = 'No reset token provided';
      return;
    }

    submitting = true;
    try {
      await api.post('/api/auth/reset-password', { token, password });
      success = true;
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="page">
  <h1>Set New Password</h1>
  {#if success}
    <p class="success">Password reset! You can now log in.</p>
    <a href="/login">Go to login</a>
  {:else}
    <form onsubmit={handleSubmit}>
      <input type="password" bind:value={password} placeholder="New password (8+ characters)" autocomplete="new-password" required />
      <input type="password" bind:value={confirmPassword} placeholder="Confirm password" autocomplete="new-password" required />
      {#if error}<p class="error">{error}</p>{/if}
      <button type="submit" disabled={submitting}>Reset password</button>
    </form>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
  }
  h1 {
    margin-bottom: 2rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 320px;
  }
  input {
    padding: 0.6rem 0.8rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: #2a2a3e;
    color: #eee;
    font-size: 1rem;
  }
  button {
    padding: 0.6rem;
    border: none;
    border-radius: 4px;
    background: #5b8fd9;
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .error {
    color: #e74c3c;
    font-size: 0.9rem;
  }
  .success {
    color: #2ecc71;
  }
  a {
    margin-top: 1rem;
    font-size: 0.9rem;
  }
</style>
