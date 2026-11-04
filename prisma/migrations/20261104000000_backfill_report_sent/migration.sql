-- Approved reports that were emailed or shared with the customer, and not sent back for correction afterwards.
UPDATE "Audit" a SET "reportSent" = true
WHERE a."reportSent" = false AND a."draft" = false AND a."pendingApproval" = false AND a."readyToSubmit" = false
  AND EXISTS (
    SELECT 1 FROM "AuditEvent" e
    WHERE e."auditId" = a."id"
      AND (e."message" LIKE 'Email sent to % with the report attached' OR e."message" = 'Public report link created')
      AND NOT EXISTS (
        SELECT 1 FROM "AuditEvent" c
        WHERE c."auditId" = a."id" AND c."createdAt" > e."createdAt"
          AND (c."message" LIKE 'Correction requested:%' OR c."message" = 'Sent back for correction')
      )
  );
