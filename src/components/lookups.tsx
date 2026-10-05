import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api';
import type { Property, UserDirectoryEntry } from '@/api/types';
import { ROLE } from '@/lib/labels';
import type { ComboOption } from './form';
import { HouseNumber } from './ui';

/**
 * A API devolve referências por id (ownerId, tenantId, brokerId...).
 * Estes hooks buscam o registro por trás de cada id; o React Query guarda o
 * resultado e evita repetir a mesma consulta quando o id aparece em várias linhas.
 */
const FIVE_MINUTES = 5 * 60 * 1000;

export function usePerson(id: string | null | undefined) {
  return useQuery({ queryKey: ['people', id], queryFn: () => api.people.get(id!), enabled: !!id, staleTime: FIVE_MINUTES });
}

export function useProperty(id: string | null | undefined) {
  return useQuery({ queryKey: ['properties', id], queryFn: () => api.properties.get(id!), enabled: !!id, staleTime: 30_000 });
}

export function useLease(id: string | null | undefined) {
  return useQuery({ queryKey: ['leases', id], queryFn: () => api.leases.get(id!), enabled: !!id, staleTime: 30_000 });
}

export function useLead(id: string | null | undefined) {
  return useQuery({ queryKey: ['leads', id], queryFn: () => api.leads.get(id!), enabled: !!id, staleTime: 30_000 });
}

export function useUserDirectory() {
  return useQuery({ queryKey: ['users', 'directory'], queryFn: api.users.directory, staleTime: FIVE_MINUTES });
}

export function PersonName({ id }: { id: string | null | undefined }) {
  const { data, isError } = usePerson(id);
  if (!id) return <>—</>;
  return <>{data?.name ?? (isError ? 'Pessoa não encontrada' : '…')}</>;
}

export function UserName({ id }: { id: string | null | undefined }) {
  const { data } = useUserDirectory();
  if (!id) return <>—</>;
  return <>{data ? (data.find((user) => user.id === id)?.name ?? 'Usuário removido') : '…'}</>;
}

export function LeadName({ id }: { id: string }) {
  const { data } = useLead(id);
  return <>{data?.name ?? '…'}</>;
}

/** Número e título do imóvel, com link para a ficha. */
export function PropertyRef({ id, link = true }: { id: string | null | undefined; link?: boolean }) {
  const { data } = useProperty(id);
  if (!id) return <>—</>;
  if (!data) return <>…</>;
  return (
    <span className="property-ref">
      <HouseNumber code={data.code} />
      {link ? <Link to={`/imoveis/${data.id}`}>{data.title}</Link> : <span>{data.title}</span>}
    </span>
  );
}

/** Imóvel e inquilino de um contrato, para telas que só têm o id do contrato (cobranças). */
export function LeaseRef({ id }: { id: string }) {
  const { data } = useLease(id);
  if (!data) return <>…</>;
  return (
    <div>
      <PropertyRef id={data.propertyId} link={false} />
      <div className="small muted">
        <Link to={`/locacoes/${data.id}`}>
          Inquilino: <PersonName id={data.tenantId} />
        </Link>
      </div>
    </div>
  );
}

// ── Buscas usadas pelos seletores (ComboField) ──

export async function searchPeople(text: string): Promise<ComboOption[]> {
  const page = await api.people.search({ search: text || undefined, perPage: 8 });
  return page.items.map((person) => ({ id: person.id, label: person.name, detail: person.documentFormatted }));
}

export function propertyLabel(property: Property): string {
  return `Nº ${property.code} – ${property.title}`;
}

export function searchProperties(filters: { purpose?: 'SALE' | 'RENT'; onlyAvailable?: boolean } = {}) {
  return async (text: string): Promise<ComboOption[]> => {
    const page = await api.properties.search({
      search: text || undefined,
      purpose: filters.purpose,
      status: filters.onlyAvailable ? 'AVAILABLE' : undefined,
      perPage: 8,
    });
    return page.items.map((property) => ({
      id: property.id,
      label: propertyLabel(property),
      detail: `${property.address.district}, ${property.address.city}`,
    }));
  };
}

export async function searchOpenLeads(text: string): Promise<ComboOption[]> {
  // A API não busca lead por nome; carrega os em aberto mais recentes e filtra aqui.
  const pages = await Promise.all(
    (['NEW', 'IN_SERVICE', 'VISIT_SCHEDULED', 'PROPOSAL'] as const).map((status) => api.leads.search({ status, perPage: 50 })),
  );
  const term = text.toLowerCase();
  return pages
    .flatMap((page) => page.items)
    .filter((lead) => lead.name.toLowerCase().includes(term))
    .slice(0, 8)
    .map((lead) => ({ id: lead.id, label: lead.name, detail: lead.phone ?? lead.email ?? undefined }));
}

/** Opções de <select> com os usuários ativos, opcionalmente só de alguns papéis. */
export function userOptions(directory: UserDirectoryEntry[] | undefined, roles?: UserDirectoryEntry['role'][]) {
  return (directory ?? [])
    .filter((user) => user.active && (!roles || roles.includes(user.role)))
    .map((user) => ({ value: user.id, label: `${user.name} (${ROLE[user.role]})` }));
}
