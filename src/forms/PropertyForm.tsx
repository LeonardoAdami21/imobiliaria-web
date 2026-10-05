import type { FormEvent } from 'react';
import { api } from '@/api';
import type { Property, PropertyPurpose, PropertyType } from '@/api/types';
import { ComboField, FormActions, MoneyField, SelectField, TextAreaField, TextField } from '@/components/form';
import { PersonName, searchPeople, userOptions, useUserDirectory } from '@/components/lookups';
import { ErrorAlert, Modal } from '@/components/ui';
import { formatZipCode } from '@/lib/format';
import { options, PROPERTY_PURPOSE, PROPERTY_TYPE, STATES } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useFormState } from '@/lib/useFormState';

const toInt = (text: string): number => Math.max(0, Math.trunc(Number(text) || 0));

export function PropertyForm({ property, onClose, onSaved }: { property?: Property; onClose: () => void; onSaved?: (saved: Property) => void }) {
  const directory = useUserDirectory();
  const { values, set } = useFormState({
    ownerId: property?.ownerId ?? (null as string | null),
    listingBrokerId: property?.listingBrokerId ?? '',
    title: property?.title ?? '',
    description: property?.description ?? '',
    type: (property?.type ?? 'APARTMENT') as PropertyType,
    purpose: (property?.purpose ?? 'SALE') as PropertyPurpose,
    salePriceCents: property?.salePriceCents ?? null,
    rentPriceCents: property?.rentPriceCents ?? null,
    condoFeeCents: property?.condoFeeCents ?? null,
    propertyTaxCents: property?.propertyTaxCents ?? null,
    bedrooms: String(property?.bedrooms ?? 0),
    bathrooms: String(property?.bathrooms ?? 0),
    parkingSpaces: String(property?.parkingSpaces ?? 0),
    areaM2: property?.areaM2 != null ? String(property.areaM2).replace('.', ',') : '',
    zipCode: property ? formatZipCode(property.address.zipCode) : '',
    street: property?.address.street ?? '',
    number: property?.address.number ?? '',
    complement: property?.address.complement ?? '',
    district: property?.address.district ?? '',
    city: property?.address.city ?? '',
    state: property?.address.state ?? '',
  });

  const forSale = values.purpose !== 'RENT';
  const forRent = values.purpose !== 'SALE';

  const save = useAction(
    () => {
      const area = Number(values.areaM2.replace(',', '.'));
      const details = {
        title: values.title,
        description: values.description || null,
        type: values.type,
        purpose: values.purpose,
        // Preço que não combina com a finalidade é limpo, para não ficar um valor antigo escondido.
        salePriceCents: forSale ? values.salePriceCents : null,
        rentPriceCents: forRent ? values.rentPriceCents : null,
        condoFeeCents: values.condoFeeCents,
        propertyTaxCents: values.propertyTaxCents,
        bedrooms: toInt(values.bedrooms),
        bathrooms: toInt(values.bathrooms),
        parkingSpaces: toInt(values.parkingSpaces),
        areaM2: values.areaM2.trim() && area > 0 ? area : null,
        listingBrokerId: values.listingBrokerId || null,
        address: {
          street: values.street,
          number: values.number,
          complement: values.complement || null,
          district: values.district,
          city: values.city,
          state: values.state,
          zipCode: values.zipCode,
        },
      };
      return property ? api.properties.update(property.id, details) : api.properties.create({ ...details, ownerId: values.ownerId! });
    },
    {
      success: property ? 'Imóvel atualizado.' : (saved) => `Imóvel nº ${saved.code} cadastrado.`,
      onDone: (saved) => {
        onSaved?.(saved);
        onClose();
      },
    },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(undefined);
  };

  return (
    <Modal title={property ? `Editar imóvel nº ${property.code}` : 'Cadastrar imóvel'} onClose={onClose} size="lg">
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={save.error} />
        <div className="form-grid">
          <TextField className="col-12" label="Título do anúncio" required minLength={3} maxLength={160} value={values.title} onChange={set('title')} placeholder="Ex.: Apartamento 2 quartos no Centro" />
          <SelectField className="col-4" label="Tipo" value={values.type} onChange={(value) => value && set('type')(value)} options={options(PROPERTY_TYPE)} />
          <SelectField className="col-4" label="Finalidade" value={values.purpose} onChange={(value) => value && set('purpose')(value)} options={options(PROPERTY_PURPOSE)} />
          <SelectField
            className="col-4"
            label="Corretor captador"
            value={values.listingBrokerId}
            onChange={set('listingBrokerId')}
            placeholder="Sem captador"
            options={userOptions(directory.data)}
          />
          {property ? (
            <div className="field col-12">
              <span className="label">Proprietário</span>
              <span><PersonName id={property.ownerId} /></span>
              <span className="hint">O proprietário não muda depois do cadastro.</span>
            </div>
          ) : (
            <ComboField
              className="col-12"
              label="Proprietário"
              required
              value={values.ownerId}
              onChange={(id) => set('ownerId')(id)}
              search={searchPeople}
              placeholder="Busque por nome ou CPF/CNPJ"
              hint="A pessoa precisa estar cadastrada em Pessoas."
            />
          )}
        </div>

        <fieldset className="fieldset">
          <legend>Valores</legend>
          <div className="form-grid">
            {forSale && <MoneyField className="col-3" label="Preço de venda (R$)" required value={values.salePriceCents} onChange={set('salePriceCents')} />}
            {forRent && <MoneyField className="col-3" label="Aluguel (R$)" required value={values.rentPriceCents} onChange={set('rentPriceCents')} />}
            <MoneyField className="col-3" label="Condomínio (R$)" value={values.condoFeeCents} onChange={set('condoFeeCents')} />
            <MoneyField className="col-3" label="IPTU anual (R$)" value={values.propertyTaxCents} onChange={set('propertyTaxCents')} />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Características</legend>
          <div className="form-grid">
            <TextField className="col-3" label="Quartos" type="number" min={0} max={99} value={values.bedrooms} onChange={set('bedrooms')} />
            <TextField className="col-3" label="Banheiros" type="number" min={0} max={99} value={values.bathrooms} onChange={set('bathrooms')} />
            <TextField className="col-3" label="Vagas" type="number" min={0} max={99} value={values.parkingSpaces} onChange={set('parkingSpaces')} />
            <TextField className="col-3" label="Área (m²)" inputMode="decimal" value={values.areaM2} onChange={set('areaM2')} placeholder="68,5" />
            <TextAreaField className="col-12" label="Descrição" maxLength={5000} value={values.description} onChange={set('description')} />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Endereço</legend>
          <div className="form-grid">
            <TextField className="col-3" label="CEP" required inputMode="numeric" pattern="\d{5}-?\d{3}" title="8 dígitos" value={values.zipCode} onChange={set('zipCode')} placeholder="80010-000" />
            <TextField className="col-6" label="Logradouro" required value={values.street} onChange={set('street')} />
            <TextField className="col-3" label="Número" required value={values.number} onChange={set('number')} />
            <TextField className="col-4" label="Complemento" value={values.complement} onChange={set('complement')} />
            <TextField className="col-4" label="Bairro" required value={values.district} onChange={set('district')} />
            <TextField className="col-3" label="Cidade" required value={values.city} onChange={set('city')} />
            <SelectField className="col-3" label="UF" required value={values.state} onChange={set('state')} placeholder="UF" options={STATES.map((uf) => ({ value: uf as string, label: uf }))} />
          </div>
        </fieldset>

        <FormActions onCancel={onClose} submitLabel={property ? 'Salvar alterações' : 'Cadastrar imóvel'} isPending={save.isPending} />
      </form>
    </Modal>
  );
}
