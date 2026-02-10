<script>
  import { socket } from '$lib/socket.svelte.js';
  import { canvasState } from '$lib/canvas/state.svelte.js';
  import Canvas from '$lib/canvas/Canvas.svelte';

  let { roomId } = $props();

  let activeTab = $state('draw');
  let textContent = $state('');
  let imageFile = $state(null);
  let imagePreview = $state(null);
  let uploading = $state(false);
  let uploadError = $state(null);

  // Typing indicator state
  let isTyping = $state(false);
  let typingTimeout = null;

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
  }

  function sendText() {
    const trimmed = textContent.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) return;
    socket.sendMessage(roomId, 'text', trimmed);
    textContent = '';
    stopTypingNow();
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

    // Create preview
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

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed');
      }

      socket.sendMessage(roomId, 'image', data.url);
      imageFile = null;
      imagePreview = null;
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
  }
</script>

<div class="message-input">
  <div class="tabs">
    <button class="tab" class:active={activeTab === 'draw'} onclick={() => { activeTab = 'draw'; }}>Draw</button>
    <button class="tab" class:active={activeTab === 'text'} onclick={() => { activeTab = 'text'; }}>Text</button>
    <button class="tab" class:active={activeTab === 'image'} onclick={() => { activeTab = 'image'; }}>Image</button>
  </div>

  <div class="input-area">
    {#if activeTab === 'draw'}
      <div class="draw-area">
        <Canvas />
        <button class="send-btn" onclick={sendDrawing}>Send Drawing</button>
      </div>
    {:else if activeTab === 'text'}
      <div class="text-area">
        <textarea
          bind:value={textContent}
          oninput={handleTextInput}
          onkeydown={handleTextKeydown}
          onblur={stopTypingNow}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          maxlength="2000"
          rows="3"
        ></textarea>
        <div class="text-footer">
          <span class="char-count">{textContent.length}/2000</span>
          <button class="send-btn" onclick={sendText} disabled={!textContent.trim()}>Send</button>
        </div>
      </div>
    {:else if activeTab === 'image'}
      <div class="image-area">
        {#if imagePreview}
          <div class="image-preview-container">
            <img src={imagePreview} alt="Preview" class="image-preview" />
            <button class="clear-image-btn" onclick={clearImage}>Remove</button>
          </div>
        {:else}
          <label class="file-label">
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onchange={handleFileChange}
              class="file-input"
            />
            <span class="file-label-text">Choose an image</span>
          </label>
        {/if}
        {#if uploadError}
          <p class="error">{uploadError}</p>
        {/if}
        {#if imagePreview}
          <button class="send-btn" onclick={sendImage} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Send Image'}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .message-input {
    border-top: 1px solid #334;
    background: #16213e;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #2a2a4e;
  }

  .tab {
    flex: 1;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: #888;
    font-size: 13px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab:hover {
    color: #ccc;
  }

  .tab.active {
    color: #7eb8da;
    border-bottom-color: #7eb8da;
  }

  .input-area {
    padding: 8px;
  }

  .draw-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .text-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #334;
    border-radius: 6px;
    background: #1a1a2e;
    color: #eee;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    min-height: 60px;
    outline: none;
  }

  textarea:focus {
    border-color: #7eb8da;
  }

  textarea::placeholder {
    color: #555;
  }

  .text-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .char-count {
    font-size: 11px;
    color: #666;
  }

  .image-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .file-input {
    display: none;
  }

  .file-label {
    cursor: pointer;
  }

  .file-label-text {
    display: inline-block;
    padding: 12px 24px;
    border: 2px dashed #334;
    border-radius: 8px;
    color: #888;
    font-size: 14px;
    transition: border-color 0.15s, color 0.15s;
  }

  .file-label-text:hover {
    border-color: #7eb8da;
    color: #7eb8da;
  }

  .image-preview-container {
    position: relative;
    display: inline-block;
  }

  .image-preview {
    max-width: 300px;
    max-height: 200px;
    border-radius: 4px;
    display: block;
  }

  .clear-image-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 2px 8px;
    border: none;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.7);
    color: #eee;
    font-size: 11px;
    cursor: pointer;
  }

  .clear-image-btn:hover {
    background: rgba(200, 50, 50, 0.8);
  }

  .send-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    background: #2a5a8a;
    color: #eee;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .send-btn:hover:not(:disabled) {
    background: #3a7aba;
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .error {
    color: #e55;
    font-size: 12px;
  }
</style>
