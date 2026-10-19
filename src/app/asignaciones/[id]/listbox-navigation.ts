export type NavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

/**
 * Next highlighted option for a listbox with `count` options.
 * `current` is -1 when nothing is highlighted. Movement is clamped (no wrap),
 * so the person always knows where the list starts and ends.
 */
export function nextActiveIndex(key: NavigationKey, current: number, count: number): number {
  if (count <= 0) return -1;
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'ArrowDown':
      return current < 0 ? 0 : Math.min(current + 1, count - 1);
    case 'ArrowUp':
      return current < 0 ? count - 1 : Math.max(current - 1, 0);
  }
}
