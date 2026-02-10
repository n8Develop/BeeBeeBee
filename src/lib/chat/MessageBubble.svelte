<script>
  import { socket } from '$lib/socket.svelte.js';
  import Avatar from '$lib/social/Avatar.svelte';
  import DrawingMessage from './DrawingMessage.svelte';
  import TextMessage from './TextMessage.svelte';
  import ImageMessage from './ImageMessage.svelte';
  import ReactionBar from './ReactionBar.svelte';

  let { message, isOwn = false, roomId, currentUserId } = $props();

  let formattedTime = $derived.by(() => {
    if (!message.timestamp) return '';
    const d = new Date(message.timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  function handleDelete() {
    if (confirm('Delete this message?')) {
      socket.deleteMessage(roomId, message.id);
    }
  }
</script>

<div class="message-bubble" class:own={isOwn}>
  <div class="header">
    <Avatar username={message.username} avatarUrl={message.avatarUrl} size={32} />
    <span class="username">{message.username}</span>
    <span class="time">{formattedTime}</span>
    {#if isOwn}
      <button class="delete-btn" onclick={handleDelete} title="Delete message">x</button>
    {/if}
  </div>

  <div class="content">
    {#if message.type === 'drawing'}
      <DrawingMessage content={message.content} />
    {:else if message.type === 'image'}
      <ImageMessage content={message.content} />
    {:else}
      <TextMessage content={message.content} />
    {/if}
  </div>

  <ReactionBar
    reactions={message.reactions || []}
    messageId={message.id}
    {roomId}
    {currentUserId}
  />
</div>

<style>
  .message-bubble {
    padding: 8px 12px;
    margin: 4px 0;
    background: #16213e;
    border-radius: 8px;
    border: 1px solid #2a2a4e;
    max-width: 100%;
  }

  .message-bubble.own {
    background: #1a2640;
    border-color: #334870;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .username {
    font-size: 12px;
    font-weight: 600;
    color: #7eb8da;
  }

  .own .username {
    color: #8ecae6;
  }

  .time {
    font-size: 11px;
    color: #666;
  }

  .delete-btn {
    margin-left: auto;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .delete-btn:hover {
    background: #4a1a1a;
    color: #e55;
  }

  .content {
    min-width: 0;
  }
</style>
