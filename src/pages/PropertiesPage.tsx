import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LuPlus, LuSearch } from 'react-icons/lu';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api';
import type { Property, PropertyStatus, PropertyType } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { SelectField, TextField } from '@/components/form';
import { type Column, DataTable, Empty, HouseNumber, PageHeader, Plate } from '@/components/ui';
import { PropertyForm } from '@/forms/PropertyForm';
import { formatMoney } from '@/lib/format';
import { options, PROPERTY_PURPOSE, PROPERTY_STATUS, PROPERTY_TYPE } from '@/lib/labels';
import { useDebounced } from '@/lib/useDebounced';
import { useFormState } from '@/lib/useFormState';

const columns: Column<Property>[] = [
  { header: 'Nº', cell: (property) => <HouseNumber code={property.code} /> },
  {
    header: 'Imóvel',
    className: 'primary-cell',
    cell: (property) => (
      <>
        <Link to={`/imoveis/${property.id}`}>{property.title}</Link>
        <div className="small muted" style={{ fontWeight: 400 }}>
          {property.address.district}, {property.address.city}/{property.address.state}
        </div>
      </>
    ),
  },
  { header: 'Tipo', cell: (property) => PROPERTY_TYPE[property.type] },
  { header: 'Finalidade', cell: (property) => PROPERTY_PURPOSE[property.purpose] },
  { header: 'Venda', align: 'right', className: 'num', cell: (property) => formatMoney(property.salePriceCents) },
  { header: 'Aluguel', align: 'right', className: 'num', cell: (property) => formatMoney(property.rentPriceCents) },
  { header: 'Situação', cell: (property) => <Plate {...PROPERTY_STATUS[property.status]} /> },
];

export function PropertiesPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const { values: filters, set } = useFormState({
    search: '',
    status: '' as PropertyStatus | '',
    purpose: '' as 'SALE' | 'RENT' | '',
    type: '' as PropertyType | '',
    city: '',
    minBedrooms: '',
  });
  const debounced = useDebounced(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  // Mudar um filtro volta para a primeira página.
  const change =
    <K extends keyof typeof filters>(key: K) =>
    (value: (typeof filters)[K]) => {
      set(key)(value);
      setPage(1);
    };

  const query = useQuery({
    queryKey: ['properties', 'list', debounced, page],
    queryFn: () =>
      api.properties.search({
        search: debounced.search,
        status: debounced.status || undefined,
        purpose: debounced.purpose || undefined,
        type: debounced.type || undefined,
        city: debounced.city,
        minBedrooms: debounced.minBedrooms ? Number(debounced.minBedrooms) : undefined,
        page,
        perPage: 15,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Imóveis"
        description="Tudo o que a imobiliária anuncia para venda ou locação."
        actions={
          can('editProperties') && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <LuPlus aria-hidden /> Cadastrar imóvel
            </button>
          )
        }
      />

      <div className="filters">
        <div className="field wide">
          <label htmlFor="property-search">Buscar</label>
          <div className="search">
            <LuSearch aria-hidden />
            <input id="property-search" className="input" placeholder="Título, rua ou número do imóvel" value={filters.search} onChange={(event) => change('search')(event.target.value)} />
          </div>
        </div>
        <SelectField label="Situação" value={filters.status} onChange={change('status')} placeholder="Todas" options={options(PROPERTY_STATUS)} />
        <SelectField label="Finalidade" value={filters.purpose} onChange={change('purpose')} placeholder="Todas" options={[{ value: 'SALE', label: 'Venda' }, { value: 'RENT', label: 'Locação' }]} />
        <SelectField label="Tipo" value={filters.type} onChange={change('type')} placeholder="Todos" options={options(PROPERTY_TYPE)} />
        <TextField label="Cidade" value={filters.city} onChange={change('city')} />
        <SelectField label="Quartos" value={filters.minBedrooms} onChange={change('minBedrooms')} placeholder="Qualquer" options={['1', '2', '3', '4'].map((n) => ({ value: n, label: `${n} ou mais` }))} />
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          page={query.data}
          isLoading={query.isLoading}
          error={query.error}
          onPageChange={setPage}
          empty={
            hasFilters ? (
              <Empty title="Nenhum imóvel com esses filtros.">Tente remover algum filtro.</Empty>
            ) : (
              <Empty title="Nenhum imóvel cadastrado ainda.">
                Cadastre primeiro o proprietário em Pessoas e depois o imóvel.
              </Empty>
            )
          }
        />
      </div>

      {creating && <PropertyForm onClose={() => setCreating(false)} onSaved={(saved) => navigate(`/imoveis/${saved.id}`)} />}
    </>
  );
}
