<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { MediaQuery } from 'svelte/reactivity';
  import { auth } from '$lib/auth.svelte.js';
  import { socket } from '$lib/socket.svelte.js';
  import { api } from '$lib/api.js';
  import Avatar from '$lib/social/Avatar.svelte';
  import FriendsList from '$lib/social/FriendsList.svelte';
  import ChatFeed from '$lib/chat/ChatFeed.svelte';
  import MessageInput from '$lib/chat/MessageInput.svelte';
  import TypingIndicator from '$lib/chat/TypingIndicator.svelte';

  const isMobile = new MediaQuery('(max-width: 768px)');

  let { data } = $props();
  let roomId = data.roomId;

  let roomName = $state('');
  let inviteCode = $state('');
  let codeCopied = $state(false);
  let roomError = $state(null);
  let loading = $state(true);
  let showMembers = $state(false);
  let showFriends = $state(false);

  onMount(() => {
    socket.connect(auth.user?.id);
    socket.joinRoom(roomId);
    fetchRoomDetails();

    return () => {
      socket.leaveRoom(roomId);
    };
  });

  async function fetchRoomDetails() {
    try {
      const room = await api.get(`/api/rooms/${roomId}`);
      roomName = room.name || 'Room';
      inviteCode = room.inviteCode || '';
    } catch (err) {
      roomError = err.message;
    } finally {
      loading = false;
    }
  }

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      codeCopied = true;
      setTimeout(() => { codeCopied = false; }, 2000);
    } catch {}
  }

  async function handleLeaveRoom() {
    try {
      await api.post(`/api/rooms/${roomId}/leave`);
      goto('/app');
    } catch (err) {
      goto('/app');
    }
  }

  function handleBack() {
    goto('/app');
  }

  let filteredTypingUsers = $derived(
    socket.typingUsers.filter((u) => u.userId !== auth.user?.id)
  );

  let onlineCount = $derived(
    socket.members.filter((m) => m.online).length
  );
</script>

<div class="room-page">
  <!-- Header -->
  <header class="room-header">
    <div class="header-left">
      <button class="back-btn" onclick={handleBack} title="Back to rooms">&larr;</button>
      <div class="room-title">
        <h1>{roomName || 'Loading...'}</h1>
        <span class="member-count">
          {onlineCount} online / {socket.members.length} member{socket.members.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
    {#if inviteCode}
      <button class="invite-code" onclick={copyInviteCode} title="Click to copy invite code">
        <span class="invite-label">Invite:</span>
        <span class="invite-value">{inviteCode}</span>
        <span class="invite-copy">{codeCopied ? 'Copied!' : 'Copy'}</span>
      </button>
    {/if}
    <div class="header-right">
      <button class="header-toggle" class:active={showFriends} onclick={() => { showFriends = !showFriends; }} title="Friends">
        <span class="btn-icon" aria-hidden="true">&#9734;</span><span class="btn-label">Friends</span>
      </button>
      <button class="header-toggle" class:active={showMembers} onclick={() => { showMembers = !showMembers; }} title="Members">
        <span class="btn-icon" aria-hidden="true">&#9776;</span><span class="btn-label">Members</span>
      </button>
      <button class="leave-btn" onclick={handleLeaveRoom} title="Leave room">
        <span class="btn-icon" aria-hidden="true">&#10005;</span><span class="btn-label">Leave</span>
      </button>
    </div>
  </header>

  {#if socket.reconnecting}
    <div class="reconnecting-banner">
      Connection lost. Reconnecting...
    </div>
  {/if}

  {#if roomError}
    <div class="error-banner">
      <p>{roomError}</p>
      <button onclick={handleBack}>Back to rooms</button>
    </div>
  {/if}

  {#if socket.error}
    <div class="error-banner">
      <p>{socket.error.message}</p>
      <button onclick={() => socket.clearError()}>Dismiss</button>
    </div>
  {/if}

  <div class="room-body">
    <!-- Mobile backdrop -->
    {#if isMobile.current && (showMembers || showFriends)}
      <div class="sidebar-backdrop" onclick={() => { showMembers = false; showFriends = false; }} role="presentation"></div>
    {/if}

    <!-- Members sidebar (left, toggleable) -->
    {#if showMembers}
      <aside class="members-sidebar">
        <h3>Members</h3>
        <ul class="members-list">
          {#each socket.members as member (member.userId)}
            <li class="member" class:online={member.online}>
              <Avatar username={member.username} avatarUrl={member.avatarUrl} size={32} />
              <span class="status-dot" class:online={member.online}></span>
              <span class="member-name">{member.username}</span>
            </li>
          {/each}
        </ul>
      </aside>
    {/if}

    <!-- Chat area -->
    <div class="chat-area">
      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading room...</span>
        </div>
      {:else}
        <ChatFeed
          messages={socket.messages}
          currentUserId={auth.user?.id}
          {roomId}
        />
        <TypingIndicator users={filteredTypingUsers} />
        <MessageInput {roomId} />
      {/if}
    </div>

    <!-- Friends sidebar (right, toggleable) -->
    {#if showFriends}
      <aside class="friends-sidebar">
        <FriendsList />
      </aside>
    {/if}
  </div>
</div>

<style>
  .room-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    max-height: 100vh;
    max-height: 100dvh;
    overflow: hidden;
    overscroll-behavior: none;
  }

  @supports (padding: env(safe-area-inset-bottom)) {
    .room-page { padding-bottom: env(safe-area-inset-bottom); }
  }

  .room-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    gap: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .back-btn {
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--accent);
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
    flex-shrink: 0;
  }

  .back-btn:hover, .back-btn:active {
    background: #2a2a4e;
  }

  .room-title {
    min-width: 0;
  }

  .room-title h1 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .member-count {
    font-size: 11px;
    color: var(--text-muted);
  }

  .invite-code {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
  }

  .invite-code:hover, .invite-code:active {
    background: #2a2a4e;
  }

  .invite-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .invite-value {
    font-family: monospace;
    font-size: 12px;
    color: var(--accent);
  }

  .invite-copy {
    font-size: 11px;
    color: #4ade80;
    margin-left: 2px;
  }

  .header-right {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .header-toggle {
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: #444;
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .btn-icon {
    font-size: 14px;
    line-height: 1;
  }

  .header-toggle:hover, .header-toggle:active {
    background: #555;
  }

  .header-toggle.active {
    background: var(--accent-btn);
    border-color: #3a7aba;
  }

  .leave-btn {
    padding: 5px 10px;
    border: 1px solid #543;
    border-radius: 4px;
    background: #4a2a2a;
    color: #eaa;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .leave-btn:hover, .leave-btn:active {
    background: #6a3a3a;
  }

  .reconnecting-banner {
    padding: 8px 16px;
    background: #3a2a0a;
    border-bottom: 1px solid #665520;
    color: #fbbf24;
    font-size: 13px;
    text-align: center;
    flex-shrink: 0;
  }

  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #3a1a1a;
    border-bottom: 1px solid #543;
    color: #eaa;
    font-size: 13px;
    flex-shrink: 0;
  }

  .error-banner button {
    padding: 3px 10px;
    border: 1px solid #654;
    border-radius: 3px;
    background: transparent;
    color: #eaa;
    font-size: 12px;
    cursor: pointer;
  }

  .room-body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9;
  }

  .members-sidebar {
    width: 180px;
    border-right: 1px solid var(--border);
    background: var(--bg-sidebar);
    padding: 12px;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .members-sidebar h3 {
    font-size: 13px;
    font-weight: 600;
    color: #aaa;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .members-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .member {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .member.online {
    color: var(--text);
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #555;
    flex-shrink: 0;
  }

  .status-dot.online {
    background: #4ade80;
  }

  .member-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .friends-sidebar {
    width: 220px;
    border-left: 1px solid var(--border);
    background: var(--bg-sidebar);
    overflow-y: auto;
    flex-shrink: 0;
  }

  /* --- Mobile: 768px and below --- */
  @media (max-width: 768px) {
    .room-header {
      padding: 8px 10px;
      gap: 8px;
    }

    .invite-code {
      display: none;
    }

    .members-sidebar {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 10;
      width: 280px;
      max-width: 80vw;
      border-right: 1px solid var(--border);
    }

    .friends-sidebar {
      position: fixed;
      top: 0;
      bottom: 0;
      right: 0;
      z-index: 10;
      width: 280px;
      max-width: 80vw;
      border-left: 1px solid var(--border);
    }
  }

  /* --- Compact: 480px and below --- */
  @media (max-width: 480px) {
    .room-title h1 {
      max-width: 120px;
    }

    .header-right {
      gap: 4px;
    }

    .btn-label {
      display: none;
    }

    .header-toggle,
    .leave-btn {
      min-width: 32px;
      min-height: 32px;
      padding: 4px 6px;
    }
  }
</style>
