import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { resetAuth0Mock, makeQueryClient } from '../test/utils';
import { useCurrentUser } from './useCurrentUser';

function wrapper({ children }: { children: ReactNode }) {
  const client = makeQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCurrentUser', () => {
  it('fetches the /me endpoint and returns the user', async () => {
    resetAuth0Mock();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ id: 'u1', authSubject: 'auth0|x', email: 'a@b' })),
      ),
    );
    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('u1');
    vi.unstubAllGlobals();
  });
});
