import { useEffect, useRef, useState } from 'react';
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
  getCurrentSession,
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

function isRequestCompleted(request: PublicReviewResult | null): boolean {
  return Boolean(request && (request.status === 'completed' || request.patient_signed_at));
}

export function SignReviewPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<PublicReviewResult | null>(null);
  const [documents, setDocuments] = useState<Array<PublicReviewDocument & { fromDatabase: boolean }>>([]);
  const [documentAvailability, setDocumentAvailability] = useState<Record<string, boolean>>({});
  const [acceptedDocuments, setAcceptedDocuments] = useState<Record<string, boolean>>({});
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [previewDocumentUrl, setPreviewDocumentUrl] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previewUsesBlobRef = useRef(false);

  const normalizedToken = token ?? '';
  const setPreviewUrl = (url: string | null, usesBlob: boolean) => {
    setPreviewDocumentUrl((current) => {
      if (previewUsesBlobRef.current && current) {
        URL.revokeObjectURL(current);
      }
      return url;
    });
    previewUsesBlobRef.current = usesBlob;
  };

  useEffect(() => {
    return () => {
      if (previewUsesBlobRef.current && previewDocumentUrl) {
        URL.revokeObjectURL(previewDocumentUrl);
      }
    };
  }, [previewDocumentUrl]);

  useEffect(() => {
    if (!normalizedToken) return;
    const load = async () => {
      setDocumentAvailability({});
      try {
        try {
          const session = await getCurrentSession();
          console.info('[PublicReview] contexto de auth no navegador', {
            role: session?.user ? 'authenticated' : 'anon',
            userId: session?.user?.id ?? null,
            tokenPreview: normalizedToken.slice(0, 8),
          });
        } catch (sessionError) {
          console.warn('[PublicReview] falha ao obter sessão local', sessionError);
        }

        const [requestData, documentsData] = await Promise.all([
          getPublicReviewRequest(normalizedToken),
          listPublicReviewDocuments(normalizedToken),
        ]);

        if (isRequestCompleted(requestData)) {
          setPayload(requestData);
          setDocuments([]);
          setErrorMessage('Esta solicitação já foi concluída. Redirecionando para a confirmação final.');
          navigate(`/sign/${normalizedToken}/completed`, { replace: true });
          return;
        }

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

        const availabilityEntries = await Promise.all(
          mergedDocuments.map(async (document) => {
            if (!document.signed_professional_pdf_path) {
              return [document.id, false] as const;
            }

            try {
              await createSignedDocumentUrl(document.signed_professional_pdf_path, 60, {
                forceAnon: true,
                context: 'public-review:availability',
              });
              return [document.id, true] as const;
            } catch {
              try {
                await downloadDocumentBytes(document.signed_professional_pdf_path, {
                  forceAnon: true,
                  context: 'public-review:availability-fallback',
                });
                return [document.id, true] as const;
              } catch {
                return [document.id, false] as const;
              }
            }
          }),
        );
        const availabilityByDocument = Object.fromEntries(availabilityEntries);
        setDocumentAvailability(availabilityByDocument);

        const initialAccepted: Record<string, boolean> = {};
        for (const document of mergedDocuments) {
          initialAccepted[document.id] = Boolean(document.consent_accepted_at);
        }
        setAcceptedDocuments(initialAccepted);

        const missingDocuments = mergedDocuments.filter((document) => !availabilityByDocument[document.id]);
        if (missingDocuments.length > 0) {
          const missingTitles = missingDocuments.map((document) => `"${document.title}"`).join(', ');
          setErrorMessage(
            `Arquivos indisponíveis no Storage para: ${missingTitles}. Solicite nova assinatura profissional antes de continuar.`,
          );
          return;
        }

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
  }, [navigate, normalizedToken]);

  const isDocumentAccepted = (document: PublicReviewDocument) => {
    return Boolean(document.consent_accepted_at || acceptedDocuments[document.id]);
  };

  const requiredDocuments = documents.filter((document) => document.is_required);
  const allRequiredDocumentsAvailable = requiredDocuments.every((document) => Boolean(documentAvailability[document.id]));
  const allRequiredAccepted = requiredDocuments.every((document) => isDocumentAccepted(document));

  const handleOpenPdf = async (document: PublicReviewDocument) => {
    if (!document.signed_professional_pdf_path || !documentAvailability[document.id]) {
      setErrorMessage(`Arquivo indisponível para o documento "${document.title}".`);
      return;
    }
    try {
      const signedUrl = await createSignedDocumentUrl(document.signed_professional_pdf_path, 1200, {
        forceAnon: true,
        context: 'public-review:open',
      });
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
      setErrorMessage(null);
    } catch (error) {
      const primaryMessage = error instanceof Error ? error.message : 'Não foi possível abrir o PDF.';
      try {
        const bytes = await downloadDocumentBytes(document.signed_professional_pdf_path, {
          forceAnon: true,
          context: 'public-review:open-fallback',
        });
        const safeBytes = new Uint8Array(bytes.byteLength);
        safeBytes.set(bytes);
        const blobUrl = URL.createObjectURL(new Blob([safeBytes.buffer], { type: 'application/pdf' }));
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        setErrorMessage(null);
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Falha no fallback do PDF.';
        setErrorMessage(`${document.title}: ${primaryMessage}. Fallback: ${fallbackMessage}`);
      }
    }
  };

  const handlePreviewPdf = async (document: PublicReviewDocument) => {
    if (!document.signed_professional_pdf_path || !documentAvailability[document.id]) {
      setErrorMessage(`Arquivo indisponível para o documento "${document.title}".`);
      return;
    }
    try {
      const signedUrl = await createSignedDocumentUrl(document.signed_professional_pdf_path, 1200, {
        forceAnon: true,
        context: 'public-review:preview',
      });
      setPreviewDocumentId(document.id);
      setPreviewUrl(signedUrl, false);
      setErrorMessage(null);
    } catch (error) {
      const primaryMessage = error instanceof Error ? error.message : 'Não foi possível visualizar o PDF.';
      try {
        const bytes = await downloadDocumentBytes(document.signed_professional_pdf_path, {
          forceAnon: true,
          context: 'public-review:preview-fallback',
        });
        const safeBytes = new Uint8Array(bytes.byteLength);
        safeBytes.set(bytes);
        const blobUrl = URL.createObjectURL(new Blob([safeBytes.buffer], { type: 'application/pdf' }));
        setPreviewDocumentId(document.id);
        setPreviewUrl(blobUrl, true);
        setErrorMessage(null);
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Falha no fallback do PDF.';
        setErrorMessage(`${document.title}: ${primaryMessage}. Fallback: ${fallbackMessage}`);
      }
    }
  };

  const handleSign = async () => {
    if (!payload || documents.length === 0) return;
    if (!allRequiredDocumentsAvailable) {
      setErrorMessage('Existem documentos obrigatórios indisponíveis no Storage. Solicite nova assinatura profissional.');
      return;
    }
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
      const latestBeforeProcessing = await getPublicReviewRequest(normalizedToken);
      if (!latestBeforeProcessing) {
        setErrorMessage('A solicitação não está mais disponível para assinatura.');
        return;
      }
      if (isRequestCompleted(latestBeforeProcessing)) {
        setErrorMessage('Esta solicitação já foi assinada e concluída.');
        navigate(`/sign/${normalizedToken}/completed`, { replace: true });
        return;
      }

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
          sourceBytes = await downloadDocumentBytes(document.signed_professional_pdf_path, {
            forceAnon: true,
            context: 'public-review:sign-source',
          });
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
      const latestBeforeFinalize = await getPublicReviewRequest(normalizedToken);
      if (!latestBeforeFinalize) {
        setErrorMessage('A solicitação não está mais disponível para conclusão.');
        return;
      }
      if (isRequestCompleted(latestBeforeFinalize)) {
        setErrorMessage('Esta solicitação já foi assinada e concluída.');
        navigate(`/sign/${normalizedToken}/completed`, { replace: true });
        return;
      }

      const signed = await signPublicRequest(
        normalizedToken,
        patientSignature,
        finalDocumentsMeta[0].path,
        aggregateHash,
      );
      if (!signed) {
        setErrorMessage('Esta solicitação já foi concluída ou não está mais disponível para nova assinatura.');
        navigate(`/sign/${normalizedToken}/completed`, { replace: true });
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
      ) : isRequestCompleted(payload) ? (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-text-muted">Esta solicitação já foi concluída. A assinatura não pode ser refeita.</p>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => navigate(`/sign/${normalizedToken}/completed`, { replace: true })}>
              Ver conclusão
            </Button>
          </div>
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
                    <Button
                      onClick={() => handleOpenPdf(document)}
                      disabled={!document.signed_professional_pdf_path || !documentAvailability[document.id]}
                    >
                      Abrir/baixar PDF
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handlePreviewPdf(document)}
                      disabled={!document.signed_professional_pdf_path || !documentAvailability[document.id]}
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
            <Button onClick={handleSign} disabled={submitting || !allRequiredAccepted || !allRequiredDocumentsAvailable}>
              {submitting ? 'Concluindo...' : 'Assinar documento'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
