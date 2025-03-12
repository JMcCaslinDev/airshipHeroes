/**
 * Collision Detection Module
 * 
 * Handles collision detection between various game objects.
 */

/**
 * Check if two axis-aligned bounding boxes (AABBs) intersect
 * @param {Object} box1 - First box {min: {x, y, z}, max: {x, y, z}}
 * @param {Object} box2 - Second box {min: {x, y, z}, max: {x, y, z}}
 * @returns {Boolean} - Whether the boxes intersect
 */
export function checkAABBIntersection(box1, box2) {
  return (
    box1.min.x <= box2.max.x &&
    box1.max.x >= box2.min.x &&
    box1.min.y <= box2.max.y &&
    box1.max.y >= box2.min.y &&
    box1.min.z <= box2.max.z &&
    box1.max.z >= box2.min.z
  );
}

/**
 * Check if a point is inside an AABB
 * @param {Object} point - The point {x, y, z}
 * @param {Object} box - The box {min: {x, y, z}, max: {x, y, z}}
 * @returns {Boolean} - Whether the point is inside the box
 */
export function isPointInBox(point, box) {
  return (
    point.x >= box.min.x &&
    point.x <= box.max.x &&
    point.y >= box.min.y &&
    point.y <= box.max.y &&
    point.z >= box.min.z &&
    point.z <= box.max.z
  );
}

/**
 * Check if a ray intersects with an AABB
 * @param {Object} rayOrigin - Ray origin point {x, y, z}
 * @param {Object} rayDirection - Normalized ray direction {x, y, z}
 * @param {Object} box - The box {min: {x, y, z}, max: {x, y, z}}
 * @returns {Object|null} - Intersection data or null if no intersection
 */
export function rayBoxIntersection(rayOrigin, rayDirection, box) {
  // Calculate inverse of ray direction to avoid division
  const invDir = {
    x: 1 / rayDirection.x,
    y: 1 / rayDirection.y,
    z: 1 / rayDirection.z
  };
  
  // Calculate intersections with box planes
  const tMin = {
    x: (box.min.x - rayOrigin.x) * invDir.x,
    y: (box.min.y - rayOrigin.y) * invDir.y,
    z: (box.min.z - rayOrigin.z) * invDir.z
  };
  
  const tMax = {
    x: (box.max.x - rayOrigin.x) * invDir.x,
    y: (box.max.y - rayOrigin.y) * invDir.y,
    z: (box.max.z - rayOrigin.z) * invDir.z
  };
  
  // Find the largest minimum value and smallest maximum value
  const tMinMax = Math.max(
    Math.max(
      Math.min(tMin.x, tMax.x),
      Math.min(tMin.y, tMax.y)
    ),
    Math.min(tMin.z, tMax.z)
  );
  
  const tMaxMin = Math.min(
    Math.min(
      Math.max(tMin.x, tMax.x),
      Math.max(tMin.y, tMax.y)
    ),
    Math.max(tMin.z, tMax.z)
  );
  
  // If tMaxMin < 0, the ray is intersecting the box but the box is behind the ray
  // If tMinMax > tMaxMin, the ray is missing the box
  if (tMaxMin < 0 || tMinMax > tMaxMin) {
    return null;
  }
  
  // Calculate intersection point
  const t = tMinMax;
  const intersectionPoint = {
    x: rayOrigin.x + rayDirection.x * t,
    y: rayOrigin.y + rayDirection.y * t,
    z: rayOrigin.z + rayDirection.z * t
  };
  
  // Determine which face was hit
  let normal = { x: 0, y: 0, z: 0 };
  
  if (t === tMin.x) normal = { x: -1, y: 0, z: 0 };
  else if (t === tMax.x) normal = { x: 1, y: 0, z: 0 };
  else if (t === tMin.y) normal = { x: 0, y: -1, z: 0 };
  else if (t === tMax.y) normal = { x: 0, y: 1, z: 0 };
  else if (t === tMin.z) normal = { x: 0, y: 0, z: -1 };
  else if (t === tMax.z) normal = { x: 0, y: 0, z: 1 };
  
  return {
    distance: t,
    point: intersectionPoint,
    normal
  };
}

/**
 * Check if a sphere intersects with an AABB
 * @param {Object} sphereCenter - Sphere center {x, y, z}
 * @param {Number} sphereRadius - Sphere radius
 * @param {Object} box - The box {min: {x, y, z}, max: {x, y, z}}
 * @returns {Boolean} - Whether the sphere intersects the box
 */
export function sphereBoxIntersection(sphereCenter, sphereRadius, box) {
  // Find the closest point on the box to the sphere center
  const closestPoint = {
    x: Math.max(box.min.x, Math.min(sphereCenter.x, box.max.x)),
    y: Math.max(box.min.y, Math.min(sphereCenter.y, box.max.y)),
    z: Math.max(box.min.z, Math.min(sphereCenter.z, box.max.z))
  };
  
  // Calculate squared distance between the closest point and sphere center
  const distanceSquared = 
    Math.pow(closestPoint.x - sphereCenter.x, 2) +
    Math.pow(closestPoint.y - sphereCenter.y, 2) +
    Math.pow(closestPoint.z - sphereCenter.z, 2);
  
  // If the distance is less than the radius, there is an intersection
  return distanceSquared <= (sphereRadius * sphereRadius);
}

/**
 * Generate an AABB for a block at a given position
 * @param {Object} position - Block position {x, y, z}
 * @param {Number} size - Block size (default: 1)
 * @returns {Object} - AABB {min: {x, y, z}, max: {x, y, z}}
 */
export function generateBlockAABB(position, size = 1) {
  const halfSize = size / 2;
  
  return {
    min: {
      x: position.x - halfSize,
      y: position.y - halfSize,
      z: position.z - halfSize
    },
    max: {
      x: position.x + halfSize,
      y: position.y + halfSize,
      z: position.z + halfSize
    }
  };
} 