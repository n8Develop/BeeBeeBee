<script>
  import { goto } from '$app/navigation';
  import { api } from '$lib/api.js';
  import CreateRoomModal from './CreateRoomModal.svelte';
  import JoinRoomModal from './JoinRoomModal.svelte';

  let rooms = $state([]);
  let loading = $state(true);
  let error = $state(null);
  let showCreateModal = $state(false);
  let showJoinModal = $state(false);

  async function fetchRooms() {
    loading = true;
    error = null;
    try {
      rooms = await api.get('/api/rooms');
    } catch (err) {
      error = err.message;
      rooms = [];
    } finally {
      loading = false;
    }
  }

  // Fetch rooms on component init
  fetchRooms();

  function handleRoomClick(roomId) {
    goto(`/app/room/${roomId}`);
  }

  function handleCreated(room) {
    showCreateModal = false;
    rooms = [...rooms, room];
    goto(`/app/room/${room.id}`);
  }

  function handleJoined(room) {
    showJoinModal = false;
    // Add to list if not already present
    if (!rooms.find((r) => r.id === room.id)) {
      rooms = [...rooms, room];
    }
    goto(`/app/room/${room.id}`);
  }
</script>

<div class="room-list">
  <div class="room-list-header">
    <h2>Your Rooms</h2>
    <div class="header-actions">
      <button class="action-btn" onclick={() => { showCreateModal = true; }}>Create Room</button>
      <button class="action-btn" onclick={() => { showJoinModal = true; }}>Join Room</button>
    </div>
  </div>

  {#if loading}
    <div class="status">Loading rooms...</div>
  {:else if error}
    <div class="status error">{error}</div>
  {:else if rooms.length === 0}
    <div class="status empty">
      <p>No rooms yet.</p>
      <p>Create a room or join one with an invite code!</p>
    </div>
  {:else}
    <div class="rooms">
      {#each rooms as room (room.id)}
        <button class="room-card" onclick={() => handleRoomClick(room.id)}>
          <div class="room-info">
            <div class="room-name-row">
              <span class="room-name">{room.name}</span>
              {#if room.type === 'direct'}
                <span class="room-badge dm">DM</span>
              {:else if room.type === 'named'}
                <span class="room-badge named">Named</span>
              {/if}
            </div>
            {#if room.memberCount != null}
              <span class="room-members">{room.memberCount} member{room.memberCount === 1 ? '' : 's'}</span>
            {/if}
          </div>
          {#if room.inviteCode}
            <div class="room-code" title="Invite code">
              <span class="code-label">Code:</span>
              <span class="code-value">{room.inviteCode}</span>
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

{#if showCreateModal}
  <CreateRoomModal
    onClose={() => { showCreateModal = false; }}
    onCreated={handleCreated}
  />
{/if}

{#if showJoinModal}
  <JoinRoomModal
    onClose={() => { showJoinModal = false; }}
    onJoined={handleJoined}
  />
{/if}

<style>
  .room-list {
    width: 100%;
    max-width: 600px;
  }

  .room-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 8px;
  }

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: #eee;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    padding: 6px 14px;
    border: 1px solid #334;
    border-radius: 4px;
    background: #2a5a8a;
    color: #eee;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .action-btn:hover {
    background: #3a7aba;
  }

  .status {
    text-align: center;
    padding: 32px 16px;
    color: #888;
    font-size: 14px;
  }

  .status.error {
    color: #e55;
  }

  .empty p {
    margin: 4px 0;
  }

  .rooms {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .room-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #16213e;
    border: 1px solid #2a2a4e;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    text-align: left;
    width: 100%;
    color: inherit;
    font-family: inherit;
  }

  .room-card:hover {
    background: #1e2d4a;
    border-color: #3a4a6e;
  }

  .room-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .room-name {
    font-size: 15px;
    font-weight: 500;
    color: #eee;
  }

  .room-members {
    font-size: 12px;
    color: #888;
  }

  .room-code {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #666;
    background: #1a1a2e;
    padding: 3px 8px;
    border-radius: 4px;
  }

  .code-label {
    color: #555;
  }

  .code-value {
    color: #7eb8da;
    font-family: monospace;
    font-size: 12px;
  }

  .room-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .room-badge {
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .room-badge.dm {
    background: #2a3a5a;
    color: #7eb8da;
  }

  .room-badge.named {
    background: #2a4a3a;
    color: #4ade80;
  }
</style>
