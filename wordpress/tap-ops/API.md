# TAP Ops REST API contract (`/wp-json/tap/v1`)

Single source of truth shared by the WordPress plugin (PHP) and the Next.js client (`src/lib/wp`).
All JSON is **camelCase**. IDs are **strings** (DB auto-increment ints cast to string).

## Auth (server-to-server)

Every request (except none) must send:

- `X-TAP-Key: <secret>` — must `hash_equals` the PHP constant `TAP_API_KEY` (defined in wp-config.php). If the
  constant is missing/empty every endpoint returns `503 {code:"not_configured"}`. Wrong key -> `401 {code:"bad_key"}`.
- `X-TAP-User: <wp user id>` — the acting user. Required on every endpoint **except** `POST /auth/login`,
  `POST /requests` (public intake webhook) and `POST /dev/seed`. The user must exist, be `active`, and have role
  `tap_admin`, `tap_inspector` or WP `administrator`; else `403 {code:"forbidden"}`.
- "Admin" = role `tap_admin` OR WP `administrator`. "Staff" = admin or `tap_inspector`.
  Endpoints marked **(admin)** require admin, others require staff.

Errors: HTTP status + `{ "code": string, "message": string }`. Use 404 not found, 409 conflict/referenced,
422 validation, 403 forbidden, 401 bad credentials/key.

## Storage

Custom tables (`$wpdb->prefix . 'tap_'`): customers, templates, audits, schedules, actions, events, requests,
doc_sequences. Create with `dbDelta` on activation and when a stored `tap_ops_db_version` option is behind.
JSON columns (template fields, audit responses/photos, request services/trainings) are LONGTEXT holding JSON.
Dates: `createdAt/updatedAt/date/resolvedAt/reviewedAt` are ISO-8601 UTC strings (`2026-09-24T10:49:00.000Z`).
`dueDate`, `startDate`, `dateNeeded` are date-only strings `YYYY-MM-DD` (never timestamps).

## Users (WP users)

User: `{ id, name, email, role: "ADMIN"|"INSPECTOR", active: bool, auditCount: int }`
(`role` = ADMIN for tap_admin/administrator, else INSPECTOR; `active` from user meta `tap_active`, default true;
`auditCount` = audits with that inspector_id.)

- `POST /auth/login` `{email, password}` -> `{id,name,email,role}`. Accept email or username. 401 if bad credentials,
  inactive, or user has no tap role. Add a small throttle (e.g. 10 failed attempts / 15 min per email via transient -> 429).
- `GET /users/{id}` -> User (used to re-validate sessions).
- `GET /users` -> `User[]`.
- `POST /users` (admin) `{name,email,password(min 8),role:"ADMIN"|"INSPECTOR"}` -> User. 409 if email exists.
- `PATCH /users/{id}` (admin) any of `{role, active, password}` -> User. Reject changing/deactivating yourself (422).

## Customers

Customer: `{ id, name, site, city, state, zip, contact, email, phone, createdAt }` (strings or null).

- `GET /customers` -> `Customer[]` ordered by name asc. `GET /customers/{id}` -> Customer.
- `POST /customers` `{name (required), site?, city?, state?, zip?, contact?, email?, phone?}` -> Customer.
- `PATCH /customers/{id}` same fields (partial) -> Customer.
- `DELETE /customers/{id}` -> `{ok:true}`; 409 `{code:"referenced"}` if audits/schedules/actions reference it.

## Templates

Template: `{ id, name, category: "ELECTRICAL"|"PLUMBING"|"HVAC"|"SAFETY"|"GENERAL", fields: any[],
approvalRequired: bool, reportStyle: "MODERN"|"CLASSIC", reportAccentColor: string|null, reportLogo: string|null,
createdAt, updatedAt }`

- `GET /templates` -> `Template[]` ordered by name; `GET /templates/{id}`.
- `POST /templates` / `PATCH /templates/{id}` (body = the Template fields except id/timestamps) -> Template.
- `DELETE /templates/{id}` -> `{ok:true}`; 409 `{code:"referenced"}` if audits/schedules use it.

## Audits

Audit (full): `{ id, docNumber, templateId, customerId, inspectorId: string|null, title, score: int|null,
criticalFail: bool, draft: bool, pendingApproval: bool, date, responses: any[], notes: string, photos: any[],
signature: string|null, shareToken: string|null, createdAt, updatedAt,
customer: {id,name,site,city,state,zip,contact,email,phone},
template: {id,name,category,fields,approvalRequired,reportStyle,reportAccentColor,reportLogo},
inspector: {id,name}|null }`

- `GET /audits?customerId=&q=&noResponses=1` -> list of Audit **without** `photos` and `signature`
  (and without `responses`/`notes` when `noResponses=1`), ordered by date desc. `q` matches title, docNumber or
  customer name (case-insensitive contains). `customer`, `template`, `inspector` included (template WITHOUT `fields`).
- `GET /audits/{id}` -> full Audit (template WITH fields).
- `GET /audits/by-token/{token}` -> full Audit, 404 if no such token. (Still needs key; staff user NOT required —
  this is the one endpoint besides login/requests that ignores `X-TAP-User`, used for the public share page.)
- `POST /audits` body: `{docNumber, templateId, customerId, title, score, criticalFail, draft, pendingApproval,
  date?, responses, notes, photos, signature}` (inspector = acting user) -> full Audit. 409 `{code:"duplicate_doc_number"}`
  if docNumber exists (unique index); 422 if template/customer missing.
- `PATCH /audits/{id}` partial of `{score, criticalFail, draft, pendingApproval, responses, notes, photos, signature}` -> full Audit.
- `PATCH /audits/{id}/share` `{enabled: bool}` -> `{shareToken: string|null}` (generates 24-char url-safe random token when enabled; null clears).
- `DELETE /audits/{id}` (admin) -> `{ok:true}`; also deletes its events and actions.
- `GET /audits/{id}/events` -> `Event[]` newest first, max 30. `POST /audits/{id}/events` `{message}` -> Event.
  Event: `{ id, auditId, userId: string|null, userName: string|null, message, createdAt }`.

## Doc numbers

- `POST /doc-numbers` `{category}` -> `{ seq: int }`: atomically increments and returns the next sequence for that
  template category (create row at 1 if missing). Next formats `EL-0001`.

## Corrective actions

Action: `{ id, title, description, priority: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", status: "OPEN"|"IN_PROGRESS"|"RESOLVED",
dueDate: "YYYY-MM-DD"|null, findingLabel: string|null, auditId: string|null, customerId, assigneeId: string|null,
createdById: string|null, resolvedAt: iso|null, createdAt, customerName, auditDoc: string|null, assigneeName: string|null }`

- `GET /actions?customerId=&auditId=` -> `Action[]` ordered by dueDate asc (nulls last) then createdAt desc.
- `POST /actions` `{title, description?, priority?, dueDate?, findingLabel?, auditId?, customerId, assigneeId?}`
  (createdBy = acting user) -> Action. `POST /actions/bulk` `{items: [...same...]}` -> `{created: int}`.
- `PATCH /actions/{id}` partial `{status, assigneeId, ...}`; setting status RESOLVED sets resolvedAt=now, otherwise clears it -> Action.
- `DELETE /actions/{id}` -> `{ok:true}`.

## Customer requests (new-customer intake)

Request: `{ id, firstName, lastName, companyName, title, street, street2, city, state, zip, phone, email,
services: string[], trainings: string[], dateNeeded: "YYYY-MM-DD", additionalInfo, status: "PENDING"|"APPROVED"|"REJECTED",
reviewedById, reviewedByName, reviewedAt, reviewNote, customerId, createdAt, source: string }`

- `GET /requests` -> `Request[]` newest first (max 200). `GET /requests/pending-count` -> `{count:int}`.
- `POST /requests` — **public intake**, requires the key but NOT a user. Same fields as Request (required: firstName,
  lastName, companyName, street, city, state, zip, phone, email). -> Request. Used by webhooks / non-GF sources.
- `POST /requests/{id}/approve` (admin) -> `{customerId}`; only while PENDING (else 409 `{code:"already_reviewed"}`);
  creates the customer (name=companyName, site="street, street2", city, state, zip, contact="First Last, Title",
  email, phone), sets status APPROVED, reviewedBy/At, customerId.
- `POST /requests/{id}/reject` (admin) `{note?}` -> `{ok:true}`; only while PENDING.

### Gravity Forms intake

`add_action('gform_after_submission', fn($entry,$form))` creates a PENDING request (`source` = `gravityforms:<form id>`)
for the quote form: form id from constant `TAP_QUOTE_FORM_ID`, else any form whose title contains "quote" (case-insens.).
Map fields by **label** (case-insensitive contains): First Name, Last Name (also a single Name field: input .3=first,
.6=last), Company Name, Title, Street Address, Address Line 2, City, State, ZIP, Phone, Email, Date Needed,
Additional Info; an Address-type field maps street(.1) line2(.2) city(.3) state(.4) zip(.5). Checkbox fields: selected
choice labels go to `trainings` if the field label contains "training", else `services`. Expose
`apply_filters('tap_gf_map_entry', $mapped, $entry, $form)`. Date Needed accepts m/d/Y, Y-m-d, d/m/Y -> normalise to Y-m-d.
Missing required values -> still store what exists using empty string / today's date (never lose a lead).

## Schedules

Schedule: `{ id, title, templateId, customerId, frequency: "WEEKLY"|"BIWEEKLY"|"MONTHLY"|"QUARTERLY",
startDate: "YYYY-MM-DD", active: bool, createdAt, templateName, customerName }`

- `GET /schedules` (ordered by startDate asc), `POST /schedules`, `PATCH /schedules/{id}` (`{active}`), `DELETE /schedules/{id}`.

## Dev seed

`POST /dev/seed` — only when constant `TAP_ALLOW_DEV_SEED` is true; needs the key, no user. Idempotent. Creates:
WP users admin@tapsvs.com "TAP Admin" (tap_admin) and inspector@tapsvs.com "Travis Perry" (tap_inspector), both password
`changeme123`; customers Riverside Medical Plaza (Building B, Austin TX), Northgate Data Center, Lakeside Cold Storage;
template "Panel & Breaker Inspection" (ELECTRICAL; fields: {id:"f1",label:"Panel cover intact",type:"status",required:true},
{id:"f2",label:"Breaker condition",type:"choice",required:true,presetKey:"good-fair-poor",options:[{label:"Good",score:100,fail:false},
{label:"Fair",score:60,fail:false},{label:"Poor",score:0,fail:true}]}, {id:"f3",label:"Photo evidence",type:"photo",required:false},
{id:"f4",label:"Additional notes",type:"text",required:false}); and a handful of finished audits (with responses matching
those fields, scores 30-100, dates spread over the last year, doc numbers EL-0001..) plus a few corrective actions.
Returns `{ok:true}`.
