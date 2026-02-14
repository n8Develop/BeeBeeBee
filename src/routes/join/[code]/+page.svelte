<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api.js';
  import { auth } from '$lib/auth.svelte.js';

  let { data } = $props();
  let code = data.code;

  let status = $state('joining');
  let error = $state(null);
  let needsPassword = $state(false);
  let password = $state('');
  let loading = $state(false);

  onMount(async () => {
    // Wait for auth to finish loading
    if (auth.loading) {
      await new Promise((resolve) => {
        const check = () => {
          if (!auth.loading) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    }

    // If not logged in, redirect to login
    if (!auth.user) {
      goto('/login');
      return;
    }

    await attemptJoin();
  });

  async function attemptJoin() {
    loading = true;
    error = null;

    try {
      const body = { inviteCode: code };
      if (password.trim()) {
        body.password = password.trim();
      }
      const room = await api.post('/api/rooms/join-by-code', body);
      status = 'success';
      goto(`/app/room/${room.id}`);
    } catch (err) {
      if (err.status === 401 || (err.message && err.message.toLowerCase().includes('password'))) {
        needsPassword = true;
        status = 'password';
        error = 'This room requires a password.';
      } else {
        status = 'error';
        error = err.message;
      }
    } finally {
      loading = false;
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    await attemptJoin();
  }
</script>

<div class="join-page">
  <div class="join-card">
    <h1>BeeBeeBee</h1>

    {#if status === 'joining'}
      <p class="status-text">Joining room...</p>
    {:else if status === 'password'}
      <p class="info-text">This room is password-protected.</p>
      <form onsubmit={handlePasswordSubmit}>
        <label class="field">
          <span class="label">Password</span>
          <input
            type="password"
            bind:value={password}
            placeholder="Enter room password"
            autofocus
          />
        </label>

        {#if error && error !== 'This room requires a password.'}
          <p class="error">{error}</p>
        {/if}

        <button type="submit" class="submit-btn" disabled={loading}>
          {loading ? 'Joining...' : 'Join Room'}
        </button>
      </form>
    {:else if status === 'error'}
      <p class="error">{error}</p>
      <a href="/app" class="back-link">Go to BeeBeeBee</a>
    {:else if status === 'success'}
      <p class="status-text">Joined! Redirecting...</p>
    {/if}
  </div>
</div>

<style>
  .join-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }

  .join-card {
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 32px;
    width: 100%;
    max-width: 400px;
    text-align: center;
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 20px;
  }

  .status-text {
    color: var(--text-muted);
    font-size: 14px;
  }

  .info-text {
    color: #aaa;
    font-size: 14px;
    margin-bottom: 16px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
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

  input::placeholder {
    color: #555;
  }

  .error {
    color: #e55;
    font-size: 13px;
    margin: 8px 0;
  }

  .submit-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    background: var(--accent-btn);
    color: var(--text);
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .submit-btn:hover:not(:disabled), .submit-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .submit-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .back-link {
    display: inline-block;
    margin-top: 16px;
    color: var(--accent);
    text-decoration: none;
    font-size: 14px;
  }

  .back-link:hover, .back-link:active {
    text-decoration: underline;
  }
</style>
