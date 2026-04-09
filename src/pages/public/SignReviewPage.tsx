import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PdfViewer } from '../../components/pdf/PdfViewer';
import { Alert, Badge, Button, Card, Checkbox, SummaryCard } from '../../components/ui';
import { appendSignaturePage } from '../../lib/pdfSigning';
import type { PublicReviewDocument, PublicReviewResult } from '../../lib/requests';
import {
  acceptPublicDocumentConsent,
  acceptPublicConsent,
  attachPublicFinalDocument,
  buildRequestDocumentPath,
  createSignedDocumentUrl,
  downloadDocumentBytes,
  getPublicReviewRequest,
  listPublicReviewDocuments,
  signPublicRequest,
  uploadPdfBytes,
} from '../../lib/requests';
import { sha256Hex, sha256HexFromBytes } from '../../lib/security';
import { PublicFlowHeader } from './PublicFlowHeader';

function formatDateTimeWithSeconds(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function SignReviewPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<PublicReviewResult | null>(null);
  const [documents, setDocuments] = useState<Array<PublicReviewDocument & { fromDatabase: boolean }>>([]);
  const [acceptedDocuments, setAcceptedDocuments] = useState<Record<string, boolean>>({});
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [previewDocumentUrl, setPreviewDocumentUrl] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedToken = token ?? '';

  useEffect(() => {
    if (!normalizedToken) return;
    const load = async () => {
      try {
        const [requestData, documentsData] = await Promise.all([
          getPublicReviewRequest(normalizedToken),
          listPublicReviewDocuments(normalizedToken),
        ]);

        setPayload(requestData);
        const mergedDocuments: Array<PublicReviewDocument & { fromDatabase: boolean }> =
          documentsData.length > 0
            ? documentsData.map((document) => ({ ...document, fromDatabase: true }))
            : requestData && requestData.signed_professional_pdf_path
              ? [
                  {
                    id: requestData.id,
                    request_id: requestData.id,
                    document_type: 'legacy',
                    title: requestData.document_title,
                    file_name: requestData.file_name ?? 'documento.pdf',
                    sort_order: 1,
                    is_required: true,
                    signed_professional_pdf_path: requestData.signed_professional_pdf_path,
                    signed_final_pdf_path: requestData.signed_final_pdf_path,
                    document_hash: requestData.document_hash,
                    consent_accepted_at: requestData.consent_accepted_at,
                    fromDatabase: false,
                  },
                ]
              : [];

        setDocuments(mergedDocuments);

        const initialAccepted: Record<string, boolean> = {};
        for (const document of mergedDocuments) {
          initialAccepted[document.id] = Boolean(document.consent_accepted_at);
        }
        setAcceptedDocuments(initialAccepted);

        if (!requestData) {
          setErrorMessage('Valide o código de acesso antes de revisar o documento.');
        } else if (mergedDocuments.length === 0) {
          setErrorMessage('Nenhum documento assinado pelo profissional está disponível.');
        } else {
          setErrorMessage(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar o documento.';
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [normalizedToken]);

  const isDocumentAccepted = (document: PublicReviewDocument) => {
    return Boolean(document.consent_accepted_at || acceptedDocuments[document.id]);
  };

  const requiredDocuments = documents.filter((document) => document.is_required);
  const allRequiredAccepted = requiredDocuments.every((document) => isDocumentAccepted(document));

  const handleOpenPdf = async (document: PublicReviewDocument) => {
    if (!document.signed_professional_pdf_path) return;
    try {
      const signedUrl = await createSignedDocumentUrl(document.signed_professional_pdf_path, 1200);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível abrir o PDF.';
      setErrorMessage(`${document.title}: ${message}`);
    }
  };

  const handlePreviewPdf = async (document: PublicReviewDocument) => {
    if (!document.signed_professional_pdf_path) return;
    try {
      const signedUrl = await createSignedDocumentUrl(document.signed_professional_pdf_path, 1200);
      setPreviewDocumentId(document.id);
      setPreviewDocumentUrl(signedUrl);
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível visualizar o PDF.';
      setErrorMessage(`${document.title}: ${message}`);
    }
  };

  const handleSign = async () => {
    if (!payload || documents.length === 0) return;
    if (!acceptTerms) {
      setErrorMessage('Você precisa aceitar os termos antes de assinar.');
      return;
    }
    if (!allRequiredAccepted) {
      setErrorMessage('Aceite todos os documentos obrigatórios antes de assinar.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      for (const document of documents) {
        if (document.fromDatabase && isDocumentAccepted(document) && !document.consent_accepted_at) {
          const accepted = await acceptPublicDocumentConsent(normalizedToken, document.id);
          if (!accepted) {
            setErrorMessage(`Não foi possível registrar o aceite do documento: ${document.title}`);
            return;
          }
        }
      }

      const consentOk = await acceptPublicConsent(normalizedToken);
      if (!consentOk) {
        setErrorMessage('Não foi possível registrar o aceite.');
        return;
      }

      const patientSignature = `Assinado por ${payload.patient_name} em ${formatDateTimeWithSeconds()}`;
      const finalDocumentsMeta: Array<{ id: string; path: string; hash: string }> = [];

      for (const document of documents) {
        if (!document.signed_professional_pdf_path) {
          continue;
        }

        let sourceBytes: Uint8Array;
        try {
          sourceBytes = await downloadDocumentBytes(document.signed_professional_pdf_path);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Falha ao carregar arquivo no Storage.';
          throw new Error(`Não foi possível carregar o PDF do documento "${document.title}": ${message}`);
        }

        const finalBytes = await appendSignaturePage(sourceBytes, {
          title: 'Assinatura final do paciente',
          lines: [
            `Documento: ${document.title}`,
            `Paciente: ${payload.patient_name}`,
            `Profissional: ${payload.professional_signature ?? 'Assinatura registrada'}`,
            patientSignature,
            `Aceite do paciente: ${isDocumentAccepted(document) ? 'confirmado' : 'não confirmado'}`,
            `Hash do documento anterior (SHA-256): ${document.document_hash}`,
          ],
        });

        const finalPdfPath = buildRequestDocumentPath(normalizedToken, 'final', `${document.id}-final-signed.pdf`);
        try {
          await uploadPdfBytes(finalPdfPath, finalBytes);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Falha ao salvar PDF final no Storage.';
          throw new Error(`Não foi possível salvar o PDF final do documento "${document.title}": ${message}`);
        }
        const finalHash = await sha256HexFromBytes(finalBytes);
        if (document.fromDatabase) {
          const attached = await attachPublicFinalDocument(normalizedToken, document.id, finalPdfPath, finalHash);

          if (!attached) {
            setErrorMessage(`Não foi possível anexar o PDF final do documento: ${document.title}`);
            return;
          }
        }

        finalDocumentsMeta.push({
          id: document.id,
          path: finalPdfPath,
          hash: finalHash,
        });
      }

      if (finalDocumentsMeta.length === 0) {
        setErrorMessage('Nenhum PDF final foi gerado para concluir esta assinatura.');
        return;
      }

      const aggregateHash = await sha256Hex(finalDocumentsMeta.map((document) => `${document.id}:${document.hash}`).join('|'));
      const signed = await signPublicRequest(
        normalizedToken,
        patientSignature,
        finalDocumentsMeta[0].path,
        aggregateHash,
      );
      if (!signed) {
        setErrorMessage('Não foi possível concluir a assinatura.');
        return;
      }

      navigate(`/sign/${normalizedToken}/completed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao concluir assinatura.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PublicFlowHeader
        title="Revisão e assinatura"
        description="Revise o PDF assinado pelo profissional, aceite os termos e conclua."
        currentStep="review"
      />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      {loading ? (
        <Card className="p-4 text-sm text-text-muted">Carregando documento...</Card>
      ) : !payload ? (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-text-muted">Acesso não validado para esta etapa.</p>
          <Button variant="secondary" onClick={() => navigate(`/sign/${normalizedToken}/otp`)}>
            Ir para código de acesso
          </Button>
        </Card>
      ) : (
        <>
          <SummaryCard
            title="Resumo da solicitação"
            items={[
              { label: 'Paciente', value: payload.patient_name },
              { label: 'Documento', value: payload.document_title },
              { label: 'Documentos', value: documents.length.toString() },
              { label: 'Arquivo principal', value: documents[0]?.file_name ?? payload.file_name ?? 'documento.pdf' },
              { label: 'Hash atual', value: payload.document_hash },
            ]}
          />

          <Card className="space-y-3">
            <p className="text-sm text-text-muted">
              Abra cada documento para revisar. O aceite individual dos documentos obrigatórios libera a assinatura final.
            </p>
            <ul className="space-y-3">
              {documents.map((document) => (
                <li key={document.id} className="space-y-3 rounded-md border border-border-soft bg-surface-1 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-strong">{document.title}</p>
                      <p className="text-xs text-text-muted">{document.file_name}</p>
                    </div>
                    {document.is_required ? <Badge>Obrigatório</Badge> : <Badge>Opcional</Badge>}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={() => handleOpenPdf(document)} disabled={!document.signed_professional_pdf_path}>
                      Abrir/baixar PDF
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handlePreviewPdf(document)}
                      disabled={!document.signed_professional_pdf_path}
                    >
                      Visualizar aqui (opcional)
                    </Button>
                  </div>
                  <Checkbox
                    id={`document-consent-${document.id}`}
                    checked={isDocumentAccepted(document)}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setAcceptedDocuments((current) => ({
                        ...current,
                        [document.id]: checked,
                      }));
                    }}
                    label={
                      document.is_required
                        ? 'Li e aceito este documento (obrigatório para concluir).'
                        : 'Li este documento (opcional).'
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>

          {previewDocumentUrl ? (
            <PdfViewer
              fileUrl={previewDocumentUrl}
              title={`Visualização: ${documents.find((document) => document.id === previewDocumentId)?.title ?? 'Documento'}`}
            />
          ) : null}

          <Card className="space-y-3">
            <Checkbox
              id="accept-terms"
              checked={acceptTerms}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setAcceptTerms(checked);
              }}
              label="Li e aceito os termos para concluir esta assinatura eletrônica."
            />
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSign} disabled={submitting || !allRequiredAccepted}>
              {submitting ? 'Concluindo...' : 'Assinar documento'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
