/**
 * Concatenate class values into a single string. This helper mimics the
 * behaviour of libraries like `clsx` or `classnames`, but without any
 * external dependencies. It will remove falsy values and join the rest
 * with a single space.
 */
export function cn(...classes: any[]): string {
  return classes.filter(Boolean).join(" ");
}
