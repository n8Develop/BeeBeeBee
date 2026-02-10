// Catmull-Rom spline interpolation for smooth strokes

/**
 * Skip points that are too close together during capture.
 * Returns true if the point should be added.
 */
export function shouldAddPoint(prev, next, minDist = 2) {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  return dx * dx + dy * dy >= minDist * minDist;
}

/**
 * Catmull-Rom interpolation between control points.
 * Passes through all original points (no drift).
 * Returns array of {x, y, pressure} with subdivisions between each pair.
 */
export function catmullRomPoints(points, subdivisions = 6) {
  if (points.length < 2) return [...points];
  if (points.length === 2) return lerp2(points[0], points[1], subdivisions);

  const result = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    for (let j = 0; j < subdivisions; j++) {
      const t = j / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;

      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );
      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );
      const pressure = p1.pressure + (p2.pressure - p1.pressure) * t;

      result.push({ x, y, pressure });
    }
  }

  // Add the last point
  result.push({ ...points[points.length - 1] });
  return result;
}

function lerp2(a, b, steps) {
  const result = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    result.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      pressure: a.pressure + (b.pressure - a.pressure) * t
    });
  }
  return result;
}
