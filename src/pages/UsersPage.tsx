import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { LuPencil, LuPlus } from 'react-icons/lu';
import { api } from '@/api';
import type { User, UserRole } from '@/api/types';
import { useAuth, useCurrentUser } from '@/auth/AuthContext';
import { FormActions, SelectField, TextField } from '@/components/form';
import { type Column, DataTable, Empty, ErrorAlert, Modal, PageHeader, Tag } from '@/components/ui';
import { options, ROLE } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useFormState } from '@/lib/useFormState';

export function UsersPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const canManage = can('manageUsers');

  const query = useQuery({
    queryKey: ['users', 'list', page],
    queryFn: () => api.users.list({ page, perPage: 20 }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<User>[] = [
    { header: 'Nome', className: 'primary-cell', cell: (user) => user.name },
    { header: 'E-mail', cell: (user) => user.email },
    { header: 'Papel', cell: (user) => ROLE[user.role] },
    { header: 'CRECI', cell: (user) => user.creci ?? '—' },
    { header: 'Acesso', cell: (user) => (user.active ? <Tag label="Ativo" tone="ok" /> : <Tag label="Desativado" tone="mute" />) },
    ...(canManage
      ? [
          {
            header: '',
            className: 'actions',
            cell: (user: User) => (
              <button className="btn btn-sm" onClick={() => setEditing(user)}>
                <LuPencil aria-hidden /> Editar
              </button>
            ),
          } satisfies Column<User>,
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Quem entra no sistema e o que pode fazer. Corretores precisam do número do CRECI."
        actions={
          canManage && (
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              <LuPlus aria-hidden /> Cadastrar usuário
            </button>
          )
        }
      />
      <div className="panel">
        <DataTable columns={columns} page={query.data} isLoading={query.isLoading} error={query.error} onPageChange={setPage} empty={<Empty title="Nenhum usuário." />} />
      </div>
      {editing && <UserForm user={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function UserForm({ user, onClose }: { user?: User; onClose: () => void }) {
  const me = useCurrentUser();
  const isSelf = user?.id === me.id;
  const { values, set } = useFormState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: (user?.role ?? 'BROKER') as UserRole,
    creci: user?.creci ?? '',
    active: user?.active ?? true,
  });

  const save = useAction(
    () =>
      user
        ? api.users.update(user.id, {
            name: values.name,
            creci: values.creci || null,
            // A API não deixa ninguém mudar o próprio papel nem se desativar.
            ...(isSelf ? {} : { role: values.role, active: values.active }),
          })
        : api.users.create({ name: values.name, email: values.email, password: values.password, role: values.role, creci: values.creci || null }),
    { success: user ? 'Usuário atualizado.' : 'Usuário cadastrado.', onDone: onClose },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(undefined);
  };

  return (
    <Modal title={user ? 'Editar usuário' : 'Cadastrar usuário'} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={save.error} />
        <div className="form-grid">
          <TextField className="col-12" label="Nome" required minLength={2} maxLength={120} value={values.name} onChange={set('name')} />
          <TextField className="col-6" label="E-mail" type="email" required disabled={!!user} value={values.email} onChange={set('email')} hint={user ? 'O e-mail de acesso não muda.' : undefined} />
          {!user && <TextField className="col-6" label="Senha inicial" type="password" required minLength={8} autoComplete="new-password" value={values.password} onChange={set('password')} hint="Pelo menos 8 caracteres. A pessoa pode trocar depois." />}
          <SelectField className="col-6" label="Papel" value={values.role} onChange={(value) => value && set('role')(value)} options={options(ROLE)} disabled={isSelf} hint={isSelf ? 'Você não pode mudar o próprio papel.' : undefined} />
          <TextField className="col-6" label="CRECI" required={values.role === 'BROKER'} maxLength={30} value={values.creci} onChange={set('creci')} hint={values.role === 'BROKER' ? 'Obrigatório para corretor.' : 'Opcional.'} />
          {user && !isSelf && (
            <SelectField
              className="col-6"
              label="Acesso"
              value={values.active ? 'on' : 'off'}
              onChange={(value) => set('active')(value === 'on')}
              options={[
                { value: 'on', label: 'Ativo' },
                { value: 'off', label: 'Desativado' },
              ]}
              hint="Desativar bloqueia o login na hora, sem apagar o histórico."
            />
          )}
        </div>
        <FormActions onCancel={onClose} submitLabel={user ? 'Salvar alterações' : 'Cadastrar usuário'} isPending={save.isPending} />
      </form>
    </Modal>
  );
}
