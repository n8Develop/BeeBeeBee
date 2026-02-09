<script>
  import { auth } from '$lib/auth.js';

  async function handleLogout() {
    await auth.logout();
  }
</script>

<div class="page">
  <h1>Welcome to BeeBeeBee</h1>
  {#if auth.user}
    <p>Logged in as <strong>{auth.user.username}</strong></p>
    <button onclick={handleLogout}>Log out</button>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 1rem;
  }
  button {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 4px;
    background: #444;
    color: #eee;
    cursor: pointer;
  }
</style>
