/*
 * Class-name combiner.
 *
 * `clsx` filters out falsy values and joins classes — convenient for
 * conditional styling, e.g.:
 *   <div className={cn("base", isActive && "border-accent", error && "text-danger")} />
 */

import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
