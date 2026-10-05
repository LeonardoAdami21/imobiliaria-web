import type { FormEvent } from 'react';
import { api } from '@/api';
import type { Lead, LeadInterest, LeadSource } from '@/api/types';
import { ComboField, FormActions, SelectField, TextAreaField, TextField } from '@/components/form';
import { PropertyRef, searchProperties, userOptions, useUserDirectory } from '@/components/lookups';
import { ErrorAlert, Modal } from '@/components/ui';
import { formatPhone } from '@/lib/format';
import { LEAD_INTEREST, LEAD_SOURCE, options } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useFormState } from '@/lib/useFormState';

export function LeadForm({ lead, onClose }: { lead?: Lead; onClose: () => void }) {
  const directory = useUserDirectory();
  const { values, set } = useFormState({
    name: lead?.name ?? '',
    phone: lead?.phone ? formatPhone(lead.phone) : '',
    email: lead?.email ?? '',
    interest: (lead?.interest ?? 'BUY') as LeadInterest,
    source: (lead?.source ?? 'WEBSITE') as LeadSource,
    propertyId: lead?.propertyId ?? (null as string | null),
    brokerId: lead?.brokerId ?? '',
    notes: lead?.notes ?? '',
  });

  const save = useAction(
    async () => {
      const data = {
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        interest: values.interest,
        source: values.source,
        propertyId: values.propertyId,
        notes: values.notes || null,
      };
      if (!lead) return api.leads.create({ ...data, brokerId: values.brokerId || null });
      const updated = await api.leads.update(lead.id, data);
      // O corretor responsável tem rota própria na API.
      return values.brokerId && values.brokerId !== lead.brokerId ? api.leads.assign(lead.id, values.brokerId) : updated;
    },
    { success: lead ? 'Lead atualizado.' : 'Lead registrado.', onDone: onClose },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(undefined);
  };

  return (
    <Modal title={lead ? 'Editar lead' : 'Registrar lead'} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={save.error} />
        <div className="form-grid">
          <TextField className="col-12" label="Nome" required minLength={2} maxLength={160} value={values.name} onChange={set('name')} />
          <TextField className="col-6" label="Telefone" type="tel" value={values.phone} onChange={set('phone')} placeholder="(41) 99999-0000" hint="Informe telefone ou e-mail." />
          <TextField className="col-6" label="E-mail" type="email" value={values.email} onChange={set('email')} />
          <SelectField className="col-6" label="Quer" value={values.interest} onChange={(value) => value && set('interest')(value)} options={options(LEAD_INTEREST)} />
          <SelectField className="col-6" label="Chegou por" value={values.source} onChange={(value) => value && set('source')(value)} options={options(LEAD_SOURCE)} />
          <ComboField
            className="col-12"
            label="Imóvel de interesse"
            value={values.propertyId}
            selected={<PropertyRef id={values.propertyId} link={false} />}
            onChange={(id) => set('propertyId')(id)}
            search={searchProperties()}
            placeholder="Opcional. Busque por título, rua ou número"
          />
          <SelectField
            className="col-12"
            label="Corretor responsável"
            value={values.brokerId}
            onChange={set('brokerId')}
            placeholder={lead?.brokerId ? undefined : 'Definir depois'}
            options={userOptions(directory.data)}
          />
          <TextAreaField className="col-12" label="Observações" maxLength={2000} value={values.notes} onChange={set('notes')} />
        </div>
        <FormActions onCancel={onClose} submitLabel={lead ? 'Salvar alterações' : 'Registrar lead'} isPending={save.isPending} />
      </form>
    </Modal>
  );
}
