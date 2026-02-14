<script>
  import { goto } from '$app/navigation';
  import { friendsStore } from '$lib/friends.svelte.js';
  import Avatar from './Avatar.svelte';

  let dmLoading = $state(null);

  friendsStore.fetchFriends();

  async function handleDM(friend) {
    dmLoading = friend.userId;
    try {
      const room = await friendsStore.startDirectMessage(friend.userId);
      goto(`/app/room/${room.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      dmLoading = null;
    }
  }
</script>

<div class="friends-list">
  <h3>Friends</h3>
  {#if friendsStore.friends.length === 0}
    <p class="empty">No friends yet. Add someone below!</p>
  {:else}
    <ul>
      {#each friendsStore.friends as friend (friend.userId)}
        <li class="friend-row">
          <Avatar username={friend.username} avatarUrl={friend.avatarUrl} size={48} />
          <div class="friend-info">
            <span class="friend-name">{friend.username}</span>
            <span class="friend-status" class:online={friend.online}>
              <span class="status-dot" class:online={friend.online}></span>
              {friend.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <button
            class="dm-btn"
            onclick={() => handleDM(friend)}
            disabled={dmLoading === friend.userId}
          >
            {dmLoading === friend.userId ? '...' : 'DM'}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .friends-list {
    width: 100%;
  }

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 10px;
  }

  .empty {
    font-size: 13px;
    color: var(--text-muted);
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .friend-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--bg-panel);
    border: 1px solid #2a2a4e;
    border-radius: 8px;
  }

  .friend-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .friend-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .friend-status {
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .friend-status.online {
    color: #4ade80;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #555;
    flex-shrink: 0;
  }

  .status-dot.online {
    background: #4ade80;
  }

  .dm-btn {
    padding: 5px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--accent-btn);
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .dm-btn:hover:not(:disabled), .dm-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .dm-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
