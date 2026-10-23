-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "paymentProofs" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "CustomerRequest" ADD COLUMN     "paymentProofs" JSONB NOT NULL DEFAULT '[]';
