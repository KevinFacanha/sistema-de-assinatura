import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { getCurrentSession, onAuthStateChange } from '../../lib/requests';

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const session = await getCurrentSession();
        if (!mounted) return;
        setAuthenticated(Boolean(session));
      } catch {
        if (!mounted) return;
        setAuthenticated(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    check();

    const { data } = onAuthStateChange((session) => {
      setAuthenticated(Boolean(session));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="panel p-6">
        <p className="text-sm text-text-muted">Carregando sessão...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
