import { getSession } from "@/lib/access";
import { wp } from "@/lib/wp/client";
import type {
  Backend,
  Category,
  User,
  Customer,
  Template,
  Audit,
  AuditWriteInput,
  AuditEvent,
  CorrectiveAction,
  ActionInput,
  CustomerRequest,
  Schedule,
} from "@/lib/repo-types";

// WordPress-backed implementation, talking to the `tap-ops` plugin's REST API
// (see wordpress/tap-ops/API.md). Active when DATA_BACKEND=wordpress.
// Timestamps come back as ISO strings over HTTP; Date objects are
// reconstructed here so the rest of the app never has to know the difference.

const toDate = (v: unknown) => new Date(v as string);
const toDateOrNull = (v: unknown) => (v ? new Date(v as string) : null);
const asArr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

async function actor(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("You must be signed in.");
  return session.user.id;
}

function customerOf(c: Record<string, unknown>): Customer {
  return { ...(c as unknown as Customer), createdAt: toDate(c.createdAt) };
}
function templateOf(t: Record<string, unknown>): Template {
  return { ...(t as unknown as Template), createdAt: toDate(t.createdAt), updatedAt: toDate(t.updatedAt) };
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

const users: Backend["users"] = {
  get: async (id) => {
    try {
      return await wp<User>(`/users/${id}`, { userId: id });
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },
  list: async () => wp<User[]>("/users", { userId: await actor() }),
  create: async (data) => {
    await wp("/users", { method: "POST", body: data, userId: await actor() });
  },
  patch: async (id, data) => {
    await wp(`/users/${id}`, { method: "PATCH", body: data, userId: await actor() });
  },
};

const customers: Backend["customers"] = {
  list: async () => (await wp<Record<string, unknown>[]>("/customers", { userId: await actor() })).map(customerOf),
  get: async (id) => {
    try {
      return customerOf(await wp<Record<string, unknown>>(`/customers/${id}`, { userId: await actor() }));
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },
  create: async (data) => customerOf(await wp<Record<string, unknown>>("/customers", { method: "POST", body: data, userId: await actor() })),
  update: async (id, data) => customerOf(await wp<Record<string, unknown>>(`/customers/${id}`, { method: "PATCH", body: data, userId: await actor() })),
  remove: async (id) => {
    await wp(`/customers/${id}`, { method: "DELETE", userId: await actor() });
  },
};

const templates: Backend["templates"] = {
  list: async () => (await wp<Record<string, unknown>[]>("/templates", { userId: await actor() })).map(templateOf),
  get: async (id) => {
    try {
      return templateOf(await wp<Record<string, unknown>>(`/templates/${id}`, { userId: await actor() }));
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },
  create: async (data) => templateOf(await wp<Record<string, unknown>>("/templates", { method: "POST", body: data, userId: await actor() })),
  update: async (id, data) => templateOf(await wp<Record<string, unknown>>(`/templates/${id}`, { method: "PATCH", body: data, userId: await actor() })),
  remove: async (id) => {
    await wp(`/templates/${id}`, { method: "DELETE", userId: await actor() });
  },
};

const audits: Backend["audits"] = {
  list: async (opts = {}) =>
    (
      await wp<Record<string, unknown>[]>("/audits", {
        userId: await actor(),
        query: { customerId: opts.customerId, q: opts.q, noResponses: opts.noResponses ? 1 : undefined },
      })
    ).map(auditOf),
  get: async (id) => {
    try {
      return auditOf(await wp<Record<string, unknown>>(`/audits/${id}`, { userId: await actor() }));
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },
  // Public share page: authorised by the unguessable token, no signed-in user.
  getByToken: async (token) => {
    try {
      return auditOf(await wp<Record<string, unknown>>(`/audits/by-token/${encodeURIComponent(token)}`));
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },
  create: async (data: AuditWriteInput) => auditOf(await wp<Record<string, unknown>>("/audits", { method: "POST", body: data, userId: await actor() })),
  update: async (id, data) => auditOf(await wp<Record<string, unknown>>(`/audits/${id}`, { method: "PATCH", body: data, userId: await actor() })),
  setShare: async (id, enabled) => wp<{ shareToken: string | null }>(`/audits/${id}/share`, { method: "PATCH", body: { enabled }, userId: await actor() }),
  remove: async (id) => {
    await wp(`/audits/${id}`, { method: "DELETE", userId: await actor() });
  },
  events: async (id) =>
    (await wp<Record<string, unknown>[]>(`/audits/${id}/events`, { userId: await actor() })).map(
      (e): AuditEvent => ({ ...(e as unknown as AuditEvent), createdAt: toDate(e.createdAt) }),
    ),
  addEvent: async (id, message) => {
    await wp(`/audits/${id}/events`, { method: "POST", body: { message }, userId: await actor() });
  },
  nextDocSeq: async (category: Category) => (await wp<{ seq: number }>("/doc-numbers", { method: "POST", body: { category }, userId: await actor() })).seq,
};

const actions: Backend["actions"] = {
  list: async (opts = {}) => (await wp<Record<string, unknown>[]>("/actions", { userId: await actor(), query: opts })).map(actionOf),
  create: async (data: ActionInput) => actionOf(await wp<Record<string, unknown>>("/actions", { method: "POST", body: data, userId: await actor() })),
  createMany: async (items) => wp<{ created: number }>("/actions/bulk", { method: "POST", body: { items }, userId: await actor() }),
  patch: async (id, data) => actionOf(await wp<Record<string, unknown>>(`/actions/${id}`, { method: "PATCH", body: data, userId: await actor() })),
  remove: async (id) => wp<{ auditId: string | null }>(`/actions/${id}`, { method: "DELETE", userId: await actor() }),
};

const requests: Backend["requests"] = {
  list: async () => (await wp<Record<string, unknown>[]>("/requests", { userId: await actor() })).map(requestOf),
  pendingCount: async () => (await wp<{ count: number }>("/requests/pending-count", { userId: await actor() })).count,
  // Public intake: no signed-in user, matching the API contract.
  create: async (data) => requestOf(await wp<Record<string, unknown>>("/requests", { method: "POST", body: data })),
  approve: async (id) => wp<{ customerId: string | null }>(`/requests/${id}/approve`, { method: "POST", userId: await actor() }),
  reject: async (id, note) => {
    await wp(`/requests/${id}/reject`, { method: "POST", body: { note }, userId: await actor() });
  },
};

const schedules: Backend["schedules"] = {
  list: async () => (await wp<Record<string, unknown>[]>("/schedules", { userId: await actor() })).map(scheduleOf),
  create: async (data) => scheduleOf(await wp<Record<string, unknown>>("/schedules", { method: "POST", body: data, userId: await actor() })),
  setActive: async (id, active) => {
    await wp(`/schedules/${id}`, { method: "PATCH", body: { active }, userId: await actor() });
  },
  remove: async (id) => {
    await wp(`/schedules/${id}`, { method: "DELETE", userId: await actor() });
  },
};

const backend: Backend = { users, customers, templates, audits, actions, requests, schedules };
export default backend;
