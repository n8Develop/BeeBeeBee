<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth.js';

  let username = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let submitting = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    submitting = true;
    try {
      await auth.register(username, password);
      goto('/app');
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="page">
  <h1>Create Account</h1>
  <form onsubmit={handleSubmit}>
    <input type="text" bind:value={username} placeholder="Username" autocomplete="username" required />
    <input type="password" bind:value={password} placeholder="Password (8+ characters)" autocomplete="new-password" required />
    <input type="password" bind:value={confirmPassword} placeholder="Confirm password" autocomplete="new-password" required />
    {#if error}<p class="error">{error}</p>{/if}
    <button type="submit" disabled={submitting}>Create account</button>
  </form>
  <div class="links">
    <a href="/login">Already have an account?</a>
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
    font-size: 0.9rem;
  }
</style>
