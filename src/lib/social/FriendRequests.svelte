<script>
  import { friendsStore } from '$lib/friends.svelte.js';
  import Avatar from './Avatar.svelte';

  let actionLoading = $state(null);

  friendsStore.fetchRequests();

  async function accept(userId) {
    actionLoading = `accept-${userId}`;
    try {
      await friendsStore.acceptRequest(userId);
    } catch (err) {
      alert(err.message);
    } finally {
      actionLoading = null;
    }
  }

  async function decline(userId) {
    actionLoading = `decline-${userId}`;
    try {
      await friendsStore.declineRequest(userId);
    } catch (err) {
      alert(err.message);
    } finally {
      actionLoading = null;
    }
  }
</script>

<div class="friend-requests">
  {#if friendsStore.incomingRequests.length > 0}
    <h3>Incoming Requests</h3>
    <ul>
      {#each friendsStore.incomingRequests as req (req.userId)}
        <li class="request-row">
          <Avatar username={req.username} size={36} />
          <span class="req-name">{req.username}</span>
          <div class="req-actions">
            <button
              class="accept-btn"
              onclick={() => accept(req.userId)}
              disabled={actionLoading === `accept-${req.userId}`}
            >Accept</button>
            <button
              class="decline-btn"
              onclick={() => decline(req.userId)}
              disabled={actionLoading === `decline-${req.userId}`}
            >Decline</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if friendsStore.outgoingRequests.length > 0}
    <h3>Outgoing Requests</h3>
    <ul>
      {#each friendsStore.outgoingRequests as req (req.userId)}
        <li class="request-row">
          <Avatar username={req.username} size={36} />
          <span class="req-name">{req.username}</span>
          <button
            class="decline-btn"
            onclick={() => decline(req.userId)}
            disabled={actionLoading === `decline-${req.userId}`}
          >Cancel</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .friend-requests {
    width: 100%;
  }

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #aaa;
    margin: 12px 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .request-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--bg-panel);
    border: 1px solid #2a2a4e;
    border-radius: 8px;
  }

  .req-name {
    flex: 1;
    font-size: 14px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .req-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .accept-btn {
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    background: #2a7a4a;
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
  }

  .accept-btn:hover:not(:disabled), .accept-btn:active:not(:disabled) {
    background: #3a9a5a;
  }

  .decline-btn {
    padding: 4px 12px;
    border: 1px solid #543;
    border-radius: 4px;
    background: transparent;
    color: #eaa;
    font-size: 12px;
    cursor: pointer;
  }

  .decline-btn:hover:not(:disabled), .decline-btn:active:not(:disabled) {
    background: #3a1a1a;
  }

  .accept-btn:disabled, .decline-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
