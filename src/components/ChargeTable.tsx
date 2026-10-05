import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { LuArrowRightLeft, LuBanknote } from 'react-icons/lu';
import { api } from '@/api';
import type { Charge, Page } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { FormActions, TextField } from '@/components/form';
import { LeaseRef } from '@/components/lookups';
import { type Column, DataTable, ErrorAlert, Loading, Modal, Tag } from '@/components/ui';
import { formatDate, formatMoney, formatMonth, todayIso } from '@/lib/format';
import { CHARGE_STATUS, TRANSFER_STATUS } from '@/lib/labels';
import { useAction } from '@/lib/useAction';

type Dialog = { kind: 'pay' | 'transfer'; charge: Charge } | null;

/** Tabela de cobranças com as ações de dar baixa e registrar repasse. */
export function ChargeTable({
  page,
  isLoading,
  error,
  onPageChange,
  showLease,
  empty,
}: {
  page?: Page<Charge>;
  isLoading: boolean;
  error: unknown;
  onPageChange: (page: number) => void;
  /** Mostra imóvel e inquilino (desnecessário dentro da tela do próprio contrato). */
  showLease?: boolean;
  empty: React.ReactNode;
}) {
  const { can } = useAuth();
  const [dialog, setDialog] = useState<Dialog>(null);
  const canManage = can('manageRentals');

  const columns: Column<Charge>[] = [
    { header: 'Vencimento', className: 'num primary-cell', cell: (charge) => formatDate(charge.dueDate) },
    { header: 'Competência', className: 'num', cell: (charge) => formatMonth(charge.referenceMonth) },
    ...(showLease ? [{ header: 'Contrato', cell: (charge: Charge) => <LeaseRef id={charge.leaseId} /> }] : []),
    { header: 'Aluguel', align: 'right', className: 'num', cell: (charge) => formatMoney(charge.amountCents) },
    {
      header: 'Situação',
      cell: (charge) => (charge.overdue ? <Tag label="Atrasada" tone="danger" /> : <Tag {...CHARGE_STATUS[charge.status]} />),
    },
    {
      header: 'Recebido',
      align: 'right',
      className: 'num',
      cell: (charge) =>
        charge.payment ? (
          <>
            {formatMoney(charge.payment.paidAmountCents)}
            <div className="small muted">em {formatDate(charge.payment.paidAt)}</div>
          </>
        ) : (
          '—'
        ),
    },
    {
      header: 'Repasse ao proprietário',
      align: 'right',
      className: 'num',
      cell: (charge) =>
        charge.payment ? (
          <>
            {formatMoney(charge.payment.ownerTransferCents)}
            <div className="small">
              {charge.payment.transferStatus === 'DONE' ? (
                <span className="muted">repassado em {formatDate(charge.payment.transferredAt)}</span>
              ) : (
                <Tag {...TRANSFER_STATUS.PENDING} />
              )}
            </div>
          </>
        ) : (
          '—'
        ),
    },
    ...(canManage
      ? [
          {
            header: '',
            className: 'actions',
            cell: (charge: Charge) => (
              <>
                {charge.status === 'PENDING' && (
                  <button className="btn btn-sm" onClick={() => setDialog({ kind: 'pay', charge })}>
                    <LuBanknote aria-hidden /> Dar baixa
                  </button>
                )}
                {charge.payment?.transferStatus === 'PENDING' && (
                  <button className="btn btn-sm" onClick={() => setDialog({ kind: 'transfer', charge })}>
                    <LuArrowRightLeft aria-hidden /> Registrar repasse
                  </button>
                )}
              </>
            ),
          } satisfies Column<Charge>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        page={page}
        isLoading={isLoading}
        error={error}
        onPageChange={onPageChange}
        empty={empty}
        rowClassName={(charge) => (charge.overdue ? 'is-late' : undefined)}
      />
      {dialog?.kind === 'pay' && <PayCharge charge={dialog.charge} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'transfer' && <TransferCharge charge={dialog.charge} onClose={() => setDialog(null)} />}
    </>
  );
}

/** Baixa do pagamento. Mostra o valor atualizado para a data escolhida antes de confirmar. */
function PayCharge({ charge, onClose }: { charge: Charge; onClose: () => void }) {
  const [paidAt, setPaidAt] = useState(todayIso());
  const quote = useQuery({
    queryKey: ['charges', charge.id, 'quote', paidAt],
    queryFn: () => api.charges.quote(charge.id, paidAt),
    enabled: !!paidAt,
  });
  const pay = useAction(() => api.charges.pay(charge.id, paidAt), {
    success: (paid) => `Baixa registrada: ${formatMoney(paid.payment?.paidAmountCents)}.`,
    onDone: onClose,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    pay.mutate(undefined);
  };

  return (
    <Modal title="Dar baixa no pagamento" onClose={onClose} size="sm">
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={pay.error ?? quote.error} />
        <LeaseRef id={charge.leaseId} />
        <TextField label="Data do pagamento" type="date" required max={todayIso()} value={paidAt} onChange={setPaidAt} hint={`Vencimento: ${formatDate(charge.dueDate)}.`} />
        {quote.isLoading && <Loading label="Calculando…" />}
        {quote.data && (
          <div>
            <div className="sum-row"><span>Aluguel de {formatMonth(charge.referenceMonth)}</span><span className="num">{formatMoney(quote.data.amountCents)}</span></div>
            {quote.data.daysLate > 0 && (
              <>
                <div className="sum-row"><span>Multa por atraso</span><span className="num">{formatMoney(quote.data.lateFeeCents)}</span></div>
                <div className="sum-row">
                  <span>Juros de {quote.data.daysLate} {quote.data.daysLate === 1 ? 'dia' : 'dias'}</span>
                  <span className="num">{formatMoney(quote.data.interestCents)}</span>
                </div>
              </>
            )}
            <div className="sum-row total"><span>Total a receber</span><span className="num">{formatMoney(quote.data.totalCents)}</span></div>
          </div>
        )}
        <FormActions onCancel={onClose} submitLabel="Dar baixa" isPending={pay.isPending} />
      </form>
    </Modal>
  );
}

function TransferCharge({ charge, onClose }: { charge: Charge; onClose: () => void }) {
  const payment = charge.payment!;
  const [date, setDate] = useState(todayIso());
  const transfer = useAction(() => api.charges.transfer(charge.id, date), { success: 'Repasse registrado.', onDone: onClose });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    transfer.mutate(undefined);
  };

  return (
    <Modal title="Registrar repasse ao proprietário" onClose={onClose} size="sm">
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={transfer.error} />
        <LeaseRef id={charge.leaseId} />
        <div>
          <div className="sum-row"><span>Recebido em {formatDate(payment.paidAt)}</span><span className="num">{formatMoney(payment.paidAmountCents)}</span></div>
          <div className="sum-row"><span>Taxa de administração</span><span className="num">− {formatMoney(payment.adminFeeCents)}</span></div>
          <div className="sum-row total"><span>Repassar ao proprietário</span><span className="num">{formatMoney(payment.ownerTransferCents)}</span></div>
        </div>
        <TextField label="Data do repasse" type="date" required min={payment.paidAt} max={todayIso()} value={date} onChange={setDate} />
        <FormActions onCancel={onClose} submitLabel="Registrar repasse" isPending={transfer.isPending} />
      </form>
    </Modal>
  );
}
