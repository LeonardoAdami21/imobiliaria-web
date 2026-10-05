import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LuBanknote } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { api } from '@/api';
import type { CommissionEntry, CommissionStatus } from '@/api/types';
import { useAuth, useCurrentUser } from '@/auth/AuthContext';
import { SelectField, TextField } from '@/components/form';
import { PropertyRef, UserName, userOptions, useUserDirectory } from '@/components/lookups';
import { type PayableCommission, PayCommission } from '@/components/PayCommission';
import { type Column, DataTable, Empty, PageHeader, Segmented, Tag } from '@/components/ui';
import { formatDate, formatMoney, formatPercent } from '@/lib/format';
import { COMMISSION_ROLE, COMMISSION_STATUS } from '@/lib/labels';

export function CommissionsPage() {
  const me = useCurrentUser();
  const { can } = useAuth();
  const directory = useUserDirectory();
  const isBroker = me.role === 'BROKER';
  const [status, setStatus] = useState<CommissionStatus | 'ALL'>('PENDING');
  const [broker, setBroker] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<PayableCommission | null>(null);

  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const query = useQuery({
    queryKey: ['commissions', status, broker, from, to, page],
    queryFn: () =>
      api.sales.commissions({ status: status === 'ALL' ? undefined : status, brokerId: broker || undefined, closedFrom: from, closedTo: to, page, perPage: 15 }),
    placeholderData: keepPreviousData,
  });

  const payee = (entry: CommissionEntry) => (entry.brokerId ? <UserName id={entry.brokerId} /> : 'Imobiliária');

  const columns: Column<CommissionEntry>[] = [
    {
      header: 'Venda',
      className: 'num primary-cell',
      cell: (entry) => <Link to={`/vendas/${entry.saleId}`}>{formatDate(entry.saleClosedAt)}</Link>,
    },
    { header: 'Imóvel', cell: (entry) => <PropertyRef id={entry.propertyId} /> },
    { header: 'Quem recebe', cell: payee },
    { header: 'Papel', cell: (entry) => `${COMMISSION_ROLE[entry.role]} (${formatPercent(entry.sharePercent)})` },
    { header: 'Valor', align: 'right', className: 'num', cell: (entry) => formatMoney(entry.amountCents) },
    {
      header: 'Situação',
      cell: (entry) => (
        <>
          <Tag {...COMMISSION_STATUS[entry.status]} />
          {entry.paidAt && <span className="small muted"> em {formatDate(entry.paidAt)}</span>}
        </>
      ),
    },
    {
      header: '',
      className: 'actions',
      cell: (entry) =>
        entry.status === 'PENDING' &&
        can('payCommissions') && (
          <button
            className="btn btn-sm"
            onClick={() => setPaying({ id: entry.id, saleId: entry.saleId, amountCents: entry.amountCents, saleClosedAt: entry.saleClosedAt, payee: payee(entry) })}
          >
            <LuBanknote aria-hidden /> Pagar
          </button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={isBroker ? 'Minhas comissões' : 'Comissões'}
        description={isBroker ? 'O que você tem a receber e já recebeu pelas vendas de que participou.' : 'Comissões geradas pelas vendas, por corretor e período.'}
      />

      <div className="filters">
        <div className="field" style={{ width: 'auto' }}>
          <span className="label">Mostrar</span>
          <Segmented
            label="Mostrar"
            value={status}
            onChange={reset(setStatus)}
            options={[
              { value: 'PENDING', label: 'A pagar' },
              { value: 'PAID', label: 'Pagas' },
              { value: 'ALL', label: 'Todas' },
            ]}
          />
        </div>
        {!isBroker && <SelectField className="wide" label="Corretor" value={broker} onChange={reset(setBroker)} placeholder="Todos" options={userOptions(directory.data)} />}
        <TextField label="Vendas de" type="date" value={from} onChange={reset(setFrom)} />
        <TextField label="Até" type="date" value={to} onChange={reset(setTo)} />
      </div>

      <div className="panel">
        {!!query.data?.total && (
          <div className="panel-head">
            <span className="muted">Total do filtro</span>
            <strong className="num" style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{formatMoney(query.data.totalAmountCents)}</strong>
          </div>
        )}
        <DataTable
          columns={columns}
          page={query.data}
          isLoading={query.isLoading}
          error={query.error}
          onPageChange={setPage}
          empty={<Empty title={status === 'PENDING' ? 'Nenhuma comissão a pagar.' : 'Nenhuma comissão com esses filtros.'}>As comissões são geradas ao fechar uma venda.</Empty>}
        />
      </div>

      {paying && <PayCommission commission={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
