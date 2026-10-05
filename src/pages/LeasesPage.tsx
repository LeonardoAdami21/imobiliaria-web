import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api';
import type { Lease, LeaseStatus } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { PersonName, PropertyRef } from '@/components/lookups';
import { type Column, DataTable, Empty, PageHeader, Segmented, Tag } from '@/components/ui';
import { LeaseForm } from '@/forms/LeaseForm';
import { formatDate, formatMoney } from '@/lib/format';
import { LEASE_STATUS } from '@/lib/labels';

const columns: Column<Lease>[] = [
  { header: 'Imóvel', cell: (lease) => <PropertyRef id={lease.propertyId} link={false} /> },
  {
    header: 'Inquilino',
    className: 'primary-cell',
    cell: (lease) => (
      <Link to={`/locacoes/${lease.id}`}>
        <PersonName id={lease.tenantId} />
      </Link>
    ),
  },
  { header: 'Proprietário', cell: (lease) => <PersonName id={lease.ownerId} /> },
  { header: 'Aluguel', align: 'right', className: 'num', cell: (lease) => formatMoney(lease.rentAmountCents) },
  { header: 'Vence dia', align: 'right', className: 'num', cell: (lease) => lease.dueDay },
  { header: 'Vigência', className: 'num', cell: (lease) => `${formatDate(lease.startDate)} a ${formatDate(lease.endDate)}` },
  { header: 'Situação', cell: (lease) => <Tag {...LEASE_STATUS[lease.status]} /> },
];

export function LeasesPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LeaseStatus | 'ALL'>('ACTIVE');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const query = useQuery({
    queryKey: ['leases', 'list', status, page],
    queryFn: () => api.leases.search({ status: status === 'ALL' ? undefined : status, page, perPage: 15 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Contratos de locação"
        description="Ao criar um contrato, o imóvel passa a alugado e as cobranças mensais são geradas para todo o prazo."
        actions={
          can('manageRentals') && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <LuPlus aria-hidden /> Criar contrato
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
            { value: 'ACTIVE', label: 'Ativos' },
            { value: 'ENDED', label: 'Encerrados' },
            { value: 'TERMINATED', label: 'Rescindidos' },
            { value: 'ALL', label: 'Todos' },
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
          empty={<Empty title={status === 'ACTIVE' ? 'Nenhum contrato ativo.' : 'Nenhum contrato nesta situação.'}>O imóvel precisa estar disponível e anunciado para locação.</Empty>}
        />
      </div>

      {creating && <LeaseForm onClose={() => setCreating(false)} onSaved={(lease) => navigate(`/locacoes/${lease.id}`)} />}
    </>
  );
}
