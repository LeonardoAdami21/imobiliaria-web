import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api';
import type { ChargeFilters } from '@/api/types';
import { ChargeTable } from '@/components/ChargeTable';
import { Empty, PageHeader, Segmented } from '@/components/ui';

type View = 'overdue' | 'pending' | 'transfer' | 'paid' | 'all';

const FILTERS: Record<View, ChargeFilters> = {
  overdue: { overdue: true },
  pending: { status: 'PENDING' },
  transfer: { transferStatus: 'PENDING' },
  paid: { status: 'PAID' },
  all: {},
};

const EMPTY: Record<View, string> = {
  overdue: 'Nenhuma cobrança atrasada.',
  pending: 'Nenhuma cobrança a receber.',
  transfer: 'Nenhum repasse pendente.',
  paid: 'Nenhuma cobrança paga ainda.',
  all: 'Nenhuma cobrança. Elas são geradas ao criar um contrato de locação.',
};

export function ChargesPage() {
  const [view, setView] = useState<View>('overdue');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['charges', 'list', view, page],
    queryFn: () => api.charges.search({ ...FILTERS[view], page, perPage: 15 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Cobranças"
        description="Aluguéis de todos os contratos. Dê baixa quando o inquilino pagar e registre o repasse quando o valor for para o proprietário."
      />

      <div className="filters">
        <Segmented
          label="Mostrar"
          value={view}
          onChange={(value) => {
            setView(value);
            setPage(1);
          }}
          options={[
            { value: 'overdue', label: 'Atrasadas' },
            { value: 'pending', label: 'A receber' },
            { value: 'transfer', label: 'Repasse pendente' },
            { value: 'paid', label: 'Pagas' },
            { value: 'all', label: 'Todas' },
          ]}
        />
      </div>

      <div className="panel">
        <ChargeTable page={query.data} isLoading={query.isLoading} error={query.error} onPageChange={setPage} showLease empty={<Empty title={EMPTY[view]} />} />
      </div>
    </>
  );
}
