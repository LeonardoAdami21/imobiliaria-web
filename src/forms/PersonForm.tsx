import type { FormEvent } from 'react';
import { api } from '@/api';
import type { Person } from '@/api/types';
import { FormActions, TextAreaField, TextField } from '@/components/form';
import { ErrorAlert, Modal } from '@/components/ui';
import { formatPhone } from '@/lib/format';
import { useAction } from '@/lib/useAction';
import { useFormState } from '@/lib/useFormState';

export function PersonForm({ person, onClose, onSaved }: { person?: Person; onClose: () => void; onSaved?: (saved: Person) => void }) {
  const { values, set } = useFormState({
    name: person?.name ?? '',
    document: person?.documentFormatted ?? '',
    email: person?.email ?? '',
    phone: person?.phone ? formatPhone(person.phone) : '',
    notes: person?.notes ?? '',
  });

  const save = useAction(
    () => {
      const contact = { name: values.name, email: values.email || null, phone: values.phone || null, notes: values.notes || null };
      return person ? api.people.update(person.id, contact) : api.people.create({ ...contact, document: values.document });
    },
    {
      success: person ? 'Cadastro atualizado.' : 'Pessoa cadastrada.',
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
    <Modal title={person ? 'Editar pessoa' : 'Cadastrar pessoa'} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={save.error} />
        <div className="form-grid">
          <TextField className="col-8" label="Nome ou razão social" required minLength={2} maxLength={160} value={values.name} onChange={set('name')} />
          <TextField
            className="col-4"
            label="CPF ou CNPJ"
            required
            disabled={!!person}
            value={values.document}
            onChange={set('document')}
            hint={person ? 'O documento não muda depois do cadastro.' : 'Com ou sem pontuação.'}
          />
          <TextField className="col-6" label="Telefone" type="tel" value={values.phone} onChange={set('phone')} placeholder="(41) 99999-0000" />
          <TextField className="col-6" label="E-mail" type="email" value={values.email} onChange={set('email')} />
          <TextAreaField className="col-12" label="Observações" maxLength={2000} value={values.notes} onChange={set('notes')} />
        </div>
        <FormActions onCancel={onClose} submitLabel={person ? 'Salvar alterações' : 'Cadastrar pessoa'} isPending={save.isPending} />
      </form>
    </Modal>
  );
}
