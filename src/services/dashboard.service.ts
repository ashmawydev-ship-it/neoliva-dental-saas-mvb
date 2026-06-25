import { DashboardRepository } from "@/repositories/dashboard.repository";
import { subMonths, startOfMonth, differenceInMinutes } from "date-fns";
import { formatDoctorName } from "@/lib/utils";

export class DashboardService {
  static instance?: DashboardService;

  constructor(
    private readonly dashboardRepo = new DashboardRepository()
  ) {}

  async getDashboardData(tenantId: string) {
    const revenueTodayRaw = await this.dashboardRepo.getDailyRevenue(tenantId);
    const revenueYesterdayRaw = await this.dashboardRepo.getYesterdayRevenue(tenantId);
    const appointmentsToday = await this.dashboardRepo.getTodayAppointments(tenantId);
    const financialStats = await this.dashboardRepo.getFinancialStats(tenantId);
    const revenueVsExpensesRaw = await this.dashboardRepo.getRevenueVsExpenses(tenantId);
    const weeklyAppointmentsRaw = await this.dashboardRepo.getWeeklyAppointments(tenantId);
    const recentPatientsRaw = await this.dashboardRepo.getRecentPatients(tenantId);
    const doctorPerformanceRaw = await this.dashboardRepo.getDoctorPerformance(tenantId);
    const activityFeedRaw = await this.dashboardRepo.getActivityFeed(tenantId);
    const patientQueueRaw = await this.dashboardRepo.getPatientQueue(tenantId);

    const revenueToday = Number(revenueTodayRaw || 0);
    const revenueYesterday = Number(revenueYesterdayRaw || 0);
    const revenueChange = revenueYesterday > 0 
      ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 
      : 0;

    // Monthly Growth
    const currentMonth = startOfMonth(new Date());
    const prevMonth = startOfMonth(subMonths(new Date(), 1));
    const currentMonthRevenue = financialStats.invoices
      .filter(i => i.createdAt >= currentMonth && i.status === "PAID")
      .reduce((acc, i) => acc + Number(i.totalAmount), 0);
    const prevMonthRevenue = financialStats.invoices
      .filter(i => i.createdAt >= prevMonth && i.createdAt < currentMonth && i.status === "PAID")
      .reduce((acc, i) => acc + Number(i.totalAmount), 0);
    const monthlyGrowth = prevMonthRevenue > 0 
      ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
      : 0;

    // Profit Margin & Collection Rate (Unified 12-month window)
    const totalRevenue = revenueVsExpensesRaw.invoices
      .reduce((acc, i) => acc + Number(i.totalAmount), 0);
    const totalExpenses = revenueVsExpensesRaw.expenses
      .reduce((acc, i) => acc + Number(i.amount), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    const totalInvoiced = financialStats.invoices.reduce((acc, i) => acc + Number(i.totalAmount), 0);
    const collectionRate = totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

    // Insights Engine
    const insights = [];
    if (revenueChange < -20) insights.push({ type: 'revenue_drop', message: `Revenue is down ${Math.abs(revenueChange).toFixed(1)}% compared to yesterday.`, severity: 'high' });
    
    const noShows = weeklyAppointmentsRaw.filter(a => a.status === 'NO_SHOW').length;
    if (noShows > 5) insights.push({ type: 'no_show', message: `${noShows} patients missed their appointments this week.`, severity: 'medium' });

    const overdueCount = financialStats.invoices.filter(i => i.status === 'PENDING').length;
    if (overdueCount > 0) insights.push({ type: 'overdue', message: `You have ${overdueCount} pending invoices requiring follow-up.`, severity: 'medium' });

    // Doctor Performance
    const doctorPerformance = doctorPerformanceRaw.map(doc => {
      const docAppointments = doc.appointments;
      const docRevenue = docAppointments.reduce((acc, a) => acc + (Number(a.invoice?.totalAmount) || 0), 0);
      const completionRate = docAppointments.length > 0 
        ? (docAppointments.filter(a => a.status === 'COMPLETED').length / docAppointments.length) * 100 
        : 0;
      return {
        id: doc.id,
        name: doc.name,
        revenue: docRevenue,
        patientsCount: docAppointments.length,
        completionRate
      };
    }).sort((a, b) => b.revenue - a.revenue);

    if (doctorPerformance.length > 0) {
      insights.push({ type: 'top_doctor', message: `${doctorPerformance[0].name} is the top performer this month.`, severity: 'low' });
    }

    // Patient Queue (Combine date and time for correct wait time tracking)
    const patientQueue = patientQueueRaw.map(q => {
      const dateComp = q.date instanceof Date ? q.date : new Date(q.date);
      const timeComp = q.time instanceof Date ? q.time : new Date(q.time);
      const scheduledDateTime = new Date(dateComp);
      scheduledDateTime.setHours(timeComp.getHours(), timeComp.getMinutes(), 0, 0);

      const waitTime = differenceInMinutes(new Date(), scheduledDateTime);
      return {
        id: q.id,
        patientName: q.patient.name,
        doctorName: q.doctor?.name || "Unassigned",
        time: scheduledDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        waitTime: waitTime > 0 ? waitTime : 0,
        status: q.status
      };
    });

    // Financial Flow
    const cashIn = revenueToday;
    const cashOut = financialStats.expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const outstandingInvoices = financialStats.invoices
      .filter(i => i.status === "PENDING")
      .reduce((acc, i) => acc + Number(i.totalAmount), 0);

    // Activity Feed
    const activityFeed = [
      ...activityFeedRaw.payments.map(p => ({
        id: `p-${p.id}`,
        type: 'payment' as const,
        title: 'Payment Received',
        description: `$${p.totalAmount} from ${p.patient.name}`,
        time: p.updatedAt
      })),
      ...activityFeedRaw.appointments.map(a => ({
        id: `a-${a.id}`,
        type: 'appointment' as const,
        title: 'New Appointment',
        description: `${a.patient.name} with ${formatDoctorName(a.doctor?.name || "")}`,
        time: a.createdAt
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return {
      kpis: {
        revenueToday: { value: revenueToday, change: revenueChange },
        monthlyGrowth,
        profitMargin,
        collectionRate
      },
      insights,
      charts: {
        revenueVsExpensesVsProfit: this.calculateFinancialTrends(revenueVsExpensesRaw),
        appointmentStatus: this.calculateAppointmentStatus(weeklyAppointmentsRaw)
      },
      operational: {
        patientQueue
      },
      doctorPerformance,
      financialFlow: {
        cashIn,
        cashOut,
        outstandingInvoices,
        activityFeed
      },
      recentPatients: recentPatientsRaw.map(p => ({
        id: p.patientId,
        name: p.patient.name,
        treatment: p.treatment || "Consultation",
        status: p.status,
        time: new Date(p.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }))
    };
  }

  private calculateFinancialTrends(raw: any) {
    const monthlyData: Record<string, { revenue: number; expenses: number; profit: number }> = {};
    for (let i = 0; i <= 5; i++) {
      const monthDate = subMonths(new Date(), i);
      const monthKey = monthDate.toLocaleString('en-US', { month: 'short' });
      monthlyData[monthKey] = { revenue: 0, expenses: 0, profit: 0 };
    }

    raw.invoices.forEach((inv: any) => {
      const monthKey = new Date(inv.createdAt!).toLocaleString('en-US', { month: 'short' });
      if (monthlyData[monthKey]) monthlyData[monthKey].revenue += Number(inv.totalAmount || 0);
    });

    raw.expenses.forEach((exp: any) => {
      const monthKey = new Date(exp.date).toLocaleString('en-US', { month: 'short' });
      if (monthlyData[monthKey]) monthlyData[monthKey].expenses += Number(exp.amount || 0);
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
      profit: data.revenue - data.expenses
    })).reverse();
  }

  private calculateAppointmentStatus(raw: any[]) {
    const statusCounts: Record<string, number> = {
      'COMPLETED': 0,
      'SCHEDULED': 0,
      'NO_SHOW': 0,
      'CANCELED': 0
    };
    raw.forEach(a => {
      if (statusCounts[a.status] !== undefined) statusCounts[a.status]++;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }
}
