// Scanline flood fill on ImageData

/**
 * Flood fill starting at (startX, startY) with the given color.
 * Exact color match (no tolerance).
 * Operates on ctx directly via getImageData/putImageData.
 */
export function floodFill(ctx, startX, startY, fillColor) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const sx = Math.round(startX);
  const sy = Math.round(startY);
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return;

  const targetIdx = (sy * width + sx) * 4;
  const targetR = data[targetIdx];
  const targetG = data[targetIdx + 1];
  const targetB = data[targetIdx + 2];
  const targetA = data[targetIdx + 3];

  const fill = hexToRgba(fillColor);

  // Don't fill if target color matches fill color
  if (targetR === fill.r && targetG === fill.g && targetB === fill.b && targetA === fill.a) return;

  const stack = [[sx, sy]];
  const visited = new Uint8Array(width * height);

  while (stack.length > 0) {
    let [x, y] = stack.pop();

    // Move to leftmost matching pixel in this row
    while (x > 0 && matchesTarget(data, ((y * width + x - 1) * 4), targetR, targetG, targetB, targetA)) {
      x--;
    }

    let spanAbove = false;
    let spanBelow = false;

    while (x < width && matchesTarget(data, ((y * width + x) * 4), targetR, targetG, targetB, targetA)) {
      const idx = (y * width + x) * 4;
      data[idx] = fill.r;
      data[idx + 1] = fill.g;
      data[idx + 2] = fill.b;
      data[idx + 3] = fill.a;
      visited[y * width + x] = 1;

      if (y > 0) {
        const aboveIdx = ((y - 1) * width + x) * 4;
        const aboveMatches = matchesTarget(data, aboveIdx, targetR, targetG, targetB, targetA);
        if (aboveMatches && !spanAbove && !visited[(y - 1) * width + x]) {
          stack.push([x, y - 1]);
          spanAbove = true;
        } else if (!aboveMatches) {
          spanAbove = false;
        }
      }

      if (y < height - 1) {
        const belowIdx = ((y + 1) * width + x) * 4;
        const belowMatches = matchesTarget(data, belowIdx, targetR, targetG, targetB, targetA);
        if (belowMatches && !spanBelow && !visited[(y + 1) * width + x]) {
          stack.push([x, y + 1]);
          spanBelow = true;
        } else if (!belowMatches) {
          spanBelow = false;
        }
      }

      x++;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function matchesTarget(data, idx, r, g, b, a) {
  return data[idx] === r && data[idx + 1] === g && data[idx + 2] === b && data[idx + 3] === a;
}

function hexToRgba(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
    a: 255
  };
}
