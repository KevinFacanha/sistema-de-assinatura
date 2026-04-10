import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Alert, Button, Card, Input } from '../../components/ui';
import { getPublicReviewRequest, validatePublicAccessCode } from '../../lib/requests';
import { PublicFlowHeader } from './PublicFlowHeader';

export function SignOtpPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalizedToken = token ?? '';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedToken) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    validatePublicAccessCode(normalizedToken, accessCode)
      .then(async (ok) => {
        if (!ok) {
          setErrorMessage('Código inválido. Confira o código enviado pelo nutricionista.');
          return;
        }
        const latestRequest = await getPublicReviewRequest(normalizedToken);
        if (latestRequest && (latestRequest.status === 'completed' || latestRequest.patient_signed_at)) {
          setSuccessMessage('Solicitação já concluída. Redirecionando para a confirmação final.');
          navigate(`/sign/${normalizedToken}/completed`, { replace: true });
          return;
        }
        setSuccessMessage('Código validado com sucesso.');
        navigate(`/sign/${normalizedToken}/review`);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Não foi possível validar o código.';
        setErrorMessage(message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="space-y-6">
      <PublicFlowHeader
        title="Código de acesso"
        description="Digite o código informado pelo nutricionista para desbloquear o documento."
        currentStep="otp"
      />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Card className="space-y-2">
          <label htmlFor="otp-code" className="text-xs font-medium text-text-muted">
            Código de acesso
          </label>
          <Input
            id="otp-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="Digite 6 dígitos"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            required
          />
          <p className="text-xs text-text-muted">
            Não enviamos código por SMS/e-mail. O nutricionista compartilha este código junto com o link.
          </p>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate(`/sign/${normalizedToken}`)}>
            Voltar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Validando...' : 'Validar código'}
          </Button>
        </div>
      </form>
    </div>
  );
}
