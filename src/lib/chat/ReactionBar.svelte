<script>
  import { socket } from '$lib/socket.svelte.js';

  let { reactions = [], messageId, roomId, currentUserId } = $props();

  const EMOJI_MAP = {
    heart: '\u2764\uFE0F',
    laugh: '\uD83D\uDE02',
    fire: '\uD83D\uDD25',
    sad: '\uD83D\uDE22',
    thumbsup: '\uD83D\uDC4D',
    thumbsdown: '\uD83D\uDC4E',
    star: '\u2B50',
    question: '\u2753'
  };

  const ALL_EMOJIS = ['heart', 'laugh', 'fire', 'sad', 'thumbsup', 'thumbsdown', 'star', 'question'];

  let showPicker = $state(false);

  function handleReactionClick(emoji) {
    const existing = reactions.find((r) => r.emoji === emoji);
    const hasReacted = existing && existing.userIds.includes(currentUserId);
    if (hasReacted) {
      socket.removeReaction(roomId, messageId, emoji);
    } else {
      socket.addReaction(roomId, messageId, emoji);
    }
  }

  function handlePickerSelect(emoji) {
    handleReactionClick(emoji);
    showPicker = false;
  }
</script>

<div class="reaction-bar">
  {#each reactions as reaction}
    {#if reaction.userIds.length > 0}
      <button
        class="reaction-chip"
        class:reacted={reaction.userIds.includes(currentUserId)}
        onclick={() => handleReactionClick(reaction.emoji)}
        title={reaction.emoji}
      >
        <span class="emoji">{EMOJI_MAP[reaction.emoji] || reaction.emoji}</span>
        <span class="count">{reaction.userIds.length}</span>
      </button>
    {/if}
  {/each}

  <div class="picker-wrapper">
    <button class="add-reaction-btn" onclick={() => { showPicker = !showPicker; }} title="Add reaction">
      +
    </button>
    {#if showPicker}
      <div class="emoji-picker">
        {#each ALL_EMOJIS as emoji}
          <button
            class="emoji-option"
            onclick={() => handlePickerSelect(emoji)}
            title={emoji}
          >
            {EMOJI_MAP[emoji]}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .reaction-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .reaction-chip {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border: 1px solid #334;
    border-radius: 12px;
    background: #1a1a2e;
    color: #ccc;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .reaction-chip:hover {
    background: #2a2a4e;
  }

  .reaction-chip.reacted {
    border-color: #7eb8da;
    background: #1e2d4a;
  }

  .emoji {
    font-size: 14px;
    line-height: 1;
  }

  .count {
    font-size: 11px;
  }

  .picker-wrapper {
    position: relative;
  }

  .add-reaction-btn {
    width: 24px;
    height: 24px;
    border: 1px solid #334;
    border-radius: 50%;
    background: #1a1a2e;
    color: #888;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .add-reaction-btn:hover {
    background: #2a2a4e;
    color: #eee;
  }

  .emoji-picker {
    position: absolute;
    bottom: 100%;
    left: 0;
    display: flex;
    gap: 2px;
    padding: 6px;
    background: #16213e;
    border: 1px solid #334;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    z-index: 10;
    margin-bottom: 4px;
  }

  .emoji-option {
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 4px;
    background: transparent;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .emoji-option:hover {
    background: #2a2a4e;
  }
</style>
