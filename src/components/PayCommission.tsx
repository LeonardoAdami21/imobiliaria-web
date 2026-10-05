import { type FormEvent, useState } from 'react';
import { api } from '@/api';
import { FormActions, TextField } from '@/components/form';
import { ErrorAlert, Modal } from '@/components/ui';
import { formatMoney, todayIso } from '@/lib/format';
import { useAction } from '@/lib/useAction';

export interface PayableCommission {
  id: string;
  saleId: string;
  amountCents: number;
  /** Data da venda: a comissão não pode ser paga antes dela. */
  saleClosedAt: string;
  payee: React.ReactNode;
}

export function PayCommission({ commission, onClose }: { commission: PayableCommission; onClose: () => void }) {
  const [paidAt, setPaidAt] = useState(todayIso());
  const pay = useAction(() => api.sales.payCommission(commission.saleId, commission.id, paidAt), {
    success: 'Comissão paga.',
    onDone: onClose,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    pay.mutate(undefined);
  };

  return (
    <Modal title="Pagar comissão" onClose={onClose} size="sm">
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={pay.error} />
        <div className="sum-row total" style={{ borderTop: 0 }}>
          <span>{commission.payee}</span>
          <span className="num">{formatMoney(commission.amountCents)}</span>
        </div>
        <TextField label="Data do pagamento" type="date" required min={commission.saleClosedAt} max={todayIso()} value={paidAt} onChange={setPaidAt} />
        <FormActions onCancel={onClose} submitLabel="Pagar comissão" isPending={pay.isPending} />
      </form>
    </Modal>
  );
}
