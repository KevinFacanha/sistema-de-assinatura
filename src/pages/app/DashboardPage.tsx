import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert, Button, Card, Input, PageHeader, SectionHeader, Select, StatusPill } from '../../components/ui';
import type { SignRequest } from '../../lib/requests';
import { deleteProfessionalRequest, listProfessionalRequests } from '../../lib/requests';

const ALL_MONTHS = 'all';
const INITIAL_VISIBLE_REQUESTS = 6;

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMonthKey(dateIso: string): string | null {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const latestLoadRequestRef = useRef(0);

  const loadRequests = useCallback(async () => {
    const requestSequence = ++latestLoadRequestRef.current;

    try {
      const data = await listProfessionalRequests();
      if (requestSequence !== latestLoadRequestRef.current) {
        return;
      }
      setRequests(data);
      setErrorMessage(null);
    } catch (error) {
      if (requestSequence !== latestLoadRequestRef.current) {
        return;
      }
      const message = error instanceof Error ? error.message : 'Falha ao carregar solicitações.';
      setErrorMessage(message);
    } finally {
      if (requestSequence === latestLoadRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadRequests();
    const interval = window.setInterval(loadRequests, 8000);
    return () => window.clearInterval(interval);
  }, [loadRequests]);

  useEffect(() => {
    setShowAllRequests(false);
  }, [searchTerm, selectedMonth]);

  const summary = useMemo(() => {
    const total = requests.length;
    const draft = requests.filter((item) => item.status === 'draft').length;
    const awaiting = requests.filter((item) => item.status === 'awaiting_patient').length;
    const opened = requests.filter((item) => item.status === 'opened').length;
    const completed = requests.filter((item) => item.status === 'completed').length;

    return [
      { label: 'Total de solicitações', value: total.toString().padStart(2, '0'), hint: `${draft} em rascunho` },
      { label: 'Aguardando paciente', value: awaiting.toString().padStart(2, '0'), hint: 'Link já liberado' },
      { label: 'Acesso iniciado', value: opened.toString().padStart(2, '0'), hint: 'Paciente em andamento' },
      { label: 'Concluídas', value: completed.toString().padStart(2, '0'), hint: 'Fluxo finalizado' },
    ];
  }, [requests]);

  const monthOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];

    for (const item of requests) {
      const monthKey = getMonthKey(item.updated_at);
      if (!monthKey || seen.has(monthKey)) {
        continue;
      }

      seen.add(monthKey);
      const monthLabel = new Date(item.updated_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({
        value: monthKey,
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      });
    }

    return options;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchTerm);

    return requests.filter((item) => {
      const monthKey = getMonthKey(item.updated_at);
      const matchesMonth = selectedMonth === ALL_MONTHS || monthKey === selectedMonth;
      const matchesSearch =
        normalizedSearch.length === 0 || normalizeSearchValue(item.patient_name).includes(normalizedSearch);
      return matchesMonth && matchesSearch;
    });
  }, [requests, searchTerm, selectedMonth]);

  const visibleRequests = useMemo(() => {
    if (showAllRequests) {
      return filteredRequests;
    }
    return filteredRequests.slice(0, INITIAL_VISIBLE_REQUESTS);
  }, [filteredRequests, showAllRequests]);

  const hasHiddenRows = filteredRequests.length > INITIAL_VISIBLE_REQUESTS;

  const handleDeleteRequest = useCallback(async (request: SignRequest) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a solicitação de ${request.patient_name}? Essa ação não poderá ser desfeita.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingRequestId(request.id);
      await deleteProfessionalRequest(request.id);
      await loadRequests();
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir a solicitação.';
      setErrorMessage(message);
    } finally {
      setDeletingRequestId(null);
    }
  }, [loadRequests]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        description="Acompanhe suas solicitações e avance para a próxima ação sem fricção."
        className="rounded-xl border border-border-soft bg-white px-5 py-4 shadow-sm"
        action={<Button onClick={() => navigate('/requests/new')}>Nova solicitação</Button>}
      />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((card) => (
          <Card
            key={card.label}
            className="space-y-3 border border-border-soft bg-gradient-to-b from-white to-surface-1 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-text-muted">{card.label}</p>
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-secondary/70" />
            </div>
            <p className="text-2xl font-semibold leading-none text-text-strong">{card.value}</p>
            <p className="text-xs text-text-muted">{card.hint}</p>
          </Card>
        ))}
      </section>

      <Card className="space-y-4 border border-border-soft bg-white p-0 shadow-md">
        <div className="border-b border-border-soft px-5 py-4">
          <SectionHeader title="Solicitações recentes" subtitle="Acompanhe status, paciente e última atualização em tempo real." />
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-text-muted">Carregando solicitações...</p>
        ) : requests.length === 0 ? (
          <div className="mx-5 mb-5 rounded-md border border-border-soft bg-surface-1 px-4 py-6 text-sm text-text-muted">
            Nenhuma solicitação criada ainda. Clique em <strong>Nova solicitação</strong> para iniciar.
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-4 sm:px-5">
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="dashboard-search-patient" className="text-xs font-medium text-text-muted">
                  Paciente
                </label>
                <Input
                  id="dashboard-search-patient"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome do paciente"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="dashboard-filter-month" className="text-xs font-medium text-text-muted">
                  Mês
                </label>
                <Select
                  id="dashboard-filter-month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                >
                  <option value={ALL_MONTHS}>Todos os meses</option>
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="rounded-md border border-border-soft bg-surface-1 px-4 py-5 text-sm text-text-muted">
                Nenhuma solicitação encontrada para os filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-text-muted">
                      <th className="px-3 py-3">Solicitação</th>
                      <th className="px-3 py-3">Paciente</th>
                      <th className="px-3 py-3">Documento</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Atualização</th>
                      <th className="px-3 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRequests.map((item) => (
                      <tr
                        key={item.id}
                        className="rounded-md border-b border-border-soft transition duration-150 ease-smooth hover:bg-surface-1 last:border-b-0"
                      >
                        <td className="px-3 py-3.5">
                          <Link className="font-medium text-brand-secondary hover:underline" to={`/requests/${item.id}`}>
                            {item.id.slice(0, 8).toUpperCase()}
                          </Link>
                        </td>
                        <td className="px-3 py-3.5 text-text-muted">{item.patient_name}</td>
                        <td className="max-w-[320px] px-3 py-3.5 text-text-muted">
                          <span className="block truncate">{item.document_title}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusPill status={item.status} />
                        </td>
                        <td className="px-3 py-3.5 text-text-muted">{formatDate(item.updated_at)}</td>
                        <td className="px-3 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              className="text-xs font-medium text-brand-secondary transition duration-150 ease-smooth hover:opacity-80 hover:underline"
                              to={`/requests/${item.id}`}
                            >
                              Abrir
                            </Link>
                            <button
                              type="button"
                              className="text-xs font-medium text-text-muted transition duration-150 ease-smooth hover:opacity-80 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => void handleDeleteRequest(item)}
                              disabled={deletingRequestId === item.id}
                            >
                              {deletingRequestId === item.id ? 'Excluindo...' : 'Excluir'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hasHiddenRows ? (
              <div className="flex justify-center pt-1">
                <Button variant="ghost" size="sm" onClick={() => setShowAllRequests((current) => !current)}>
                  {showAllRequests ? 'Visualizar menos' : 'Visualizar mais'}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
