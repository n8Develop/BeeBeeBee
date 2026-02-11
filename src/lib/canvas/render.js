// Canvas operations renderer — pure functions

import { catmullRomPoints } from './smoothing.js';
import { floodFill } from './flood-fill.js';
import { stamps } from './stamps.js';

/**
 * Replay all operations on a canvas context.
 * Clears to white first, then draws each op sequentially.
 */
export function replayOperations(ctx, ops) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.save();

  for (const op of ops) {
    renderSingleOp(ctx, op);
  }

  ctx.restore();
}

/**
 * Render a single operation onto the canvas.
 */
export function renderSingleOp(ctx, op) {
  switch (op.type) {
    case 'stroke': renderStroke(ctx, op); break;
    case 'shape': renderShape(ctx, op); break;
    case 'fill': renderFill(ctx, op); break;
    case 'text': renderText(ctx, op); break;
    case 'stamp': renderStamp(ctx, op); break;
    case 'clear': renderClear(ctx); break;
  }
}

function renderStroke(ctx, op) {
  if (op.points.length < 2) return;

  ctx.save();
  if (op.eraser) {
    ctx.globalCompositeOperation = 'destination-out';
  }

  const smoothed = catmullRomPoints(op.points);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = op.eraser ? '#000000' : op.color;

  // Draw segments with pressure-modulated width
  for (let i = 1; i < smoothed.length; i++) {
    const prev = smoothed[i - 1];
    const curr = smoothed[i];
    const pressure = (prev.pressure + curr.pressure) / 2;
    ctx.lineWidth = op.size * (0.3 + 0.7 * pressure);

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }

  ctx.restore();
}

function renderShape(ctx, op) {
  ctx.save();
  ctx.strokeStyle = op.color;
  ctx.lineWidth = op.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  switch (op.shape) {
    case 'line':
      ctx.moveTo(op.x1, op.y1);
      ctx.lineTo(op.x2, op.y2);
      break;
    case 'rect':
      ctx.rect(op.x1, op.y1, op.x2 - op.x1, op.y2 - op.y1);
      break;
    case 'ellipse': {
      const cx = (op.x1 + op.x2) / 2;
      const cy = (op.y1 + op.y2) / 2;
      const rx = Math.abs(op.x2 - op.x1) / 2;
      const ry = Math.abs(op.y2 - op.y1) / 2;
      ctx.ellipse(cx, cy, rx || 0.1, ry || 0.1, 0, 0, Math.PI * 2);
      break;
    }
  }
  ctx.stroke();
  ctx.restore();
}

function renderFill(ctx, op) {
  floodFill(ctx, op.x, op.y, op.color);
}

/**
 * Calculate wrapped lines for canvas text.
 * Returns { lines, lastLineWidth } for cursor positioning.
 */
export function getTextWrapInfo(ctx, text, x, fontSize, canvasWidth) {
  const maxWidth = canvasWidth - x - 4;
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < text.length; i++) {
    const testLine = currentLine + text[i];
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = text[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lastLine = lines[lines.length - 1] || '';
  return { lines, lastLineWidth: ctx.measureText(lastLine).width };
}

function renderText(ctx, op) {
  ctx.save();
  ctx.fillStyle = op.color;
  ctx.font = `${op.fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';

  const info = getTextWrapInfo(ctx, op.content, op.x, op.fontSize, ctx.canvas.width);
  const lineHeight = op.fontSize + 4;
  let y = op.y;
  for (const line of info.lines) {
    ctx.fillText(line, op.x, y);
    y += lineHeight;
  }

  ctx.restore();
}

function renderStamp(ctx, op) {
  const stampDef = stamps.find(s => s.id === op.stampId);
  if (!stampDef) return;

  ctx.save();
  const scale = op.size / stampDef.size;
  ctx.translate(op.x - op.size / 2, op.y - op.size / 2);
  ctx.scale(scale, scale);

  const path = new Path2D(stampDef.path);
  ctx.fillStyle = op.color || '#000000';
  ctx.fill(path);
  ctx.restore();
}

function renderClear(ctx) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
}

/**
 * Draw a preview stroke (for live drawing, not committed yet).
 * Does NOT save/restore — caller handles that.
 */
export function renderLiveStroke(ctx, points, color, size, eraser) {
  if (points.length < 2) return;

  ctx.save();
  if (eraser) {
    ctx.globalCompositeOperation = 'destination-out';
  }

  const smoothed = catmullRomPoints(points);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = eraser ? '#000000' : color;

  for (let i = 1; i < smoothed.length; i++) {
    const prev = smoothed[i - 1];
    const curr = smoothed[i];
    const pressure = (prev.pressure + curr.pressure) / 2;
    ctx.lineWidth = size * (0.3 + 0.7 * pressure);

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a preview shape (rubber-band during drag).
 */
export function renderPreviewShape(ctx, shape, x1, y1, x2, y2, color, size) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  switch (shape) {
    case 'line':
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      break;
    case 'rect':
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      break;
    case 'ellipse': {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      ctx.ellipse(cx, cy, rx || 0.1, ry || 0.1, 0, 0, Math.PI * 2);
      break;
    }
  }
  ctx.stroke();
  ctx.restore();
}
