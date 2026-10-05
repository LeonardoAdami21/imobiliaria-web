import { type FormEvent, useState } from 'react';
import { api } from '@/api';
import { useCurrentUser } from '@/auth/AuthContext';
import { TextField } from '@/components/form';
import { ErrorAlert, Facts, PageHeader } from '@/components/ui';
import { ROLE } from '@/lib/labels';
import { useAction } from '@/lib/useAction';

export function AccountPage() {
  const user = useCurrentUser();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm !== '' && confirm !== next;

  const change = useAction(() => api.auth.changePassword(current, next), {
    success: 'Senha alterada.',
    onDone: () => {
      setCurrent('');
      setNext('');
      setConfirm('');
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!mismatch) change.mutate(undefined);
  };

  return (
    <>
      <PageHeader title="Minha conta" />
      <div className="stack" style={{ maxWidth: 560 }}>
        <section className="panel">
          <div className="panel-body">
            <Facts items={[['Nome', user.name], ['E-mail', user.email], ['Papel', ROLE[user.role]], ['CRECI', user.creci]]} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Trocar senha</h2></div>
          <form onSubmit={submit} className="panel-body stack">
            <ErrorAlert error={change.error} />
            <TextField label="Senha atual" type="password" required autoComplete="current-password" value={current} onChange={setCurrent} />
            <TextField label="Nova senha" type="password" required minLength={8} autoComplete="new-password" value={next} onChange={setNext} hint="Pelo menos 8 caracteres." />
            <TextField label="Repita a nova senha" type="password" required autoComplete="new-password" value={confirm} onChange={setConfirm} hint={mismatch ? <span style={{ color: 'var(--danger)' }}>As senhas não são iguais.</span> : undefined} />
            <div>
              <button type="submit" className="btn btn-primary" disabled={change.isPending || mismatch}>
                {change.isPending ? 'Salvando…' : 'Trocar senha'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
