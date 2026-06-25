import { ReportsRepository } from "@/repositories/reports.repository";
import { subMonths, format, startOfMonth } from "date-fns";
import { cache } from "react";
import { 
  FinancialTrend, 
  AppointmentAnalytics, 
  TreatmentDistribution, 
  PatientGrowth, 
  InventoryInsights, 
  ReportsKPIData 
} from "@/types/reports.types";
import { AIInsightsService } from "./ai-insights.service";

// Simple in-memory cache for TTL
const MEMO_CACHE = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

export class ReportsService {
  static instance?: ReportsService;

  constructor(
    private readonly repo = new ReportsRepository()
  ) {}

  private getCachedData<T>(key: string): T | null {
    const cached = MEMO_CACHE.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any) {
    MEMO_CACHE.set(key, { data, expiry: Date.now() + CACHE_TTL });
  }

  async getFinancialAnalytics(tenantId: string, monthsCount: number = 12): Promise<FinancialTrend[]> {
    try {
      const cacheKey = `financial_${tenantId}_${monthsCount}`;
      const cached = this.getCachedData<FinancialTrend[]>(cacheKey);
      if (cached) return cached;

      const fromDate = startOfMonth(subMonths(new Date(), monthsCount - 1));
      const [invoices, expenses] = await Promise.all([
        this.repo.getInvoices(tenantId, fromDate),
        this.repo.getExpenses(tenantId, fromDate)
      ]);

      const months = Array.from({ length: monthsCount }, (_, i) => {
        const date = subMonths(new Date(), (monthsCount - 1) - i);
        return format(date, 'MMM yyyy');
      });

      const revenueMap: Record<string, number> = {};
      const expenseMap: Record<string, number> = {};

      invoices.forEach(inv => {
        const key = format(new Date(inv.createdAt!), 'MMM yyyy');
        revenueMap[key] = (revenueMap[key] || 0) + Number(inv.totalAmount || 0);
      });

      expenses.forEach(exp => {
        const key = format(new Date(exp.date), 'MMM yyyy');
        expenseMap[key] = (expenseMap[key] || 0) + Number(exp.amount || 0);
      });

      const trendData = months.map(month => ({
        month,
        revenue: revenueMap[month] || 0,
        expenses: expenseMap[month] || 0,
        profit: (revenueMap[month] || 0) - (expenseMap[month] || 0)
      }));

      this.setCachedData(cacheKey, trendData);
      return trendData;
    } catch (error) {
      console.error('[ReportsService.getFinancialAnalytics]', error);
      return [];
    }
  }

  async getAppointmentAnalytics(tenantId: string): Promise<AppointmentAnalytics> {
    try {
      const appointments = await this.repo.getAppointments(tenantId);
      return {
        total: appointments.length,
        completed: appointments.filter(a => a.status === 'COMPLETED').length,
        pending: appointments.filter(a => ['SCHEDULED', 'WAITING', 'IN_PROGRESS'].includes(a.status || '')).length,
        canceled: appointments.filter(a => a.status === 'CANCELLED').length
      };
    } catch (error) {
      console.error('[ReportsService.getAppointmentAnalytics]', error);
      return { total: 0, completed: 0, pending: 0, canceled: 0 };
    }
  }

  async getTreatmentDistribution(tenantId: string): Promise<TreatmentDistribution[]> {
    try {
      const appointments = await this.repo.getAppointments(tenantId);
      const distribution: Record<string, number> = {};

      appointments.forEach(apt => {
        const name = apt.treatment?.trim() || "General Checkup";
        distribution[name] = (distribution[name] || 0) + 1;
      });

      return Object.entries(distribution)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    } catch (error) {
      console.error('[ReportsService.getTreatmentDistribution]', error);
      return [];
    }
  }

  async getPatientGrowth(tenantId: string, monthsCount: number = 12): Promise<PatientGrowth[]> {
    try {
      const fromDate = startOfMonth(subMonths(new Date(), monthsCount - 1));
      const patients = await this.repo.getPatients(tenantId, fromDate);
      const months = Array.from({ length: monthsCount }, (_, i) => {
        const date = subMonths(new Date(), (monthsCount - 1) - i);
        return format(date, 'MMM yyyy');
      });

      const growthMap: Record<string, number> = {};
      patients.forEach(p => {
        const key = format(new Date(p.createdAt!), 'MMM yyyy');
        growthMap[key] = (growthMap[key] || 0) + 1;
      });

      return months.map(month => ({
        month,
        count: growthMap[month] || 0
      }));
    } catch (error) {
      console.error('[ReportsService.getPatientGrowth]', error);
      return [];
    }
  }

  async getInventoryInsights(tenantId: string): Promise<InventoryInsights> {
    try {
      const items = await this.repo.getInventory(tenantId);
      
      const processedItems = items.map(item => {
        const currentStock = item.stockEntries.reduce((acc, entry) => {
          if (entry.type === 'IN') return acc + entry.quantity;
          if (entry.type === 'OUT') return acc - entry.quantity;
          return acc;
        }, 0);

        return {
          id: item.id,
          name: item.name,
          currentStock,
          minimumStock: item.minimumStock,
          category: item.category,
          unit: item.unit
        };
      });

      return {
        all: processedItems,
        lowStock: processedItems.filter(i => i.currentStock <= i.minimumStock)
      };
    } catch (error) {
      console.error('[ReportsService.getInventoryInsights]', error);
      return { all: [], lowStock: [] };
    }
  }

  async getKPIs(tenantId: string): Promise<ReportsKPIData> {
    try {
      const [invoices, expenses, patients] = await Promise.all([
        this.repo.getInvoices(tenantId),
        this.repo.getExpenses(tenantId),
        this.repo.getPatients(tenantId)
      ]);

      const totalRevenue = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
      const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
      
      return {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalPatients: patients.length
      };
    } catch (error) {
      console.error('[ReportsService.getKPIs]', error);
      return { totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalPatients: 0 };
    }
  }

  getAIInsights = cache(async (
    tenantId: string,
    data?: {
      financials?: FinancialTrend[];
      treatments?: TreatmentDistribution[];
      growth?: PatientGrowth[];
      inventory?: InventoryInsights;
    }
  ): Promise<string[]> => {
    try {
      const [financials, treatments, growth, inventory] = await Promise.all([
        data?.financials ?? this.getFinancialAnalytics(tenantId),
        data?.treatments ?? this.getTreatmentDistribution(tenantId),
        data?.growth ?? this.getPatientGrowth(tenantId),
        data?.inventory ?? this.getInventoryInsights(tenantId)
      ]);

      return AIInsightsService.generateInsights({
        revenueTrend: financials.map(f => f.revenue),
        expenseTrend: financials.map(f => f.expenses),
        profitTrend: financials.map(f => f.profit),
        patientGrowth: growth.map(g => g.count),
        topTreatments: treatments,
        lowStockItems: (inventory?.lowStock || []).map(i => ({ name: i.name, currentStock: i.currentStock }))
      });
    } catch (error) {
      console.error('[ReportsService.getAIInsights]', error);
      return ["No insights available at the moment."];
    }
  });
}

// Export a request-memoized version of the service instance creator if needed, 
// but since it's a class with private repo, we'll just use it in actions.
