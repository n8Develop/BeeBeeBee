<script>
  import { onMount } from 'svelte';
  import { replayOperations } from '$lib/canvas/render.js';

  let { content } = $props();
  let canvasEl = $state(null);

  onMount(() => {
    if (canvasEl && content && content.operations) {
      const ctx = canvasEl.getContext('2d');
      replayOperations(ctx, content.operations);
    }
  });

  // Re-render if content changes
  $effect(() => {
    if (canvasEl && content && content.operations) {
      const ctx = canvasEl.getContext('2d');
      replayOperations(ctx, content.operations);
    }
  });
</script>

<div class="drawing-message">
  <canvas
    bind:this={canvasEl}
    width={content?.width || 600}
    height={content?.height || 200}
  ></canvas>
</div>

<style>
  .drawing-message {
    padding: 4px 0;
    line-height: 0;
  }

  canvas {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    background: #fff;
    display: block;
  }
</style>
