import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/access";
import { dateOnlyStringUTC, parseDateOnlyUTC } from "@/lib/schedule";

// Data access for the whole app, backed directly by Postgres via Prisma.
// Kept as one typed module (rather than importing `prisma` everywhere) so every
// caller goes through the same shapes, and so this file is the one place that
// would need to change if the backend ever moved again.

export class RepoError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "RepoError";
  }
}

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
  customer: Customer;
  template: Template;
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
}
export interface RequestInput {
  firstName: string;
  lastName: string;
  companyName: string;
  title?: string | null;
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  services: string[];
  trainings: string[];
  dateNeeded: string;
  additionalInfo?: string;
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

// ---- helpers --------------------------------------------------------------

async function actor(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("You must be signed in.");
  return session.user.id;
}

function isUniqueViolation(err: unknown, target?: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && (!target || (err.meta?.target as string[] | undefined)?.includes(target) === true);
}

function isFkViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003";
}

const auditInclude = { customer: true, template: true, inspector: { select: { id: true, name: true } } } as const;

function auditOf(a: Prisma.AuditGetPayload<{ include: typeof auditInclude }>): Audit {
  return { ...a, customer: a.customer, template: a.template as unknown as Template, inspector: a.inspector };
}

function actionOf(a: Prisma.CorrectiveActionGetPayload<{ include: { customer: { select: { name: true } }; audit: { select: { docNumber: true } }; assignee: { select: { id: true; name: true } } } }>): CorrectiveAction {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    priority: a.priority,
    status: a.status,
    dueDate: a.dueDate ? dateOnlyStringUTC(a.dueDate) : null,
    findingLabel: a.findingLabel,
    auditId: a.auditId,
    customerId: a.customerId,
    assigneeId: a.assigneeId,
    createdById: a.createdById,
    resolvedAt: a.resolvedAt,
    createdAt: a.createdAt,
    customerName: a.customer.name,
    auditDoc: a.audit?.docNumber ?? null,
    assigneeName: a.assignee?.name ?? null,
  };
}

function requestOf(r: Prisma.CustomerRequestGetPayload<{ include: { reviewedBy: { select: { name: true } } } }>): CustomerRequest {
  return {
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    companyName: r.companyName,
    title: r.title,
    street: r.street,
    street2: r.street2,
    city: r.city,
    state: r.state,
    zip: r.zip,
    phone: r.phone,
    email: r.email,
    services: Array.isArray(r.services) ? (r.services as string[]) : [],
    trainings: Array.isArray(r.trainings) ? (r.trainings as string[]) : [],
    dateNeeded: dateOnlyStringUTC(r.dateNeeded),
    additionalInfo: r.additionalInfo,
    status: r.status,
    reviewedById: r.reviewedById,
    reviewedByName: r.reviewedBy?.name ?? null,
    reviewedAt: r.reviewedAt,
    reviewNote: r.reviewNote,
    customerId: r.customerId,
    createdAt: r.createdAt,
  };
}

function scheduleOf(s: Prisma.ScheduleGetPayload<{ include: { template: { select: { name: true } }; customer: { select: { name: true } } } }>): Schedule {
  return {
    id: s.id,
    title: s.title,
    templateId: s.templateId,
    customerId: s.customerId,
    frequency: s.frequency,
    startDate: dateOnlyStringUTC(s.startDate),
    active: s.active,
    createdAt: s.createdAt,
    templateName: s.template.name,
    customerName: s.customer.name,
  };
}

// ---- users ------------------------------------------------------------------

export const users = {
  // Used only by auth.ts.
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  get: async (id: string): Promise<User | null> => {
    const u = await prisma.user.findUnique({ where: { id }, include: { _count: { select: { auditsInspected: true } } } });
    if (!u) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, auditCount: u._count.auditsInspected };
  },
  list: async (): Promise<User[]> => {
    const rows = await prisma.user.findMany({ include: { _count: { select: { auditsInspected: true } } } });
    return rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, auditCount: u._count.auditsInspected }));
  },
  create: async (data: { name: string; email: string; password: string; role: AppRole }) => {
    try {
      await prisma.user.create({ data: { name: data.name, email: data.email, role: data.role, passwordHash: await bcrypt.hash(data.password, 10) } });
    } catch (err) {
      if (isUniqueViolation(err, "email")) throw new RepoError(409, "duplicate_email", "A user with that email already exists.");
      throw err;
    }
  },
  patch: async (id: string, data: { role?: AppRole; active?: boolean; password?: string }) => {
    await prisma.user.update({
      where: { id },
      data: { role: data.role, active: data.active, passwordHash: data.password ? await bcrypt.hash(data.password, 10) : undefined },
    });
  },
};

// ---- customers ----------------------------------------------------------

export const customers = {
  list: () => prisma.customer.findMany({ orderBy: { name: "asc" } }),
  get: (id: string) => prisma.customer.findUnique({ where: { id } }),
  create: (data: CustomerInput) => prisma.customer.create({ data }),
  update: (id: string, data: Partial<CustomerInput>) => prisma.customer.update({ where: { id }, data }),
  remove: async (id: string) => {
    try {
      await prisma.customer.delete({ where: { id } });
    } catch (err) {
      if (isFkViolation(err)) throw new RepoError(409, "referenced", "This customer is still referenced by audits or schedules.");
      throw err;
    }
  },
};

// ---- templates ------------------------------------------------------------

export const templates = {
  list: () => prisma.template.findMany({ orderBy: { name: "asc" } }) as Promise<Template[]>,
  get: (id: string) => prisma.template.findUnique({ where: { id } }) as Promise<Template | null>,
  create: (data: TemplateInput) => prisma.template.create({ data: data as Prisma.TemplateCreateInput }) as Promise<Template>,
  update: (id: string, data: TemplateInput) => prisma.template.update({ where: { id }, data: data as Prisma.TemplateUpdateInput }) as Promise<Template>,
  remove: async (id: string) => {
    try {
      await prisma.template.delete({ where: { id } });
    } catch (err) {
      if (isFkViolation(err)) throw new RepoError(409, "referenced", "This template is still referenced by audits or schedules.");
      throw err;
    }
  },
};

// ---- audits -------------------------------------------------------------

export const audits = {
  list: async (opts: { customerId?: string; q?: string; noResponses?: boolean } = {}): Promise<Audit[]> => {
    const rows = await prisma.audit.findMany({
      where: {
        ...(opts.customerId ? { customerId: opts.customerId } : {}),
        ...(opts.q
          ? {
              OR: [
                { title: { contains: opts.q, mode: "insensitive" } },
                { docNumber: { contains: opts.q, mode: "insensitive" } },
                { customer: { name: { contains: opts.q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: auditInclude,
      orderBy: { date: "desc" },
    });
    return rows.map((a) => {
      const audit = auditOf(a);
      if (opts.noResponses) return { ...audit, responses: undefined, notes: "", photos: [], signature: null };
      return audit;
    });
  },
  get: async (id: string): Promise<Audit | null> => {
    const a = await prisma.audit.findUnique({ where: { id }, include: auditInclude });
    return a ? auditOf(a) : null;
  },
  getByToken: async (token: string): Promise<Audit | null> => {
    const a = await prisma.audit.findUnique({ where: { shareToken: token }, include: auditInclude });
    return a ? auditOf(a) : null;
  },
  create: async (data: AuditWriteInput): Promise<Audit> => {
    const inspectorId = await actor().catch(() => undefined);
    try {
      const a = await prisma.audit.create({
        data: {
          docNumber: data.docNumber,
          templateId: data.templateId,
          customerId: data.customerId,
          inspectorId,
          title: data.title,
          score: data.score,
          criticalFail: data.criticalFail,
          draft: data.draft,
          pendingApproval: data.pendingApproval,
          responses: data.responses as Prisma.InputJsonValue,
          notes: data.notes,
          photos: data.photos as Prisma.InputJsonValue,
          signature: data.signature,
        },
        include: auditInclude,
      });
      return auditOf(a);
    } catch (err) {
      if (isUniqueViolation(err, "docNumber")) throw new RepoError(409, "duplicate_doc_number", "That document number is already in use.");
      throw err;
    }
  },
  update: async (id: string, data: Partial<AuditWriteInput>): Promise<Audit> => {
    const a = await prisma.audit.update({
      where: { id },
      data: {
        responses: data.responses as Prisma.InputJsonValue | undefined,
        notes: data.notes,
        photos: data.photos as Prisma.InputJsonValue | undefined,
        signature: data.signature,
        draft: data.draft,
        score: data.score,
        criticalFail: data.criticalFail,
        pendingApproval: data.pendingApproval,
      },
      include: auditInclude,
    });
    return auditOf(a);
  },
  setShare: async (id: string, enabled: boolean): Promise<{ shareToken: string | null }> => {
    const shareToken = enabled ? randomBytes(18).toString("base64url") : null;
    const a = await prisma.audit.update({ where: { id }, data: { shareToken } });
    return { shareToken: a.shareToken };
  },
  remove: (id: string) => prisma.audit.delete({ where: { id } }),
  events: async (id: string): Promise<AuditEvent[]> => {
    const rows = await prisma.auditEvent.findMany({ where: { auditId: id }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 });
    return rows.map((e) => ({ id: e.id, auditId: e.auditId, userId: e.userId, userName: e.user?.name ?? null, message: e.message, createdAt: e.createdAt }));
  },
  addEvent: async (id: string, message: string) => {
    const userId = await actor().catch(() => undefined);
    await prisma.auditEvent.create({ data: { auditId: id, userId, message } });
  },
  // Race-safe per-category counter feeding docNumber generation (e.g. "EL-0417").
  nextDocSeq: async (category: Category): Promise<number> => {
    const seq = await prisma.docSequence.upsert({
      where: { category },
      create: { category, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    return seq.lastSeq;
  },
};

// ---- corrective actions ----------------------------------------------------

const actionInclude = { customer: { select: { name: true } }, audit: { select: { docNumber: true } }, assignee: { select: { id: true, name: true } } } as const;

export const actions = {
  list: async (opts: { customerId?: string; auditId?: string } = {}): Promise<CorrectiveAction[]> => {
    const rows = await prisma.correctiveAction.findMany({
      where: { ...(opts.customerId ? { customerId: opts.customerId } : {}), ...(opts.auditId ? { auditId: opts.auditId } : {}) },
      include: actionInclude,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    });
    return rows.map(actionOf);
  },
  create: async (data: ActionInput): Promise<CorrectiveAction> => {
    const createdById = await actor().catch(() => undefined);
    const a = await prisma.correctiveAction.create({
      data: {
        title: data.title,
        description: data.description ?? "",
        priority: data.priority ?? "MEDIUM",
        dueDate: data.dueDate ? parseDateOnlyUTC(data.dueDate) : null,
        findingLabel: data.findingLabel ?? null,
        auditId: data.auditId ?? null,
        customerId: data.customerId,
        assigneeId: data.assigneeId ?? null,
        createdById,
      },
      include: actionInclude,
    });
    return actionOf(a);
  },
  createMany: async (items: ActionInput[]): Promise<{ created: number }> => {
    const createdById = await actor().catch(() => undefined);
    const res = await prisma.correctiveAction.createMany({
      data: items.map((f) => ({
        title: f.title,
        description: f.description ?? "",
        priority: f.priority ?? "MEDIUM",
        dueDate: f.dueDate ? parseDateOnlyUTC(f.dueDate) : null,
        findingLabel: f.findingLabel ?? null,
        auditId: f.auditId ?? null,
        customerId: f.customerId,
        createdById,
      })),
    });
    return { created: res.count };
  },
  patch: async (id: string, data: { status?: ActionStatus; assigneeId?: string | null }): Promise<CorrectiveAction> => {
    const a = await prisma.correctiveAction.update({
      where: { id },
      data: { status: data.status, assigneeId: data.assigneeId, resolvedAt: data.status ? (data.status === "RESOLVED" ? new Date() : null) : undefined },
      include: actionInclude,
    });
    return actionOf(a);
  },
  remove: async (id: string): Promise<{ auditId: string | null }> => {
    const a = await prisma.correctiveAction.delete({ where: { id } });
    return { auditId: a.auditId };
  },
};

// ---- customer requests --------------------------------------------------

export const requests = {
  list: async (): Promise<CustomerRequest[]> => {
    const rows = await prisma.customerRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { reviewedBy: { select: { name: true } } } });
    return rows.map(requestOf);
  },
  pendingCount: () => prisma.customerRequest.count({ where: { status: "PENDING" } }),
  create: async (data: RequestInput): Promise<CustomerRequest> => {
    const r = await prisma.customerRequest.create({
      data: { ...data, dateNeeded: parseDateOnlyUTC(data.dateNeeded) },
      include: { reviewedBy: { select: { name: true } } },
    });
    return requestOf(r);
  },
  approve: async (id: string): Promise<{ customerId: string | null }> => {
    const reviewerId = await actor();
    const req = await prisma.customerRequest.findUnique({ where: { id } });
    if (!req) throw new RepoError(404, "not_found", "This request no longer exists.");
    if (req.status !== "PENDING") throw new RepoError(409, "already_reviewed", "This request was already reviewed.");
    const updated = await prisma.customerRequest.update({
      where: { id, status: "PENDING" },
      data: {
        status: "APPROVED",
        reviewedBy: { connect: { id: reviewerId } },
        reviewedAt: new Date(),
        customer: {
          create: {
            name: req.companyName,
            site: [req.street, req.street2].filter(Boolean).join(", "),
            city: req.city,
            state: req.state,
            zip: req.zip,
            contact: [`${req.firstName} ${req.lastName}`, req.title].filter(Boolean).join(", "),
            email: req.email,
            phone: req.phone,
          },
        },
      },
    });
    return { customerId: updated.customerId };
  },
  reject: async (id: string, note?: string) => {
    const reviewerId = await actor();
    try {
      await prisma.customerRequest.update({
        where: { id, status: "PENDING" },
        data: { status: "REJECTED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: note?.trim().slice(0, 500) || null },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        throw new RepoError(409, "already_reviewed", "This request was already reviewed or no longer exists.");
      }
      throw err;
    }
  },
};

// ---- schedules ------------------------------------------------------------

const scheduleInclude = { template: { select: { name: true } }, customer: { select: { name: true } } } as const;

export const schedules = {
  list: async (): Promise<Schedule[]> => {
    const rows = await prisma.schedule.findMany({ include: scheduleInclude, orderBy: { startDate: "asc" } });
    return rows.map(scheduleOf);
  },
  create: async (data: { title: string; templateId: string; customerId: string; frequency: Frequency; startDate: string; active?: boolean }): Promise<Schedule> => {
    const s = await prisma.schedule.create({
      data: { title: data.title, templateId: data.templateId, customerId: data.customerId, frequency: data.frequency, active: data.active ?? true, startDate: parseDateOnlyUTC(data.startDate) },
      include: scheduleInclude,
    });
    return scheduleOf(s);
  },
  setActive: (id: string, active: boolean) => prisma.schedule.update({ where: { id }, data: { active } }),
  remove: (id: string) => prisma.schedule.delete({ where: { id } }),
};
