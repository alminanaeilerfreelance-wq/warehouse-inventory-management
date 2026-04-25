/**
 * Safely convert any value to a renderable string
 * - Handles MongoDB objects with _id, name, title properties
 * - Handles arrays, primitives, and null/undefined
 * - Returns a string or React-safe value
 * 
 * @param {any} value - The value to render
 * @param {string} fallback - Fallback value if value is empty (default: '—')
 * @returns {string | null | undefined}
 */
export function renderSafeValue(value, fallback = '—') {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return fallback;
  }

  // Handle primitives (string, number, boolean)
  if (typeof value !== 'object') {
    return value === '' ? fallback : String(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.length === 0 ? fallback : `[${value.length} items]`;
  }

  // Handle objects - extract meaningful properties
  if (value.name) return value.name;
  if (value.title) return value.title;
  if (value.label) return value.label;
  if (value._id) {
    return typeof value._id === 'string' ? value._id : String(value._id);
  }
  if (value.id) {
    return typeof value.id === 'string' ? value.id : String(value.id);
  }

  // Object with no identifiable property
  return fallback;
}

/**
 * Wrapper for Material-UI components that safely renders values
 * Usage: in renderCell functions or Typography/Box children
 * 
 * Example:
 * <Typography>{renderSafe(row.category)}</Typography>
 */
export const renderSafe = renderSafeValue;

export default renderSafeValue;
