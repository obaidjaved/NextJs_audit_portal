import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/access";
import { dateOnlyStringUTC, parseDateOnlyUTC } from "@/lib/schedule";
import {
  RepoError,
  type Backend,
  type Category,
  type CustomerInput,
  type TemplateInput,
  type Audit,
  type AuditWriteInput,
  type AuditEvent,
  type CorrectiveAction,
  type ActionInput,
  type CustomerRequest,
  type Schedule,
  type Template,
} from "@/lib/repo-types";

// Postgres-backed implementation (direct via Prisma). Active when
// DATA_BACKEND is unset or "postgres". See repo.wordpress.ts for the
// alternative and repo.ts for the switch between them.

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

const users: Backend["users"] = {
  get: async (id) => {
    const u = await prisma.user.findUnique({ where: { id }, include: { _count: { select: { auditsInspected: true } } } });
    if (!u) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, auditCount: u._count.auditsInspected };
  },
  list: async () => {
    const rows = await prisma.user.findMany({ include: { _count: { select: { auditsInspected: true } } } });
    return rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, auditCount: u._count.auditsInspected }));
  },
  create: async (data) => {
    try {
      await prisma.user.create({ data: { name: data.name, email: data.email, role: data.role, passwordHash: await bcrypt.hash(data.password, 10) } });
    } catch (err) {
      if (isUniqueViolation(err, "email")) throw new RepoError(409, "duplicate_email", "A user with that email already exists.");
      throw err;
    }
  },
  patch: async (id, data) => {
    await prisma.user.update({
      where: { id },
      data: { role: data.role, active: data.active, passwordHash: data.password ? await bcrypt.hash(data.password, 10) : undefined },
    });
  },
};

const customers: Backend["customers"] = {
  list: () => prisma.customer.findMany({ orderBy: { name: "asc" } }),
  get: (id) => prisma.customer.findUnique({ where: { id } }),
  create: (data: CustomerInput) => prisma.customer.create({ data }),
  update: (id, data) => prisma.customer.update({ where: { id }, data }),
  remove: async (id) => {
    try {
      await prisma.customer.delete({ where: { id } });
    } catch (err) {
      if (isFkViolation(err)) throw new RepoError(409, "referenced", "This customer is still referenced by audits or schedules.");
      throw err;
    }
  },
};

const templates: Backend["templates"] = {
  list: () => prisma.template.findMany({ orderBy: { name: "asc" } }) as Promise<Template[]>,
  get: (id) => prisma.template.findUnique({ where: { id } }) as Promise<Template | null>,
  create: (data: TemplateInput) => prisma.template.create({ data: data as Prisma.TemplateCreateInput }) as Promise<Template>,
  update: (id, data: TemplateInput) => prisma.template.update({ where: { id }, data: data as Prisma.TemplateUpdateInput }) as Promise<Template>,
  remove: async (id) => {
    try {
      await prisma.template.delete({ where: { id } });
    } catch (err) {
      if (isFkViolation(err)) throw new RepoError(409, "referenced", "This template is still referenced by audits or schedules.");
      throw err;
    }
  },
};

const audits: Backend["audits"] = {
  list: async (opts = {}) => {
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
  get: async (id) => {
    const a = await prisma.audit.findUnique({ where: { id }, include: auditInclude });
    return a ? auditOf(a) : null;
  },
  getByToken: async (token) => {
    const a = await prisma.audit.findUnique({ where: { shareToken: token }, include: auditInclude });
    return a ? auditOf(a) : null;
  },
  create: async (data: AuditWriteInput) => {
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
  update: async (id, data) => {
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
  setShare: async (id, enabled) => {
    const shareToken = enabled ? randomBytes(18).toString("base64url") : null;
    const a = await prisma.audit.update({ where: { id }, data: { shareToken } });
    return { shareToken: a.shareToken };
  },
  remove: async (id) => {
    await prisma.audit.delete({ where: { id } });
  },
  events: async (id) => {
    const rows = await prisma.auditEvent.findMany({ where: { auditId: id }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 });
    return rows.map((e): AuditEvent => ({ id: e.id, auditId: e.auditId, userId: e.userId, userName: e.user?.name ?? null, message: e.message, createdAt: e.createdAt }));
  },
  addEvent: async (id, message) => {
    const userId = await actor().catch(() => undefined);
    await prisma.auditEvent.create({ data: { auditId: id, userId, message } });
  },
  // Race-safe per-category counter feeding docNumber generation (e.g. "EL-0417").
  nextDocSeq: async (category: Category) => {
    const seq = await prisma.docSequence.upsert({
      where: { category },
      create: { category, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    return seq.lastSeq;
  },
};

const actionInclude = { customer: { select: { name: true } }, audit: { select: { docNumber: true } }, assignee: { select: { id: true, name: true } } } as const;

const actions: Backend["actions"] = {
  list: async (opts = {}) => {
    const rows = await prisma.correctiveAction.findMany({
      where: { ...(opts.customerId ? { customerId: opts.customerId } : {}), ...(opts.auditId ? { auditId: opts.auditId } : {}) },
      include: actionInclude,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    });
    return rows.map(actionOf);
  },
  create: async (data: ActionInput) => {
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
  createMany: async (items: ActionInput[]) => {
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
  patch: async (id, data) => {
    const a = await prisma.correctiveAction.update({
      where: { id },
      data: { status: data.status, assigneeId: data.assigneeId, resolvedAt: data.status ? (data.status === "RESOLVED" ? new Date() : null) : undefined },
      include: actionInclude,
    });
    return actionOf(a);
  },
  remove: async (id) => {
    const a = await prisma.correctiveAction.delete({ where: { id } });
    return { auditId: a.auditId };
  },
};

const requests: Backend["requests"] = {
  list: async () => {
    const rows = await prisma.customerRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { reviewedBy: { select: { name: true } } } });
    return rows.map(requestOf);
  },
  pendingCount: () => prisma.customerRequest.count({ where: { status: "PENDING" } }),
  create: async (data) => {
    const r = await prisma.customerRequest.create({
      data: { ...data, dateNeeded: parseDateOnlyUTC(data.dateNeeded) },
      include: { reviewedBy: { select: { name: true } } },
    });
    return requestOf(r);
  },
  approve: async (id) => {
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
  reject: async (id, note) => {
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

const scheduleInclude = { template: { select: { name: true } }, customer: { select: { name: true } } } as const;

const schedules: Backend["schedules"] = {
  list: async () => {
    const rows = await prisma.schedule.findMany({ include: scheduleInclude, orderBy: { startDate: "asc" } });
    return rows.map(scheduleOf);
  },
  create: async (data) => {
    const s = await prisma.schedule.create({
      data: { title: data.title, templateId: data.templateId, customerId: data.customerId, frequency: data.frequency, active: data.active ?? true, startDate: parseDateOnlyUTC(data.startDate) },
      include: scheduleInclude,
    });
    return scheduleOf(s);
  },
  setActive: async (id, active) => {
    await prisma.schedule.update({ where: { id }, data: { active } });
  },
  remove: async (id) => {
    await prisma.schedule.delete({ where: { id } });
  },
};

const backend: Backend = { users, customers, templates, audits, actions, requests, schedules };
export default backend;
