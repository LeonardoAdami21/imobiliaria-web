import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { LuCalendarClock, LuCheck, LuPlus } from 'react-icons/lu';
import { api } from '@/api';
import type { Visit, VisitStatus } from '@/api/types';
import { FormActions, SelectField, TextAreaField } from '@/components/form';
import { LeadName, PropertyRef, UserName, userOptions, useUserDirectory } from '@/components/lookups';
import { type Column, DataTable, Empty, ErrorAlert, Modal, PageHeader, Segmented, Tag } from '@/components/ui';
import { VisitForm } from '@/forms/VisitForm';
import { formatDateTime } from '@/lib/format';
import { VISIT_STATUS } from '@/lib/labels';
import { useAction } from '@/lib/useAction';

type Dialog = { kind: 'new' } | { kind: 'reschedule' | 'finish'; visit: Visit } | null;

export function VisitsPage() {
  const [status, setStatus] = useState<VisitStatus | 'ALL'>('SCHEDULED');
  const [broker, setBroker] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);
  const directory = useUserDirectory();

  const query = useQuery({
    queryKey: ['visits', 'list', status, broker, page],
    queryFn: () => api.visits.search({ status: status === 'ALL' ? undefined : status, brokerId: broker || undefined, page, perPage: 15 }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<Visit>[] = [
    { header: 'Data e hora', className: 'num primary-cell', cell: (visit) => formatDateTime(visit.scheduledAt) },
    { header: 'Lead', cell: (visit) => <LeadName id={visit.leadId} /> },
    { header: 'Imóvel', cell: (visit) => <PropertyRef id={visit.propertyId} /> },
    { header: 'Corretor', cell: (visit) => <UserName id={visit.brokerId} /> },
    {
      header: 'Situação',
      cell: (visit) => (
        <>
          <Tag {...VISIT_STATUS[visit.status]} />
          {visit.feedback && <div className="small muted" style={{ maxWidth: '32ch' }}>{visit.feedback}</div>}
        </>
      ),
    },
    {
      header: '',
      className: 'actions',
      cell: (visit) =>
        visit.status === 'SCHEDULED' && (
          <>
            <button className="btn btn-sm" onClick={() => setDialog({ kind: 'reschedule', visit })}>
              <LuCalendarClock aria-hidden /> Remarcar
            </button>
            <button className="btn btn-sm" onClick={() => setDialog({ kind: 'finish', visit })}>
              <LuCheck aria-hidden /> Encerrar
            </button>
          </>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Visitas"
        description="Agenda de visitas aos imóveis. Corretor e imóvel não podem ter duas visitas no mesmo horário."
        actions={
          <button className="btn btn-primary" onClick={() => setDialog({ kind: 'new' })}>
            <LuPlus aria-hidden /> Agendar visita
          </button>
        }
      />

      <div className="filters">
        <div className="field" style={{ width: 'auto' }}>
          <span className="label">Mostrar</span>
          <Segmented
            label="Mostrar"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: 'SCHEDULED', label: 'Agendadas' },
              { value: 'DONE', label: 'Realizadas' },
              { value: 'ALL', label: 'Todas' },
            ]}
          />
        </div>
        <SelectField
          className="wide"
          label="Corretor"
          value={broker}
          onChange={(value) => {
            setBroker(value);
            setPage(1);
          }}
          placeholder="Todos"
          options={userOptions(directory.data)}
        />
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          page={query.data}
          isLoading={query.isLoading}
          error={query.error}
          onPageChange={setPage}
          empty={<Empty title={status === 'SCHEDULED' ? 'Nenhuma visita agendada.' : 'Nenhuma visita encontrada.'}>Agende a partir de um lead em aberto.</Empty>}
        />
      </div>

      {dialog?.kind === 'new' && <VisitForm onClose={() => setDialog(null)} />}
      {dialog?.kind === 'reschedule' && <VisitForm visit={dialog.visit} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'finish' && <FinishVisit visit={dialog.visit} onClose={() => setDialog(null)} />}
    </>
  );
}

function FinishVisit({ visit, onClose }: { visit: Visit; onClose: () => void }) {
  const [outcome, setOutcome] = useState<'DONE' | 'CANCELED' | 'NO_SHOW'>('DONE');
  const [feedback, setFeedback] = useState('');
  const finish = useAction(() => api.visits.finish(visit.id, outcome, feedback || null), { success: 'Visita encerrada.', onDone: onClose });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    finish.mutate(undefined);
  };

  return (
    <Modal title="Encerrar visita" onClose={onClose} size="sm">
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={finish.error} />
        <p className="muted">
          <LeadName id={visit.leadId} />, {formatDateTime(visit.scheduledAt)}
        </p>
        <SelectField
          label="O que aconteceu"
          value={outcome}
          onChange={(value) => value && setOutcome(value)}
          options={[
            { value: 'DONE', label: 'Visita realizada' },
            { value: 'NO_SHOW', label: 'Cliente não veio' },
            { value: 'CANCELED', label: 'Visita cancelada' },
          ]}
        />
        <TextAreaField label="Como foi" maxLength={2000} value={feedback} onChange={setFeedback} hint="Opcional. O que o cliente achou, próximos passos." />
        <FormActions onCancel={onClose} submitLabel="Encerrar visita" isPending={finish.isPending} />
      </form>
    </Modal>
  );
}
