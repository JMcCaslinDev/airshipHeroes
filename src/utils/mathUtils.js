/**
 * Math Utility Functions
 * 
 * Common math operations used throughout the game.
 */

/**
 * Clamp a value between a minimum and maximum
 * @param {Number} value - The value to clamp
 * @param {Number} min - The minimum value
 * @param {Number} max - The maximum value
 * @returns {Number} - The clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param {Number} a - Start value
 * @param {Number} b - End value
 * @param {Number} t - Interpolation factor (0-1)
 * @returns {Number} - The interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Calculate the distance between two points in 3D space
 * @param {Object} point1 - First point {x, y, z}
 * @param {Object} point2 - Second point {x, y, z}
 * @returns {Number} - The distance between the points
 */
export function distance3D(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const dz = point2.z - point1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate the distance between two points in 2D space (ignoring y)
 * @param {Object} point1 - First point {x, z}
 * @param {Object} point2 - Second point {x, z}
 * @returns {Number} - The distance between the points
 */
export function distance2D(point1, point2) {
  const dx = point2.x - point1.x;
  const dz = point2.z - point1.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Convert degrees to radians
 * @param {Number} degrees - Angle in degrees
 * @returns {Number} - Angle in radians
 */
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {Number} radians - Angle in radians
 * @returns {Number} - Angle in degrees
 */
export function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param {Number} min - Minimum value
 * @param {Number} max - Maximum value
 * @returns {Number} - Random integer
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Rotate a 2D vector by an angle
 * @param {Object} vector - The vector to rotate {x, z}
 * @param {Number} angle - The angle to rotate by (in radians)
 * @returns {Object} - The rotated vector {x, z}
 */
export function rotateVector2D(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  return {
    x: vector.x * cos - vector.z * sin,
    z: vector.x * sin + vector.z * cos
  };
} 