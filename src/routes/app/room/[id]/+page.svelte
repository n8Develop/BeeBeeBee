<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth.svelte.js';
  import { socket } from '$lib/socket.svelte.js';
  import { api } from '$lib/api.js';
  import Avatar from '$lib/social/Avatar.svelte';
  import ChatFeed from '$lib/chat/ChatFeed.svelte';
  import MessageInput from '$lib/chat/MessageInput.svelte';
  import TypingIndicator from '$lib/chat/TypingIndicator.svelte';

  let { data } = $props();
  let roomId = data.roomId;

  let roomName = $state('');
  let roomError = $state(null);
  let showMembers = $state(false);

  onMount(() => {
    // Connect socket and join room
    socket.connect();
    socket.joinRoom(roomId);

    // Fetch room details
    fetchRoomDetails();

    return () => {
      socket.leaveRoom(roomId);
    };
  });

  async function fetchRoomDetails() {
    try {
      const room = await api.get(`/api/rooms/${roomId}`);
      roomName = room.name || 'Room';
    } catch (err) {
      roomError = err.message;
    }
  }

  async function handleLeaveRoom() {
    try {
      await api.post(`/api/rooms/${roomId}/leave`);
      goto('/app');
    } catch (err) {
      // If it fails, still navigate back
      goto('/app');
    }
  }

  function handleBack() {
    goto('/app');
  }

  // Filter typing users to exclude current user
  let filteredTypingUsers = $derived(
    socket.typingUsers.filter((u) => u.userId !== auth.user?.id)
  );

  // Count online members
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
    <div class="header-right">
      <button class="members-toggle" onclick={() => { showMembers = !showMembers; }}>
        Members
      </button>
      <button class="leave-btn" onclick={handleLeaveRoom}>Leave</button>
    </div>
  </header>

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
    <!-- Members sidebar (toggleable) -->
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
      <ChatFeed
        messages={socket.messages}
        currentUserId={auth.user?.id}
        {roomId}
      />
      <TypingIndicator users={filteredTypingUsers} />
      <MessageInput {roomId} />
    </div>
  </div>
</div>

<style>
  .room-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
  }

  .room-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #16213e;
    border-bottom: 1px solid #334;
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .back-btn {
    padding: 4px 10px;
    border: 1px solid #334;
    border-radius: 4px;
    background: transparent;
    color: #7eb8da;
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
    flex-shrink: 0;
  }

  .back-btn:hover {
    background: #2a2a4e;
  }

  .room-title {
    min-width: 0;
  }

  .room-title h1 {
    font-size: 16px;
    font-weight: 600;
    color: #eee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .member-count {
    font-size: 11px;
    color: #888;
  }

  .header-right {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .members-toggle {
    padding: 5px 10px;
    border: 1px solid #334;
    border-radius: 4px;
    background: #444;
    color: #eee;
    font-size: 12px;
    cursor: pointer;
  }

  .members-toggle:hover {
    background: #555;
  }

  .leave-btn {
    padding: 5px 10px;
    border: 1px solid #543;
    border-radius: 4px;
    background: #4a2a2a;
    color: #eaa;
    font-size: 12px;
    cursor: pointer;
  }

  .leave-btn:hover {
    background: #6a3a3a;
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
  }

  .members-sidebar {
    width: 180px;
    border-right: 1px solid #334;
    background: #12192e;
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
    color: #888;
  }

  .member.online {
    color: #eee;
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
</style>
