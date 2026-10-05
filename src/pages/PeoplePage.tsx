import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LuPencil, LuPlus, LuSearch } from 'react-icons/lu';
import { api } from '@/api';
import type { Person } from '@/api/types';
import { type Column, DataTable, Empty, PageHeader } from '@/components/ui';
import { PersonForm } from '@/forms/PersonForm';
import { formatPhone } from '@/lib/format';
import { useDebounced } from '@/lib/useDebounced';

export function PeoplePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Person | 'new' | null>(null);
  const term = useDebounced(search);

  const query = useQuery({
    queryKey: ['people', 'list', term, page],
    queryFn: () => api.people.search({ search: term, page, perPage: 15 }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<Person>[] = [
    { header: 'Nome', className: 'primary-cell', cell: (person) => person.name },
    { header: 'CPF/CNPJ', className: 'num', cell: (person) => person.documentFormatted },
    { header: 'Telefone', className: 'num', cell: (person) => formatPhone(person.phone) },
    { header: 'E-mail', cell: (person) => person.email ?? '—' },
    {
      header: '',
      className: 'actions',
      cell: (person) => (
        <button className="btn btn-sm" onClick={() => setEditing(person)}>
          <LuPencil aria-hidden /> Editar
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Pessoas"
        description="Proprietários, inquilinos, compradores e fiadores. A mesma pessoa pode ter mais de um papel: quem define é o contrato."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <LuPlus aria-hidden /> Cadastrar pessoa
          </button>
        }
      />

      <div className="filters">
        <div className="field wide">
          <label htmlFor="people-search">Buscar</label>
          <div className="search">
            <LuSearch aria-hidden />
            <input
              id="people-search"
              className="input"
              placeholder="Nome, CPF ou CNPJ"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          page={query.data}
          isLoading={query.isLoading}
          error={query.error}
          onPageChange={setPage}
          empty={
            term ? (
              <Empty title={`Ninguém encontrado para "${term}".`}>Confira o nome ou o documento.</Empty>
            ) : (
              <Empty title="Nenhuma pessoa cadastrada ainda.">Comece pelo proprietário do primeiro imóvel.</Empty>
            )
          }
        />
      </div>

      {editing && <PersonForm person={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
