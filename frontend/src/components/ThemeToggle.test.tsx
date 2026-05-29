import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeToggle } from './ThemeToggle';
import { THEME_STORAGE_KEY, ThemeProvider } from '../theme/ThemeProvider';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('opens the menu and exposes the three options', async () => {
    renderToggle();
    await userEvent.click(
      screen.getByRole('button', { name: /toggle theme/i }),
    );
    expect(await screen.findByRole('menuitem', { name: /system/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /dark/i })).toBeInTheDocument();
  });

  it('switches to dark when selecting Dark', async () => {
    renderToggle();
    await userEvent.click(
      screen.getByRole('button', { name: /toggle theme/i }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: /dark/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('switches to light when selecting Light', async () => {
    renderToggle();
    await userEvent.click(
      screen.getByRole('button', { name: /toggle theme/i }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: /light/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('clears the persisted choice when reselecting System', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderToggle();
    await userEvent.click(
      screen.getByRole('button', { name: /toggle theme/i }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: /system/i }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
