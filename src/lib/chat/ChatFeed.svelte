<script>
  import MessageBubble from './MessageBubble.svelte';

  let { messages = [], currentUserId, roomId } = $props();

  let feedEl = $state(null);
  let wasNearBottom = true;

  function isNearBottom() {
    if (!feedEl) return true;
    return feedEl.scrollHeight - feedEl.scrollTop - feedEl.clientHeight < 80;
  }

  function handleScroll() {
    wasNearBottom = isNearBottom();
  }

  // Auto-scroll only if user was already near the bottom
  $effect(() => {
    const _ = messages.length;
    if (feedEl && wasNearBottom) {
      queueMicrotask(() => {
        feedEl.scrollTop = feedEl.scrollHeight;
      });
    }
  });
</script>

<div class="chat-feed" bind:this={feedEl} onscroll={handleScroll}>
  {#if messages.length === 0}
    <div class="empty">No messages yet. Start the conversation!</div>
  {:else}
    {#each messages as message (message.id)}
      <MessageBubble
        {message}
        isOwn={message.userId === currentUserId}
        {roomId}
        {currentUserId}
      />
    {/each}
  {/if}
</div>

<style>
  .chat-feed {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .chat-feed::-webkit-scrollbar {
    width: 6px;
  }

  .chat-feed::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-feed::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-style: italic;
    font-size: 14px;
  }
</style>
