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
    { id: 'pen', label: 'Pen' },
    { id: 'eraser', label: 'Eraser' },
    { id: 'line', label: 'Line' },
    { id: 'rect', label: 'Rect' },
    { id: 'ellipse', label: 'Ellipse' },
    { id: 'fill', label: 'Fill' },
    { id: 'type', label: 'Type' },
    { id: 'textbox', label: 'Text Box' },
    { id: 'stamp', label: 'Stamp' },
  ];

  function isTextTool(tool) {
    return tool === 'type' || tool === 'textbox';
  }

  let canvasEl = $state(null);
  let containerEl = $state(null);
  let ctx = null; // Not reactive — set once during init
  let showStampPicker = $state(false);
  let audioInitialized = false;
  let initialized = false;

  // Text cursor state
  let textCursorX = $state(10);
  let textCursorY = $state(20);
  let textBuffer = $state('');
  let textCursorVisible = $state(false);
  let cursorBlinkInterval = null;
  let textboxPlaced = false; // For textbox tool: must click before typing

  // Init canvas context once the element is bound
  $effect(() => {
    if (canvasEl && !initialized) {
      initialized = true;
      ctx = canvasEl.getContext('2d');
      replayOperations(ctx, canvasState.operations);
    }
  });

  // Replay when operations change (undo/redo/commit)
  $effect(() => {
    const ops = canvasState.operations;
    const isDrawing = canvasState.drawing;
    if (ctx && !isDrawing) {
      replayOperations(ctx, ops);
      // Re-draw text preview + cursor if in a text mode
      if (isTextTool(canvasState.tool)) {
        drawTextPreview();
      }
    }
  });

  // Start/stop cursor blink when text tool is selected/deselected
  $effect(() => {
    if (isTextTool(canvasState.tool)) {
      if (canvasState.tool === 'type') {
        // Type tool: cursor ready immediately, reset to default position
        textCursorX = 10;
        textCursorY = 20;
        textboxPlaced = false;
        startCursorBlink();
      } else {
        // Text Box tool: wait for click before showing cursor
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

    // Draw the in-progress text
    if (textBuffer) {
      ctx.fillStyle = canvasState.color;
      ctx.fillText(textBuffer, textCursorX, textCursorY);
    }

    // Draw blinking cursor
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
      // Move cursor after committed text
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
      // Type tool: clicks do nothing (just type)
      containerEl?.focus();
      return;
    }

    if (canvasState.tool === 'textbox') {
      // Text Box tool: click to place cursor, then type there
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
    // Text Box requires a click to place before typing
    if (canvasState.tool === 'textbox' && !textboxPlaced) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      commitPendingText();
      if (canvasState.tool === 'type') {
        // Type tool: advance to next line
        textCursorX = 10;
        textCursorY += canvasState.fontSize + 4;
      } else {
        // Text Box: commit and wait for next click
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
      // Ctrl/Cmd shortcuts
      if (e.key === 'a') {
        e.preventDefault();
        // Select all is implicit — copy/cut operate on entire buffer
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
      // Reset blink so cursor stays visible while typing
      startCursorBlink();
      replayOperations(ctx, canvasState.operations);
      drawTextPreview();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="canvas-container" bind:this={containerEl} tabindex="0" onkeydown={handleKeydown}>
  <!-- Toolbar -->
  <div class="toolbar">
    <!-- Tool buttons -->
    <div class="tool-group">
      {#each toolList as t}
        <button
          class="tool-btn"
          class:active={canvasState.tool === t.id}
          onclick={() => { canvasState.tool = t.id; showStampPicker = t.id === 'stamp'; }}
        >{t.label}</button>
      {/each}
    </div>

    <div class="separator"></div>

    <!-- Undo / Redo / Clear -->
    <div class="tool-group">
      <button class="tool-btn" onclick={() => canvasState.undo()} disabled={canvasState.operations.length === 0}>Undo</button>
      <button class="tool-btn" onclick={() => canvasState.redo()} disabled={canvasState.redoStack.length === 0}>Redo</button>
      <button class="tool-btn" onclick={() => canvasState.clear()}>Clear</button>
    </div>

    <div class="separator"></div>

    <!-- Sound toggle -->
    <button
      class="tool-btn"
      class:active={canvasState.soundEnabled}
      onclick={() => canvasState.soundEnabled = !canvasState.soundEnabled}
    >{canvasState.soundEnabled ? 'Sound On' : 'Sound Off'}</button>
  </div>

  <!-- Canvas area -->
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

  <!-- Bottom bar: palette + sizes -->
  <div class="bottom-bar">
    <!-- Color palette -->
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

    <!-- Brush size -->
    <div class="size-group">
      <span class="size-label">Brush</span>
      {#each brushSizes as s}
        <button
          class="size-btn"
          class:active={canvasState.brushSize === s}
          onclick={() => canvasState.brushSize = s}
          title="Size {s}"
        >
          <span class="size-dot" style="width: {Math.min(s, 16)}px; height: {Math.min(s, 16)}px;"></span>
        </button>
      {/each}
    </div>

    <!-- Font size (shown when text tool active) -->
    {#if isTextTool(canvasState.tool)}
      <div class="size-group">
        <span class="size-label">Font</span>
        {#each fontSizes as fs}
          <button
            class="size-btn"
            class:active={canvasState.fontSize === fs}
            onclick={() => canvasState.fontSize = fs}
          >{fs}</button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Stamp picker -->
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
    gap: 8px;
    padding: 12px;
    background: #16213e;
    border-radius: 8px;
    width: fit-content;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .tool-group {
    display: flex;
    gap: 2px;
  }

  .separator {
    width: 1px;
    height: 24px;
    background: #334;
    margin: 0 4px;
  }

  .tool-btn {
    padding: 4px 8px;
    border: 1px solid #334;
    border-radius: 3px;
    background: #1a1a2e;
    color: #ccc;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }

  .tool-btn:hover {
    background: #2a2a4e;
  }

  .tool-btn.active {
    background: #3a3a6e;
    color: #fff;
    border-color: #557;
  }

  .tool-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .canvas-wrap {
    position: relative;
    border: 2px solid #334;
    border-radius: 2px;
    line-height: 0;
  }

  canvas {
    background: #fff;
    cursor: crosshair;
    display: block;
  }

  .canvas-container:focus {
    outline: none;
  }

  .bottom-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .palette {
    display: grid;
    grid-template-columns: repeat(14, 1fr);
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

  .size-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .size-label {
    font-size: 11px;
    color: #888;
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
