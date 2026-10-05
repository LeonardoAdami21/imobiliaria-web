import { cleanParams, http } from './http';
import type {
  Charge,
  ChargeFilters,
  ChargeQuote,
  CloseSaleInput,
  CommissionFilters,
  CommissionReport,
  Lead,
  LeadInput,
  LeadInterest,
  LeadStatus,
  LeadStatusChange,
  Lease,
  LeaseInput,
  LeaseStatus,
  Page,
  PageParams,
  Person,
  PersonInput,
  Property,
  PropertyDetailsInput,
  PropertyFilters,
  Proposal,
  ProposalInput,
  ProposalStatus,
  Sale,
  Session,
  User,
  UserDirectoryEntry,
  UserRole,
  Visit,
  VisitStatus,
} from './types';

const get = <T>(url: string, params: object = {}) => http.get<T>(url, { params: cleanParams(params) }).then((r) => r.data);
const post = <T>(url: string, body: unknown = {}) => http.post<T>(url, body).then((r) => r.data);
const patch = <T>(url: string, body: unknown) => http.patch<T>(url, body).then((r) => r.data);

/** Uma função por rota da API, agrupadas por área do sistema. */
export const api = {
  auth: {
    login: (email: string, password: string) => post<Session>('/auth/login', { email, password }),
    me: () => get<User>('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      patch<void>('/auth/me/password', { currentPassword, newPassword }),
  },

  users: {
    directory: () => get<UserDirectoryEntry[]>('/users/directory'),
    list: (params: PageParams & { role?: UserRole; active?: boolean }) => get<Page<User>>('/users', params),
    create: (body: { name: string; email: string; password: string; role: UserRole; creci?: string | null }) =>
      post<User>('/users', body),
    update: (id: string, body: { name?: string; role?: UserRole; creci?: string | null; active?: boolean }) =>
      patch<User>(`/users/${id}`, body),
  },

  people: {
    search: (params: PageParams & { search?: string }) => get<Page<Person>>('/people', params),
    get: (id: string) => get<Person>(`/people/${id}`),
    create: (body: PersonInput) => post<Person>('/people', body),
    update: (id: string, body: Partial<Omit<PersonInput, 'document'>>) => patch<Person>(`/people/${id}`, body),
  },

  leads: {
    search: (params: PageParams & { status?: LeadStatus; interest?: LeadInterest; brokerId?: string; unassigned?: boolean }) =>
      get<Page<Lead>>('/leads', params),
    get: (id: string) => get<Lead>(`/leads/${id}`),
    create: (body: LeadInput) => post<Lead>('/leads', body),
    update: (id: string, body: Partial<Omit<LeadInput, 'brokerId'>>) => patch<Lead>(`/leads/${id}`, body),
    assign: (id: string, brokerId: string) => post<Lead>(`/leads/${id}/assign`, { brokerId }),
    changeStatus: (id: string, change: LeadStatusChange) => post<Lead>(`/leads/${id}/status`, change),
  },

  visits: {
    search: (
      params: PageParams & { status?: VisitStatus; brokerId?: string; propertyId?: string; leadId?: string; from?: string; to?: string },
    ) => get<Page<Visit>>('/visits', params),
    schedule: (body: { leadId: string; propertyId: string; brokerId: string; scheduledAt: string }) =>
      post<Visit>('/visits', body),
    reschedule: (id: string, scheduledAt: string) => post<Visit>(`/visits/${id}/reschedule`, { scheduledAt }),
    finish: (id: string, outcome: 'DONE' | 'CANCELED' | 'NO_SHOW', feedback?: string | null) =>
      post<Visit>(`/visits/${id}/finish`, { outcome, feedback }),
  },

  properties: {
    search: (params: PropertyFilters) => get<Page<Property>>('/properties', params),
    get: (id: string) => get<Property>(`/properties/${id}`),
    create: (body: PropertyDetailsInput & { ownerId: string }) => post<Property>('/properties', body),
    update: (id: string, body: Partial<PropertyDetailsInput>) => patch<Property>(`/properties/${id}`, body),
    addPhoto: (id: string, url: string, caption?: string | null) =>
      post<Property>(`/properties/${id}/photos`, { url, caption }),
    reorderPhotos: (id: string, photoIds: string[]) =>
      http.put<Property>(`/properties/${id}/photos/order`, { photoIds }).then((r) => r.data),
    removePhoto: (id: string, photoId: string) =>
      http.delete<Property>(`/properties/${id}/photos/${photoId}`).then((r) => r.data),
    setListing: (id: string, active: boolean) => post<Property>(`/properties/${id}/listing`, { active }),
  },

  leases: {
    search: (params: PageParams & { status?: LeaseStatus; propertyId?: string; tenantId?: string; ownerId?: string }) =>
      get<Page<Lease>>('/leases', params),
    get: (id: string) => get<Lease>(`/leases/${id}`),
    create: (body: LeaseInput) => post<Lease>('/leases', body),
    adjustRent: (id: string, percent: number, effectiveFrom?: string) =>
      post<Lease>(`/leases/${id}/adjust-rent`, { percent, effectiveFrom }),
    close: (id: string, body: { date?: string; reason?: string | null }) => post<Lease>(`/leases/${id}/close`, body),
  },

  charges: {
    search: (params: ChargeFilters) => get<Page<Charge>>('/charges', params),
    quote: (id: string, date?: string) => get<ChargeQuote>(`/charges/${id}/quote`, { date }),
    pay: (id: string, paidAt?: string) => post<Charge>(`/charges/${id}/pay`, { paidAt }),
    transfer: (id: string, date?: string) => post<Charge>(`/charges/${id}/transfer`, { date }),
  },

  proposals: {
    search: (params: PageParams & { status?: ProposalStatus; propertyId?: string; buyerId?: string; brokerId?: string }) =>
      get<Page<Proposal>>('/proposals', params),
    get: (id: string) => get<Proposal>(`/proposals/${id}`),
    create: (body: ProposalInput) => post<Proposal>('/proposals', body),
    accept: (id: string) => post<Proposal>(`/proposals/${id}/accept`),
    reject: (id: string, reason: string) => post<Proposal>(`/proposals/${id}/reject`, { reason }),
    cancel: (id: string) => post<Proposal>(`/proposals/${id}/cancel`),
  },

  sales: {
    search: (params: PageParams & { buyerId?: string; sellerId?: string; closedFrom?: string; closedTo?: string }) =>
      get<Page<Sale>>('/sales', params),
    get: (id: string) => get<Sale>(`/sales/${id}`),
    close: (body: CloseSaleInput) => post<Sale>('/sales', body),
    payCommission: (saleId: string, commissionId: string, paidAt?: string) =>
      post<Sale>(`/sales/${saleId}/commissions/${commissionId}/pay`, { paidAt }),
    commissions: (params: CommissionFilters) => get<CommissionReport>('/commissions', params),
  },
};
