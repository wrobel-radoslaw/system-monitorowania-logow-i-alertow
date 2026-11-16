import { useSyncExternalStore } from 'react';

export type Device = 'desktop' | 'tablet' | 'mobile';

// Same edges as Tailwind's md (768px) and lg (1024px).
const MOBILE_QUERY = '(max-width: 767px)';
const COMPACT_QUERY = '(max-width: 1023px)';

function matches(query: string) {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

function getDevice(): Device {
  if (matches(MOBILE_QUERY)) return 'mobile';
  if (matches(COMPACT_QUERY)) return 'tablet';
  return 'desktop';
}

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const lists = [MOBILE_QUERY, COMPACT_QUERY].map((query) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener('change', onChange));
  return () => lists.forEach((list) => list.removeEventListener('change', onChange));
}

/**
 * Which layout the viewport gets. Use it where a screen renders different markup (cards instead
 * of a table); plain style changes belong in Tailwind's md:/lg: variants.
 * Without matchMedia (jsdom) it reports desktop.
 */
export function useDevice(): Device {
  return useSyncExternalStore(subscribe, getDevice, (): Device => 'desktop');
}
