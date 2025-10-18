/**
 * @fileoverview useMediaQuery Hook - Responsive breakpoint detection
 * @description React hook for detecting media query changes
 * @version 1.0.0
 */

import { useEffect, useState } from 'react';

/**
 * Hook to detect media query matches
 *
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @returns boolean indicating if the query matches
 *
 * @example
 * ```tsx
 * const isDesktop = useMediaQuery('(min-width: 768px)');
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Create media query list
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Define event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener (modern browsers)
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Common breakpoint queries (Tailwind CSS)
 */
export const mediaQueries = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;
