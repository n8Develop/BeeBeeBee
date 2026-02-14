// Tool handlers — each returns {onPointerDown, onPointerMove, onPointerUp}
// In-progress data is stored locally, NOT in the operations array.

import { canvasState } from './state.svelte.js';
import { replayOperations, renderLiveStroke, renderPreviewShape } from './render.js';
import { shouldAddPoint } from './smoothing.js';
import { floodFill } from './flood-fill.js';
import { stamps } from './stamps.js';
import * as sounds from './sounds.js';
import { settings } from '../settings.svelte.js';

function inputVol() {
  return settings.inputVolume * settings.masterVolume;
}

function getCanvasPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
    pressure: e.pressure || 0.5
  };
}

// ─── Pen / Eraser ────────────────────────────────────────

function createStrokeTool(eraser = false) {
  let points = [];
  let active = false;

  return {
    onPointerDown(ctx, e) {
      const pos = getCanvasPos(ctx.canvas, e);
      points = [pos];
      active = true;
      canvasState.drawing = true;
      if (canvasState.soundEnabled) {
        sounds.penDown(inputVol());
        sounds.resetMoveTracking();
      }
    },

    onPointerMove(ctx, e) {
      if (!active) return;
      const pos = getCanvasPos(ctx.canvas, e);
      const last = points[points.length - 1];
      if (!shouldAddPoint(last, pos)) return;

      points.push(pos);

      if (canvasState.soundEnabled) sounds.moveTick(pos.x, pos.y, inputVol());

      // Redraw committed ops + live stroke
      replayOperations(ctx, canvasState.operations);
      renderLiveStroke(ctx, points, canvasState.color, canvasState.brushSize, eraser);
    },

    onPointerUp(ctx, e) {
      if (!active) return;
      active = false;
      canvasState.drawing = false;

      if (points.length >= 2) {
        canvasState.commit({
          type: 'stroke',
          points: [...points],
          color: canvasState.color,
          size: canvasState.brushSize,
          eraser
        });
      }
      points = [];
    }
  };
}

export const penTool = createStrokeTool(false);
export const eraserTool = createStrokeTool(true);

// ─── Shape tools (line, rect, ellipse) ───────────────────

function createShapeTool(shape) {
  let startX, startY, active = false;

  return {
    onPointerDown(ctx, e) {
      const pos = getCanvasPos(ctx.canvas, e);
      startX = pos.x;
      startY = pos.y;
      active = true;
      canvasState.drawing = true;
    },

    onPointerMove(ctx, e) {
      if (!active) return;
      const pos = getCanvasPos(ctx.canvas, e);

      // Rubber-band preview: replay + draw preview shape
      replayOperations(ctx, canvasState.operations);
      renderPreviewShape(ctx, shape, startX, startY, pos.x, pos.y, canvasState.color, canvasState.brushSize);
    },

    onPointerUp(ctx, e) {
      if (!active) return;
      active = false;
      canvasState.drawing = false;
      const pos = getCanvasPos(ctx.canvas, e);

      canvasState.commit({
        type: 'shape',
        shape,
        x1: startX,
        y1: startY,
        x2: pos.x,
        y2: pos.y,
        color: canvasState.color,
        size: canvasState.brushSize
      });
    }
  };
}

export const lineTool = createShapeTool('line');
export const rectTool = createShapeTool('rect');
export const ellipseTool = createShapeTool('ellipse');

// ─── Fill tool ───────────────────────────────────────────

export const fillTool = {
  onPointerDown(ctx, e) {
    const pos = getCanvasPos(ctx.canvas, e);
    canvasState.commit({
      type: 'fill',
      x: pos.x,
      y: pos.y,
      color: canvasState.color
    });
  },
  onPointerMove() {},
  onPointerUp() {}
};

// ─── Text tool ───────────────────────────────────────────
// Text tool is special — it requires a DOM input overlay.
// The Canvas.svelte component handles the input element.
// This just provides the operation commit.

export const textTool = {
  // These are overridden by Canvas.svelte which manages the text input overlay
  onPointerDown() {},
  onPointerMove() {},
  onPointerUp() {}
};

export function commitText(x, y, content, color, fontSize) {
  if (!content.trim()) return;
  canvasState.commit({
    type: 'text',
    x,
    y,
    content,
    color,
    fontSize
  });
}

// ─── Stamp tool ──────────────────────────────────────────

export const stampTool = {
  onPointerDown(ctx, e) {
    const pos = getCanvasPos(ctx.canvas, e);
    if (canvasState.soundEnabled) sounds.stampPlace(inputVol());

    canvasState.commit({
      type: 'stamp',
      x: pos.x,
      y: pos.y,
      stampId: canvasState.selectedStamp,
      size: 32,
      color: canvasState.color
    });
  },
  onPointerMove() {},
  onPointerUp() {}
};

// ─── Tool map ────────────────────────────────────────────

export const tools = {
  pen: penTool,
  eraser: eraserTool,
  line: lineTool,
  rect: rectTool,
  ellipse: ellipseTool,
  fill: fillTool,
  text: textTool,
  type: textTool,
  textbox: textTool,
  stamp: stampTool
};

export function getActiveTool() {
  return tools[canvasState.tool] || penTool;
}
