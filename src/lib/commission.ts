export interface SplitPart {
  role: 'LISTING_BROKER' | 'SELLING_BROKER' | 'AGENCY';
  sharePercent: number;
  amountCents: number;
}

/**
 * Prévia do rateio da comissão, com a mesma conta que a API faz ao fechar a venda:
 * cada parte é arredondada para baixo e os centavos que sobram vão para a última
 * (a imobiliária, quando ela participa). Devolve null se as partes passam de 100%.
 */
export function previewCommissionSplit(input: {
  amountCents: number;
  commissionPercent: number;
  sellingSharePercent: number;
  listingSharePercent: number;
  hasListingBroker: boolean;
}): { commissionCents: number; parts: SplitPart[] } | null {
  const listing = input.hasListingBroker ? input.listingSharePercent : 0;
  const selling = input.sellingSharePercent;
  if (listing < 0 || selling < 0 || listing + selling > 100) return null;

  const commissionCents = Math.round((input.amountCents * input.commissionPercent) / 100);
  const agency = Math.round((100 - selling - listing) * 100) / 100;

  const shares: [SplitPart['role'], number][] = [];
  if (listing > 0) shares.push(['LISTING_BROKER', listing]);
  if (selling > 0) shares.push(['SELLING_BROKER', selling]);
  if (agency > 0) shares.push(['AGENCY', agency]);

  const amounts = shares.map(([, share]) => Math.floor((commissionCents * Math.round(share * 100)) / 10_000));
  const leftover = commissionCents - amounts.reduce((sum, cents) => sum + cents, 0);
  if (amounts.length > 0) amounts[amounts.length - 1]! += leftover;

  return {
    commissionCents,
    parts: shares.map(([role, sharePercent], index) => ({ role, sharePercent, amountCents: amounts[index]! })),
  };
}
