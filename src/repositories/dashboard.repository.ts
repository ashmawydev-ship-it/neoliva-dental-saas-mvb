const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, subMonths, startOfMonth, startOfWeek, endOfWeek } from "date-fns";

export class DashboardRepository {
  async getRecentPatients(tenantId: string) {
    return await prisma.appointment.findMany({
      where: {
        tenantId,
        date: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
      include: {
        patient: true,
      },
      orderBy: {
        date: "asc",
      },
      take: 5,
    });
  }

  async getDailyRevenue(tenantId: string) {
    const today = new Date();
    const result = await prisma.invoice.aggregate({
      where: {
        tenantId,
        status: "PAID",
        createdAt: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
      _sum: {
        totalAmount: true,
      },
    });
    return result._sum.totalAmount;
  }

  async getTodayAppointments(tenantId: string) {
    const today = new Date();
    return await prisma.appointment.findMany({
      where: {
        tenantId,
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async getPendingPayments(tenantId: string) {
    const result = await prisma.invoice.aggregate({
      where: {
        tenantId,
        status: "PENDING",
      },
      _sum: {
        totalAmount: true,
      },
    });
    return result._sum.totalAmount;
  }

  async getInventoryItems(tenantId: string) {
    return await prisma.inventoryItem.findMany({
      where: { tenantId },
      include: {
        stockEntries: {
          select: {
            type: true,
            quantity: true,
          },
        },
      },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async getRevenueVsExpenses(tenantId: string) {
    const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 12));
    
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: "PAID",
        createdAt: { gte: twelveMonthsAgo },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
        take: DEFAULT_PAGE_SIZE
    });

    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        date: { gte: twelveMonthsAgo },
      },
      select: {
        amount: true,
        date: true,
      },
        take: DEFAULT_PAGE_SIZE
    });

    return { invoices, expenses };
  }

  async getWeeklyAppointments(tenantId: string) {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });

    return await prisma.appointment.findMany({
      where: {
        tenantId,
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        date: true,
        status: true,
      },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async getYesterdayRevenue(tenantId: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = await prisma.invoice.aggregate({
      where: {
        tenantId,
        status: "PAID",
        createdAt: {
          gte: startOfDay(yesterday),
          lte: endOfDay(yesterday),
        },
      },
      _sum: {
        totalAmount: true,
      },
    });
    return result._sum.totalAmount;
  }

  async getDoctorPerformance(tenantId: string) {
    const start = startOfMonth(new Date());
    return await prisma.staff.findMany({
      where: {
        tenantId,
        role: "DOCTOR",
      },
      select: {
        name: true,
        id: true,
        appointments: {
          where: {
            date: { gte: start },
          },
          select: {
            status: true,
            invoice: {
              select: {
                totalAmount: true,
                status: true,
              },
            },
          },
        },
      },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async getFinancialStats(tenantId: string) {
    const now = new Date();
    const twelveMonthsAgo = startOfMonth(subMonths(now, 12));

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: twelveMonthsAgo },
      },
      select: {
        totalAmount: true,
        status: true,
        createdAt: true,
      },
        take: DEFAULT_PAGE_SIZE
    });

    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        date: {
          gte: startOfDay(now),
          lte: endOfDay(now),
        },
      },
      select: {
        amount: true,
      },
        take: DEFAULT_PAGE_SIZE
    });

    return { invoices, expenses };
  }

  async getActivityFeed(tenantId: string) {
    const sevenDaysAgo = subDays(new Date(), 7);

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        createdAt: { gte: sevenDaysAgo },
      },
      include: { 
        patient: { select: { name: true } }, 
        doctor: { select: { name: true } } 
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const payments = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: "PAID",
        updatedAt: { gte: sevenDaysAgo },
      },
      include: { 
        patient: { select: { name: true } } 
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    return { appointments, payments };
  }

  async getPatientQueue(tenantId: string) {
    return await prisma.appointment.findMany({
      where: {
        tenantId,
        date: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
        status: { in: ["WAITING", "IN_PROGRESS", "SCHEDULED"] },
      },
      include: {
        patient: { select: { name: true } },
        doctor: { select: { name: true } },
      },
      orderBy: {
        date: "asc",
      },
        take: DEFAULT_PAGE_SIZE
    });
  }
}
