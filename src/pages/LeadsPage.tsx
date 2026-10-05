import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { LuArrowRightLeft, LuCalendarDays, LuMail, LuPencil, LuPhone, LuPlus, LuRotateCcw } from 'react-icons/lu';
import { api } from '@/api';
import type { Lead, LeadStatus, LeadStatusChange } from '@/api/types';
import { ComboField, FormActions, SelectField, TextAreaField } from '@/components/form';
import { PersonName, PropertyRef, searchPeople, UserName, userOptions, useUserDirectory } from '@/components/lookups';
import { type Column, DataTable, Empty, ErrorAlert, Loading, Modal, PageHeader, Segmented, Tag } from '@/components/ui';
import { LeadForm } from '@/forms/LeadForm';
import { VisitForm } from '@/forms/VisitForm';
import { formatDate, formatPhone } from '@/lib/format';
import { LEAD_INTEREST, LEAD_SOURCE, LEAD_STATUS } from '@/lib/labels';
import { useAction } from '@/lib/useAction';

const OPEN: LeadStatus[] = ['NEW', 'IN_SERVICE', 'VISIT_SCHEDULED', 'PROPOSAL'];
type View = 'open' | 'WON' | 'LOST';
type Dialog = { kind: 'new' } | { kind: 'edit' | 'move' | 'visit'; lead: Lead } | null;

export function LeadsPage() {
  const [view, setView] = useState<View>('open');
  const [broker, setBroker] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const directory = useUserDirectory();

  const brokerFilter = broker === 'none' ? { unassigned: true } : { brokerId: broker || undefined };

  return (
    <>
      <PageHeader
        title="Leads"
        description="Quem procurou a imobiliária para comprar ou alugar, e em que ponto do atendimento está."
        actions={
          <button className="btn btn-primary" onClick={() => setDialog({ kind: 'new' })}>
            <LuPlus aria-hidden /> Registrar lead
          </button>
        }
      />

      <div className="filters">
        <div className="field" style={{ width: 'auto' }}>
          <span className="label">Mostrar</span>
          <Segmented
            label="Mostrar"
            value={view}
            onChange={setView}
            options={[
              { value: 'open', label: 'Em aberto' },
              { value: 'WON', label: 'Ganhos' },
              { value: 'LOST', label: 'Perdidos' },
            ]}
          />
        </div>
        <SelectField
          className="wide"
          label="Corretor"
          value={broker}
          onChange={setBroker}
          placeholder="Todos"
          options={[{ value: 'none', label: 'Sem corretor' }, ...userOptions(directory.data)]}
        />
      </div>

      {view === 'open' ? (
        <div className="board">
          {OPEN.map((status) => (
            <BoardColumn key={status} status={status} filter={brokerFilter} onAction={setDialog} />
          ))}
        </div>
      ) : (
        <ClosedLeads status={view} filter={brokerFilter} />
      )}

      {dialog?.kind === 'new' && <LeadForm onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <LeadForm lead={dialog.lead} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'visit' && <VisitForm lead={dialog.lead} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'move' && <MoveLead lead={dialog.lead} onClose={() => setDialog(null)} />}
    </>
  );
}

function BoardColumn({
  status,
  filter,
  onAction,
}: {
  status: LeadStatus;
  filter: { brokerId?: string; unassigned?: boolean };
  onAction: (dialog: Dialog) => void;
}) {
  const query = useQuery({
    queryKey: ['leads', 'board', status, filter],
    queryFn: () => api.leads.search({ status, ...filter, perPage: 50 }),
  });

  return (
    <section className="board-col" aria-label={LEAD_STATUS[status].label}>
      <header>
        <span>{LEAD_STATUS[status].label}</span>
        <span className="queue-count">{query.data?.total ?? '…'}</span>
      </header>
      {query.isLoading && <Loading />}
      <ErrorAlert error={query.error} />
      {query.data?.items.length === 0 && <p className="small muted">Nenhum lead nesta etapa.</p>}
      {query.data?.items.map((lead) => (
        <article key={lead.id} className="lead-card">
          <div className="spread" style={{ flexWrap: 'nowrap' }}>
            <span className="name">{lead.name}</span>
            <button className="icon-btn" aria-label={`Editar ${lead.name}`} title="Editar" onClick={() => onAction({ kind: 'edit', lead })}>
              <LuPencil aria-hidden />
            </button>
          </div>
          <div className="meta">
            <Tag label={LEAD_INTEREST[lead.interest]} tone="info" />
            <span>{LEAD_SOURCE[lead.source]}</span>
          </div>
          {lead.phone && <div className="meta"><LuPhone aria-hidden /> {formatPhone(lead.phone)}</div>}
          {lead.email && <div className="meta"><LuMail aria-hidden /> {lead.email}</div>}
          {lead.propertyId && <div className="small"><PropertyRef id={lead.propertyId} /></div>}
          <div className="meta">
            {lead.brokerId ? <>Com <UserName id={lead.brokerId} /></> : <Tag label="Sem corretor" tone="danger" />}
          </div>
          <div className="row">
            <button className="btn btn-sm" onClick={() => onAction({ kind: 'visit', lead })}>
              <LuCalendarDays aria-hidden /> Agendar visita
            </button>
            <button className="btn btn-sm" onClick={() => onAction({ kind: 'move', lead })}>
              <LuArrowRightLeft aria-hidden /> Mover
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

type Destination = 'IN_SERVICE' | 'VISIT_SCHEDULED' | 'PROPOSAL' | 'WON' | 'LOST';

/** Avança o lead no funil ou encerra o atendimento (ganho ou perdido). */
function MoveLead({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  // O funil só anda para a frente: oferece apenas as etapas depois da atual.
  const forward = OPEN.slice(OPEN.indexOf(lead.status) + 1) as Destination[];
  const destinations: Destination[] = [...forward, 'WON', 'LOST'];
  const [to, setTo] = useState<Destination>(destinations[0]!);
  const [reason, setReason] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);

  const move = useAction(
    () => {
      const change: LeadStatusChange =
        to === 'WON' ? { status: 'WON', personId } : to === 'LOST' ? { status: 'LOST', reason } : { status: to };
      return api.leads.changeStatus(lead.id, change);
    },
    { success: (moved) => `${moved.name}: ${LEAD_STATUS[moved.status].label.toLowerCase()}.`, onDone: onClose },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    move.mutate(undefined);
  };

  return (
    <Modal title={`Mover ${lead.name}`} onClose={onClose} size="sm">
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={move.error} />
        <SelectField
          label="Nova etapa"
          value={to}
          onChange={(value) => value && setTo(value)}
          options={destinations.map((status) => ({ value: status, label: LEAD_STATUS[status].label }))}
          hint={`Hoje: ${LEAD_STATUS[lead.status].label}.`}
        />
        {to === 'LOST' && <TextAreaField label="Motivo da perda" required maxLength={500} value={reason} onChange={setReason} />}
        {to === 'WON' && (
          <ComboField
            label="Pessoa cadastrada"
            value={personId}
            selected={<PersonName id={personId} />}
            onChange={setPersonId}
            search={searchPeople}
            hint="Opcional. Liga o lead ao cadastro do cliente em Pessoas."
          />
        )}
        <FormActions onCancel={onClose} submitLabel="Mover lead" isPending={move.isPending} />
      </form>
    </Modal>
  );
}

function ClosedLeads({ status, filter }: { status: 'WON' | 'LOST'; filter: { brokerId?: string; unassigned?: boolean } }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['leads', 'closed', status, filter, page],
    queryFn: () => api.leads.search({ status, ...filter, page, perPage: 15 }),
  });
  const reopen = useAction((id: string) => api.leads.changeStatus(id, { status: 'REOPEN' }), {
    success: 'Lead reaberto e de volta ao atendimento.',
  });

  const columns: Column<Lead>[] = [
    { header: 'Nome', className: 'primary-cell', cell: (lead) => lead.name },
    { header: 'Queria', cell: (lead) => LEAD_INTEREST[lead.interest] },
    { header: 'Corretor', cell: (lead) => <UserName id={lead.brokerId} /> },
    status === 'WON'
      ? { header: 'Cliente', cell: (lead) => <PersonName id={lead.personId} /> }
      : { header: 'Motivo', cell: (lead) => lead.lostReason ?? '—' },
    { header: 'Encerrado em', className: 'num', cell: (lead) => formatDate(lead.updatedAt) },
    {
      header: '',
      className: 'actions',
      cell: (lead) => (
        <button className="btn btn-sm" onClick={() => reopen.mutate(lead.id)} disabled={reopen.isPending}>
          <LuRotateCcw aria-hidden /> Reabrir
        </button>
      ),
    },
  ];

  return (
    <div className="panel">
      <ErrorAlert error={reopen.error} />
      <DataTable
        columns={columns}
        page={query.data}
        isLoading={query.isLoading}
        error={query.error}
        onPageChange={setPage}
        empty={<Empty title={status === 'WON' ? 'Nenhum lead ganho ainda.' : 'Nenhum lead perdido.'} />}
      />
    </div>
  );
}
