import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LuBanknote } from 'react-icons/lu';
import { useParams } from 'react-router-dom';
import { api } from '@/api';
import type { Commission } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { PersonName, PropertyRef, UserName } from '@/components/lookups';
import { type PayableCommission, PayCommission } from '@/components/PayCommission';
import { type Column, DataTable, ErrorAlert, Facts, Loading, PageHeader, Tag } from '@/components/ui';
import { formatDate, formatMoney, formatPercent } from '@/lib/format';
import { COMMISSION_ROLE, COMMISSION_STATUS } from '@/lib/labels';

export function SaleDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const [paying, setPaying] = useState<PayableCommission | null>(null);
  const { data: sale, error, isLoading } = useQuery({ queryKey: ['sales', id], queryFn: () => api.sales.get(id) });

  if (isLoading) return <Loading />;
  if (error || !sale) return <ErrorAlert error={error ?? new Error('Venda não encontrada.')} />;

  const payee = (commission: Commission) => (commission.brokerId ? <UserName id={commission.brokerId} /> : 'Imobiliária');

  const columns: Column<Commission>[] = [
    { header: 'Quem recebe', className: 'primary-cell', cell: payee },
    { header: 'Papel na venda', cell: (commission) => COMMISSION_ROLE[commission.role] },
    { header: 'Parte', align: 'right', className: 'num', cell: (commission) => formatPercent(commission.sharePercent) },
    { header: 'Valor', align: 'right', className: 'num', cell: (commission) => formatMoney(commission.amountCents) },
    {
      header: 'Situação',
      cell: (commission) => (
        <>
          <Tag {...COMMISSION_STATUS[commission.status]} />
          {commission.paidAt && <span className="small muted"> em {formatDate(commission.paidAt)}</span>}
        </>
      ),
    },
    {
      header: '',
      className: 'actions',
      cell: (commission) =>
        commission.status === 'PENDING' &&
        can('payCommissions') && (
          <button
            className="btn btn-sm"
            onClick={() => setPaying({ id: commission.id, saleId: sale.id, amountCents: commission.amountCents, saleClosedAt: sale.closedAt, payee: payee(commission) })}
          >
            <LuBanknote aria-hidden /> Pagar
          </button>
        ),
    },
  ];

  return (
    <>
      <PageHeader back={{ to: '/vendas', label: 'Vendas' }} title={`Venda de ${formatDate(sale.closedAt)}`} description={<PropertyRef id={sale.propertyId} />} />

      <div className="stack">
        <section className="panel">
          <div className="panel-body">
            <Facts
              items={[
                ['Valor da venda', <span className="num">{formatMoney(sale.amountCents)}</span>],
                ['Comprador', <PersonName id={sale.buyerId} />],
                ['Vendedor (proprietário)', <PersonName id={sale.sellerId} />],
                ['Comissão', <span className="num">{formatMoney(sale.commissionAmountCents)} ({formatPercent(sale.commissionPercent)})</span>],
              ]}
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Rateio da comissão</h2></div>
          <DataTable columns={columns} rows={sale.commissions} empty={<div className="panel-body muted">Venda sem comissão.</div>} />
        </section>
      </div>

      {paying && <PayCommission commission={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
