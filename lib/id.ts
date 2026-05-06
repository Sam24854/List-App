/*
 * Tiny helper for generating unique IDs.
 *
 * `crypto.randomUUID()` is available in all modern browsers and Node 19+.
 * Wrapping it in our own function means if we ever need to swap implementations
 * (e.g., to use a server-generated ID), only this file changes.
 */

export function newId(): string {
  return crypto.randomUUID();
}
