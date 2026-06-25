import { FinanceRepository } from "@/repositories/finance.repository";
import { TreasuryService } from "./treasury.service";
import { startOfDay, startOfMonth, subMonths, format, isSameDay, isSameMonth } from "date-fns";

export class FinanceService {
  static instance?: FinanceService;

  constructor(
    private readonly financeRepository = new FinanceRepository(),
    private readonly treasuryService = TreasuryService.instance || new TreasuryService()
  ) {}
  async getFinancialDashboard(tenantId: string, period: '7d' | '30d' | '12m' = '30d') {
    const now = new Date();
    let fromDate: Date;

    if (period === '7d') fromDate = startOfDay(new Date(now.setDate(now.getDate() - 7)));
    else if (period === '12m') fromDate = startOfMonth(subMonths(new Date(), 12));
    else fromDate = startOfMonth(subMonths(new Date(), 1)); // Default 30d/1m

    // 1. Fetch Data in Parallel
    const [
      revenueRaw,
      expensesRaw,
      invoiceSummary,
      activityRaw,
      topServicesRaw,
      doctorRevenueRaw,
      balances
    ] = await Promise.all([
      this.financeRepository.getRevenueData(tenantId, fromDate),
      this.financeRepository.getExpenseData(tenantId, fromDate),
      this.financeRepository.getInvoiceSummary(tenantId),
      this.financeRepository.getRecentFinancialActivity(tenantId),
      this.financeRepository.getTopServices(tenantId),
      this.financeRepository.getRevenueByDoctor(tenantId),
      this.treasuryService.getTrialBalance(tenantId)
    ]);

    // 2. Process KPIs
    const revenueToday = revenueRaw
      .filter(p => p.paidAt && isSameDay(new Date(p.paidAt), new Date()))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const revenueMonth = revenueRaw
      .filter(p => p.paidAt && isSameMonth(new Date(p.paidAt), new Date()))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const expensesMonth = expensesRaw
      .filter(e => e.date && isSameMonth(new Date(e.date), new Date()))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const netProfit = revenueMonth - expensesMonth;

    // From Treasury Balances
    const cashBalance = balances.find(b => b.name.toLowerCase().includes('cash') || b.name.toLowerCase().includes('bank'))?.balance || 0;
    const receivables = balances.find(b => b.name.toLowerCase().includes('receivable'))?.balance || 0;
    const payables = balances.find(b => b.name.toLowerCase().includes('payable'))?.balance || 0;

    // 3. Trends (Revenue vs Expenses)
    // We'll group by date
    const trendMap = new Map<string, { date: string, revenue: number, expenses: number }>();
    
    revenueRaw.forEach(p => {
      const day = format(new Date(p.paidAt), "MMM dd");
      const current = trendMap.get(day) || { date: day, revenue: 0, expenses: 0 };
      current.revenue += Number(p.amount || 0);
      trendMap.set(day, current);
    });

    expensesRaw.forEach(e => {
      const day = format(new Date(e.date), "MMM dd");
      const current = trendMap.get(day) || { date: day, revenue: 0, expenses: 0 };
      current.expenses += Number(e.amount || 0);
      trendMap.set(day, current);
    });

    const revenueVsExpenses = Array.from(trendMap.values());

    // 4. Activity Feed
    const recentActivity = [
      ...activityRaw.invoices.map(i => ({ type: 'INVOICE', title: `Invoice ${i.displayId}`, amount: Number(i.totalAmount), date: i.createdAt, status: i.status, patient: i.patient?.name })),
      ...activityRaw.payments.map((p: any) => ({ type: 'PAYMENT', title: `Payment Received`, amount: Number(p.amount), date: p.paidAt, method: p.method, patient: p.invoice?.patient?.name })),
      ...activityRaw.expenses.map(e => ({ type: 'EXPENSE', title: e.title, amount: Number(e.amount), date: e.date, category: e.category }))
    ].sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime()).slice(0, 15);

    // 5. Top Services
    // `total` column doesn't exist in DB; we use unitPrice × count as revenue proxy
    const topServices = topServicesRaw.map(s => ({
      name: s.description,
      value: Number(s._sum.unitPrice || 0) * s._count.id,
      count: s._count.id
    }));


    // 6. Revenue By Doctor
    const doctorMap = new Map<string, number>();
    doctorRevenueRaw.forEach(r => {
      const name = r.appointment?.doctor?.name || "Unknown";
      doctorMap.set(name, (doctorMap.get(name) || 0) + Number(r.totalAmount || 0));
    });
    const revenueByDoctor = Array.from(doctorMap.entries()).map(([name, value]) => ({ name, value }));

    // 7. Alerts
    const alerts = [];
    if (receivables > 5000) alerts.push({ severity: 'WARNING', message: `High receivables ($${receivables.toLocaleString()}). Follow up on pending invoices.` });
    if (cashBalance < 1000) alerts.push({ severity: 'CRITICAL', message: `Low cash balance ($${cashBalance.toLocaleString()})!` });
    if (expensesMonth > revenueMonth * 0.8) alerts.push({ severity: 'WARNING', message: `Expenses are reaching 80% of monthly revenue.` });

    return {
      kpis: {
        revenueToday,
        revenueMonth,
        expensesMonth,
        netProfit,
        cashBalance,
        receivables,
        payables
      },
      trends: {
        revenueVsExpenses
      },
      cashFlow: {
        cashIn: revenueMonth,
        cashOut: expensesMonth,
        net: netProfit
      },
      alerts,
      recentActivity,
      topServices,
      revenueByDoctor
    };
  }
}
