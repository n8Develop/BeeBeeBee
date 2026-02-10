<script>
  import { auth } from '$lib/auth.svelte.js';
  import RoomList from '$lib/social/RoomList.svelte';

  async function handleLogout() {
    await auth.logout();
  }
</script>

<div class="page">
  <header class="app-header">
    <h1>BeeBeeBee</h1>
    {#if auth.user}
      <div class="user-info">
        <span class="username">Logged in as <strong>{auth.user.username}</strong></span>
        <button class="logout-btn" onclick={handleLogout}>Log out</button>
      </div>
    {/if}
  </header>

  <main class="content">
    <RoomList />
  </main>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    padding: 24px 16px;
    gap: 24px;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 600px;
    flex-wrap: wrap;
    gap: 12px;
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #eee;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .username {
    font-size: 13px;
    color: #aaa;
  }

  .username strong {
    color: #7eb8da;
  }

  .logout-btn {
    padding: 5px 12px;
    border: 1px solid #334;
    border-radius: 4px;
    background: #444;
    color: #eee;
    font-size: 12px;
    cursor: pointer;
  }

  .logout-btn:hover {
    background: #555;
  }

  .content {
    width: 100%;
    max-width: 600px;
  }
</style>
