/**
 * Check whether a point is inside a polygon.
 *
 * point:
 * {
 *   latitude: number,
 *   longitude: number
 * }
 *
 * polygon:
 * [
 *   [longitude, latitude],
 *   [longitude, latitude],
 *   ...
 * ]
 */
const isPointInPolygon = (point, polygon) => {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  const x = Number(point.longitude);
  const y = Number(point.latitude);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }

  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = Number(polygon[i][0]);
    const yi = Number(polygon[i][1]);

    const xj = Number(polygon[j][0]);
    const yj = Number(polygon[j][1]);

    if (
      !Number.isFinite(xi) ||
      !Number.isFinite(yi) ||
      !Number.isFinite(xj) ||
      !Number.isFinite(yj)
    ) {
      continue;
    }

    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

module.exports = {
  isPointInPolygon,
};
