import { ReactNode, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

/**
 * Route guard: triggers `loginWithRedirect` for unauthenticated users and
 * renders the protected subtree only once Auth0 reports an authenticated
 * session.  Returns a small placeholder while Auth0 is initialising or the
 * redirect is in flight.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void loginWithRedirect({
        appState: { returnTo: window.location.pathname + window.location.search },
      });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isLoading) return <p>Loading…</p>;
  if (!isAuthenticated) return <p>Redirecting to sign-in…</p>;
  return <>{children}</>;
}
