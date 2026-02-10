<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth.svelte.js';

  let username = $state('');
  let password = $state('');
  let error = $state('');
  let submitting = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    submitting = true;
    try {
      await auth.login(username, password);
      goto('/app');
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="page">
  <h1>BeeBeeBee</h1>
  <form onsubmit={handleSubmit}>
    <input type="text" bind:value={username} placeholder="Username" autocomplete="username" required />
    <input type="password" bind:value={password} placeholder="Password" autocomplete="current-password" required />
    {#if error}<p class="error">{error}</p>{/if}
    <button type="submit" disabled={submitting}>Log in</button>
  </form>
  <div class="links">
    <a href="/register">Create account</a>
    <a href="/request-reset">Forgot password?</a>
  </div>
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
    font-size: 2rem;
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
  .links {
    margin-top: 1rem;
    display: flex;
    gap: 1.5rem;
    font-size: 0.9rem;
  }
</style>
