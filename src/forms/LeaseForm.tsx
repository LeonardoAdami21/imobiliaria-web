import { type FormEvent, useEffect } from 'react';
import { api } from '@/api';
import type { AdjustmentIndex, GuaranteeType, Lease, Property } from '@/api/types';
import { ComboField, FormActions, MoneyField, SelectField, TextField } from '@/components/form';
import { PersonName, PropertyRef, searchPeople, searchProperties, useProperty } from '@/components/lookups';
import { ErrorAlert, Modal } from '@/components/ui';
import { formatMoney, inputToPercent, todayIso } from '@/lib/format';
import { ADJUSTMENT_INDEX, GUARANTEE, options } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useFormState } from '@/lib/useFormState';

export function LeaseForm({ property, onClose, onSaved }: { property?: Property; onClose: () => void; onSaved?: (lease: Lease) => void }) {
  const { values, set, setValues } = useFormState({
    propertyId: property?.id ?? (null as string | null),
    tenantId: null as string | null,
    guaranteeType: 'NONE' as GuaranteeType,
    guarantorId: null as string | null,
    depositAmountCents: null as number | null,
    startDate: todayIso(),
    durationMonths: '30',
    rentAmountCents: property?.rentPriceCents ?? (null as number | null),
    dueDay: '10',
    adminFeePercent: '10',
    lateFeePercent: '10',
    monthlyInterestPercent: '1',
    adjustmentIndex: 'IPCA' as AdjustmentIndex,
  });

  // Ao escolher o imóvel, sugere o aluguel anunciado. Depende só do imóvel escolhido,
  // para não sobrescrever o valor que a pessoa ajustar depois.
  const picked = useProperty(values.propertyId).data;
  const pickedId = picked?.id;
  const pickedRent = picked?.rentPriceCents ?? null;
  useEffect(() => {
    if (pickedId && pickedRent) setValues((current) => ({ ...current, rentAmountCents: pickedRent }));
  }, [pickedId, pickedRent, setValues]);

  const depositLimit = values.rentAmountCents ? values.rentAmountCents * 3 : null;

  const save = useAction(
    () =>
      api.leases.create({
        propertyId: values.propertyId!,
        tenantId: values.tenantId!,
        guaranteeType: values.guaranteeType,
        guarantorId: values.guaranteeType === 'GUARANTOR' ? values.guarantorId : null,
        depositAmountCents: values.guaranteeType === 'DEPOSIT' ? values.depositAmountCents : null,
        startDate: values.startDate,
        durationMonths: Number(values.durationMonths),
        rentAmountCents: values.rentAmountCents ?? 0,
        dueDay: Number(values.dueDay),
        adminFeePercent: inputToPercent(values.adminFeePercent) ?? 0,
        lateFeePercent: inputToPercent(values.lateFeePercent) ?? 0,
        monthlyInterestPercent: inputToPercent(values.monthlyInterestPercent) ?? 0,
        adjustmentIndex: values.adjustmentIndex,
      }),
    {
      success: 'Contrato criado. As cobranças mensais foram geradas.',
      onDone: (lease) => {
        onSaved?.(lease);
        onClose();
      },
    },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(undefined);
  };

  return (
    <Modal title="Criar contrato de locação" onClose={onClose} size="lg">
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
              search={searchProperties({ purpose: 'RENT', onlyAvailable: true })}
              placeholder="Só imóveis disponíveis para locação"
            />
          )}
          <ComboField
            className="col-12"
            label="Inquilino"
            required
            value={values.tenantId}
            selected={<PersonName id={values.tenantId} />}
            onChange={(id) => set('tenantId')(id)}
            search={searchPeople}
            placeholder="Busque por nome ou CPF/CNPJ"
            hint={picked ? <>Proprietário: <PersonName id={picked.ownerId} /></> : undefined}
          />
        </div>

        <fieldset className="fieldset">
          <legend>Prazo e valor</legend>
          <div className="form-grid">
            <TextField className="col-3" label="Início" type="date" required value={values.startDate} onChange={set('startDate')} />
            <TextField className="col-3" label="Prazo (meses)" type="number" required min={1} max={120} value={values.durationMonths} onChange={set('durationMonths')} />
            <MoneyField className="col-3" label="Aluguel (R$)" required value={values.rentAmountCents} onChange={set('rentAmountCents')} />
            <TextField className="col-3" label="Dia do vencimento" type="number" required min={1} max={28} value={values.dueDay} onChange={set('dueDay')} hint="De 1 a 28." />
            <SelectField className="col-3" label="Índice de reajuste" value={values.adjustmentIndex} onChange={(value) => value && set('adjustmentIndex')(value)} options={options(ADJUSTMENT_INDEX)} />
            <TextField className="col-3" label="Taxa de administração (%)" inputMode="decimal" required value={values.adminFeePercent} onChange={set('adminFeePercent')} />
            <TextField className="col-3" label="Multa por atraso (%)" inputMode="decimal" required value={values.lateFeePercent} onChange={set('lateFeePercent')} />
            <TextField className="col-3" label="Juros ao mês (%)" inputMode="decimal" required value={values.monthlyInterestPercent} onChange={set('monthlyInterestPercent')} />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Garantia</legend>
          <div className="form-grid">
            <SelectField className="col-4" label="Tipo de garantia" value={values.guaranteeType} onChange={(value) => value && set('guaranteeType')(value)} options={options(GUARANTEE)} />
            {values.guaranteeType === 'GUARANTOR' && (
              <ComboField
                className="col-8"
                label="Fiador"
                required
                value={values.guarantorId}
                selected={<PersonName id={values.guarantorId} />}
                onChange={(id) => set('guarantorId')(id)}
                search={searchPeople}
                placeholder="Busque por nome ou CPF/CNPJ"
              />
            )}
            {values.guaranteeType === 'DEPOSIT' && (
              <MoneyField
                className="col-4"
                label="Valor da caução (R$)"
                required
                value={values.depositAmountCents}
                onChange={set('depositAmountCents')}
                hint={depositLimit ? `Até 3 aluguéis: ${formatMoney(depositLimit)}.` : 'Até 3 aluguéis.'}
              />
            )}
          </div>
        </fieldset>

        <FormActions onCancel={onClose} submitLabel="Criar contrato" isPending={save.isPending} />
      </form>
    </Modal>
  );
}
