import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { LuBath, LuBedDouble, LuCar, LuEyeOff, LuImageOff, LuKeyRound, LuMapPin, LuPencil, LuPlus, LuRotateCcw, LuRuler, LuSignature, LuStar, LuTrash2 } from 'react-icons/lu';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api';
import type { Property } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { TextField } from '@/components/form';
import { PersonName, useProperty, UserName } from '@/components/lookups';
import { Confirm, Empty, ErrorAlert, Facts, HouseNumber, Loading, PageHeader, Plate, Tag } from '@/components/ui';
import { LeaseForm } from '@/forms/LeaseForm';
import { PropertyForm } from '@/forms/PropertyForm';
import { ProposalForm } from '@/forms/ProposalForm';
import { formatAddress, formatDate, formatMoney, formatZipCode } from '@/lib/format';
import { LEASE_STATUS, PROPERTY_PURPOSE, PROPERTY_STATUS, PROPERTY_TYPE, PROPOSAL_STATUS } from '@/lib/labels';
import { useAction } from '@/lib/useAction';

type Dialog = 'edit' | 'lease' | 'proposal' | 'listing' | null;

export function PropertyDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const { data: property, error, isLoading } = useProperty(id);

  const leases = useQuery({ queryKey: ['leases', 'by-property', id], queryFn: () => api.leases.search({ propertyId: id, perPage: 5 }) });
  const proposals = useQuery({ queryKey: ['proposals', 'by-property', id], queryFn: () => api.proposals.search({ propertyId: id, perPage: 5 }) });

  const listing = useAction((active: boolean) => api.properties.setListing(id, active), {
    success: (saved) => (saved.status === 'INACTIVE' ? 'Imóvel retirado do anúncio.' : 'Imóvel de volta ao anúncio.'),
    onDone: () => setDialog(null),
  });

  if (isLoading) return <Loading />;
  if (error || !property) return <ErrorAlert error={error ?? new Error('Imóvel não encontrado.')} />;

  const available = property.status === 'AVAILABLE';
  const forSale = property.purpose !== 'RENT';
  const forRent = property.purpose !== 'SALE';
  const editable = can('editProperties') && property.status !== 'SOLD';

  return (
    <>
      <PageHeader
        back={{ to: '/imoveis', label: 'Imóveis' }}
        title={
          <span className="property-title">
            <HouseNumber code={property.code} large />
            {property.title}
            <Plate {...PROPERTY_STATUS[property.status]} />
          </span>
        }
        description={
          <span className="row">
            <LuMapPin aria-hidden /> {formatAddress(property.address)}, CEP {formatZipCode(property.address.zipCode)}
          </span>
        }
        actions={
          <>
            {available && forRent && can('manageRentals') && (
              <button className="btn btn-primary" onClick={() => setDialog('lease')}>
                <LuKeyRound aria-hidden /> Criar contrato
              </button>
            )}
            {available && forSale && can('negotiate') && (
              <button className="btn btn-primary" onClick={() => setDialog('proposal')}>
                <LuSignature aria-hidden /> Registrar proposta
              </button>
            )}
            {editable && (
              <button className="btn" onClick={() => setDialog('edit')}>
                <LuPencil aria-hidden /> Editar
              </button>
            )}
            {editable && available && (
              <button className="btn" onClick={() => setDialog('listing')}>
                <LuEyeOff aria-hidden /> Tirar do anúncio
              </button>
            )}
            {editable && property.status === 'INACTIVE' && (
              <button className="btn" onClick={() => listing.mutate(true)} disabled={listing.isPending}>
                <LuRotateCcw aria-hidden /> Voltar ao anúncio
              </button>
            )}
          </>
        }
      />

      <div className="two-col">
        <div className="stack">
          <section className="panel">
            <div className="panel-body stack">
              <div className="specs">
                <span><LuBedDouble aria-hidden /> {property.bedrooms} {property.bedrooms === 1 ? 'quarto' : 'quartos'}</span>
                <span><LuBath aria-hidden /> {property.bathrooms} {property.bathrooms === 1 ? 'banheiro' : 'banheiros'}</span>
                <span><LuCar aria-hidden /> {property.parkingSpaces} {property.parkingSpaces === 1 ? 'vaga' : 'vagas'}</span>
                {property.areaM2 != null && <span><LuRuler aria-hidden /> {String(property.areaM2).replace('.', ',')} m²</span>}
              </div>
              {property.description && <p style={{ maxWidth: '75ch', whiteSpace: 'pre-line' }}>{property.description}</p>}
              <Facts
                items={[
                  ['Tipo', PROPERTY_TYPE[property.type]],
                  ['Finalidade', PROPERTY_PURPOSE[property.purpose]],
                  ...(forSale ? [['Preço de venda', <span className="num">{formatMoney(property.salePriceCents)}</span>] as [string, React.ReactNode]] : []),
                  ...(forRent ? [['Aluguel', <span className="num">{formatMoney(property.rentPriceCents)}</span>] as [string, React.ReactNode]] : []),
                  ['Condomínio', <span className="num">{formatMoney(property.condoFeeCents)}</span>],
                  ['IPTU anual', <span className="num">{formatMoney(property.propertyTaxCents)}</span>],
                ]}
              />
            </div>
          </section>

          <Photos property={property} editable={editable} />
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-body">
              <Facts
                items={[
                  ['Proprietário', <PersonName id={property.ownerId} />],
                  ['Corretor captador', <UserName id={property.listingBrokerId} />],
                  ['Cadastrado em', formatDate(property.createdAt)],
                ]}
              />
            </div>
          </section>

          {forRent && (
            <section className="panel">
              <div className="panel-head"><h2>Contratos de locação</h2></div>
              {leases.data?.items.length ? (
                <ul className="queue-list">
                  {leases.data.items.map((lease) => (
                    <li key={lease.id}>
                      <Link to={`/locacoes/${lease.id}`}>
                        <PersonName id={lease.tenantId} />
                        <div className="small muted">{formatDate(lease.startDate)} a {formatDate(lease.endDate)}</div>
                      </Link>
                      <Tag {...LEASE_STATUS[lease.status]} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="panel-body muted">Este imóvel ainda não foi alugado.</div>
              )}
            </section>
          )}

          {forSale && (
            <section className="panel">
              <div className="panel-head"><h2>Propostas de compra</h2></div>
              {proposals.data?.items.length ? (
                <ul className="queue-list">
                  {proposals.data.items.map((proposal) => (
                    <li key={proposal.id}>
                      <div>
                        <PersonName id={proposal.buyerId} />
                        <div className="small muted num">{formatMoney(proposal.amountCents)}</div>
                      </div>
                      <Tag {...PROPOSAL_STATUS[proposal.status]} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="panel-body muted">Nenhuma proposta recebida.</div>
              )}
            </section>
          )}
        </div>
      </div>

      {dialog === 'edit' && <PropertyForm property={property} onClose={() => setDialog(null)} />}
      {dialog === 'lease' && <LeaseForm property={property} onClose={() => setDialog(null)} onSaved={(lease) => navigate(`/locacoes/${lease.id}`)} />}
      {dialog === 'proposal' && <ProposalForm property={property} onClose={() => setDialog(null)} />}
      {dialog === 'listing' && (
        <Confirm
          title="Tirar do anúncio?"
          confirmLabel="Tirar do anúncio"
          isPending={listing.isPending}
          error={listing.error}
          onConfirm={() => listing.mutate(false)}
          onClose={() => setDialog(null)}
        >
          O imóvel nº {property.code} deixa de aparecer como disponível e não aceita visitas, contratos nem propostas até voltar ao anúncio.
        </Confirm>
      )}
    </>
  );
}

function Photos({ property, editable }: { property: Property; editable: boolean }) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');

  const add = useAction(() => api.properties.addPhoto(property.id, url, caption || null), {
    success: 'Foto adicionada.',
    onDone: () => {
      setUrl('');
      setCaption('');
    },
  });
  const remove = useAction((photoId: string) => api.properties.removePhoto(property.id, photoId), { success: 'Foto removida.' });
  const makeCover = useAction(
    (photoId: string) =>
      api.properties.reorderPhotos(property.id, [photoId, ...property.photos.filter((photo) => photo.id !== photoId).map((photo) => photo.id)]),
    { success: 'Capa do anúncio alterada.' },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate(undefined);
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Fotos</h2>
        <span className="muted small">{property.photos.length} de 30</span>
      </div>
      <div className="panel-body stack">
        <ErrorAlert error={add.error ?? remove.error ?? makeCover.error} />
        {property.photos.length === 0 ? (
          <Empty title="Sem fotos ainda.">{editable && 'Adicione o endereço de uma imagem abaixo. A primeira foto é a capa do anúncio.'}</Empty>
        ) : (
          <div className="photos">
            {property.photos.map((photo, index) => (
              <figure key={photo.id} className="photo">
                <PhotoImage url={photo.url} alt={photo.caption ?? `Foto ${index + 1} do imóvel`} />
                {index === 0 && <span className="cover"><Tag label="Capa" tone="warn" /></span>}
                <figcaption>
                  <span>{photo.caption ?? <span className="muted">Sem legenda</span>}</span>
                  {editable && (
                    <span className="nowrap">
                      {index > 0 && (
                        <button className="icon-btn" title="Usar como capa" aria-label="Usar como capa" onClick={() => makeCover.mutate(photo.id)}>
                          <LuStar aria-hidden />
                        </button>
                      )}
                      <button className="icon-btn" title="Remover foto" aria-label="Remover foto" onClick={() => remove.mutate(photo.id)}>
                        <LuTrash2 aria-hidden />
                      </button>
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {editable && property.photos.length < 30 && (
          <form onSubmit={submit} className="form-grid" style={{ alignItems: 'end' }}>
            <TextField className="col-6" label="Endereço da imagem (URL)" type="url" required value={url} onChange={setUrl} placeholder="https://…" />
            <TextField className="col-4" label="Legenda" maxLength={160} value={caption} onChange={setCaption} />
            <div className="field col-3" style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn" disabled={add.isPending}>
                <LuPlus aria-hidden /> Adicionar
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

/** Mostra a foto ou, se o endereço não carregar, um aviso no lugar (em vez do ícone de imagem quebrada). */
function PhotoImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="photo-missing">
        <LuImageOff aria-hidden />
        <span>Imagem não carregou</span>
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
