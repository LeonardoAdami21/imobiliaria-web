import { type FormEvent } from 'react';
import { api } from '@/api';
import type { Proposal, Sale } from '@/api/types';
import { FormActions, TextField } from '@/components/form';
import { PersonName, PropertyRef, useProperty, UserName } from '@/components/lookups';
import { ErrorAlert, Modal } from '@/components/ui';
import { previewCommissionSplit } from '@/lib/commission';
import { formatMoney, formatPercent, inputToPercent, todayIso } from '@/lib/format';
import { COMMISSION_ROLE } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useFormState } from '@/lib/useFormState';

export function CloseSaleForm({ proposal, onClose, onSaved }: { proposal: Proposal; onClose: () => void; onSaved?: (sale: Sale) => void }) {
  const property = useProperty(proposal.propertyId).data;
  const hasListingBroker = !!property?.listingBrokerId;
  const { values, set } = useFormState({ closedAt: todayIso(), commissionPercent: '6', sellingShare: '30', listingShare: '20' });

  const commissionPercent = inputToPercent(values.commissionPercent) ?? 0;
  const sellingShare = inputToPercent(values.sellingShare) ?? 0;
  const listingShare = hasListingBroker ? (inputToPercent(values.listingShare) ?? 0) : 0;
  const split = previewCommissionSplit({
    amountCents: proposal.amountCents,
    commissionPercent,
    sellingSharePercent: sellingShare,
    listingSharePercent: listingShare,
    hasListingBroker,
  });

  const close = useAction(
    () =>
      api.sales.close({
        proposalId: proposal.id,
        closedAt: values.closedAt,
        commissionPercent,
        sellingBrokerSharePercent: sellingShare,
        listingBrokerSharePercent: listingShare,
      }),
    {
      success: 'Venda fechada. O imóvel foi marcado como vendido.',
      onDone: (sale) => {
        onSaved?.(sale);
        onClose();
      },
    },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    close.mutate(undefined);
  };

  const who = (role: 'LISTING_BROKER' | 'SELLING_BROKER' | 'AGENCY') =>
    role === 'AGENCY' ? null : <UserName id={role === 'SELLING_BROKER' ? proposal.brokerId : property?.listingBrokerId} />;

  return (
    <Modal title="Fechar venda" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <ErrorAlert error={close.error} />
        <div>
          <PropertyRef id={proposal.propertyId} link={false} />
          <p className="muted small">
            Comprador: <PersonName id={proposal.buyerId} />. Valor da venda: <span className="num">{formatMoney(proposal.amountCents)}</span>.
          </p>
        </div>
        <div className="form-grid">
          <TextField className="col-6" label="Data da assinatura" type="date" required max={todayIso()} value={values.closedAt} onChange={set('closedAt')} />
          <TextField className="col-6" label="Comissão sobre a venda (%)" inputMode="decimal" required value={values.commissionPercent} onChange={set('commissionPercent')} />
          <TextField className="col-6" label="Parte do corretor vendedor (%)" inputMode="decimal" required value={values.sellingShare} onChange={set('sellingShare')} hint="Percentual da comissão, não da venda." />
          <TextField
            className="col-6"
            label="Parte do corretor captador (%)"
            inputMode="decimal"
            disabled={!hasListingBroker}
            value={hasListingBroker ? values.listingShare : '0'}
            onChange={set('listingShare')}
            hint={hasListingBroker ? undefined : 'Este imóvel não tem captador.'}
          />
        </div>

        {split ? (
          <div>
            {split.parts.map((part) => (
              <div className="sum-row" key={part.role}>
                <span>
                  {COMMISSION_ROLE[part.role]} ({formatPercent(part.sharePercent)}){part.role !== 'AGENCY' && <>, {who(part.role)}</>}
                </span>
                <span className="num">{formatMoney(part.amountCents)}</span>
              </div>
            ))}
            <div className="sum-row total">
              <span>Comissão total</span>
              <span className="num">{formatMoney(split.commissionCents)}</span>
            </div>
          </div>
        ) : (
          <div className="alert" data-tone="warn">
            <div>A soma das partes dos corretores não pode passar de 100% da comissão.</div>
          </div>
        )}

        <p className="small muted">As outras propostas pendentes deste imóvel serão recusadas automaticamente.</p>
        <FormActions onCancel={onClose} submitLabel="Fechar venda" isPending={close.isPending} />
      </form>
    </Modal>
  );
}
