import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Alert, Badge, Button, Card, PageHeader, SectionHeader, StatusPill, SummaryCard } from '../../components/ui';
import type { RequestEvent, SignRequest, SignRequestDocument } from '../../lib/requests';
import { createSignedDocumentUrl, getProfessionalRequest, listRequestDocuments, listRequestEvents } from '../../lib/requests';

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

const eventLabels: Record<RequestEvent['event_type'], string> = {
  request_created: 'Solicitação criada',
  professional_signed: 'Assinatura profissional concluída',
  link_opened: 'Link aberto pelo paciente',
  access_code_validated: 'Código de acesso validado',
  consent_accepted: 'Termos aceitos pelo paciente',
  patient_signed: 'Paciente assinou o documento',
  request_completed: 'Solicitação concluída',
};

const actorLabels: Record<RequestEvent['actor_type'], string> = {
  professional: 'profissional',
  patient: 'paciente',
};

const statusLabels: Record<SignRequest['status'], string> = {
  draft: 'Rascunho',
  awaiting_patient: 'Aguardando paciente',
  opened: 'Acesso iniciado',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

export function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<SignRequest | null>(null);
  const [documents, setDocuments] = useState<SignRequestDocument[]>([]);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [requestData, documentsData, eventsData] = await Promise.all([
        getProfessionalRequest(id),
        listRequestDocuments(id),
        listRequestEvents(id),
      ]);
      setRequest(requestData);
      setDocuments(documentsData);
      setEvents(eventsData);
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar os detalhes.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 8000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  const publicLink = useMemo(() => {
    if (!request?.sign_token) return null;
    return `${window.location.origin}/sign/${request.sign_token}`;
  }, [request?.sign_token]);

  const handleCopy = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(successMessage);
      window.setTimeout(() => setCopyMessage(null), 2500);
    } catch {
      setCopyMessage('Não foi possível copiar automaticamente.');
      window.setTimeout(() => setCopyMessage(null), 2500);
    }
  };

  const openPdfVersion = async (path: string | null) => {
    if (!path) return;
    try {
      const signedUrl = await createSignedDocumentUrl(path, 1200);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível abrir o PDF.';
      setCopyMessage(message);
      window.setTimeout(() => setCopyMessage(null), 3000);
    }
  };

  return (
    <>
      <PageHeader
        title={`Solicitação ${id?.slice(0, 8).toUpperCase() ?? ''}`}
        description="Acompanhe status, link do paciente e evidências operacionais."
        action={
          <Button variant="secondary" onClick={() => navigate('/requests/new')}>
            Nova solicitação
          </Button>
        }
      />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
      {copyMessage ? <Alert variant="success">{copyMessage}</Alert> : null}

      {loading ? (
        <Card className="p-4 text-sm text-text-muted">Carregando detalhes...</Card>
      ) : !request ? (
        <Card className="p-4 text-sm text-text-muted">Solicitação não encontrada.</Card>
      ) : (
        <>
          {request.status === 'draft' ? (
            <Alert variant="warning">
              Esta solicitação ainda está em rascunho. Conclua a assinatura profissional para liberar o link ao paciente.
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-2 p-4">
              <p className="text-xs text-text-muted">Status atual</p>
              <StatusPill status={request.status} />
            </Card>
            <Card className="space-y-2 p-4">
              <p className="text-xs text-text-muted">Última atualização</p>
              <p className="text-sm font-medium text-text-strong">{formatDateTime(request.updated_at)}</p>
            </Card>
            <Card className="space-y-2 p-4">
              <p className="text-xs text-text-muted">Canal de envio</p>
              <Badge>WhatsApp manual</Badge>
            </Card>
          </div>

          <SummaryCard
            title="Resumo da solicitação"
            items={[
              { label: 'Paciente', value: request.patient_name },
              { label: 'Documento', value: request.document_title },
              { label: 'Arquivo', value: request.file_name ?? '-' },
              { label: 'Status', value: statusLabels[request.status] },
              { label: 'Assinatura profissional', value: request.professional_signature ?? '-' },
              { label: 'Assinatura do paciente', value: request.patient_signature ?? '-' },
              { label: 'Hash atual do PDF', value: request.document_hash },
            ]}
          />

          <Card className="space-y-3">
            <SectionHeader title="Versões do PDF" subtitle="Arquivo original e versões assinadas." />
            {documents.length === 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Button variant="secondary" onClick={() => openPdfVersion(request.storage_path)} disabled={!request.storage_path}>
                  PDF original
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openPdfVersion(request.signed_professional_pdf_path)}
                  disabled={!request.signed_professional_pdf_path}
                >
                  PDF assinado profissional
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openPdfVersion(request.signed_final_pdf_path)}
                  disabled={!request.signed_final_pdf_path}
                >
                  PDF final assinado
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {documents.map((document) => (
                  <li key={document.id} className="space-y-2 rounded-md border border-border-soft bg-surface-1 p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-strong">{document.title}</p>
                        <p className="text-xs text-text-muted">{document.file_name}</p>
                      </div>
                      {document.is_required ? <Badge>Obrigatório</Badge> : <Badge>Opcional</Badge>}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button variant="secondary" size="sm" onClick={() => openPdfVersion(document.storage_path)}>
                        Original
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openPdfVersion(document.signed_professional_pdf_path)}
                        disabled={!document.signed_professional_pdf_path}
                      >
                        PDF assinado pelo profissional
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openPdfVersion(document.signed_final_pdf_path)}
                        disabled={!document.signed_final_pdf_path}
                      >
                        PDF final assinado
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-4">
            <SectionHeader title="Link do paciente" subtitle="Envie manualmente por WhatsApp." />
            <div className="space-y-3 rounded-md border border-border-soft bg-surface-1 p-3">
              <div>
                <p className="text-xs text-text-muted">Link único</p>
                <p className="mt-1 break-all font-mono text-xs text-text-strong">{publicLink ?? 'Indisponível'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Código de acesso</p>
                <p className="mt-1 font-mono text-sm font-semibold text-text-strong">{request.access_code}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {request.status === 'draft' ? (
                <Button onClick={() => navigate(`/requests/${request.id}/sign`)}>Assinar como profissional</Button>
              ) : null}
              {publicLink && request.status !== 'draft' ? (
                <Button variant="secondary" onClick={() => handleCopy(publicLink, 'Link copiado com sucesso.')}>
                  Copiar link
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => handleCopy(request.access_code, 'Código copiado com sucesso.')}
                disabled={request.status === 'draft'}
              >
                Copiar código
              </Button>
              {request.sign_token && request.status !== 'draft' ? (
                <Button onClick={() => navigate(`/sign/${request.sign_token}`)}>Abrir fluxo do paciente</Button>
              ) : null}
            </div>
          </Card>

          <Card className="space-y-3">
            <SectionHeader title="Datas principais" subtitle="Evidências mínimas do processo." />
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-text-muted">Assinado pelo profissional</dt>
                <dd className="font-medium text-text-strong">{formatDateTime(request.professional_signed_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Paciente abriu link</dt>
                <dd className="font-medium text-text-strong">{formatDateTime(request.patient_opened_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Código validado</dt>
                <dd className="font-medium text-text-strong">{formatDateTime(request.access_code_validated_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Aceite de termos</dt>
                <dd className="font-medium text-text-strong">{formatDateTime(request.consent_accepted_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Assinado pelo paciente</dt>
                <dd className="font-medium text-text-strong">{formatDateTime(request.patient_signed_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Concluída</dt>
                <dd className="font-medium text-text-strong">{formatDateTime(request.completed_at)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="space-y-3">
            <SectionHeader title="Histórico de eventos" subtitle="Registro mínimo para rastreabilidade." />
            {events.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhum evento registrado.</p>
            ) : (
              <ul className="space-y-2 text-sm text-text-muted">
                {events.map((event) => (
                  <li key={event.id}>
                    {formatDateTime(event.created_at)} - {eventLabels[event.event_type]} ({actorLabels[event.actor_type]})
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}
