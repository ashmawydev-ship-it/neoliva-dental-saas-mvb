const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { getPagination } from "@/lib/pagination";

export class DoctorCommissionRepository {
  private getClient(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async create(
    data: {
      tenantId: string;
      doctorId: string;
      invoiceId?: string;
      paymentId?: string;
      invoiceAmount: number | Prisma.Decimal;
      commissionRate: number | Prisma.Decimal;
      commissionAmount: number | Prisma.Decimal;
      journalEntryId?: string;
      status?: string;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);
    return client.doctorCommission.create({
      data: {
        tenantId: data.tenantId,
        doctorId: data.doctorId,
        invoiceId: data.invoiceId,
        paymentId: data.paymentId,
        invoiceAmount: new Prisma.Decimal(data.invoiceAmount.toString()),
        commissionRate: new Prisma.Decimal(data.commissionRate.toString()),
        commissionAmount: new Prisma.Decimal(data.commissionAmount.toString()),
        journalEntryId: data.journalEntryId,
        status: data.status || "pending",
      },
    });
  }

  async findByDoctor(tenantId: string, doctorId: string, params?: { skip?: number; take?: number }) {
    const { take, skip } = getPagination(params);
    return prisma.doctorCommission.findMany({
      where: { tenantId, doctorId },
      take,
      skip,
      include: {
        invoice: { select: { id: true, displayId: true, totalAmount: true } },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findPendingByDoctor(tenantId: string, doctorId: string, params?: { skip?: number; take?: number }) {
    const { take, skip } = getPagination(params);
    return prisma.doctorCommission.findMany({
      where: { tenantId, doctorId, status: "pending" },
      take,
      skip,
      include: {
        invoice: { select: { id: true, displayId: true, totalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSummary(tenantId: string, doctorId: string) {
    const rawGroupings = await prisma.doctorCommission.groupBy({
      by: ["status"],
      where: { tenantId, doctorId },
      _sum: { commissionAmount: true },
    });

    const earned = rawGroupings.reduce((sum, g) => sum + (+(g._sum.commissionAmount || 0)), 0);
    const paid = rawGroupings.find(g => g.status === "paid")?._sum.commissionAmount || 0;
    const pending = rawGroupings.find(g => g.status === "pending")?._sum.commissionAmount || 0;

    return {
      earned: (+(earned)),
      paid: (+(paid)),
      pending: (+(pending)),
    };
  }

  async getAllSummaries(tenantId: string) {
    return prisma.doctorCommission.groupBy({
      by: ["doctorId", "status"],
      where: { tenantId },
      _sum: { commissionAmount: true },
    });
  }

  async markAsPaid(
    tenantId: string,
    ids: string[],
    expenseId: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);
    return client.doctorCommission.updateMany({
      where: {
        id: { in: ids },
        tenantId,
        status: "pending",
      },
      data: {
        status: "paid",
        paidAt: new Date(),
        paidViaExpenseId: expenseId,
      },
    });
  }

  async findByIds(tenantId: string, ids: string[]) {
    return prisma.doctorCommission.findMany({
      where: {
        id: { in: ids },
        tenantId,
      },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async getAllDoctorsSummary(tenantId: string) {
    const rawGroupings = await prisma.doctorCommission.groupBy({
      by: ["doctorId", "status"],
      where: { tenantId },
      _sum: { commissionAmount: true },
    });

    const doctorIdsWithCommissions = rawGroupings.map(g => g.doctorId);

    // Find all doctors, OR any staff who has existing commissions.
    // This fixes the issue where doctors with 0 earned commissions were hidden
    // or if a staff member isn't explicitly a 'DOCTOR' but has a commission record.
    const doctors = await prisma.staff.findMany({
      where: { 
        tenantId, 
        OR: [
          { role: "DOCTOR" },
          { id: { in: doctorIdsWithCommissions } }
        ]
      },
      select: { id: true, name: true, commissionRate: true },
      take: DEFAULT_PAGE_SIZE
    });

    return doctors.map((doc) => {
      // Find grouping for this doctor
      const allForDoc = rawGroupings.filter(g => g.doctorId === doc.id);
      
      const earned = allForDoc.reduce((sum, g) => sum + (+(g._sum.commissionAmount || 0)), 0);
      const paid = allForDoc.find(g => g.status === "paid")?._sum.commissionAmount || 0;
      const pending = allForDoc.find(g => g.status === "pending")?._sum.commissionAmount || 0;

      return {
        doctorId: doc.id,
        doctorName: doc.name,
        commissionRate: (+(doc.commissionRate || 0)),
        earned: (+(earned)),
        paid: (+(paid)),
        pending: (+(pending)),
      };
    });
  }
}
