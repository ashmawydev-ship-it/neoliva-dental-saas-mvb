import "server-only";
import { DoctorCommissionRepository } from "@/repositories/doctor-commission.repository";
import { TreasuryService } from "./treasury.service";
import { ExpenseRepository } from "@/repositories/expense.repository";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

// System ledger account names for doctor commissions
const COMMISSION_ACCOUNTS = {
  EXPENSE: "عمولات الدكاترة",
  LIABILITY: "مستحقات الدكاترة",
};

export class DoctorCommissionService {
  static instance?: DoctorCommissionService;

  constructor(
    private readonly commissionRepository = new DoctorCommissionRepository(),
    private readonly treasuryService = TreasuryService.instance || new TreasuryService(),
    private readonly expenseRepository = new ExpenseRepository()
  ) {}

  /**
   * Calculate and record commission when a payment is made on an invoice.
   * Called automatically after a payment is recorded in BillingService.
   *
   * Flow:
   * 1. Get invoice with doctorId
   * 2. Get doctor with commissionRate
   * 3. If commissionRate > 0:
   *    a. commissionAmount = paidAmount × rate / 100
   *    b. JournalEntry:
   *       DR: "عمولات الدكاترة" (EXPENSE)
   *       CR: "مستحقات الدكاترة" (LIABILITY)
   *    c. Create DoctorCommission record
   */
  async calculateOnPayment(
    tenantId: string,
    invoiceId: string,
    paidAmount: number | Prisma.Decimal
  ) {
    try {
      const amount = (+(paidAmount));
      if (!amount || amount <= 0) return;

      // 1. Get invoice to find doctorId
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        select: { id: true, doctorId: true, totalAmount: true, displayId: true },
      });

      if (!invoice?.doctorId) return; // No doctor assigned → skip

      // 2. Get doctor's commission rate
      const doctor = await prisma.staff.findFirst({
        where: { id: invoice.doctorId, tenantId },
        select: { id: true, name: true, commissionRate: true },
      });

      if (!doctor) return;

      const rate = (+(doctor.commissionRate || 0));
      if (rate <= 0) return; // No commission rate → skip

      // 3. Calculate
      const commissionAmount = (amount * rate) / 100;
      if (commissionAmount <= 0) return;

      // 4. Create journal entry + commission record in a transaction
      await prisma.$transaction(async (tx) => {
        // 4a. Journal Entry: DR Expense, CR Liability
        const journalEntry = await this.treasuryService.createJournalEntry(
          tenantId,
          {
            reference: invoice.id,
            description: `عمولة د.${doctor.name} على فاتورة ${invoice.displayId || invoice.id} — ${commissionAmount.toFixed(2)}`,
            lines: [
              {
                accountName: COMMISSION_ACCOUNTS.EXPENSE,
                debit: commissionAmount,
                credit: 0,
              },
              {
                accountName: COMMISSION_ACCOUNTS.LIABILITY,
                debit: 0,
                credit: commissionAmount,
              },
            ],
          },
          tx
        );

        // 4b. Create commission record
        await this.commissionRepository.create(
          {
            tenantId,
            doctorId: doctor.id,
            invoiceId: invoice.id,
            invoiceAmount: amount,
            commissionRate: rate,
            commissionAmount,
            journalEntryId: journalEntry.id,
            status: "pending",
          },
          tx
        );
      });
    } catch (error) {
      // Commission calculation should not break the payment flow
      console.error("[DoctorCommissionService] calculateOnPayment failed:", error);
    }
  }

  /**
   * Pay outstanding commissions to a doctor.
   *
   * Flow:
   * 1. Sum pending commission amounts
   * 2. Create Expense record (category: "Doctor Commission")
   * 3. JournalEntry:
   *    DR: "مستحقات الدكاترة" (LIABILITY) — reduce liability
   *    CR: "Cash" (ASSET) — cash going out
   * 4. Mark DoctorCommission records as paid
   */
  async payCommissions(
    tenantId: string,
    doctorId: string,
    commissionIds: string[]
  ) {
    if (!commissionIds.length) throw new Error("No commission IDs provided");

    // 1. Get commission records and total
    const records = await this.commissionRepository.findByIds(tenantId, commissionIds);
    const pendingRecords = records.filter((r) => r.status === "pending");

    if (!pendingRecords.length) {
      throw new Error("No pending commissions found for the provided IDs");
    }

    const totalAmount = pendingRecords.reduce(
      (sum, r) => sum + (+(r.commissionAmount)),
      0
    );

    // Get doctor name for display
    const doctor = await prisma.staff.findFirst({
      where: { id: doctorId, tenantId },
      select: { name: true },
    });

    return prisma.$transaction(async (tx) => {
      // 2. Create expense record
      const expense = await this.expenseRepository.create(tenantId, {
        title: `عمولة د.${doctor?.name || "Unknown"}`,
        amount: new Prisma.Decimal(totalAmount),
        category: "Doctor Commission",
        date: new Date(),
        status: "PAID",
        description: `دفع عمولات ${pendingRecords.length} فاتورة`,
        method: "CASH",
      });

      // 3. Journal Entry: DR Liability, CR Cash
      await this.treasuryService.createJournalEntry(
        tenantId,
        {
          reference: expense.id,
          description: `دفع عمولة د.${doctor?.name || "Unknown"} — ${totalAmount.toFixed(2)}`,
          lines: [
            {
              accountName: COMMISSION_ACCOUNTS.LIABILITY,
              debit: totalAmount,
              credit: 0,
            },
            {
              accountName: TreasuryService.SYSTEM_ACCOUNTS.CASH,
              debit: 0,
              credit: totalAmount,
            },
          ],
        },
        tx
      );

      // 4. Mark as paid
      await this.commissionRepository.markAsPaid(
        tenantId,
        pendingRecords.map((r) => r.id),
        expense.id,
        tx
      );

      return {
        expenseId: expense.id,
        paidAmount: totalAmount,
        paidCount: pendingRecords.length,
      };
    });
  }

  /**
   * Get commission summary for a single doctor
   */
  async getDoctorCommissionSummary(tenantId: string, doctorId: string) {
    try {
      const [summary, commissions, doctor] = await Promise.all([
        this.commissionRepository.getSummary(tenantId, doctorId),
        this.commissionRepository.findByDoctor(tenantId, doctorId),
        prisma.staff.findFirst({
          where: { id: doctorId, tenantId },
          select: { id: true, name: true, commissionRate: true },
        }),
      ]);

      return JSON.parse(
        JSON.stringify({
          doctorId,
          doctorName: doctor?.name || "Unknown",
          commissionRate: (+(doctor?.commissionRate || 0)),
          ...summary,
          commissions: commissions.map((c) => ({
            id: c.id,
            invoiceId: c.invoiceId,
            invoiceDisplayId: c.invoice?.displayId || null,
            invoiceAmount: (+(c.invoiceAmount)),
            commissionRate: (+(c.commissionRate)),
            commissionAmount: (+(c.commissionAmount)),
            status: c.status,
            paidAt: c.paidAt,
            createdAt: c.createdAt,
          })),
        })
      );
    } catch (error) {
      console.error("[DoctorCommissionService] getDoctorCommissionSummary failed:", error);
      return {
        doctorId,
        doctorName: "Unknown",
        commissionRate: 0,
        earned: 0,
        paid: 0,
        pending: 0,
        commissions: [],
      };
    }
  }

  /**
   * Get commission summaries for all doctors in the tenant
   */
  async getAllDoctorsCommissionSummary(tenantId: string) {
    try {
      const results = await this.commissionRepository.getAllDoctorsSummary(tenantId);
      return results;
    } catch (error) {
      console.error("[DoctorCommissionService] getAllDoctorsCommissionSummary failed:", error);
      return [];
    }
  }
}
