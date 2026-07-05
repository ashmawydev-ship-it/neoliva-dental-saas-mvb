const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import { Prisma, InvoiceStatus, PaymentMethod } from "@/generated/client";

export class BillingRepository {
  /**
   * Fetch all invoices for a tenant with patient details
   */
  async findMany(tenantId: string, params?: {
    skip?: number;
    take?: number;
    where?: Prisma.InvoiceWhereInput;
    include?: Prisma.InvoiceInclude;
    orderBy?: Prisma.InvoiceOrderByWithRelationInput;
  }) {
    return await prisma.invoice.findMany({
      ...params,
      where: {
        ...params?.where,
        tenantId,
      },
      select: {
        id: true,
        displayId: true,
        patientId: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: params?.orderBy || { createdAt: 'desc' },
        take: Math.min(params?.take ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    });
  }

  /**
   * Get financial statistics for a tenant
   */
  async getFinancialStats(tenantId: string) {
    const now = new Date();

    const [general, overdue] = await Promise.all([
      prisma.invoice.aggregate({
        where: { tenantId },
        _sum: {
          totalAmount: true,
          paidAmount: true
        }
      }),
      prisma.invoice.aggregate({
        where: {
          tenantId,
          status: { not: 'PAID' },
          dueDate: { lt: now }
        },
        _sum: {
          totalAmount: true,
          paidAmount: true
        },
        _count: {
          id: true
        }
      })
    ]);

    const totalRevenue = new Prisma.Decimal(general._sum.paidAmount || 0);
    const totalInvoiced = new Prisma.Decimal(general._sum.totalAmount || 0);
    const pendingAmount = totalInvoiced.minus(totalRevenue);

    const overdueTotal = new Prisma.Decimal(overdue._sum.totalAmount || 0);
    const overduePaid = new Prisma.Decimal(overdue._sum.paidAmount || 0);
    const overdueAmount = overdueTotal.minus(overduePaid);
    const overdueCount = overdue._count.id || 0;

    return {
      totalRevenue,
      pendingAmount,
      overdueAmount,
      overdueCount
    };
  }

  async findUnique(tenantId: string, id: string) {
    if (!id) {
      throw new Error("BillingRepository.findUnique: id is required");
    }
    return await prisma.invoice.findUnique({
      where: { id, tenantId },
      select: {
        id: true,
        displayId: true,
        patientId: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
        createdAt: true,
        patient: true,
        items: true,
        payments: true
      }
    });
  }

  async findByAppointmentId(tenantId: string, appointmentId: string) {
    return await prisma.invoice.findFirst({
      where: { appointmentId, tenantId },
      select: {
        id: true,
        displayId: true,
        patientId: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        items: true,
        payments: true
      }
    });
  }

  /**
   * Creates an invoice with items atomically
   */
  async create(tenantId: string, data: Omit<Prisma.InvoiceUncheckedCreateInput, 'tenantId' | 'totalAmount'> & { totalAmount?: any }, tx?: Prisma.TransactionClient) {
    // Calculate total amount if items are provided in the create-input style
    let totalAmount = new Prisma.Decimal(0);
    if (data.items && typeof data.items === 'object' && 'create' in data.items) {
      const items = (data.items as any).create;
      if (Array.isArray(items)) {
        totalAmount = items.reduce((sum: Prisma.Decimal, item: any) => {
          const unitPrice = new Prisma.Decimal(item.unitPrice || item.price || 0);
          const quantity = new Prisma.Decimal(item.quantity || 1);
          return sum.plus(unitPrice.times(quantity));
        }, new Prisma.Decimal(0));
      }
    }

    const client = tx || prisma;
    return await client.invoice.create({
      data: {
        ...data,
        totalAmount: data.totalAmount ? new Prisma.Decimal(data.totalAmount) : totalAmount,
        tenantId
      },
      select: {
        id: true,
        displayId: true,
        items: true,
        patient: true
      }
    });
  }

  /**
   * Generic update for invoices with tenant isolation
   */
  async update(tenantId: string, id: string, data: Prisma.InvoiceUpdateInput) {
    return await prisma.invoice.update({
      where: { id, tenantId },
      data
    });
  }

  /**
   * Records a payment and updates invoice status atomically
   */
  async recordPayment(tenantId: string, invoiceId: string, data: {
    amount: number;
    method: PaymentMethod;
    notes?: string;
    paidAt?: Date;
  }, tx?: Prisma.TransactionClient) {
    const execute = async (client: Prisma.TransactionClient) => {
      // 1. Fetch invoice with strict tenant isolation
      const invoice = await client.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
          patientId: true
        }
      });

      if (!invoice) {
        throw new Error("Invoice not found or unauthorized access.");
      }

      if (invoice.status === "PAID") {
        throw new Error("This invoice is already fully paid.");
      }

      const totalAmount = new Prisma.Decimal(invoice.totalAmount as Prisma.Decimal);
      const currentPaid = new Prisma.Decimal(invoice.paidAmount as Prisma.Decimal);
      const remainingBalance = totalAmount.minus(currentPaid);
      const paymentAmount = new Prisma.Decimal(data.amount);

      // 2. Validate payment amount
      if (paymentAmount.greaterThan(remainingBalance)) {
        throw new Error(`Payment amount exceeds the remaining balance ($${remainingBalance.toFixed(2)}).`);
      }

      // 3. Create the Payment record
      const payment = await client.payment.create({
        data: {
          invoiceId,
          amount: paymentAmount,
          method: data.method,
          notes: data.notes,
          paidAt: data.paidAt || new Date(),
          tenantId
        }
      });

      // 4. Calculate new state
      const newPaidAmount = currentPaid.plus(paymentAmount);
      let newStatus: InvoiceStatus = 'PENDING';
      
      if (newPaidAmount.greaterThanOrEqualTo(totalAmount)) {
        newStatus = 'PAID';
      } else if (newPaidAmount.greaterThan(0)) {
        newStatus = 'PARTIAL';
      }

      // 5. Update the Invoice record
      await client.invoice.update({
        where: { id: invoiceId, tenantId },
        data: { 
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: new Date()
        }
      });

      return payment;
    };

    if (tx) {
      return execute(tx);
    } else {
      return prisma.$transaction(execute);
    }
  }

  async delete(tenantId: string, id: string) {
    return await prisma.invoice.delete({
      where: { id, tenantId }
    });
  }
}
