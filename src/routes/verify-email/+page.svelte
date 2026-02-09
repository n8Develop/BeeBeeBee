<script>
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { api } from '$lib/api.js';

  let status = $state('verifying');
  let message = $state('');

  onMount(async () => {
    const token = page.url.searchParams.get('token');
    if (!token) {
      status = 'error';
      message = 'No verification token provided';
      return;
    }

    try {
      await api.post('/api/email/verify', { token });
      status = 'success';
      message = 'Email verified! You can close this page.';
    } catch (err) {
      status = 'error';
      message = err.message;
    }
  });
</script>

<div class="page">
  <h1>Email Verification</h1>
  {#if status === 'verifying'}
    <p>Verifying your email...</p>
  {:else if status === 'success'}
    <p class="success">{message}</p>
    <a href="/app">Go to app</a>
  {:else}
    <p class="error">{message}</p>
    <a href="/app">Go to app</a>
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
    margin-bottom: 1.5rem;
  }
  .success {
    color: #2ecc71;
  }
  .error {
    color: #e74c3c;
  }
  a {
    margin-top: 1rem;
  }
</style>
