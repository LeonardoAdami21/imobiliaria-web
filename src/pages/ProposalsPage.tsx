import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { LuBan, LuCheck, LuHandshake, LuPlus, LuX } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import type { Proposal, ProposalStatus } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { FormActions, TextAreaField } from '@/components/form';
import { PersonName, PropertyRef, useProperty, UserName } from '@/components/lookups';
import { type Column, Confirm, DataTable, Empty, ErrorAlert, Modal, PageHeader, Segmented, Tag } from '@/components/ui';
import { CloseSaleForm } from '@/forms/CloseSaleForm';
import { ProposalForm } from '@/forms/ProposalForm';
import { formatDate, formatMoney } from '@/lib/format';
import { PROPOSAL_STATUS } from '@/lib/labels';
import { useAction } from '@/lib/useAction';

type Dialog = { kind: 'new' } | { kind: 'accept' | 'reject' | 'cancel' | 'sale'; proposal: Proposal } | null;

export function ProposalsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProposalStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);

  const query = useQuery({
    queryKey: ['proposals', 'list', status, page],
    queryFn: () => api.proposals.search({ status: status === 'ALL' ? undefined : status, page, perPage: 15 }),
    placeholderData: keepPreviousData,
  });

  const accept = useAction((id: string) => api.proposals.accept(id), { success: 'Proposta aceita. O imóvel está reservado.', onDone: () => setDialog(null) });
  const cancel = useAction((id: string) => api.proposals.cancel(id), { success: 'Proposta cancelada.', onDone: () => setDialog(null) });

  const columns: Column<Proposal>[] = [
    { header: 'Imóvel', cell: (proposal) => <PropertyRef id={proposal.propertyId} /> },
    { header: 'Comprador', className: 'primary-cell', cell: (proposal) => <PersonName id={proposal.buyerId} /> },
    { header: 'Corretor', cell: (proposal) => <UserName id={proposal.brokerId} /> },
    {
      header: 'Valor',
      align: 'right',
      className: 'num',
      cell: (proposal) => (
        <>
          {formatMoney(proposal.amountCents)}
          {proposal.paymentTerms && <div className="small muted" style={{ whiteSpace: 'normal', maxWidth: '26ch', marginLeft: 'auto' }}>{proposal.paymentTerms}</div>}
        </>
      ),
    },
    { header: 'Válida até', className: 'num', cell: (proposal) => formatDate(proposal.validUntil) },
    {
      header: 'Situação',
      cell: (proposal) => (
        <>
          <Tag {...PROPOSAL_STATUS[proposal.status]} />
          {proposal.rejectionReason && <div className="small muted" style={{ maxWidth: '28ch' }}>{proposal.rejectionReason}</div>}
        </>
      ),
    },
    { header: '', className: 'actions', cell: (proposal) => <Actions proposal={proposal} onAction={setDialog} /> },
  ];

  return (
    <>
      <PageHeader
        title="Propostas de compra"
        description="Aceitar uma proposta reserva o imóvel. Depois da assinatura, feche a venda para gerar as comissões."
        actions={
          can('negotiate') && (
            <button className="btn btn-primary" onClick={() => setDialog({ kind: 'new' })}>
              <LuPlus aria-hidden /> Registrar proposta
            </button>
          )
        }
      />

      <div className="filters">
        <Segmented
          label="Mostrar"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: 'PENDING', label: 'Aguardando resposta' },
            { value: 'ACCEPTED', label: 'Aceitas' },
            { value: 'REJECTED', label: 'Recusadas' },
            { value: 'ALL', label: 'Todas' },
          ]}
        />
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          page={query.data}
          isLoading={query.isLoading}
          error={query.error}
          onPageChange={setPage}
          empty={<Empty title={status === 'PENDING' ? 'Nenhuma proposta aguardando resposta.' : 'Nenhuma proposta nesta situação.'} />}
        />
      </div>

      {dialog?.kind === 'new' && <ProposalForm onClose={() => setDialog(null)} />}
      {dialog?.kind === 'sale' && <CloseSaleForm proposal={dialog.proposal} onClose={() => setDialog(null)} onSaved={(sale) => navigate(`/vendas/${sale.id}`)} />}
      {dialog?.kind === 'reject' && <RejectProposal proposal={dialog.proposal} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'accept' && (
        <Confirm
          title="Aceitar proposta?"
          confirmLabel="Aceitar proposta"
          isPending={accept.isPending}
          error={accept.error}
          onConfirm={() => accept.mutate(dialog.proposal.id)}
          onClose={() => setDialog(null)}
        >
          O imóvel fica reservado para <strong><PersonName id={dialog.proposal.buyerId} /></strong> por {formatMoney(dialog.proposal.amountCents)} e deixa de receber novas propostas.
        </Confirm>
      )}
      {dialog?.kind === 'cancel' && (
        <Confirm
          title="Cancelar proposta?"
          confirmLabel="Cancelar proposta"
          danger
          isPending={cancel.isPending}
          error={cancel.error}
          onConfirm={() => cancel.mutate(dialog.proposal.id)}
          onClose={() => setDialog(null)}
        >
          Use quando o comprador desistir.
          {dialog.proposal.status === 'ACCEPTED' && ' Como a proposta já foi aceita, o imóvel volta a ficar disponível.'}
        </Confirm>
      )}
    </>
  );
}

function Actions({ proposal, onAction }: { proposal: Proposal; onAction: (dialog: Dialog) => void }) {
  const { can } = useAuth();
  const property = useProperty(proposal.propertyId).data;

  if (proposal.status === 'PENDING') {
    return (
      <>
        {can('decideProposals') && (
          <>
            <button className="btn btn-sm" onClick={() => onAction({ kind: 'accept', proposal })}>
              <LuCheck aria-hidden /> Aceitar
            </button>
            <button className="btn btn-sm" onClick={() => onAction({ kind: 'reject', proposal })}>
              <LuX aria-hidden /> Recusar
            </button>
          </>
        )}
        {can('negotiate') && (
          <button className="btn btn-sm btn-quiet" onClick={() => onAction({ kind: 'cancel', proposal })}>
            <LuBan aria-hidden /> Cancelar
          </button>
        )}
      </>
    );
  }

  if (proposal.status === 'ACCEPTED') {
    // Proposta aceita cujo imóvel já está vendido é uma venda concluída: não há mais o que fazer aqui.
    if (property?.status === 'SOLD') return <Tag label="Venda fechada" tone="ok" />;
    return (
      <>
        {can('decideProposals') && (
          <button className="btn btn-sm btn-primary" onClick={() => onAction({ kind: 'sale', proposal })}>
            <LuHandshake aria-hidden /> Fechar venda
          </button>
        )}
        {can('negotiate') && (
          <button className="btn btn-sm btn-quiet" onClick={() => onAction({ kind: 'cancel', proposal })}>
            <LuBan aria-hidden /> Cancelar
          </button>
        )}
      </>
    );
  }
  return null;
}

function RejectProposal({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const reject = useAction(() => api.proposals.reject(proposal.id, reason), { success: 'Proposta recusada.', onDone: onClose });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    reject.mutate(undefined);
  };

  return (
    <Modal title="Recusar proposta" onClose={onClose} size="sm">
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={reject.error} />
        <p className="muted">
          Proposta de <PersonName id={proposal.buyerId} />, {formatMoney(proposal.amountCents)}.
        </p>
        <TextAreaField label="Motivo da recusa" required maxLength={500} value={reason} onChange={setReason} />
        <FormActions onCancel={onClose} submitLabel="Recusar proposta" isPending={reject.isPending} />
      </form>
    </Modal>
  );
}
