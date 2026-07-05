const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import { cache } from "react";
import { CacheService } from "@/lib/cache/cache-service";

export class ReportsRepository {
  getInvoices = cache(async (tenantId: string, fromDate?: Date) => {
    return await prisma.invoice.findMany({
      where: {
        tenantId,
        status: "PAID",
        ...(fromDate && { createdAt: { gte: fromDate } }),
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc'
      },
        take: DEFAULT_PAGE_SIZE
    });
  });

  getAggregateRevenue = cache(async (tenantId: string) => {
    return CacheService.get(
      ['aggregate_revenue', tenantId],
      async () => {
        const result = await prisma.invoice.aggregate({
          where: {
            tenantId,
            status: "PAID",
          },
          _sum: {
            totalAmount: true,
          }
        });
        return (+(result._sum.totalAmount || 0));
      },
      [`tenant_${tenantId}`, `tenant_${tenantId}_metrics`],
      300
    );
  });

  getExpenses = cache(async (tenantId: string, fromDate?: Date) => {
    return await prisma.expense.findMany({
      where: {
        tenantId,
        ...(fromDate && { date: { gte: fromDate } }),
      },
      select: {
        amount: true,
        date: true,
      },
      orderBy: {
        date: 'asc'
      },
        take: DEFAULT_PAGE_SIZE
    });
  });

  getAggregateExpenses = cache(async (tenantId: string) => {
    return CacheService.get(
      ['aggregate_expenses', tenantId],
      async () => {
        const result = await prisma.expense.aggregate({
          where: {
            tenantId,
          },
          _sum: {
            amount: true,
          }
        });
        return (+(result._sum.amount || 0));
      },
      [`tenant_${tenantId}`, `tenant_${tenantId}_metrics`],
      300
    );
  });

  getAppointments = cache(async (tenantId: string) => {
    return await prisma.appointment.findMany({
      where: {
        tenantId,
      },
      select: {
        status: true,
        treatment: true,
        date: true,
      },
        take: DEFAULT_PAGE_SIZE
    });
  });

  getPatients = cache(async (tenantId: string, fromDate?: Date) => {
    return await prisma.patient.findMany({
      where: {
        tenantId,
        ...(fromDate && { createdAt: { gte: fromDate } }),
      },
      select: {
        createdAt: true,
      },
        take: DEFAULT_PAGE_SIZE
    });
  });

  getPatientCount = cache(async (tenantId: string) => {
    return await prisma.patient.count({
      where: { tenantId }
    });
  });

  getInventory = cache(async (tenantId: string) => {
    return CacheService.get(
      ['inventory', tenantId],
      async () => {
        const items = await prisma.$queryRaw<Array<{
          id: string;
          name: string;
          minimumStock: number;
          category: string;
          unit: string;
          currentStock: number;
        }>>`
          SELECT 
            i.id,
            i.name,
            i."minimumStock",
            i.category,
            i.unit,
            COALESCE(
              SUM(CASE WHEN e.type = 'IN' THEN e.quantity ELSE 0 END) -
              SUM(CASE WHEN e.type = 'OUT' THEN e.quantity ELSE 0 END), 
            0)::int as "currentStock"
          FROM "inventory_items" i
          LEFT JOIN "stock_entries" e ON i.id = e."item_id"
          WHERE i."tenant_id" = ${tenantId}::uuid
          GROUP BY i.id
        `;
        return items;
      },
      [`tenant_${tenantId}`, `tenant_${tenantId}_inventory`],
      900
    );
  });
}
