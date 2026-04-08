import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { getCurrentProfessionalDisplayName, getCurrentProfessionalProfile, signOutProfessional } from '../../lib/requests';
import { Button } from '../ui';

export function Topbar() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string>('Profissional');

  useEffect(() => {
    const loadSession = async () => {
      try {
        const profile = await getCurrentProfessionalProfile();
        if (profile?.full_name) {
          setDisplayName(profile.full_name);
          return;
        }

        const name = await getCurrentProfessionalDisplayName();
        setDisplayName(name);
      } catch {
        setDisplayName('Profissional');
      }
    };

    loadSession();
  }, []);

  const handleSignOut = () => {
    signOutProfessional()
      .then(() => {
        navigate('/login', { replace: true });
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border-soft bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[70px] max-w-[1320px] items-center justify-between px-4 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-secondary">ClinicalSign</p>
          <p className="font-display text-lg font-semibold text-brand-primary">Painel profissional</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-md border border-border-soft bg-surface-1 px-2.5 py-1 text-xs text-text-muted sm:inline">
            {displayName}
          </span>
          <Link
            to="/requests/new"
            className="inline-flex h-9 items-center justify-center rounded-md bg-gradient-primary px-3 text-xs font-medium text-white shadow-soft transition duration-150 ease-smooth hover:opacity-95"
          >
            Nova solicitação
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
