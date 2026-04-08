import { useNavigate } from 'react-router-dom';

import { Button, Card } from '../components/ui';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
      <Card className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-text-strong">Página não encontrada</h1>
        <p className="text-sm text-text-muted">O caminho informado não existe ou foi movido.</p>
        <Button onClick={() => navigate('/login')}>Ir para o login</Button>
      </Card>
    </div>
  );
}
