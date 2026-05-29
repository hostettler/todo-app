import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function LandingPage() {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 py-16 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Todo app
        </h1>
        <p className="text-lg text-muted-foreground">
          A small multi-user todo tracker. Sign in to manage your todos and
          tags.
        </p>
      </div>

      {isAuthenticated ? (
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center">
            <Button asChild variant="default">
              <Link to="/todos">
                Your todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/tags">
                Your tags
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button size="lg" onClick={() => loginWithRedirect()}>
          Sign in to get started
        </Button>
      )}
    </section>
  );
}
