import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api';
import type { PropertyStatus } from '@/api/types';
import { useCurrentUser } from '@/auth/AuthContext';
import { LeadName, LeaseRef, PersonName, PropertyRef, UserName } from '@/components/lookups';
import { ErrorAlert, PageHeader, Plate } from '@/components/ui';
import { formatDate, formatDateTime, formatMoney, formatPhone } from '@/lib/format';
import { COMMISSION_ROLE, LEAD_INTEREST, PROPERTY_STATUS } from '@/lib/labels';

const TOP = 5;
const STATUSES: PropertyStatus[] = ['AVAILABLE', 'RESERVED', 'RENTED', 'SOLD', 'INACTIVE'];

/**
 * Tela inicial: em vez de indicadores, a fila do que precisa de alguém hoje.
 * Cada bloco mostra os primeiros itens e leva para a tela onde a ação é feita.
 */
export function HomePage() {
  const user = useCurrentUser();
  const isBroker = user.role === 'BROKER';
  const today = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date());

  const portfolio = useQuery({
    queryKey: ['home', 'portfolio'],
    queryFn: () => Promise.all(STATUSES.map((status) => api.properties.search({ status, perPage: 1 }).then((page) => [status, page.total] as const))),
  });
  const overdue = useQuery({ queryKey: ['home', 'overdue'], queryFn: () => api.charges.search({ overdue: true, perPage: TOP }) });
  const transfers = useQuery({ queryKey: ['home', 'transfers'], queryFn: () => api.charges.search({ transferStatus: 'PENDING', perPage: TOP }) });
  const newLeads = useQuery({ queryKey: ['home', 'leads'], queryFn: () => api.leads.search({ status: 'NEW', unassigned: true, perPage: TOP }) });
  const visits = useQuery({
    queryKey: ['home', 'visits', user.id],
    queryFn: () => api.visits.search({ status: 'SCHEDULED', brokerId: isBroker ? user.id : undefined, perPage: TOP }),
  });
  const proposals = useQuery({ queryKey: ['home', 'proposals'], queryFn: () => api.proposals.search({ status: 'PENDING', perPage: TOP }) });
  const commissions = useQuery({ queryKey: ['home', 'commissions'], queryFn: () => api.sales.commissions({ status: 'PENDING', perPage: TOP }) });

  return (
    <>
      <PageHeader title={`Olá, ${user.name.split(' ')[0]}`} description={`Hoje é ${today}. Isto é o que está esperando por alguém.`} />

      <section className="panel portfolio" aria-label="Imóveis por situação">
        <ErrorAlert error={portfolio.error} />
        {portfolio.data?.map(([status, total]) => (
          <Link key={status} to="/imoveis" className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <strong className="num">{total}</strong>
            <Plate {...PROPERTY_STATUS[status]} />
          </Link>
        ))}
        {portfolio.isLoading && <span className="muted">Carregando imóveis…</span>}
      </section>

      <div className="queue">
        <Queue title="Cobranças atrasadas" total={overdue.data?.total} tone="danger" to="/cobrancas" error={overdue.error} empty="Nenhum aluguel em atraso.">
          {overdue.data?.items.map((charge) => (
            <li key={charge.id}>
              <LeaseRef id={charge.leaseId} />
              <span className="right num">
                {formatMoney(charge.amountCents)}
                <div className="small muted">venceu em {formatDate(charge.dueDate)}</div>
              </span>
            </li>
          ))}
        </Queue>

        <Queue title="Repasses a fazer" total={transfers.data?.total} tone="warn" to="/cobrancas" error={transfers.error} empty="Nenhum repasse pendente.">
          {transfers.data?.items.map((charge) => (
            <li key={charge.id}>
              <LeaseRef id={charge.leaseId} />
              <span className="right num">
                {formatMoney(charge.payment?.ownerTransferCents)}
                <div className="small muted">recebido em {formatDate(charge.payment?.paidAt)}</div>
              </span>
            </li>
          ))}
        </Queue>

        <Queue title="Leads novos sem corretor" total={newLeads.data?.total} tone="warn" to="/leads" error={newLeads.error} empty="Todos os leads novos já têm corretor.">
          {newLeads.data?.items.map((lead) => (
            <li key={lead.id}>
              <span>
                <strong>{lead.name}</strong>
                <div className="small muted">
                  Quer {LEAD_INTEREST[lead.interest].toLowerCase()}, {lead.phone ? formatPhone(lead.phone) : lead.email}
                </div>
              </span>
              <span className="small muted nowrap">desde {formatDate(lead.createdAt)}</span>
            </li>
          ))}
        </Queue>

        <Queue title={isBroker ? 'Suas próximas visitas' : 'Próximas visitas'} total={visits.data?.total} to="/visitas" error={visits.error} empty="Nenhuma visita agendada.">
          {visits.data?.items.map((visit) => (
            <li key={visit.id}>
              <span>
                <strong><LeadName id={visit.leadId} /></strong>
                <div className="small"><PropertyRef id={visit.propertyId} /></div>
              </span>
              <span className="right num nowrap">
                {formatDateTime(visit.scheduledAt)}
                {!isBroker && <div className="small muted"><UserName id={visit.brokerId} /></div>}
              </span>
            </li>
          ))}
        </Queue>

        <Queue title="Propostas aguardando resposta" total={proposals.data?.total} tone="warn" to="/propostas" error={proposals.error} empty="Nenhuma proposta pendente.">
          {proposals.data?.items.map((proposal) => (
            <li key={proposal.id}>
              <span>
                <PropertyRef id={proposal.propertyId} />
                <div className="small muted">de <PersonName id={proposal.buyerId} /></div>
              </span>
              <span className="num">{formatMoney(proposal.amountCents)}</span>
            </li>
          ))}
        </Queue>

        <Queue
          title={isBroker ? 'Suas comissões a receber' : 'Comissões a pagar'}
          total={commissions.data?.total}
          to="/comissoes"
          error={commissions.error}
          empty="Nenhuma comissão pendente."
          footer={commissions.data?.total ? <>Total: <strong className="num">{formatMoney(commissions.data.totalAmountCents)}</strong></> : undefined}
        >
          {commissions.data?.items.map((entry) => (
            <li key={entry.id}>
              <span>
                <strong>{entry.brokerId ? <UserName id={entry.brokerId} /> : 'Imobiliária'}</strong>
                <div className="small muted">
                  {entry.brokerId ? `${COMMISSION_ROLE[entry.role]}, venda` : 'Venda'} de {formatDate(entry.saleClosedAt)}
                </div>
              </span>
              <span className="num">{formatMoney(entry.amountCents)}</span>
            </li>
          ))}
        </Queue>
      </div>
    </>
  );
}

function Queue({
  title,
  total,
  tone,
  to,
  error,
  empty,
  footer,
  children,
}: {
  title: string;
  total: number | undefined;
  /** Cor do contador quando há itens na fila. */
  tone?: 'danger' | 'warn';
  to: string;
  error: unknown;
  empty: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>
          <span className="queue-count" data-tone={total ? tone : undefined}>{total ?? '…'}</span>
          {title}
        </h2>
        <Link to={to} className="small">{total && total > TOP ? `Ver as ${total}` : 'Abrir'}</Link>
      </div>
      {error ? (
        <div className="panel-body"><ErrorAlert error={error} /></div>
      ) : total === 0 ? (
        <div className="panel-body muted">{empty}</div>
      ) : (
        <ul className="queue-list">{children}</ul>
      )}
      {footer && <div className="pagination" style={{ justifyContent: 'flex-end' }}><span>{footer}</span></div>}
    </section>
  );
}
