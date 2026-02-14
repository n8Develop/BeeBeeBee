<script>
  import { goto } from '$app/navigation';
  import { api } from '$lib/api.js';

  let { onJoined = null } = $props();

  let query = $state('');
  let results = $state([]);
  let loading = $state(false);
  let error = $state(null);
  let joinLoading = $state(null);
  let debounceTimer = null;

  function handleInput() {
    clearTimeout(debounceTimer);
    if (!query.trim()) {
      results = [];
      return;
    }
    debounceTimer = setTimeout(search, 300);
  }

  async function search() {
    if (!query.trim()) return;
    loading = true;
    error = null;
    try {
      results = await api.get(`/api/rooms/browse?q=${encodeURIComponent(query.trim())}`);
    } catch (err) {
      error = err.message;
      results = [];
    } finally {
      loading = false;
    }
  }

  async function handleJoin(room) {
    joinLoading = room.id;
    try {
      const joined = await api.post(`/api/rooms/${room.id}/join`, {});
      if (onJoined) {
        onJoined(joined);
      } else {
        goto(`/app/room/${joined.id}`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      joinLoading = null;
    }
  }
</script>

<div class="browse-rooms">
  <div class="search-row">
    <input
      type="text"
      bind:value={query}
      oninput={handleInput}
      placeholder="Search rooms by name..."
    />
  </div>

  {#if loading}
    <p class="status">Searching...</p>
  {:else if error}
    <p class="status error">{error}</p>
  {:else if query.trim() && results.length === 0}
    <p class="status">No rooms found.</p>
  {:else}
    <ul class="results">
      {#each results as room (room.id)}
        <li class="room-row">
          <div class="room-info">
            <span class="room-name">
              {room.name}
              {#if room.hasPassword}
                <span class="lock" title="Password protected">🔒</span>
              {/if}
            </span>
            <span class="room-meta">{room.memberCount ?? 0} member{room.memberCount === 1 ? '' : 's'}</span>
          </div>
          <button
            class="join-btn"
            onclick={() => handleJoin(room)}
            disabled={joinLoading === room.id}
          >
            {joinLoading === room.id ? '...' : 'Join'}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .browse-rooms {
    width: 100%;
  }

  .search-row {
    margin-bottom: 10px;
  }

  input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-deep);
    color: var(--text);
    font-size: 16px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }

  input:focus {
    border-color: var(--accent);
  }

  input::placeholder {
    color: #555;
  }

  .status {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    padding: 12px;
  }

  .status.error {
    color: #e55;
  }

  .results {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .room-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--bg-panel);
    border: 1px solid #2a2a4e;
    border-radius: 8px;
  }

  .room-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .room-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }

  .lock {
    font-size: 12px;
    margin-left: 4px;
  }

  .room-meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .join-btn {
    padding: 5px 14px;
    border: none;
    border-radius: 4px;
    background: var(--accent-btn);
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .join-btn:hover:not(:disabled), .join-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .join-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
