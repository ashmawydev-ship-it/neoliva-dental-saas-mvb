-- 1. Add commission_rate to staff
ALTER TABLE "staff" ADD COLUMN "commission_rate" DECIMAL(5,2) DEFAULT 0;

-- 2. Add doctor_id to invoices
ALTER TABLE "invoices" ADD COLUMN "doctor_id" UUID REFERENCES "staff"("id");

-- 3. Create doctor_commissions table
CREATE TABLE "doctor_commissions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
    "invoice_id" UUID REFERENCES "invoices"("id") ON DELETE SET NULL,
    "payment_id" UUID,
    "invoice_amount" DECIMAL(10,2) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ,
    "paid_via_expense_id" UUID,
    "journal_entry_id" UUID REFERENCES "journal_entries"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_doctor_commissions_tenant_doctor ON doctor_commissions(tenant_id, doctor_id);
CREATE INDEX idx_doctor_commissions_tenant_status ON doctor_commissions(tenant_id, status);

-- Enable RLS
ALTER TABLE doctor_commissions ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Tenant isolation for doctor_commissions" ON doctor_commissions
    FOR ALL TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- 4. Insert system LedgerAccounts for Doctor Commissions (will apply for all existing tenants)
INSERT INTO "ledger_accounts" ("id", "tenant_id", "name", "type", "is_system", "created_at", "updated_at")
SELECT 
    gen_random_uuid(), 
    id as tenant_id, 
    'عمولات الدكاترة', 
    'EXPENSE', 
    true, 
    now(), 
    now()
FROM "tenants"
ON CONFLICT ("tenant_id", "name") DO NOTHING;

INSERT INTO "ledger_accounts" ("id", "tenant_id", "name", "type", "is_system", "created_at", "updated_at")
SELECT 
    gen_random_uuid(), 
    id as tenant_id, 
    'مستحقات الدكاترة', 
    'LIABILITY', 
    true, 
    now(), 
    now()
FROM "tenants"
ON CONFLICT ("tenant_id", "name") DO NOTHING;
