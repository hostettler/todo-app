import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import {
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from './ThemeProvider';

type MediaListener = (event: MediaQueryListEvent) => void;

interface MockMedia {
  setMatches: (matches: boolean) => void;
  cleanup: () => void;
}

function installMatchMedia(initialMatches: boolean): MockMedia {
  let matches = initialMatches;
  const listeners = new Set<MediaListener>();
  const original = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addListener: (cb: MediaListener) => listeners.add(cb),
    removeListener: (cb: MediaListener) => listeners.delete(cb),
    addEventListener: (_: string, cb: MediaListener) => listeners.add(cb),
    removeEventListener: (_: string, cb: MediaListener) => listeners.delete(cb),
    dispatchEvent: () => false,
  }));
  return {
    setMatches: (next: boolean) => {
      matches = next;
      listeners.forEach((cb) =>
        cb({ matches: next } as MediaQueryListEvent),
      );
    },
    cleanup: () => {
      window.matchMedia = original;
    },
  };
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeProvider', () => {
  let media: MockMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    media?.cleanup();
    vi.restoreAllMocks();
  });

  it('defaults to system theme and follows prefers-color-scheme', () => {
    media = installMatchMedia(true);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('persists explicit light/dark choices to localStorage', () => {
    media = installMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme('dark'));
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => result.current.setTheme('light'));
    expect(result.current.resolvedTheme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('clears localStorage when reverting to system', () => {
    media = installMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.resolvedTheme).toBe('dark');

    act(() => result.current.setTheme('system'));
    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('reacts to OS theme changes when in system mode', () => {
    media = installMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.resolvedTheme).toBe('light');

    act(() => media.setMatches(true));
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('throws when useTheme is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<UseThemeProbe />)).toThrow(
      /useTheme must be used within a ThemeProvider/,
    );
    spy.mockRestore();
  });
});

function UseThemeProbe() {
  useTheme();
  return null;
}
