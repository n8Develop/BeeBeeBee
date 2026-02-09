<script>
  import { api } from '$lib/api.js';

  let email = $state('');
  let submitted = $state(false);
  let error = $state('');
  let submitting = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    submitting = true;
    try {
      await api.post('/api/auth/request-reset', { email });
      submitted = true;
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="page">
  <h1>Reset Password</h1>
  {#if submitted}
    <p>If an account exists with that email, we sent a reset link. Check your inbox.</p>
    <a href="/login">Back to login</a>
  {:else}
    <form onsubmit={handleSubmit}>
      <input type="email" bind:value={email} placeholder="Your email" required />
      {#if error}<p class="error">{error}</p>{/if}
      <button type="submit" disabled={submitting}>Send reset link</button>
    </form>
    <a href="/login">Back to login</a>
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
  a {
    margin-top: 1rem;
    font-size: 0.9rem;
  }
</style>
