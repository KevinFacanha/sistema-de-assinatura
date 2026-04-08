import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, Button, Card, Checkbox, Input, PageHeader, SectionHeader, Select, Stepper, Textarea, UploadDropzone } from '../../components/ui';
import { createProfessionalRequest } from '../../lib/requests';
import { generateAccessCode, generateSignToken } from '../../lib/security';

const documentTypeOptions = [
  {
    value: 'contrato_prestacao_servicos_nutricionais',
    label: 'Contrato de Prestação de Serviços Nutricionais',
  },
  {
    value: 'termo_autorizacao_uso_imagem',
    label: 'Termo de Autorização de Uso de Imagem',
  },
  { value: 'outros', label: 'Outros' },
];

const newRequestSteps = [
  { id: 'patient', label: 'Paciente e documento', status: 'current' as const },
  { id: 'professional-sign', label: 'Assinatura profissional', status: 'upcoming' as const },
  { id: 'share-link', label: 'Compartilhar link', status: 'upcoming' as const },
];

type DocumentDraft = {
  id: string;
  documentType: string;
  title: string;
  isRequired: boolean;
  file: File | null;
};

function createDocumentDraft(): DocumentDraft {
  return {
    id: crypto.randomUUID(),
    documentType: '',
    title: '',
    isRequired: true,
    file: null,
  };
}

export function RequestNewPage() {
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [documents, setDocuments] = useState<DocumentDraft[]>([createDocumentDraft()]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateDocument = (documentId: string, updater: (document: DocumentDraft) => DocumentDraft) => {
    setDocuments((current) => current.map((document) => (document.id === documentId ? updater(document) : document)));
  };

  const addDocument = () => {
    setDocuments((current) => [...current, createDocumentDraft()]);
  };

  const removeDocument = (documentId: string) => {
    setDocuments((current) => {
      if (current.length === 1) {
        return current;
      }
      return current.filter((document) => document.id !== documentId);
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (documents.length === 0) {
      setErrorMessage('Adicione pelo menos um documento PDF.');
      return;
    }

    for (const [index, document] of documents.entries()) {
      if (!document.documentType || !document.title.trim() || !document.file) {
        setErrorMessage(`Preencha tipo, título e arquivo do documento ${index + 1}.`);
        return;
      }

      if (document.file.type && document.file.type !== 'application/pdf') {
        setErrorMessage(`Somente PDF é permitido no documento ${index + 1}.`);
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);

    const documentSnapshot = [
      `Paciente: ${patientName}`,
      `Telefone: ${patientPhone}`,
      ...documents.map((document, index) => {
        const typeLabel = documentTypeOptions.find((item) => item.value === document.documentType)?.label ?? document.documentType;
        return `Documento ${index + 1}: ${typeLabel} | ${document.title} | ${document.file?.name ?? 'arquivo.pdf'}`;
      }),
      `Observações: ${notes || 'Sem observações adicionais.'}`,
    ].join('\n');

    const signToken = generateSignToken();
    const accessCode = generateAccessCode();

    createProfessionalRequest({
      patientName,
      patientPhone,
      patientEmail: patientEmail || undefined,
      documentTitle: documents[0]?.title ?? 'Documentos da solicitação',
      documentSnapshot,
      signToken,
      accessCode,
      documents: documents
        .filter((document) => Boolean(document.file))
        .map((document) => ({
          documentType: document.documentType,
          title: document.title.trim(),
          isRequired: document.isRequired,
          pdfFile: document.file as File,
        })),
    })
      .then((created) => {
        navigate(`/requests/${created.id}/sign`);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Não foi possível criar a solicitação.';
        setErrorMessage(message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova solicitação"
        description="Cadastre o paciente, adicione um ou mais PDFs e avance para assinatura profissional."
        className="rounded-xl border border-border-soft bg-white px-5 py-4 shadow-sm"
      />

      <Card className="border border-border-soft bg-white p-4 shadow-sm sm:p-5">
        <Stepper steps={newRequestSteps} className="gap-3" />
      </Card>

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handleSubmit}>
        <div className="space-y-5">
          <Card className="space-y-5 border border-border-soft bg-white shadow-sm">
            <SectionHeader
              title="Dados do paciente"
              subtitle="Informações básicas para identificar o titular que receberá o link de assinatura."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="patient-name" className="text-xs font-medium text-text-muted">
                  Nome completo
                </label>
                <Input
                  id="patient-name"
                  placeholder="Ex.: Juliana Martins"
                  value={patientName}
                  onChange={(event) => setPatientName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="patient-phone" className="text-xs font-medium text-text-muted">
                  Telefone/WhatsApp
                </label>
                <Input
                  id="patient-phone"
                  placeholder="(11) 99999-9999"
                  value={patientPhone}
                  onChange={(event) => setPatientPhone(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="patient-email" className="text-xs font-medium text-text-muted">
                  E-mail (opcional)
                </label>
                <Input
                  id="patient-email"
                  type="email"
                  placeholder="paciente@email.com"
                  value={patientEmail}
                  onChange={(event) => setPatientEmail(event.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-4 border border-border-soft bg-white shadow-sm">
            <SectionHeader title="Documentos" subtitle="Inclua todos os PDFs da solicitação em um único fluxo." />
            <div className="space-y-4">
              {documents.map((document, index) => (
                <div
                  key={document.id}
                  className="space-y-4 rounded-lg border border-border-soft bg-gradient-to-b from-white to-surface-1 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold text-text-strong">Documento {index + 1}</p>
                    </div>
                    {documents.length > 1 ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDocument(document.id)}>
                        Remover
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor={`document-type-${document.id}`} className="text-xs font-medium text-text-muted">
                        Tipo de documento
                      </label>
                      <Select
                        id={`document-type-${document.id}`}
                        value={document.documentType}
                        onChange={(event) =>
                          updateDocument(document.id, (current) => ({
                            ...current,
                            documentType: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="" disabled>
                          Selecione um tipo
                        </option>
                        {documentTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`document-title-${document.id}`} className="text-xs font-medium text-text-muted">
                        Título interno
                      </label>
                      <Input
                        id={`document-title-${document.id}`}
                        placeholder={`Ex.: Documento ${index + 1}`}
                        value={document.title}
                        onChange={(event) =>
                          updateDocument(document.id, (current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="rounded-md border border-border-soft bg-white px-3 py-2">
                    <Checkbox
                      id={`document-required-${document.id}`}
                      checked={document.isRequired}
                      onChange={(event) =>
                        updateDocument(document.id, (current) => ({
                          ...current,
                          isRequired: event.currentTarget.checked,
                        }))
                      }
                      label="Aceite obrigatório no fluxo do paciente"
                    />
                  </div>

                  <UploadDropzone
                    onFileSelect={(file) =>
                      updateDocument(document.id, (current) => ({
                        ...current,
                        file,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="pt-1">
              <Button type="button" variant="secondary" onClick={addDocument}>
                Adicionar documento
              </Button>
            </div>
          </Card>

          <Card className="space-y-4 border border-border-soft bg-white shadow-sm">
            <SectionHeader title="Observações" subtitle="Campo opcional para orientações adicionais ao paciente." />
            <Textarea
              placeholder="Ex.: assinar até sexta-feira, 18h."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Card>

          <div className="flex flex-col gap-2 rounded-xl border border-border-soft bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Revisar e assinar'}
            </Button>
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <Card className="space-y-3 border border-border-soft bg-gradient-to-b from-white to-surface-1 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-secondary">Fluxo guiado</p>
              <p className="text-sm text-text-muted">
                Revise paciente e documentos agora. O link e o código são liberados somente após a assinatura profissional.
              </p>
              <ul className="space-y-2 text-xs text-text-muted">
                <li className="rounded-md bg-white px-2.5 py-2">1. Preencher dados do paciente</li>
                <li className="rounded-md bg-white px-2.5 py-2">2. Anexar um ou mais PDFs</li>
                <li className="rounded-md bg-white px-2.5 py-2">3. Assinar e compartilhar link</li>
              </ul>
            </Card>

            <Card className="space-y-2 border border-border-soft bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-secondary">Resumo rápido</p>
              <div className="space-y-1 text-sm text-text-muted">
                <p>
                  Documentos: <span className="font-semibold text-text-strong">{documents.length}</span>
                </p>
                <p>
                  Campos obrigatórios: <span className="font-semibold text-text-strong">Paciente + PDF</span>
                </p>
              </div>
            </Card>
          </div>
        </aside>
      </form>
    </div>
  );
}
