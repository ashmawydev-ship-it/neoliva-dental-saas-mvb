import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

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

  async findByDoctor(tenantId: string, doctorId: string) {
    return prisma.doctorCommission.findMany({
      where: { tenantId, doctorId },
      include: {
        invoice: { select: { id: true, displayId: true, totalAmount: true } },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findPendingByDoctor(tenantId: string, doctorId: string) {
    return prisma.doctorCommission.findMany({
      where: { tenantId, doctorId, status: "pending" },
      include: {
        invoice: { select: { id: true, displayId: true, totalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSummary(tenantId: string, doctorId: string) {
    const [earned, paid, pending] = await Promise.all([
      prisma.doctorCommission.aggregate({
        where: { tenantId, doctorId },
        _sum: { commissionAmount: true },
      }),
      prisma.doctorCommission.aggregate({
        where: { tenantId, doctorId, status: "paid" },
        _sum: { commissionAmount: true },
      }),
      prisma.doctorCommission.aggregate({
        where: { tenantId, doctorId, status: "pending" },
        _sum: { commissionAmount: true },
      }),
    ]);

    return {
      earned: Number(earned._sum.commissionAmount || 0),
      paid: Number(paid._sum.commissionAmount || 0),
      pending: Number(pending._sum.commissionAmount || 0),
    };
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
    });
  }

  async getAllDoctorsSummary(tenantId: string) {
    const results = await prisma.doctorCommission.groupBy({
      by: ["doctorId"],
      where: { tenantId },
      _sum: { commissionAmount: true },
    });

    // Also get pending amounts
    const pendingResults = await prisma.doctorCommission.groupBy({
      by: ["doctorId"],
      where: { tenantId, status: "pending" },
      _sum: { commissionAmount: true },
    });

    const paidResults = await prisma.doctorCommission.groupBy({
      by: ["doctorId"],
      where: { tenantId, status: "paid" },
      _sum: { commissionAmount: true },
    });

    // Get doctor names
    const doctorIds = results.map((r) => r.doctorId);
    const doctors = await prisma.staff.findMany({
      where: { id: { in: doctorIds }, tenantId },
      select: { id: true, name: true, commissionRate: true },
    });

    return doctors.map((doc) => {
      const total = results.find((r) => r.doctorId === doc.id);
      const pending = pendingResults.find((r) => r.doctorId === doc.id);
      const paid = paidResults.find((r) => r.doctorId === doc.id);

      return {
        doctorId: doc.id,
        doctorName: doc.name,
        commissionRate: Number(doc.commissionRate || 0),
        earned: Number(total?._sum.commissionAmount || 0),
        paid: Number(paid?._sum.commissionAmount || 0),
        pending: Number(pending?._sum.commissionAmount || 0),
      };
    });
  }
}
