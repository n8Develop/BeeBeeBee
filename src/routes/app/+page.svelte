<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth.svelte.js';
  import RoomList from '$lib/social/RoomList.svelte';
  import FriendsList from '$lib/social/FriendsList.svelte';
  import FriendRequests from '$lib/social/FriendRequests.svelte';
  import AddFriend from '$lib/social/AddFriend.svelte';

  let activeTab = $state('rooms');

  async function handleLogout() {
    await auth.logout();
  }

  function goToSettings() {
    goto('/app/settings');
  }
</script>

<div class="page">
  <header class="app-header">
    <h1>BeeBeeBee</h1>
    {#if auth.user}
      <div class="user-info">
        <span class="username">Logged in as <strong>{auth.user.username}</strong></span>
        <button class="settings-btn" onclick={goToSettings} title="Settings">&#9881;</button>
        <button class="logout-btn" onclick={handleLogout}>Log out</button>
      </div>
    {/if}
  </header>

  <nav class="tabs">
    <button class="tab" class:active={activeTab === 'rooms'} onclick={() => { activeTab = 'rooms'; }}>Rooms</button>
    <button class="tab" class:active={activeTab === 'friends'} onclick={() => { activeTab = 'friends'; }}>Friends</button>
  </nav>

  <main class="content">
    {#if activeTab === 'rooms'}
      <RoomList />
    {:else}
      <div class="friends-section">
        <FriendsList />
        <FriendRequests />
        <AddFriend />
      </div>
    {/if}
  </main>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    padding: 24px 16px;
    gap: 16px;
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
    gap: 8px;
  }

  .username {
    font-size: 13px;
    color: #aaa;
  }

  .username strong {
    color: #7eb8da;
  }

  .settings-btn {
    width: 30px;
    height: 30px;
    border: 1px solid #334;
    border-radius: 4px;
    background: #444;
    color: #eee;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .settings-btn:hover {
    background: #555;
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

  .tabs {
    display: flex;
    width: 100%;
    max-width: 600px;
    border-bottom: 1px solid #334;
    gap: 0;
  }

  .tab {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    color: #888;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab.active {
    color: #7eb8da;
    border-bottom-color: #7eb8da;
  }

  .tab:hover:not(.active) {
    color: #aaa;
  }

  .content {
    width: 100%;
    max-width: 600px;
  }

  .friends-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
</style>
