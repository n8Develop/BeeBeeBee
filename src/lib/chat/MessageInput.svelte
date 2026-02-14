<script>
  import { socket } from '$lib/socket.svelte.js';
  import { settings } from '$lib/settings.svelte.js';
  import { canvasState } from '$lib/canvas/state.svelte.js';
  import { messageSent } from '$lib/canvas/sounds.js';
  import Canvas from '$lib/canvas/Canvas.svelte';

  let { roomId } = $props();

  let textContent = $state('');
  let imageFile = $state(null);
  let imagePreview = $state(null);
  let uploading = $state(false);
  let uploadError = $state(null);
  let fileInputEl = $state(null);

  // Typing indicator state
  let isTyping = $state(false);
  let typingTimeout = null;

  function playSendSound() {
    const vol = settings.sendVolume * settings.masterVolume;
    if (vol > 0) messageSent(vol);
  }

  function handleTextInput() {
    if (!isTyping) {
      isTyping = true;
      socket.startTyping(roomId);
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isTyping = false;
      socket.stopTyping(roomId);
    }, 2000);
  }

  function stopTypingNow() {
    if (isTyping) {
      isTyping = false;
      clearTimeout(typingTimeout);
      socket.stopTyping(roomId);
    }
  }

  function sendDrawing() {
    const data = canvasState.exportOps();
    if (data.operations.length === 0) return;
    socket.sendMessage(roomId, 'drawing', data);
    canvasState.reset();
    playSendSound();
  }

  function sendText() {
    const trimmed = textContent.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) return;
    socket.sendMessage(roomId, 'text', trimmed);
    textContent = '';
    stopTypingNow();
    playSendSound();
  }

  function handleTextKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    imageFile = file;
    uploadError = null;

    const reader = new FileReader();
    reader.onload = (ev) => {
      imagePreview = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function sendImage() {
    if (!imageFile) return;
    uploading = true;
    uploadError = null;

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed');
      }

      socket.sendMessage(roomId, 'image', data.url);
      clearImage();
      playSendSound();
    } catch (err) {
      uploadError = err.message;
    } finally {
      uploading = false;
    }
  }

  function clearImage() {
    imageFile = null;
    imagePreview = null;
    uploadError = null;
    if (fileInputEl) fileInputEl.value = '';
  }

  let inputDisabled = $derived(!socket.connected);
</script>

<div class="message-input">
  {#if socket.sendError}
    <div class="send-error">{socket.sendError}</div>
  {/if}

  <!-- Canvas always visible -->
  <div class="draw-area">
    <Canvas />
    <button class="send-drawing-btn" onclick={sendDrawing} disabled={inputDisabled}>Send Drawing</button>
  </div>

  <!-- Text input bar -->
  <div class="text-bar">
    <button class="attach-btn" onclick={() => fileInputEl?.click()} title="Attach image" disabled={inputDisabled}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
      </svg>
    </button>
    <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onchange={handleFileChange} bind:this={fileInputEl} class="file-input" />
    <textarea
      class="text-input"
      bind:value={textContent}
      oninput={handleTextInput}
      onkeydown={handleTextKeydown}
      onblur={stopTypingNow}
      placeholder={inputDisabled ? 'Disconnected...' : 'Type a message... (Shift+Enter for newline)'}
      maxlength="2000"
      rows="1"
      disabled={inputDisabled}
    ></textarea>
    <button class="send-text-btn" onclick={sendText} disabled={!textContent.trim() || inputDisabled} title="Send message">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
      </svg>
    </button>
  </div>

  <!-- Image preview bar (only when image selected) -->
  {#if imagePreview}
    <div class="image-bar">
      <img src={imagePreview} alt="Preview" class="image-thumb" />
      <span class="image-name">{imageFile?.name}</span>
      <button class="image-remove" onclick={clearImage} title="Remove image">&times;</button>
      <button class="image-send-btn" onclick={sendImage} disabled={uploading || inputDisabled}>
        {uploading ? 'Uploading...' : 'Send Image'}
      </button>
      {#if uploadError}
        <span class="error">{uploadError}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .message-input {
    border-top: 1px solid var(--border);
    background: var(--bg-panel);
  }

  .send-error {
    padding: 6px 12px;
    background: #3a1a1a;
    color: #f87171;
    font-size: 12px;
    text-align: center;
    border-bottom: 1px solid #543;
  }

  .draw-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px;
  }

  .send-drawing-btn {
    padding: 6px 16px;
    border: none;
    border-radius: 4px;
    background: var(--accent-btn);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
  }

  .send-drawing-btn:hover:not(:disabled), .send-drawing-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .send-drawing-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .text-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-top: 1px solid #2a2a4e;
  }

  .attach-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .attach-btn:hover:not(:disabled), .attach-btn:active:not(:disabled) {
    background: #2a2a4e;
    color: var(--accent);
  }

  .attach-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .file-input {
    display: none;
  }

  .text-input {
    flex: 1;
    padding: 7px 14px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--bg-deep);
    color: var(--text);
    font-family: inherit;
    font-size: 16px;
    outline: none;
    min-width: 0;
    resize: none;
    overflow-y: auto;
    max-height: 80px;
    line-height: 1.4;
    field-sizing: content;
  }

  .text-input:focus {
    border-color: var(--accent);
  }

  .text-input::placeholder {
    color: #555;
  }

  .text-input:disabled {
    opacity: 0.5;
  }

  .send-text-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: var(--accent-btn);
    color: var(--text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .send-text-btn:hover:not(:disabled), .send-text-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .send-text-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .image-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-top: 1px solid #2a2a4e;
    background: var(--bg-deep);
  }

  .image-thumb {
    width: 36px;
    height: 36px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .image-name {
    font-size: 12px;
    color: #aaa;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .image-remove {
    padding: 2px 8px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: #e55;
    font-size: 18px;
    cursor: pointer;
    flex-shrink: 0;
    line-height: 1;
  }

  .image-remove:hover, .image-remove:active {
    background: rgba(200, 50, 50, 0.2);
  }

  .image-send-btn {
    padding: 5px 12px;
    border: none;
    border-radius: 4px;
    background: var(--accent-btn);
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
    flex-shrink: 0;
    margin-left: auto;
  }

  .image-send-btn:hover:not(:disabled), .image-send-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .image-send-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .error {
    color: #e55;
    font-size: 12px;
  }
</style>
