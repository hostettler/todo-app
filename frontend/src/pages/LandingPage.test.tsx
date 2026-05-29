import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuth0Mock, setAuth0Mock, withProviders } from '../test/utils';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('shows sign in button when anonymous', async () => {
    resetAuth0Mock();
    setAuth0Mock({ isAuthenticated: false });
    render(withProviders(<LandingPage />));
    expect(
      screen.getByRole('button', { name: /sign in to get started/i }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  });

  it('shows quick links when authenticated', () => {
    resetAuth0Mock();
    setAuth0Mock({ isAuthenticated: true });
    render(withProviders(<LandingPage />));
    expect(screen.getByRole('link', { name: /your todos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /your tags/i })).toBeInTheDocument();
  });
});
