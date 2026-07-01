/**
 * Convert a raw base64 string (as returned by Odoo) into a React Native
 * Image-compatible data URI.
 *
 * Detects the actual MIME type from the base64 magic bytes instead of
 * assuming PNG — Odoo can return JPEG, PNG, GIF, or WebP depending on
 * the original upload.
 *
 * Handles all falsy shapes Odoo sends when there is no image:
 *   Python False → JSON false, empty string, undefined, null.
 */
export function avatarUri(
  raw: string | false | null | undefined,
): string | undefined {
  if (!raw) {return undefined;}
  if (raw.startsWith('data:')) {return raw;}   // already a full data URI

  // Detect format from leading base64 magic bytes
  let mime = 'image/jpeg';                     // most common for photos
  if (raw.startsWith('iVBOR')) {mime = 'image/png';}
  else if (raw.startsWith('R0lGO')) {mime = 'image/gif';}
  else if (raw.startsWith('UklGR')) {mime = 'image/webp';}

  return `data:${mime};base64,${raw}`;
}
