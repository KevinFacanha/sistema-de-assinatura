import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Alert, Button, Card } from '../../components/ui';
import type { PublicReviewDocument } from '../../lib/requests';
import { createSignedDocumentUrl, getPublicReviewRequest, listPublicReviewDocuments } from '../../lib/requests';
import { PublicFlowHeader } from './PublicFlowHeader';

type CompletionPayload = {
  document_title: string;
  completed_at: string | null;
  signed_final_pdf_path: string | null;
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

export function SignCompletedPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<CompletionPayload | null>(null);
  const [documents, setDocuments] = useState<PublicReviewDocument[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([getPublicReviewRequest(token), listPublicReviewDocuments(token)])
      .then(([data, reviewDocuments]) => {
        if (!data) {
          setErrorMessage('Não foi possível localizar esta assinatura.');
          return;
        }
        setDocuments(reviewDocuments);
        setPayload({
          document_title: data.document_title,
          completed_at: data.completed_at,
          signed_final_pdf_path: data.signed_final_pdf_path,
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Falha ao carregar confirmação.';
        setErrorMessage(message);
      });
  }, [token]);

  return (
    <div className="space-y-6">
      <PublicFlowHeader
        title="Assinatura concluída"
        description="Seu documento foi finalizado com sucesso."
        currentStep="completed"
      />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      <Card className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-600">
          OK
        </div>
        <p className="text-sm text-text-muted">Solicitação: {payload?.document_title ?? '-'}</p>
        <p className="text-sm text-text-muted">Documentos: {documents.length > 0 ? documents.length : 1}</p>
        <p className="text-sm text-text-muted">Concluído em: {formatDateTime(payload?.completed_at ?? null)}</p>
      </Card>

      {documents.length > 0 ? (
        <Card className="space-y-3">
          <ul className="space-y-2">
            {documents.map((document) => (
              <li key={document.id} className="flex flex-col gap-2 rounded-md border border-border-soft bg-surface-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-text-strong">{document.title}</p>
                  <p className="text-xs text-text-muted">{document.file_name}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const path = document.signed_final_pdf_path ?? document.signed_professional_pdf_path;
                    if (!path) return;
                    try {
                      const url = await createSignedDocumentUrl(path, 1200);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    } catch (error: unknown) {
                      const message =
                        error instanceof Error ? error.message : 'Não foi possível abrir o PDF da solicitação.';
                      setErrorMessage(message);
                    }
                  }}
                  disabled={!document.signed_final_pdf_path && !document.signed_professional_pdf_path}
                >
                  Ver PDF
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            if (!payload?.signed_final_pdf_path) return;
            try {
              const url = await createSignedDocumentUrl(payload.signed_final_pdf_path, 1200);
              window.open(url, '_blank', 'noopener,noreferrer');
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'Não foi possível abrir o PDF final.';
              setErrorMessage(message);
            }
          }}
          disabled={!payload?.signed_final_pdf_path}
        >
          Ver PDF final
        </Button>
        <Button variant="secondary" onClick={() => navigate('/login')}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
