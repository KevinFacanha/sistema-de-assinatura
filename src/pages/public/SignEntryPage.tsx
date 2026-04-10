import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Alert, Button, Card, StatusPill } from '../../components/ui';
import { openPublicRequest } from '../../lib/requests';
import { PublicFlowHeader } from './PublicFlowHeader';

type EntryPayload = {
  id: string;
  document_title: string;
  status: 'awaiting_patient' | 'opened' | 'completed';
  professional_signed_at: string | null;
  patient_opened_at: string | null;
  completed_at: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SignEntryPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<EntryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const data = await openPublicRequest(token);
        setPayload(data as EntryPayload | null);
        if (!data) {
          setErrorMessage('Este link está indisponível ou expirou.');
        } else {
          setErrorMessage(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível abrir o link.';
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const normalizedToken = token ?? '';

  return (
    <div className="space-y-6">
      <PublicFlowHeader
        title="Assinatura solicitada"
        description="Confirme o acesso para seguir com a validação do código e a assinatura."
        currentStep="entry"
      />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      {loading ? (
        <Card className="p-4 text-sm text-text-muted">Validando link...</Card>
      ) : payload ? (
        <Card className="space-y-3">
          <p className="text-sm text-text-muted">Documento: {payload.document_title}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Status:</span>
            <StatusPill status={payload.status} />
          </div>
          <p className="text-sm text-text-muted">Assinado pelo profissional: {formatDateTime(payload.professional_signed_at)}</p>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Button
          onClick={() =>
            navigate(payload?.status === 'completed' ? `/sign/${normalizedToken}/completed` : `/sign/${normalizedToken}/otp`)
          }
          disabled={!payload}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
