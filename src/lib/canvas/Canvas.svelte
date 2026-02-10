<script>
  import { canvasState } from './state.svelte.js';
  import { replayOperations } from './render.js';
  import { getActiveTool, commitText } from './tools.js';
  import { palette } from './palette.js';
  import { stamps } from './stamps.js';
  import { initAudio, keyTick } from './sounds.js';

  const brushSizes = [2, 4, 8, 14, 22];
  const fontSizes = [12, 16, 20, 24];
  const toolList = [
    { id: 'pen', label: 'Pen', icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z' },
    { id: 'eraser', label: 'Eraser', icon: 'M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4 4 0 01-5.66 0L3.51 17.7a2.01 2.01 0 010-2.84l10.6-10.6a2 2 0 012.83 0l-.7-.7zM4.22 15.57a.5.5 0 000 .71l2.83 2.83a2.5 2.5 0 003.54 0L14 15.7 9.05 10.75l-4.83 4.82z' },
    { id: 'line', label: 'Line', icon: 'M4 20L20 4' },
    { id: 'rect', label: 'Rect', icon: 'M3 3h18v18H3z' },
    { id: 'ellipse', label: 'Ellipse', icon: 'M12 6a9 6 0 100 12 9 6 0 000-12z' },
    { id: 'fill', label: 'Fill', icon: 'M16.56 8.94L7.62 0 6.21 1.42l2.38 2.38-5.15 5.15a1.49 1.49 0 000 2.12l5.5 5.5a1.49 1.49 0 002.12 0l5.5-5.5a1.49 1.49 0 000-2.13zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5a2 2 0 004 0c0-1.33-2-3.5-2-3.5z' },
    { id: 'type', label: 'Type', icon: 'M5 4v3h5.5v12h3V7H19V4z' },
    { id: 'textbox', label: 'TextBox', icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5zm3 4v2h8V9H8zm0 4v2h5v-2H8z' },
    { id: 'stamp', label: 'Stamp', icon: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z' },
  ];

  function isTextTool(tool) {
    return tool === 'type' || tool === 'textbox';
  }

  let canvasEl = $state(null);
  let containerEl = $state(null);
  let ctx = null;
  let showStampPicker = $state(false);
  let audioInitialized = false;
  let initialized = false;

  // Text cursor state
  let textCursorX = $state(10);
  let textCursorY = $state(20);
  let textBuffer = $state('');
  let textCursorVisible = $state(false);
  let cursorBlinkInterval = null;
  let textboxPlaced = false;

  $effect(() => {
    if (canvasEl && !initialized) {
      initialized = true;
      ctx = canvasEl.getContext('2d');
      replayOperations(ctx, canvasState.operations);
    }
  });

  $effect(() => {
    const ops = canvasState.operations;
    const isDrawing = canvasState.drawing;
    if (ctx && !isDrawing) {
      replayOperations(ctx, ops);
      if (isTextTool(canvasState.tool)) {
        drawTextPreview();
      }
    }
  });

  $effect(() => {
    if (isTextTool(canvasState.tool)) {
      if (canvasState.tool === 'type') {
        textCursorX = 10;
        textCursorY = 20;
        textboxPlaced = false;
        startCursorBlink();
      } else {
        textboxPlaced = false;
      }
      requestAnimationFrame(() => containerEl?.focus());
    } else {
      stopCursorBlink();
      textboxPlaced = false;
      commitPendingText();
    }
  });

  function startCursorBlink() {
    stopCursorBlink();
    textCursorVisible = true;
    cursorBlinkInterval = setInterval(() => {
      textCursorVisible = !textCursorVisible;
      if (ctx && isTextTool(canvasState.tool)) {
        replayOperations(ctx, canvasState.operations);
        drawTextPreview();
      }
    }, 530);
  }

  function stopCursorBlink() {
    if (cursorBlinkInterval) {
      clearInterval(cursorBlinkInterval);
      cursorBlinkInterval = null;
    }
    textCursorVisible = false;
  }

  function drawTextPreview() {
    if (!ctx) return;
    const fontSize = canvasState.fontSize;
    ctx.save();
    ctx.font = `${fontSize}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';

    if (textBuffer) {
      ctx.fillStyle = canvasState.color;
      ctx.fillText(textBuffer, textCursorX, textCursorY);
    }

    if (textCursorVisible) {
      const textWidth = textBuffer ? ctx.measureText(textBuffer).width : 0;
      ctx.fillStyle = canvasState.color;
      ctx.fillRect(textCursorX + textWidth, textCursorY, 2, fontSize);
    }

    ctx.restore();
  }

  function commitPendingText() {
    if (textBuffer.trim()) {
      commitText(textCursorX, textCursorY, textBuffer, canvasState.color, canvasState.fontSize);
      if (ctx) {
        ctx.font = `${canvasState.fontSize}px system-ui, sans-serif`;
        textCursorX += ctx.measureText(textBuffer).width;
      }
    }
    textBuffer = '';
  }

  function ensureAudio() {
    if (!audioInitialized) {
      initAudio();
      audioInitialized = true;
    }
  }

  function handlePointerDown(e) {
    ensureAudio();
    canvasEl.setPointerCapture(e.pointerId);

    if (canvasState.tool === 'type') {
      containerEl?.focus();
      return;
    }

    if (canvasState.tool === 'textbox') {
      commitPendingText();
      const rect = canvasEl.getBoundingClientRect();
      textCursorX = e.clientX - rect.left;
      textCursorY = e.clientY - rect.top;
      textboxPlaced = true;
      startCursorBlink();
      replayOperations(ctx, canvasState.operations);
      drawTextPreview();
      containerEl?.focus();
      return;
    }

    getActiveTool().onPointerDown(ctx, e);
  }

  function handlePointerMove(e) {
    getActiveTool().onPointerMove(ctx, e);
  }

  function handlePointerUp(e) {
    canvasEl.releasePointerCapture(e.pointerId);
    getActiveTool().onPointerUp(ctx, e);
  }

  function handleKeydown(e) {
    if (!isTextTool(canvasState.tool)) return;
    if (canvasState.tool === 'textbox' && !textboxPlaced) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      commitPendingText();
      if (canvasState.tool === 'type') {
        textCursorX = 10;
        textCursorY += canvasState.fontSize + 4;
      } else {
        textboxPlaced = false;
        stopCursorBlink();
      }
      replayOperations(ctx, canvasState.operations);
      drawTextPreview();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (textBuffer.length > 0) {
        textBuffer = textBuffer.slice(0, -1);
        replayOperations(ctx, canvasState.operations);
        drawTextPreview();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      textBuffer = '';
      replayOperations(ctx, canvasState.operations);
      drawTextPreview();
    } else if (e.ctrlKey || e.metaKey) {
      if (e.key === 'a') {
        e.preventDefault();
      } else if (e.key === 'c') {
        e.preventDefault();
        if (textBuffer) navigator.clipboard.writeText(textBuffer);
      } else if (e.key === 'x') {
        e.preventDefault();
        if (textBuffer) {
          navigator.clipboard.writeText(textBuffer);
          textBuffer = '';
          replayOperations(ctx, canvasState.operations);
          drawTextPreview();
        }
      } else if (e.key === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          if (text) {
            textBuffer += text;
            if (canvasState.soundEnabled) keyTick();
            startCursorBlink();
            replayOperations(ctx, canvasState.operations);
            drawTextPreview();
          }
        });
      }
    } else if (e.key.length === 1) {
      e.preventDefault();
      textBuffer += e.key;
      if (canvasState.soundEnabled) keyTick();
      startCursorBlink();
      replayOperations(ctx, canvasState.operations);
      drawTextPreview();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="canvas-container" bind:this={containerEl} tabindex="0" onkeydown={handleKeydown}>
  <div class="canvas-layout">
    <!-- Left: tool icons -->
    <div class="tool-strip">
      <div class="tool-grid">
        {#each toolList as t}
          <button
            class="icon-btn"
            class:active={canvasState.tool === t.id}
            onclick={() => { canvasState.tool = t.id; showStampPicker = t.id === 'stamp'; }}
            title={t.label}
          >
            {#if t.id === 'line'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d={t.icon} />
              </svg>
            {:else if t.id === 'rect'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d={t.icon} />
              </svg>
            {:else if t.id === 'ellipse'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d={t.icon} />
              </svg>
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d={t.icon} />
              </svg>
            {/if}
          </button>
        {/each}
        <!-- Empty cell to fill 2-column grid -->
        <div class="icon-spacer"></div>
      </div>
      <div class="tool-divider"></div>
      <div class="tool-grid">
        <button class="icon-btn" onclick={() => canvasState.undo()} disabled={canvasState.operations.length === 0} title="Undo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
          </svg>
        </button>
        <button class="icon-btn" onclick={() => canvasState.redo()} disabled={canvasState.redoStack.length === 0} title="Redo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
          </svg>
        </button>
        <button class="icon-btn" onclick={() => canvasState.clear()} title="Clear">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
        <button
          class="icon-btn"
          class:active={canvasState.soundEnabled}
          onclick={() => canvasState.soundEnabled = !canvasState.soundEnabled}
          title={canvasState.soundEnabled ? 'Sound On' : 'Sound Off'}
        >
          {#if canvasState.soundEnabled}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          {/if}
        </button>
      </div>
    </div>

    <!-- Center: canvas -->
    <div class="canvas-wrap">
      <canvas
        bind:this={canvasEl}
        width={600}
        height={200}
        style="touch-action: none;"
        onpointerdown={handlePointerDown}
        onpointermove={handlePointerMove}
        onpointerup={handlePointerUp}
      ></canvas>
    </div>

    <!-- Right: palette + sizes -->
    <div class="options-panel">
      <div class="palette">
        {#each palette as c}
          <button
            class="color-swatch"
            class:active={canvasState.color === c}
            style="background: {c};"
            onclick={() => canvasState.color = c}
            title={c}
          ></button>
        {/each}
      </div>

      {#if isTextTool(canvasState.tool)}
        <div class="size-section">
          <span class="size-label">Font</span>
          <div class="size-row">
            {#each fontSizes as fs}
              <button
                class="size-btn"
                class:active={canvasState.fontSize === fs}
                onclick={() => canvasState.fontSize = fs}
              >{fs}</button>
            {/each}
          </div>
        </div>
      {:else}
        <div class="size-section">
          <span class="size-label">Brush</span>
          <div class="size-row">
            {#each brushSizes as s}
              <button
                class="size-btn"
                class:active={canvasState.brushSize === s}
                onclick={() => canvasState.brushSize = s}
                title="Size {s}"
              >
                <span class="size-dot" style="width: {Math.min(s, 14)}px; height: {Math.min(s, 14)}px;"></span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Stamp picker below the 3-column layout -->
  {#if showStampPicker && canvasState.tool === 'stamp'}
    <div class="stamp-picker">
      {#each stamps as s}
        <button
          class="stamp-btn"
          class:active={canvasState.selectedStamp === s.id}
          onclick={() => canvasState.selectedStamp = s.id}
          title={s.label}
        >
          <svg viewBox="0 0 {s.size} {s.size}" width="24" height="24">
            <path d={s.path} fill="currentColor" />
          </svg>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .canvas-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px;
    background: #16213e;
    border-radius: 8px;
    width: fit-content;
  }

  .canvas-container:focus {
    outline: none;
  }

  .canvas-layout {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  /* Left tool strip */
  .tool-strip {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .tool-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2px;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #334;
    border-radius: 3px;
    background: #1a1a2e;
    color: #ccc;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .icon-btn:hover {
    background: #2a2a4e;
  }

  .icon-btn.active {
    background: #3a3a6e;
    color: #fff;
    border-color: #557;
  }

  .icon-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .icon-spacer {
    width: 28px;
    height: 28px;
  }

  .tool-divider {
    height: 1px;
    background: #334;
    margin: 2px 0;
  }

  /* Center canvas */
  .canvas-wrap {
    position: relative;
    border: 2px solid #334;
    border-radius: 2px;
    line-height: 0;
    flex-shrink: 0;
  }

  canvas {
    background: #fff;
    cursor: crosshair;
    display: block;
  }

  /* Right options panel */
  .options-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .palette {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
  }

  .color-swatch {
    width: 18px;
    height: 18px;
    border: 2px solid transparent;
    border-radius: 2px;
    cursor: pointer;
    padding: 0;
  }

  .color-swatch.active {
    border-color: #fff;
    outline: 1px solid #000;
  }

  .size-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .size-label {
    font-size: 10px;
    color: #888;
    text-align: center;
  }

  .size-row {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    justify-content: center;
  }

  .size-btn {
    width: 26px;
    height: 26px;
    border: 1px solid #334;
    border-radius: 3px;
    background: #1a1a2e;
    color: #ccc;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
  }

  .size-btn.active {
    background: #3a3a6e;
    border-color: #557;
  }

  .size-dot {
    background: #ccc;
    border-radius: 50%;
    display: block;
  }

  .stamp-picker {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    padding: 6px;
    background: #1a1a2e;
    border: 1px solid #334;
    border-radius: 4px;
  }

  .stamp-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #334;
    border-radius: 3px;
    background: #16213e;
    color: #ccc;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
  }

  .stamp-btn.active {
    background: #3a3a6e;
    border-color: #557;
    color: #fff;
  }

  .stamp-btn:hover {
    background: #2a2a4e;
  }
</style>
