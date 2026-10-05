import type { FormEvent } from 'react';
import { api } from '@/api';
import type { Lead, Visit } from '@/api/types';
import { useCurrentUser } from '@/auth/AuthContext';
import { ComboField, FormActions, SelectField, TextField } from '@/components/form';
import { LeadName, PropertyRef, searchOpenLeads, searchProperties, userOptions, useUserDirectory } from '@/components/lookups';
import { ErrorAlert, Modal } from '@/components/ui';
import { isoToLocalInput, localInputToIso } from '@/lib/format';
import { useAction } from '@/lib/useAction';
import { useFormState } from '@/lib/useFormState';

/** Agenda uma visita nova ou remarca uma existente (neste caso só a data muda). */
export function VisitForm({ lead, visit, onClose }: { lead?: Lead; visit?: Visit; onClose: () => void }) {
  const me = useCurrentUser();
  const directory = useUserDirectory();
  const { values, set } = useFormState({
    leadId: visit?.leadId ?? lead?.id ?? (null as string | null),
    propertyId: visit?.propertyId ?? lead?.propertyId ?? (null as string | null),
    brokerId: visit?.brokerId ?? lead?.brokerId ?? (me.role === 'BROKER' ? me.id : ''),
    scheduledAt: visit ? isoToLocalInput(visit.scheduledAt) : '',
  });

  const save = useAction(
    () => {
      const scheduledAt = localInputToIso(values.scheduledAt);
      return visit
        ? api.visits.reschedule(visit.id, scheduledAt)
        : api.visits.schedule({ leadId: values.leadId!, propertyId: values.propertyId!, brokerId: values.brokerId, scheduledAt });
    },
    { success: visit ? 'Visita remarcada.' : 'Visita agendada.', onDone: onClose },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(undefined);
  };

  return (
    <Modal title={visit ? 'Remarcar visita' : 'Agendar visita'} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={save.error} />
        <div className="form-grid">
          {visit || lead ? (
            <div className="field col-12">
              <span className="label">Lead</span>
              <span>{lead?.name ?? <LeadName id={visit!.leadId} />}</span>
            </div>
          ) : (
            <ComboField className="col-12" label="Lead" required value={values.leadId} onChange={(id) => set('leadId')(id)} search={searchOpenLeads} placeholder="Busque pelo nome do lead" />
          )}
          {visit ? (
            <div className="field col-12">
              <span className="label">Imóvel</span>
              <PropertyRef id={visit.propertyId} link={false} />
            </div>
          ) : (
            <ComboField
              className="col-12"
              label="Imóvel"
              required
              value={values.propertyId}
              selected={<PropertyRef id={values.propertyId} link={false} />}
              onChange={(id) => set('propertyId')(id)}
              search={searchProperties({ onlyAvailable: true })}
              placeholder="Só imóveis disponíveis"
            />
          )}
          {!visit && (
            <SelectField className="col-6" label="Corretor" required value={values.brokerId} onChange={set('brokerId')} placeholder="Escolha" options={userOptions(directory.data)} />
          )}
          <TextField className="col-6" label="Data e hora" type="datetime-local" required value={values.scheduledAt} onChange={set('scheduledAt')} hint="Cada visita reserva 1 hora do corretor e do imóvel." />
        </div>
        <FormActions onCancel={onClose} submitLabel={visit ? 'Remarcar visita' : 'Agendar visita'} isPending={save.isPending} />
      </form>
    </Modal>
  );
}
