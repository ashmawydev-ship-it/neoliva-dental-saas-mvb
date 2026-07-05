'use server'

import { withPermission } from "@/lib/rbac/guard";


import { ReportsService } from "@/services/reports.service";



import { 
  ActionResponse, 
  FinancialTrend, 
  AppointmentAnalytics, 
  TreatmentDistribution, 
  PatientGrowth, 
  InventoryInsights, 
  ReportsKPIData 
} from "@/types/reports.types";

const reportsService = new ReportsService();

async function getTenant() {
  return withPermission('reports', 'read', async (session) => {
    return session.tenantId;
  });
}

export async function getFinancialTrendsAction(): Promise<ActionResponse<FinancialTrend[]>> {
  try {
    const tenantId = await getTenant();
    const rawData = await reportsService.getFinancialAnalytics(tenantId);
    const data: FinancialTrend[] = rawData.map((item: any) => ({
      ...item,
      revenue: typeof item.revenue === 'object' && 'toNumber' in item.revenue ? item.revenue.toNumber() : Number(item.revenue),
      expenses: typeof item.expenses === 'object' && 'toNumber' in item.expenses ? item.expenses.toNumber() : Number(item.expenses),
      profit: typeof item.profit === 'object' && 'toNumber' in item.profit ? item.profit.toNumber() : Number(item.profit),
    }));
    return { success: true, error: undefined, data };
  } catch (error: any) {
    return { success: false, data: undefined, error: error.message || "Failed to fetch financial trends" };
  }
}

export async function getAppointmentAnalyticsAction(): Promise<ActionResponse<AppointmentAnalytics>> {
  try {
    const tenantId = await getTenant();
    const data = await reportsService.getAppointmentAnalytics(tenantId);
    return { success: true, error: undefined, data };
  } catch (error: any) {
    return { success: false, data: undefined, error: error.message || "Failed to fetch appointment analytics" };
  }
}

export async function getTreatmentDistributionAction(): Promise<ActionResponse<TreatmentDistribution[]>> {
  try {
    const tenantId = await getTenant();
    const data = await reportsService.getTreatmentDistribution(tenantId);
    return { success: true, error: undefined, data };
  } catch (error: any) {
    return { success: false, data: undefined, error: error.message || "Failed to fetch treatment distribution" };
  }
}

export async function getPatientGrowthAction(): Promise<ActionResponse<PatientGrowth[]>> {
  try {
    const tenantId = await getTenant();
    const data = await reportsService.getPatientGrowth(tenantId);
    return { success: true, error: undefined, data };
  } catch (error: any) {
    return { success: false, data: undefined, error: error.message || "Failed to fetch patient growth" };
  }
}

export async function getInventoryInsightsAction(): Promise<ActionResponse<InventoryInsights>> {
  try {
    const tenantId = await getTenant();
    const data = await reportsService.getInventoryInsights(tenantId);
    return { success: true, error: undefined, data };
  } catch (error: any) {
    return { success: false, data: undefined, error: error.message || "Failed to fetch inventory insights" };
  }
}

export async function getReportsKPIsAction(): Promise<ActionResponse<ReportsKPIData>> {
  try {
    const tenantId = await getTenant();
    const rawData = await reportsService.getKPIs(tenantId);
    const data: ReportsKPIData = {
      ...rawData,
      totalRevenue: typeof rawData.totalRevenue === 'object' && 'toNumber' in rawData.totalRevenue ? rawData.totalRevenue.toNumber() : Number(rawData.totalRevenue),
      totalExpenses: typeof rawData.totalExpenses === 'object' && 'toNumber' in rawData.totalExpenses ? rawData.totalExpenses.toNumber() : Number(rawData.totalExpenses),
      netProfit: typeof rawData.netProfit === 'object' && 'toNumber' in rawData.netProfit ? rawData.netProfit.toNumber() : Number(rawData.netProfit),
    };
    return { success: true, error: undefined, data };
  } catch (error: any) {
    return { success: false, data: undefined, error: error.message || "Failed to fetch reports KPIs" };
  }
}

export async function getAIInsightsAction(): Promise<ActionResponse<string[]>> {
  try {
    const tenantId = await getTenant();
    const data = await reportsService.getAIInsights(tenantId);
    return { success: true, error: undefined, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate AI insights", data: [] };
  }
}
