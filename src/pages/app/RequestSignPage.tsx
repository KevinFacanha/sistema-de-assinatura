import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PdfViewer } from '../../components/pdf/PdfViewer';
import { Alert, Button, Card, PageHeader, Stepper, SummaryCard } from '../../components/ui';
import { buildProfessionalSignatureLabel } from '../../lib/professionalDisplayName';
import type { SignRequest, SignRequestDocument } from '../../lib/requests';
import {
  createSignedDocumentUrl,
  getCurrentProfessionalDisplayName,
  getProfessionalRequest,
  listRequestDocuments,
  signRequestAsProfessional,
} from '../../lib/requests';

export function RequestSignPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<SignRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<SignRequestDocument[]>([]);

  useEffect(() => {
    if (!id) return;

    const loadRequest = async () => {
      try {
        const [requestData, requestDocuments] = await Promise.all([getProfessionalRequest(id), listRequestDocuments(id)]);
        setRequest(requestData);
        setDocuments(requestDocuments);

        const primaryPath = requestDocuments[0]?.storage_path ?? requestData?.storage_path ?? null;
        if (primaryPath) {
          const signedUrl = await createSignedDocumentUrl(primaryPath, 1800);
          setOriginalPdfUrl(signedUrl);
        } else {
          setOriginalPdfUrl(null);
        }
        setErrorMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao carregar solicitação.';
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [id]);

  const handleSign = async () => {
    if (!id || !request) return;
    setSubmitting(true);

    try {
      const signer = await getCurrentProfessionalDisplayName();
      await signRequestAsProfessional(id, buildProfessionalSignatureLabel(signer));
      navigate(`/requests/${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível assinar.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Assinatura profissional"
        description="Revise os dados e confirme para gerar o link único do paciente."
      />

      <Stepper
        steps={[
          { id: 'patient', label: 'Paciente e documento', status: 'completed' },
          { id: 'professional-sign', label: 'Assinatura profissional', status: 'current' },
          { id: 'share-link', label: 'Compartilhar link', status: 'upcoming' },
        ]}
      />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      {loading ? (
        <Card className="p-4 text-sm text-text-muted">Carregando solicitação...</Card>
      ) : !request ? (
        <Card className="p-4 text-sm text-text-muted">Solicitação não encontrada.</Card>
      ) : (
        <>
          <SummaryCard
            title="Confirmação rápida"
            items={[
              { label: 'Solicitação', value: request.id.slice(0, 8).toUpperCase() },
              { label: 'Paciente', value: request.patient_name },
              { label: 'Documento', value: request.document_title },
              { label: 'Documentos', value: documents.length > 0 ? documents.length.toString() : '1' },
              { label: 'Arquivo principal', value: documents[0]?.file_name ?? request.file_name ?? 'documento.pdf' },
              { label: 'Hash', value: request.document_hash },
            ]}
          />

          <Card className="space-y-3">
            <Alert variant="info">
              Ao confirmar, o sistema muda o status para <strong>Aguardando paciente</strong> e habilita o link com código de
              acesso.
            </Alert>
            {originalPdfUrl ? <PdfViewer fileUrl={originalPdfUrl} title="PDF original anexado" /> : null}
            {documents.length > 0 ? (
              <div className="space-y-2 rounded-md border border-border-soft bg-surface-1 p-3">
                <p className="text-xs text-text-muted">Documentos desta solicitação</p>
                <ul className="space-y-2">
                  {documents.map((document) => (
                    <li key={document.id} className="flex flex-col gap-2 rounded-md bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-strong">{document.title}</p>
                        <p className="text-xs text-text-muted">{document.file_name}</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          try {
                            const url = await createSignedDocumentUrl(document.storage_path, 1200);
                            window.open(url, '_blank', 'noopener,noreferrer');
                          } catch (error) {
                            const message = error instanceof Error ? error.message : 'Falha ao abrir documento.';
                            setErrorMessage(message);
                          }
                        }}
                      >
                        Abrir PDF
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => navigate('/requests/new')}>
                Voltar
              </Button>
              <Button onClick={handleSign} disabled={submitting}>
                {submitting ? 'Assinando...' : 'Assinar e gerar link'}
              </Button>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
