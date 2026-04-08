import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, Button, Checkbox, Input } from '../../components/ui';
import { getCurrentSession, signInProfessional } from '../../lib/requests';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getCurrentSession();
        if (session) {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível validar a sessão.';
        setErrorMessage(message);
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    signInProfessional(email, password)
      .then(() => {
        navigate('/dashboard', { replace: true });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Não foi possível realizar o login.';
        setErrorMessage(message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="space-y-6 rounded-xl border border-border-soft bg-white p-6 shadow-md sm:p-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <p className="font-display text-2xl font-extrabold tracking-tight text-brand-primary sm:text-3xl">ClinicalSign</p>
          <p className="text-xs font-medium uppercase tracking-[0.13em] text-brand-secondary">Assinatura eletrônica</p>
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-semibold leading-tight text-text-strong">Entrar no painel profissional</h1>
          <p className="text-sm text-text-muted">Acesse suas solicitações, acompanhe o status e conclua assinaturas com clareza.</p>
        </div>
      </header>

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-medium text-text-muted">
            E-mail profissional
          </label>
          <Input
            id="email"
            type="email"
            placeholder="nome@clinica.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-lg border-slate-300 bg-slate-50/50 px-3.5 text-sm transition duration-150 ease-smooth hover:border-slate-400 focus:bg-white"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-xs font-medium text-text-muted">
            Senha
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-lg border-slate-300 bg-slate-50/50 px-3.5 text-sm transition duration-150 ease-smooth hover:border-slate-400 focus:bg-white"
            required
          />
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <Checkbox id="remember" label="Manter sessão ativa" />
          <button type="button" className="text-xs font-medium text-brand-secondary transition hover:opacity-80">
            Esqueci minha senha
          </button>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-lg text-sm font-semibold shadow-md hover:brightness-105"
          size="lg"
          disabled={submitting}
        >
          {submitting ? 'Entrando...' : 'Entrar'}
        </Button>

        <p className="text-center text-xs text-text-muted">Ambiente protegido com autenticação e rastreabilidade de acesso.</p>
      </form>
    </div>
  );
}
