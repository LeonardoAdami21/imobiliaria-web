import { describe, expect, it } from 'vitest';
import { previewCommissionSplit } from './commission';

describe('prévia do rateio de comissão', () => {
  it('bate com o exemplo da API: 6% de R$ 430.000,00 em 20/30/50', () => {
    const split = previewCommissionSplit({
      amountCents: 430_000_00,
      commissionPercent: 6,
      sellingSharePercent: 30,
      listingSharePercent: 20,
      hasListingBroker: true,
    });
    expect(split?.commissionCents).toBe(25_800_00);
    expect(split?.parts).toEqual([
      { role: 'LISTING_BROKER', sharePercent: 20, amountCents: 5_160_00 },
      { role: 'SELLING_BROKER', sharePercent: 30, amountCents: 7_740_00 },
      { role: 'AGENCY', sharePercent: 50, amountCents: 12_900_00 },
    ]);
  });

  it('sem captador, a parte dele fica com a imobiliária', () => {
    const split = previewCommissionSplit({
      amountCents: 100_000_00,
      commissionPercent: 5,
      sellingSharePercent: 40,
      listingSharePercent: 20,
      hasListingBroker: false,
    });
    expect(split?.parts).toEqual([
      { role: 'SELLING_BROKER', sharePercent: 40, amountCents: 2_000_00 },
      { role: 'AGENCY', sharePercent: 60, amountCents: 3_000_00 },
    ]);
  });

  it('as partes sempre somam a comissão, mesmo com centavos quebrados', () => {
    const split = previewCommissionSplit({
      amountCents: 16_666_83,
      commissionPercent: 6,
      sellingSharePercent: 50,
      listingSharePercent: 50,
      hasListingBroker: true,
    });
    expect(split?.commissionCents).toBe(1_000_01);
    expect(split?.parts.map((part) => part.amountCents)).toEqual([500_00, 500_01]);
  });

  it('recusa partes que passam de 100%', () => {
    expect(
      previewCommissionSplit({ amountCents: 1000, commissionPercent: 6, sellingSharePercent: 60, listingSharePercent: 50, hasListingBroker: true }),
    ).toBeNull();
  });
});
