import type { FormEvent } from 'react';
import { api } from '@/api';
import type { Property } from '@/api/types';
import { useCurrentUser } from '@/auth/AuthContext';
import { ComboField, FormActions, MoneyField, SelectField, TextAreaField, TextField } from '@/components/form';
import { PersonName, PropertyRef, searchPeople, searchProperties, useProperty, userOptions, useUserDirectory } from '@/components/lookups';
import { ErrorAlert, Modal } from '@/components/ui';
import { formatMoney, todayIso } from '@/lib/format';
import { useAction } from '@/lib/useAction';
import { useFormState } from '@/lib/useFormState';

export function ProposalForm({ property, onClose }: { property?: Property; onClose: () => void }) {
  const me = useCurrentUser();
  const directory = useUserDirectory();
  const { values, set } = useFormState({
    propertyId: property?.id ?? (null as string | null),
    buyerId: null as string | null,
    brokerId: me.role === 'BROKER' ? me.id : '',
    amountCents: null as number | null,
    paymentTerms: '',
    validUntil: '',
  });
  const picked = useProperty(values.propertyId).data;

  const save = useAction(
    () =>
      api.proposals.create({
        propertyId: values.propertyId!,
        buyerId: values.buyerId!,
        brokerId: values.brokerId || undefined,
        amountCents: values.amountCents ?? 0,
        paymentTerms: values.paymentTerms || null,
        validUntil: values.validUntil || null,
      }),
    { success: 'Proposta registrada.', onDone: onClose },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(undefined);
  };

  return (
    <Modal title="Registrar proposta de compra" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={save.error} />
        <div className="form-grid">
          {property ? (
            <div className="field col-12">
              <span className="label">Imóvel</span>
              <PropertyRef id={property.id} link={false} />
            </div>
          ) : (
            <ComboField
              className="col-12"
              label="Imóvel"
              required
              value={values.propertyId}
              selected={<PropertyRef id={values.propertyId} link={false} />}
              onChange={(id) => set('propertyId')(id)}
              search={searchProperties({ purpose: 'SALE', onlyAvailable: true })}
              placeholder="Só imóveis disponíveis para venda"
            />
          )}
          <ComboField
            className="col-12"
            label="Comprador"
            required
            value={values.buyerId}
            selected={<PersonName id={values.buyerId} />}
            onChange={(id) => set('buyerId')(id)}
            search={searchPeople}
            placeholder="Busque por nome ou CPF/CNPJ"
          />
          <MoneyField
            className="col-6"
            label="Valor proposto (R$)"
            required
            value={values.amountCents}
            onChange={set('amountCents')}
            hint={picked?.salePriceCents ? `Preço anunciado: ${formatMoney(picked.salePriceCents)}.` : undefined}
          />
          <TextField className="col-6" label="Válida até" type="date" min={todayIso()} value={values.validUntil} onChange={set('validUntil')} hint="Opcional." />
          {me.role !== 'BROKER' && (
            <SelectField className="col-12" label="Corretor vendedor" required value={values.brokerId} onChange={set('brokerId')} placeholder="Escolha" options={userOptions(directory.data)} hint="Quem atendeu o comprador e recebe a comissão de venda." />
          )}
          <TextAreaField className="col-12" label="Condições de pagamento" maxLength={1000} value={values.paymentTerms} onChange={set('paymentTerms')} />
        </div>
        <FormActions onCancel={onClose} submitLabel="Registrar proposta" isPending={save.isPending} />
      </form>
    </Modal>
  );
}
