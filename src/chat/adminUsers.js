/**
 * ponytail: hardcode admin allowlist for now; upgrade path: server ACL.
 */

export const ADMIN_USERNAMES = new Set(['Bob']);

export function isAdminUsername(username) {
  if (!username) {
    return false;
  }
  return ADMIN_USERNAMES.has(String(username));
}
