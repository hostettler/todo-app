import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { resetAuth0Mock, setAuth0Mock, withProviders } from '../test/utils';
import { RequireAuth } from './RequireAuth';

describe('RequireAuth', () => {
  it('renders children when authenticated', () => {
    resetAuth0Mock();
    setAuth0Mock({ isAuthenticated: true, isLoading: false });
    render(withProviders(<RequireAuth><p>secret</p></RequireAuth>));
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('shows loading placeholder while Auth0 initialises', () => {
    resetAuth0Mock();
    setAuth0Mock({ isLoading: true, isAuthenticated: false });
    render(withProviders(<RequireAuth><p>secret</p></RequireAuth>));
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('triggers loginWithRedirect when anonymous', async () => {
    resetAuth0Mock();
    const loginWithRedirect = vi.fn();
    setAuth0Mock({ isLoading: false, isAuthenticated: false, loginWithRedirect });
    render(withProviders(<RequireAuth><p>secret</p></RequireAuth>));
    await waitFor(() => expect(loginWithRedirect).toHaveBeenCalled());
    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
  });
});
