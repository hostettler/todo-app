import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { ThemeProvider } from '../theme/ThemeProvider';

// Stub the Auth0 hook globally so the hooks we want to test can resolve
// `useAuth0()` without a real `Auth0Provider`.  Each test gets the same
// authenticated identity unless overridden via `setAuth0Mock`.

let auth0State = {
  isAuthenticated: true,
  isLoading: false,
  user: { email: 'alice@example.com', name: 'alice' },
  getAccessTokenSilently: vi.fn(async () => 'fake-token'),
  loginWithRedirect: vi.fn(),
  logout: vi.fn(),
};

export function setAuth0Mock(partial: Partial<typeof auth0State>) {
  auth0State = { ...auth0State, ...partial };
}

export function resetAuth0Mock() {
  auth0State = {
    isAuthenticated: true,
    isLoading: false,
    user: { email: 'alice@example.com', name: 'alice' },
    getAccessTokenSilently: vi.fn(async () => 'fake-token'),
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  };
}

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => auth0State,
  Auth0Provider: ({ children }: { children: ReactNode }) => children,
}));

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function withProviders(ui: ReactNode, opts: { route?: string } = {}) {
  const client = makeQueryClient();
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[opts.route ?? '/']}>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
