import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { LuDoorOpen, LuTrendingUp } from 'react-icons/lu';
import { useParams } from 'react-router-dom';
import { api } from '@/api';
import type { Lease } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { ChargeTable } from '@/components/ChargeTable';
import { FormActions, TextAreaField, TextField } from '@/components/form';
import { PersonName, PropertyRef, useLease } from '@/components/lookups';
import { Empty, ErrorAlert, Facts, Loading, Modal, PageHeader, Tag } from '@/components/ui';
import { formatDate, formatMoney, formatPercent, inputToPercent, todayIso } from '@/lib/format';
import { ADJUSTMENT_INDEX, GUARANTEE, LEASE_STATUS } from '@/lib/labels';
import { useAction } from '@/lib/useAction';

export function LeaseDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const [dialog, setDialog] = useState<'adjust' | 'close' | null>(null);
  const [page, setPage] = useState(1);
  const { data: lease, error, isLoading } = useLease(id);

  const charges = useQuery({
    queryKey: ['charges', 'by-lease', id, page],
    queryFn: () => api.charges.search({ leaseId: id, page, perPage: 12 }),
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <Loading />;
  if (error || !lease) return <ErrorAlert error={error ?? new Error('Contrato não encontrado.')} />;

  const active = lease.status === 'ACTIVE';
  const canManage = can('manageRentals') && active;

  return (
    <>
      <PageHeader
        back={{ to: '/locacoes', label: 'Contratos de locação' }}
        title={
          <span className="property-title">
            Locação para <PersonName id={lease.tenantId} />
            <Tag {...LEASE_STATUS[lease.status]} />
          </span>
        }
        description={<PropertyRef id={lease.propertyId} />}
        actions={
          canManage && (
            <>
              <button className="btn" onClick={() => setDialog('adjust')}>
                <LuTrendingUp aria-hidden /> Reajustar aluguel
              </button>
              <button className="btn btn-danger" onClick={() => setDialog('close')}>
                <LuDoorOpen aria-hidden /> Encerrar contrato
              </button>
            </>
          )
        }
      />

      {lease.terminatedAt && (
        <div className="alert" data-tone="info" style={{ marginBottom: 16 }}>
          <div>
            {lease.status === 'TERMINATED' ? 'Rescindido' : 'Encerrado'} em {formatDate(lease.terminatedAt)}.
            {lease.terminationReason && <> Motivo: {lease.terminationReason}</>}
          </div>
        </div>
      )}

      <div className="stack">
        <section className="panel">
          <div className="panel-body">
            <Facts
              items={[
                ['Aluguel', <span className="num">{formatMoney(lease.rentAmountCents)}</span>],
                ['Vencimento', `Todo dia ${lease.dueDay}`],
                ['Vigência', <span className="num">{formatDate(lease.startDate)} a {formatDate(lease.endDate)}</span>],
                ['Prazo', `${lease.durationMonths} meses`],
                ['Proprietário', <PersonName id={lease.ownerId} />],
                ['Garantia', lease.guaranteeType === 'DEPOSIT' ? `Caução de ${formatMoney(lease.depositAmountCents)}` : GUARANTEE[lease.guaranteeType]],
                ...(lease.guarantorId ? [['Fiador', <PersonName id={lease.guarantorId} />] as [string, React.ReactNode]] : []),
                ['Taxa de administração', formatPercent(lease.adminFeePercent)],
                ['Multa por atraso', formatPercent(lease.lateFeePercent)],
                ['Juros de mora', `${formatPercent(lease.monthlyInterestPercent)} ao mês`],
                ['Reajuste', `${ADJUSTMENT_INDEX[lease.adjustmentIndex]}, ${lease.lastAdjustmentAt ? `último em ${formatDate(lease.lastAdjustmentAt)}` : 'ainda não reajustado'}`],
                ...(active ? [['Próximo reajuste a partir de', <span className="num">{formatDate(lease.nextAdjustmentDate)}</span>] as [string, React.ReactNode]] : []),
              ]}
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Cobranças</h2></div>
          <ChargeTable
            page={charges.data}
            isLoading={charges.isLoading}
            error={charges.error}
            onPageChange={setPage}
            empty={<Empty title="Este contrato não tem cobranças." />}
          />
        </section>
      </div>

      {dialog === 'adjust' && <AdjustRent lease={lease} onClose={() => setDialog(null)} />}
      {dialog === 'close' && <CloseLease lease={lease} onClose={() => setDialog(null)} />}
    </>
  );
}

function AdjustRent({ lease, onClose }: { lease: Lease; onClose: () => void }) {
  const today = todayIso();
  const tooEarly = today < lease.nextAdjustmentDate;
  const [percent, setPercent] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(tooEarly ? lease.nextAdjustmentDate : today);
  const value = inputToPercent(percent);
  const newRent = value == null ? null : Math.round(lease.rentAmountCents * (1 + value / 100));

  const adjust = useAction(() => api.leases.adjustRent(lease.id, value ?? 0, effectiveFrom), {
    success: (adjusted) => `Aluguel reajustado para ${formatMoney(adjusted.rentAmountCents)}.`,
    onDone: onClose,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    adjust.mutate(undefined);
  };

  return (
    <Modal title="Reajustar aluguel" onClose={onClose} size="sm">
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={adjust.error} />
        {tooEarly && (
          <div className="alert" data-tone="warn">
            <div>O aluguel só pode ser reajustado a cada 12 meses. Este contrato aceita reajuste a partir de {formatDate(lease.nextAdjustmentDate)}.</div>
          </div>
        )}
        <div className="form-grid">
          <TextField className="col-6" label={`Reajuste (%), ${ADJUSTMENT_INDEX[lease.adjustmentIndex]}`} inputMode="decimal" required value={percent} onChange={setPercent} placeholder="4,5" />
          <TextField className="col-6" label="Vale a partir de" type="date" required min={lease.nextAdjustmentDate} max={lease.endDate} value={effectiveFrom} onChange={setEffectiveFrom} />
        </div>
        <div>
          <div className="sum-row"><span>Aluguel atual</span><span className="num">{formatMoney(lease.rentAmountCents)}</span></div>
          <div className="sum-row total"><span>Novo aluguel</span><span className="num">{newRent == null ? '—' : formatMoney(newRent)}</span></div>
        </div>
        <p className="small muted">As cobranças ainda não pagas, do mês de vigência em diante, passam para o novo valor.</p>
        <FormActions onCancel={onClose} submitLabel="Reajustar aluguel" isPending={adjust.isPending} />
      </form>
    </Modal>
  );
}

function CloseLease({ lease, onClose }: { lease: Lease; onClose: () => void }) {
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const early = date < lease.endDate;

  const close = useAction(() => api.leases.close(lease.id, { date, reason: reason || null }), {
    success: (closed) => (closed.status === 'TERMINATED' ? 'Contrato rescindido. O imóvel voltou a ficar disponível.' : 'Contrato encerrado. O imóvel voltou a ficar disponível.'),
    onDone: onClose,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    close.mutate(undefined);
  };

  return (
    <Modal title="Encerrar contrato" onClose={onClose} size="sm">
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={close.error} />
        <TextField label="Data da entrega das chaves" type="date" required min={lease.startDate} max={todayIso()} value={date} onChange={setDate} hint={`O prazo do contrato vai até ${formatDate(lease.endDate)}.`} />
        {early && (
          <TextAreaField label="Motivo da rescisão" required maxLength={500} value={reason} onChange={setReason} hint="Encerrar antes do fim do prazo é uma rescisão e exige o motivo." />
        )}
        <p className="small muted">
          As cobranças dos meses seguintes ao da saída são canceladas; as anteriores continuam a receber. O imóvel volta a ficar disponível.
        </p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-danger" disabled={close.isPending}>
            {close.isPending ? 'Encerrando…' : early ? 'Rescindir contrato' : 'Encerrar contrato'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
