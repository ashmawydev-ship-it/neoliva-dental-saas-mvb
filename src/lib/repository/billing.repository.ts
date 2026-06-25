import 'server-only'
import { BaseRepository } from './base.repository'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/client'

/**
 * BillingRepository (session-scoped)
 *
 * Extends BaseRepository so tenantId is always resolved from the active user
 * session — callers never pass tenantId explicitly.
 *
 * Prisma models used:
 *   Invoice      (@@map("invoices"))
 *   InvoiceItem  (@@map("invoice_items"))
 *   Payment      (@@map("payments"))
 *
 * Fields of note:
 *   Invoice.totalAmount  — Decimal
 *   Invoice.paidAmount   — Decimal (default 0)
 *   Invoice.status       — InvoiceStatus enum: PENDING | PAID | PARTIAL | OVERDUE | CANCELLED
 *   Invoice.items        — InvoiceItem[]
 *   Invoice.payments     — Payment[]
 *   Invoice.patient      — Patient
 *   Payment.method       — String (not PaymentMethod enum — just a string in this schema)
 *   Payment.paidAt       — DateTime
 */
class BillingRepository extends BaseRepository {
  /**
   * Return all invoices for the current tenant, newest first.
   * Optionally filter by status or patientId.
   */
  async findAllInvoices(filters?: { status?: string; patientId?: string }) {
    const tenantId = await this.getTenantId()
    return prisma.invoice.findMany({
      where: {
        tenantId,
        ...(filters?.status    && { status: filters.status as any }),
        ...(filters?.patientId && { patientId: filters.patientId }),
      },
      include: {
        items:    true,
        payments: true,
        patient:  { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Return a single invoice by ID for the current tenant.
   * Returns null if not found or belongs to another tenant.
   */
  async findInvoiceById(id: string) {
    const tenantId = await this.getTenantId()
    return prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items:    true,
        payments: true,
        patient:  true,
      },
    })
  }

  /**
   * Create a new invoice with line items for the current tenant.
   * Calculates totalAmount from the provided items (supporting per-item discount %).
   */
  async createInvoice(data: {
    patientId: string
    items: {
      description: string
      quantity:    number
      unitPrice:   number
      discount?:   number   // percentage (0–100)
      serviceId?:  string
    }[]
    notes?:   string
    dueDate?: Date
    appointmentId?: string
  }) {
    const tenantId = await this.getTenantId()

    const total = data.items.reduce((sum, item) => {
      const discountFactor = 1 - (item.discount ?? 0) / 100
      return sum + item.quantity * item.unitPrice * discountFactor
    }, 0)

    return prisma.invoice.create({
      data: {
        tenantId,
        patientId:     data.patientId,
        status:        'PENDING',
        totalAmount:   total,
        notes:         data.notes,
        dueDate:       data.dueDate,
        appointmentId: data.appointmentId,
        items: {
          create: data.items.map(item => {
            const discount = item.discount ?? 0;
            const discountFactor = 1 - discount / 100;
            return {
              tenantId,
              description: item.description,
              quantity:    item.quantity,
              unitPrice:   item.unitPrice,
              discount,
              total:       item.quantity * item.unitPrice * discountFactor,
              serviceId:   item.serviceId ?? null,
            };
          }),
        },
      },
      include: { items: true },
    })
  }

  /**
   * Record a payment for an invoice and update the invoice's paidAmount + status
   * atomically inside a transaction.
   *
   * Throws if the invoice is not found, already fully paid, or the payment
   * amount exceeds the remaining balance.
   */
  async recordPayment(data: {
    invoiceId:  string
    amount:     number
    method:     string   // e.g. "CASH" | "CARD" | "TRANSFER" — stored as plain string
    reference?: string
    notes?:     string
  }) {
    const tenantId = await this.getTenantId()

    return prisma.$transaction(async (tx) => {
      // 1. Verify invoice belongs to current tenant
      const invoice = await tx.invoice.findFirst({
        where:  { id: data.invoiceId, tenantId },
        select: { id: true, totalAmount: true, paidAmount: true, status: true },
      })
      if (!invoice) throw new Error('Invoice not found or unauthorized access')
      if (invoice.status === 'PAID') throw new Error('Invoice is already fully paid')

      const totalAmount   = Number(invoice.totalAmount)
      const currentPaid   = Number(invoice.paidAmount)
      const remaining     = totalAmount - currentPaid

      if (data.amount > remaining + 0.01) {
        throw new Error(
          `Payment amount (${data.amount.toFixed(2)}) exceeds remaining balance (${remaining.toFixed(2)})`
        )
      }

      // 2. Create Payment record
      const payment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId: data.invoiceId,
          amount:    data.amount,
          method:    data.method,
          reference: data.reference,
          notes:     data.notes,
          paidAt:    new Date(),
        },
      })

      // 3. Update invoice paidAmount + status
      const newPaidAmount = currentPaid + data.amount
      const newStatus: 'PAID' | 'PARTIAL' | 'PENDING' =
        newPaidAmount >= totalAmount - 0.01 ? 'PAID'
        : newPaidAmount > 0                ? 'PARTIAL'
        : 'PENDING'

      await tx.invoice.update({
        where: { id: data.invoiceId, tenantId },
        data:  { paidAmount: newPaidAmount, status: newStatus, updatedAt: new Date() },
      })

      return payment
    })
  }

  /**
   * Return a high-level financial summary for the current tenant:
   *   - revenueThisMonth: total payments collected in the current calendar month
   *   - pendingAmount:     total outstanding (PENDING + PARTIAL invoices)
   *   - overdueCount:      number of PENDING invoices past their dueDate
   */
  async getFinancialSummary() {
    const tenantId = await this.getTenantId()
    const now           = new Date()
    const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1)

    const [revenue, pending, overdueCount] = await Promise.all([
      prisma.payment.aggregate({
        where: { tenantId, paidAt: { gte: startOfMonth } },
        _sum:  { amount: true },
      }),
      prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['PENDING', 'PARTIAL'] } },
        _sum:  { totalAmount: true },
      }),
      prisma.invoice.count({
        where: {
          tenantId,
          status:  'PENDING',
          dueDate: { lt: now },
        },
      }),
    ])

    return {
      revenueThisMonth: Number(revenue._sum.amount   ?? 0),
      pendingAmount:    Number(pending._sum.totalAmount ?? 0),
      overdueCount,
    }
  }

  /**
   * Mark an invoice as CANCELLED. Verifies tenant ownership before updating.
   */
  async cancelInvoice(id: string) {
    return this.safeUpdate<Awaited<ReturnType<typeof prisma.invoice.update>>>(
      prisma.invoice,
      id,
      { status: 'CANCELLED' }
    )
  }
}

export const billingRepository = new BillingRepository()
