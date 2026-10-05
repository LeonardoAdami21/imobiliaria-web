import type {
  AdjustmentIndex,
  ChargeStatus,
  CommissionRole,
  CommissionStatus,
  GuaranteeType,
  LeadInterest,
  LeadSource,
  LeadStatus,
  LeaseStatus,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
  ProposalStatus,
  TransferStatus,
  UserRole,
  VisitStatus,
} from '@/api/types';

/** Cor semântica usada por placas e etiquetas. */
export type Tone = 'ok' | 'warn' | 'info' | 'danger' | 'mute';

interface Label {
  label: string;
  tone: Tone;
}

/** Tradução dos códigos da API para o vocabulário da imobiliária. */
export const ROLE: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  BROKER: 'Corretor',
  FINANCE: 'Financeiro',
};

export const PROPERTY_STATUS: Record<PropertyStatus, Label> = {
  AVAILABLE: { label: 'Disponível', tone: 'ok' },
  RESERVED: { label: 'Reservado', tone: 'warn' },
  RENTED: { label: 'Alugado', tone: 'info' },
  SOLD: { label: 'Vendido', tone: 'danger' },
  INACTIVE: { label: 'Fora do anúncio', tone: 'mute' },
};

export const PROPERTY_TYPE: Record<PropertyType, string> = {
  HOUSE: 'Casa',
  APARTMENT: 'Apartamento',
  LAND: 'Terreno',
  COMMERCIAL: 'Comercial',
  RURAL: 'Rural',
  OTHER: 'Outro',
};

export const PROPERTY_PURPOSE: Record<PropertyPurpose, string> = {
  SALE: 'Venda',
  RENT: 'Locação',
  BOTH: 'Venda e locação',
};

export const LEAD_STATUS: Record<LeadStatus, Label> = {
  NEW: { label: 'Novo', tone: 'info' },
  IN_SERVICE: { label: 'Em atendimento', tone: 'info' },
  VISIT_SCHEDULED: { label: 'Visita agendada', tone: 'warn' },
  PROPOSAL: { label: 'Proposta', tone: 'warn' },
  WON: { label: 'Ganho', tone: 'ok' },
  LOST: { label: 'Perdido', tone: 'mute' },
};

export const LEAD_INTEREST: Record<LeadInterest, string> = { BUY: 'Comprar', RENT: 'Alugar' };

export const LEAD_SOURCE: Record<LeadSource, string> = {
  WEBSITE: 'Site',
  PORTAL: 'Portal de imóveis',
  REFERRAL: 'Indicação',
  WALK_IN: 'Visita à loja',
  SOCIAL_MEDIA: 'Redes sociais',
  PHONE: 'Telefone',
  OTHER: 'Outro',
};

export const VISIT_STATUS: Record<VisitStatus, Label> = {
  SCHEDULED: { label: 'Agendada', tone: 'info' },
  DONE: { label: 'Realizada', tone: 'ok' },
  CANCELED: { label: 'Cancelada', tone: 'mute' },
  NO_SHOW: { label: 'Cliente não veio', tone: 'danger' },
};

export const LEASE_STATUS: Record<LeaseStatus, Label> = {
  ACTIVE: { label: 'Ativo', tone: 'ok' },
  ENDED: { label: 'Encerrado', tone: 'mute' },
  TERMINATED: { label: 'Rescindido', tone: 'danger' },
};

export const GUARANTEE: Record<GuaranteeType, string> = {
  NONE: 'Sem garantia',
  GUARANTOR: 'Fiador',
  DEPOSIT: 'Caução',
  SURETY_INSURANCE: 'Seguro-fiança',
};

export const ADJUSTMENT_INDEX: Record<AdjustmentIndex, string> = {
  IPCA: 'IPCA',
  IGPM: 'IGP-M',
  INPC: 'INPC',
  FIXED: 'Percentual fixo',
};

export const CHARGE_STATUS: Record<ChargeStatus, Label> = {
  PENDING: { label: 'A receber', tone: 'warn' },
  PAID: { label: 'Paga', tone: 'ok' },
  CANCELED: { label: 'Cancelada', tone: 'mute' },
};

export const TRANSFER_STATUS: Record<TransferStatus, Label> = {
  PENDING: { label: 'Repasse pendente', tone: 'warn' },
  DONE: { label: 'Repassado', tone: 'ok' },
};

export const PROPOSAL_STATUS: Record<ProposalStatus, Label> = {
  PENDING: { label: 'Aguardando resposta', tone: 'warn' },
  ACCEPTED: { label: 'Aceita', tone: 'ok' },
  REJECTED: { label: 'Recusada', tone: 'danger' },
  CANCELED: { label: 'Cancelada', tone: 'mute' },
};

export const COMMISSION_ROLE: Record<CommissionRole, string> = {
  LISTING_BROKER: 'Captador',
  SELLING_BROKER: 'Vendedor',
  AGENCY: 'Imobiliária',
};

export const COMMISSION_STATUS: Record<CommissionStatus, Label> = {
  PENDING: { label: 'A pagar', tone: 'warn' },
  PAID: { label: 'Paga', tone: 'ok' },
};

export const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

/** Transforma um dicionário de rótulos em opções de <select>. */
export function options<K extends string>(record: Record<K, string | Label>): { value: K; label: string }[] {
  return (Object.entries(record) as [K, string | Label][]).map(([value, item]) => ({
    value,
    label: typeof item === 'string' ? item : item.label,
  }));
}
