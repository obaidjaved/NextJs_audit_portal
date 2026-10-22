-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedAuditorId" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'None',
ADD COLUMN     "progressStatus" TEXT NOT NULL DEFAULT 'In progress',
ADD COLUMN     "projectValue" DOUBLE PRECISION,
ADD COLUMN     "serviceDate" DATE,
ADD COLUMN     "services" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "CustomerRequest" ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "budgetQuote" DOUBLE PRECISION,
ADD COLUMN     "leadStatus" TEXT NOT NULL DEFAULT 'New',
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'None';

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedAuditorId_fkey" FOREIGN KEY ("assignedAuditorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing leads that were already decided keep a matching lead status.
UPDATE "CustomerRequest" SET "leadStatus" = 'Converted' WHERE "status" = 'APPROVED';
UPDATE "CustomerRequest" SET "leadStatus" = 'Not Interested' WHERE "status" = 'REJECTED';

-- Existing customers that came from a lead inherit its services and due date.
UPDATE "Customer" c
SET "services" = r."services", "serviceDate" = r."dateNeeded"::date
FROM "CustomerRequest" r
WHERE r."customerId" = c."id";
