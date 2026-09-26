import { auth } from "@/lib/auth";
import { wp } from "./client";

// Typed access to the WordPress `tap/v1` API (see wordpress/tap-ops/API.md).
// Shapes mirror the old Prisma models so pages/actions change as little as possible.
// Timestamps become Date objects; date-only fields (dueDate, startDate, dateNeeded)
// stay "YYYY-MM-DD" strings, which is what the UI wants.

export type Category = "ELECTRICAL" | "PLUMBING" | "HVAC" | "SAFETY" | "GENERAL";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ActionStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AppRole = "ADMIN" | "INSPECTOR";

export interface User {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  active: boolean;
  auditCount: number;
}

export interface Customer {
  id: string;
  name: string;
  site: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
}
export type CustomerInput = Partial<Omit<Customer, "id" | "createdAt">> & { name: string };

export interface Template {
  id: string;
  name: string;
  category: Category;
  fields: unknown;
  approvalRequired: boolean;
  reportStyle: "MODERN" | "CLASSIC";
  reportAccentColor: string | null;
  reportLogo: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export type TemplateInput = Omit<Template, "id" | "createdAt" | "updatedAt" | "reportAccentColor" | "reportLogo"> & {
  reportAccentColor?: string | null;
  reportLogo?: string | null;
};

export interface Audit {
  id: string;
  docNumber: string;
  templateId: string;
  customerId: string;
  inspectorId: string | null;
  title: string;
  score: number | null;
  criticalFail: boolean;
  draft: boolean;
  pendingApproval: boolean;
  date: Date;
  responses: unknown;
  notes: string;
  photos: unknown;
  signature: string | null;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: Omit<Customer, "createdAt"> & { createdAt?: Date };
  template: Omit<Template, "createdAt" | "updatedAt" | "fields"> & { fields?: unknown };
  inspector: { id: string; name: string } | null;
}

export interface AuditWriteInput {
  docNumber: string;
  templateId: string;
  customerId: string;
  title: string;
  score: number | null;
  criticalFail: boolean;
  draft: boolean;
  pendingApproval: boolean;
  date?: string;
  responses: unknown;
  notes: string;
  photos: unknown;
  signature: string | null;
}

export interface AuditEvent {
  id: string;
  auditId: string;
  userId: string | null;
  userName: string | null;
  message: string;
  createdAt: Date;
}

export interface CorrectiveAction {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: ActionStatus;
  dueDate: string | null;
  findingLabel: string | null;
  auditId: string | null;
  customerId: string;
  assigneeId: string | null;
  createdById: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  customerName: string;
  auditDoc: string | null;
  assigneeName: string | null;
}
export interface ActionInput {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  findingLabel?: string | null;
  auditId?: string | null;
  customerId: string;
  assigneeId?: string | null;
}

export interface CustomerRequest {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  title: string | null;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  services: string[];
  trainings: string[];
  dateNeeded: string;
  additionalInfo: string;
  status: RequestStatus;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  customerId: string | null;
  createdAt: Date;
  source: string;
}

export interface Schedule {
  id: string;
  title: string;
  templateId: string;
  customerId: string;
  frequency: Frequency;
  startDate: string;
  active: boolean;
  createdAt: Date;
  templateName: string;
  customerName: string;
}

// ---- helpers ------------------------------------------------------------

const toDate = (v: unknown) => new Date(v as string);
const toDateOrNull = (v: unknown) => (v ? new Date(v as string) : null);

async function actor(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be signed in.");
  return session.user.id;
}

const asArr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function customerOf<T extends { createdAt?: unknown }>(c: T) {
  return { ...c, createdAt: toDate(c.createdAt) } as unknown as Customer;
}
function templateOf<T extends { createdAt?: unknown; updatedAt?: unknown }>(t: T) {
  return { ...t, createdAt: toDate(t.createdAt), updatedAt: toDate(t.updatedAt) } as unknown as Template;
}
function auditOf(a: Record<string, unknown>): Audit {
  return {
    ...(a as unknown as Audit),
    date: toDate(a.date),
    createdAt: toDate(a.createdAt),
    updatedAt: toDate(a.updatedAt),
    photos: a.photos ?? [],
    signature: (a.signature as string | null) ?? null,
    notes: (a.notes as string) ?? "",
  };
}
function actionOf(a: Record<string, unknown>): CorrectiveAction {
  return { ...(a as unknown as CorrectiveAction), resolvedAt: toDateOrNull(a.resolvedAt), createdAt: toDate(a.createdAt) };
}
function requestOf(r: Record<string, unknown>): CustomerRequest {
  return {
    ...(r as unknown as CustomerRequest),
    services: asArr<string>(r.services),
    trainings: asArr<string>(r.trainings),
    reviewedAt: toDateOrNull(r.reviewedAt),
    createdAt: toDate(r.createdAt),
  };
}
function scheduleOf(s: Record<string, unknown>): Schedule {
  return { ...(s as unknown as Schedule), createdAt: toDate(s.createdAt) };
}

// ---- users --------------------------------------------------------------

export const users = {
  login: (email: string, password: string) =>
    wp<{ id: string; name: string; email: string; role: AppRole }>("/auth/login", { method: "POST", body: { email, password } }),
  // Used to re-validate sessions on every request; pass the user's own id.
  get: (id: string) => wp<User>(`/users/${id}`, { userId: id }),
  list: async () => wp<User[]>("/users", { userId: await actor() }),
  create: async (data: { name: string; email: string; password: string; role: AppRole }) =>
    wp<User>("/users", { method: "POST", body: data, userId: await actor() }),
  patch: async (id: string, data: { role?: AppRole; active?: boolean; password?: string }) =>
    wp<User>(`/users/${id}`, { method: "PATCH", body: data, userId: await actor() }),
};

// ---- customers ----------------------------------------------------------

export const customers = {
  list: async () => (await wp<Customer[]>("/customers", { userId: await actor() })).map(customerOf),
  get: async (id: string): Promise<Customer | null> => {
    try {
      return customerOf(await wp<Customer>(`/customers/${id}`, { userId: await actor() }));
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },
  create: async (data: CustomerInput) => customerOf(await wp<Customer>("/customers", { method: "POST", body: data, userId: await actor() })),
  update: async (id: string, data: Partial<CustomerInput>) =>
    customerOf(await wp<Customer>(`/customers/${id}`, { method: "PATCH", body: data, userId: await actor() })),
  remove: async (id: string) => wp<{ ok: true }>(`/customers/${id}`, { method: "DELETE", userId: await actor() }),
};

// ---- templates ----------------------------------------------------------

export const templates = {
  list: async () => (await wp<Template[]>("/templates", { userId: await actor() })).map(templateOf),
  get: async (id: string): Promise<Template | null> => {
    try {
      return templateOf(await wp<Template>(`/templates/${id}`, { userId: await actor() }));
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },
  create: async (data: TemplateInput) => templateOf(await wp<Template>("/templates", { method: "POST", body: data, userId: await actor() })),
  update: async (id: string, data: TemplateInput) =>
    templateOf(await wp<Template>(`/templates/${id}`, { method: "PATCH", body: data, userId: await actor() })),
  remove: async (id: string) => wp<{ ok: true }>(`/templates/${id}`, { method: "DELETE", userId: await actor() }),
};

// ---- audits -------------------------------------------------------------

export const audits = {
  list: async (opts: { customerId?: string; q?: string; noResponses?: boolean } = {}) =>
    (
      await wp<Record<string, unknown>[]>("/audits", {
        userId: await actor(),
        query: { customerId: opts.customerId, q: opts.q, noResponses: opts.noResponses ? 1 : undefined },
      })
    ).map(auditOf),
  get: async (id: string): Promise<Audit | null> => {
    try {
      return auditOf(await wp<Record<string, unknown>>(`/audits/${id}`, { userId: await actor() }));
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },
  // Public share page: authorised by the unguessable token, no signed-in user.
  getByToken: async (token: string): Promise<Audit | null> => {
    try {
      return auditOf(await wp<Record<string, unknown>>(`/audits/by-token/${encodeURIComponent(token)}`));
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },
  create: async (data: AuditWriteInput) =>
    auditOf(await wp<Record<string, unknown>>("/audits", { method: "POST", body: data, userId: await actor() })),
  update: async (id: string, data: Partial<AuditWriteInput>) =>
    auditOf(await wp<Record<string, unknown>>(`/audits/${id}`, { method: "PATCH", body: data, userId: await actor() })),
  setShare: async (id: string, enabled: boolean) =>
    wp<{ shareToken: string | null }>(`/audits/${id}/share`, { method: "PATCH", body: { enabled }, userId: await actor() }),
  remove: async (id: string) => wp<{ ok: true }>(`/audits/${id}`, { method: "DELETE", userId: await actor() }),
  events: async (id: string): Promise<AuditEvent[]> =>
    (await wp<Record<string, unknown>[]>(`/audits/${id}/events`, { userId: await actor() })).map(
      (e) => ({ ...(e as unknown as AuditEvent), createdAt: toDate(e.createdAt) }),
    ),
  addEvent: async (id: string, message: string) =>
    wp<unknown>(`/audits/${id}/events`, { method: "POST", body: { message }, userId: await actor() }),
  nextDocSeq: async (category: Category) =>
    (await wp<{ seq: number }>("/doc-numbers", { method: "POST", body: { category }, userId: await actor() })).seq,
};

// ---- corrective actions -------------------------------------------------

export const actions = {
  list: async (opts: { customerId?: string; auditId?: string } = {}) =>
    (await wp<Record<string, unknown>[]>("/actions", { userId: await actor(), query: opts })).map(actionOf),
  create: async (data: ActionInput) => actionOf(await wp<Record<string, unknown>>("/actions", { method: "POST", body: data, userId: await actor() })),
  createMany: async (items: ActionInput[]) =>
    wp<{ created: number }>("/actions/bulk", { method: "POST", body: { items }, userId: await actor() }),
  patch: async (id: string, data: { status?: ActionStatus; assigneeId?: string | null }) =>
    actionOf(await wp<Record<string, unknown>>(`/actions/${id}`, { method: "PATCH", body: data, userId: await actor() })),
  remove: async (id: string) => wp<{ ok: true }>(`/actions/${id}`, { method: "DELETE", userId: await actor() }),
};

// ---- customer requests --------------------------------------------------

export const requests = {
  list: async () => (await wp<Record<string, unknown>[]>("/requests", { userId: await actor() })).map(requestOf),
  pendingCount: async () => (await wp<{ count: number }>("/requests/pending-count", { userId: await actor() })).count,
  approve: async (id: string) => wp<{ customerId: string }>(`/requests/${id}/approve`, { method: "POST", userId: await actor() }),
  reject: async (id: string, note?: string) =>
    wp<{ ok: true }>(`/requests/${id}/reject`, { method: "POST", body: { note }, userId: await actor() }),
};

// ---- schedules ----------------------------------------------------------

export const schedules = {
  list: async () => (await wp<Record<string, unknown>[]>("/schedules", { userId: await actor() })).map(scheduleOf),
  create: async (data: { title: string; templateId: string; customerId: string; frequency: Frequency; startDate: string; active?: boolean }) =>
    scheduleOf(await wp<Record<string, unknown>>("/schedules", { method: "POST", body: data, userId: await actor() })),
  setActive: async (id: string, active: boolean) =>
    wp<unknown>(`/schedules/${id}`, { method: "PATCH", body: { active }, userId: await actor() }),
  remove: async (id: string) => wp<{ ok: true }>(`/schedules/${id}`, { method: "DELETE", userId: await actor() }),
};
