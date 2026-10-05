/** Tipos devolvidos e aceitos pela imobiliaria-api. Dinheiro em centavos; datas de calendário em AAAA-MM-DD. */

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface PageParams {
  page?: number;
  perPage?: number;
}

// ── Identidade ──
export type UserRole = 'ADMIN' | 'MANAGER' | 'BROKER' | 'FINANCE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  creci: string | null;
  active: boolean;
  createdAt: string;
}

export interface UserDirectoryEntry {
  id: string;
  name: string;
  role: UserRole;
  creci: string | null;
  active: boolean;
}

export interface Session {
  token: string;
  user: User;
}

// ── CRM ──
export interface Person {
  id: string;
  type: 'INDIVIDUAL' | 'COMPANY';
  name: string;
  document: string;
  documentFormatted: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonInput {
  name: string;
  document: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export type LeadStatus = 'NEW' | 'IN_SERVICE' | 'VISIT_SCHEDULED' | 'PROPOSAL' | 'WON' | 'LOST';
export type LeadInterest = 'BUY' | 'RENT';
export type LeadSource = 'WEBSITE' | 'PORTAL' | 'REFERRAL' | 'WALK_IN' | 'SOCIAL_MEDIA' | 'PHONE' | 'OTHER';

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  interest: LeadInterest;
  source: LeadSource;
  status: LeadStatus;
  propertyId: string | null;
  brokerId: string | null;
  personId: string | null;
  notes: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  interest: LeadInterest;
  source: LeadSource;
  propertyId?: string | null;
  brokerId?: string | null;
  notes?: string | null;
}

export type LeadStatusChange =
  | { status: 'IN_SERVICE' | 'VISIT_SCHEDULED' | 'PROPOSAL' }
  | { status: 'WON'; personId?: string | null }
  | { status: 'LOST'; reason: string }
  | { status: 'REOPEN' };

export type VisitStatus = 'SCHEDULED' | 'DONE' | 'CANCELED' | 'NO_SHOW';

export interface Visit {
  id: string;
  leadId: string;
  propertyId: string;
  brokerId: string;
  scheduledAt: string;
  status: VisitStatus;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Imóveis ──
export type PropertyType = 'HOUSE' | 'APARTMENT' | 'LAND' | 'COMMERCIAL' | 'RURAL' | 'OTHER';
export type PropertyPurpose = 'SALE' | 'RENT' | 'BOTH';
export type PropertyStatus = 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'SOLD' | 'INACTIVE';

export interface Address {
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface PropertyPhoto {
  id: string;
  url: string;
  caption: string | null;
}

export interface Property {
  id: string;
  code: number;
  title: string;
  description: string | null;
  type: PropertyType;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  ownerId: string;
  listingBrokerId: string | null;
  salePriceCents: number | null;
  rentPriceCents: number | null;
  condoFeeCents: number | null;
  propertyTaxCents: number | null;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  areaM2: number | null;
  address: Address;
  photos: PropertyPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyDetailsInput {
  title: string;
  description?: string | null;
  type: PropertyType;
  purpose: PropertyPurpose;
  salePriceCents?: number | null;
  rentPriceCents?: number | null;
  condoFeeCents?: number | null;
  propertyTaxCents?: number | null;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  areaM2?: number | null;
  address: Omit<Address, 'complement'> & { complement?: string | null };
  listingBrokerId?: string | null;
}

export interface PropertyFilters extends PageParams {
  status?: PropertyStatus;
  purpose?: 'SALE' | 'RENT';
  type?: PropertyType;
  city?: string;
  district?: string;
  ownerId?: string;
  minBedrooms?: number;
  minPriceCents?: number;
  maxPriceCents?: number;
  search?: string;
}

// ── Locação ──
export type LeaseStatus = 'ACTIVE' | 'ENDED' | 'TERMINATED';
export type GuaranteeType = 'NONE' | 'GUARANTOR' | 'DEPOSIT' | 'SURETY_INSURANCE';
export type AdjustmentIndex = 'IGPM' | 'IPCA' | 'INPC' | 'FIXED';

export interface Lease {
  id: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  guarantorId: string | null;
  startDate: string;
  endDate: string;
  durationMonths: number;
  rentAmountCents: number;
  dueDay: number;
  adminFeePercent: number;
  lateFeePercent: number;
  monthlyInterestPercent: number;
  guaranteeType: GuaranteeType;
  depositAmountCents: number | null;
  adjustmentIndex: AdjustmentIndex;
  lastAdjustmentAt: string | null;
  nextAdjustmentDate: string;
  status: LeaseStatus;
  terminatedAt: string | null;
  terminationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseInput {
  propertyId: string;
  tenantId: string;
  guarantorId?: string | null;
  startDate: string;
  durationMonths: number;
  rentAmountCents: number;
  dueDay: number;
  adminFeePercent: number;
  lateFeePercent: number;
  monthlyInterestPercent: number;
  guaranteeType: GuaranteeType;
  depositAmountCents?: number | null;
  adjustmentIndex: AdjustmentIndex;
}

export type ChargeStatus = 'PENDING' | 'PAID' | 'CANCELED';
export type TransferStatus = 'PENDING' | 'DONE';

export interface ChargePayment {
  paidAt: string;
  lateFeeCents: number;
  interestCents: number;
  paidAmountCents: number;
  adminFeeCents: number;
  ownerTransferCents: number;
  transferStatus: TransferStatus;
  transferredAt: string | null;
}

export interface Charge {
  id: string;
  leaseId: string;
  /** AAAA-MM */
  referenceMonth: string;
  dueDate: string;
  amountCents: number;
  status: ChargeStatus;
  overdue: boolean;
  payment: ChargePayment | null;
}

export interface ChargeQuote {
  chargeId: string;
  date: string;
  daysLate: number;
  amountCents: number;
  lateFeeCents: number;
  interestCents: number;
  totalCents: number;
}

export interface ChargeFilters extends PageParams {
  leaseId?: string;
  status?: ChargeStatus;
  transferStatus?: TransferStatus;
  overdue?: boolean;
  dueFrom?: string;
  dueTo?: string;
}

// ── Vendas ──
export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';

export interface Proposal {
  id: string;
  propertyId: string;
  buyerId: string;
  brokerId: string;
  amountCents: number;
  paymentTerms: string | null;
  validUntil: string | null;
  status: ProposalStatus;
  decidedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalInput {
  propertyId: string;
  buyerId: string;
  brokerId?: string;
  amountCents: number;
  paymentTerms?: string | null;
  validUntil?: string | null;
}

export type CommissionRole = 'LISTING_BROKER' | 'SELLING_BROKER' | 'AGENCY';
export type CommissionStatus = 'PENDING' | 'PAID';

export interface Commission {
  id: string;
  role: CommissionRole;
  brokerId: string | null;
  sharePercent: number;
  amountCents: number;
  status: CommissionStatus;
  paidAt: string | null;
}

export interface Sale {
  id: string;
  proposalId: string;
  propertyId: string;
  buyerId: string;
  sellerId: string;
  amountCents: number;
  commissionPercent: number;
  commissionAmountCents: number;
  closedAt: string;
  commissions: Commission[];
  createdAt: string;
}

export interface CloseSaleInput {
  proposalId: string;
  closedAt?: string;
  commissionPercent: number;
  sellingBrokerSharePercent: number;
  listingBrokerSharePercent: number;
}

export interface CommissionEntry extends Commission {
  saleId: string;
  propertyId: string;
  saleClosedAt: string;
  saleAmountCents: number;
}

export interface CommissionReport extends Page<CommissionEntry> {
  totalAmountCents: number;
}

export interface CommissionFilters extends PageParams {
  brokerId?: string;
  role?: CommissionRole;
  status?: CommissionStatus;
  closedFrom?: string;
  closedTo?: string;
}
