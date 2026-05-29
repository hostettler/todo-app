import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { resetAuth0Mock, setAuth0Mock } from './test/utils';
import { ThemeProvider } from './theme/ThemeProvider';
import { App } from './App';

function renderAt(route: string) {
  resetAuth0Mock();
  setAuth0Mock({ isAuthenticated: false });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App routing', () => {
  it('shows landing page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /todo app/i })).toBeInTheDocument();
  });

  it('redirects unknown routes to /', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('heading', { name: /todo app/i })).toBeInTheDocument();
  });

  it('renders nav links', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^todos$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^tags$/i })).toBeInTheDocument();
  });
});
