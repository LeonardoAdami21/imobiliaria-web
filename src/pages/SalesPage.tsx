import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api';
import type { Sale } from '@/api/types';
import { TextField } from '@/components/form';
import { PersonName, PropertyRef } from '@/components/lookups';
import { type Column, DataTable, Empty, PageHeader } from '@/components/ui';
import { formatDate, formatMoney, formatPercent } from '@/lib/format';

const columns: Column<Sale>[] = [
  {
    header: 'Data',
    className: 'num primary-cell',
    cell: (sale) => <Link to={`/vendas/${sale.id}`}>{formatDate(sale.closedAt)}</Link>,
  },
  { header: 'Imóvel', cell: (sale) => <PropertyRef id={sale.propertyId} /> },
  { header: 'Comprador', cell: (sale) => <PersonName id={sale.buyerId} /> },
  { header: 'Vendedor', cell: (sale) => <PersonName id={sale.sellerId} /> },
  { header: 'Valor da venda', align: 'right', className: 'num', cell: (sale) => formatMoney(sale.amountCents) },
  {
    header: 'Comissão',
    align: 'right',
    className: 'num',
    cell: (sale) => (
      <>
        {formatMoney(sale.commissionAmountCents)}
        <div className="small muted">{formatPercent(sale.commissionPercent)}</div>
      </>
    ),
  },
];

export function SalesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['sales', 'list', from, to, page],
    queryFn: () => api.sales.search({ closedFrom: from, closedTo: to, page, perPage: 15 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Vendas" description="Vendas concluídas. Para fechar uma venda, aceite a proposta do comprador em Propostas." />

      <div className="filters">
        <TextField label="Fechadas de" type="date" value={from} onChange={(value) => { setFrom(value); setPage(1); }} />
        <TextField label="Até" type="date" value={to} onChange={(value) => { setTo(value); setPage(1); }} />
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          page={query.data}
          isLoading={query.isLoading}
          error={query.error}
          onPageChange={setPage}
          empty={
            <Empty title={from || to ? 'Nenhuma venda neste período.' : 'Nenhuma venda fechada ainda.'}>
              <Link className="btn" to="/propostas">Ver propostas</Link>
            </Empty>
          }
        />
      </div>
    </>
  );
}
