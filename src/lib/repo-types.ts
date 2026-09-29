// Shapes shared by both backend implementations (repo.postgres.ts and
// repo.wordpress.ts) so the rest of the app is written against one contract
// regardless of which one is active. See repo.ts for the switch.

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

export interface Backend {
  users: {
    get(id: string): Promise<User | null>;
    list(): Promise<User[]>;
    create(data: { name: string; email: string; password: string; role: AppRole }): Promise<void>;
    patch(id: string, data: { role?: AppRole; active?: boolean; password?: string }): Promise<void>;
  };
  customers: {
    list(): Promise<Customer[]>;
    get(id: string): Promise<Customer | null>;
    create(data: CustomerInput): Promise<Customer>;
    update(id: string, data: Partial<CustomerInput>): Promise<Customer>;
    remove(id: string): Promise<void>;
  };
  templates: {
    list(): Promise<Template[]>;
    get(id: string): Promise<Template | null>;
    create(data: TemplateInput): Promise<Template>;
    update(id: string, data: TemplateInput): Promise<Template>;
    remove(id: string): Promise<void>;
  };
  audits: {
    list(opts?: { customerId?: string; q?: string; noResponses?: boolean }): Promise<Audit[]>;
    get(id: string): Promise<Audit | null>;
    getByToken(token: string): Promise<Audit | null>;
    create(data: AuditWriteInput): Promise<Audit>;
    update(id: string, data: Partial<AuditWriteInput>): Promise<Audit>;
    setShare(id: string, enabled: boolean): Promise<{ shareToken: string | null }>;
    remove(id: string): Promise<void>;
    events(id: string): Promise<AuditEvent[]>;
    addEvent(id: string, message: string): Promise<void>;
    nextDocSeq(category: Category): Promise<number>;
  };
  actions: {
    list(opts?: { customerId?: string; auditId?: string }): Promise<CorrectiveAction[]>;
    create(data: ActionInput): Promise<CorrectiveAction>;
    createMany(items: ActionInput[]): Promise<{ created: number }>;
    patch(id: string, data: { status?: ActionStatus; assigneeId?: string | null }): Promise<CorrectiveAction>;
    remove(id: string): Promise<{ auditId: string | null }>;
  };
  requests: {
    list(): Promise<CustomerRequest[]>;
    pendingCount(): Promise<number>;
    create(data: RequestInput): Promise<CustomerRequest>;
    approve(id: string): Promise<{ customerId: string | null }>;
    reject(id: string, note?: string): Promise<void>;
  };
  schedules: {
    list(): Promise<Schedule[]>;
    create(data: { title: string; templateId: string; customerId: string; frequency: Frequency; startDate: string; active?: boolean }): Promise<Schedule>;
    setActive(id: string, active: boolean): Promise<void>;
    remove(id: string): Promise<void>;
  };
}
