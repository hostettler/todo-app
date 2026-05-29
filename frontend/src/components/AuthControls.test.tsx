import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuth0Mock, setAuth0Mock, withProviders } from '../test/utils';
import { AuthControls } from './AuthControls';

describe('AuthControls', () => {
  it('shows login button when anonymous', async () => {
    resetAuth0Mock();
    const loginWithRedirect = vi.fn();
    setAuth0Mock({ isAuthenticated: false, loginWithRedirect });
    render(withProviders(<AuthControls />));
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(loginWithRedirect).toHaveBeenCalled();
  });

  it('shows user email and logout when authenticated', async () => {
    resetAuth0Mock();
    const logout = vi.fn();
    setAuth0Mock({ isAuthenticated: true, logout });
    render(withProviders(<AuthControls />));
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /alice@example\.com/i }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /log out/i }),
    );
    expect(logout).toHaveBeenCalled();
  });

  it('shows placeholder while Auth0 is loading', () => {
    resetAuth0Mock();
    setAuth0Mock({ isLoading: true });
    render(withProviders(<AuthControls />));
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });
});
