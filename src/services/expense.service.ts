import "server-only";
import { ExpenseRepository } from "@/repositories/expense.repository";
import { Prisma } from "@/generated/client";
import { TreasuryService } from "./treasury.service";

export class ExpenseService {
  static instance?: ExpenseService;

  constructor(
    private readonly repository = new ExpenseRepository(),
    private readonly treasuryService = TreasuryService.instance || new TreasuryService()
  ) {}

  private normalizeString(val: string | undefined | null): string {
    return (val || "").trim();
  }

  private getSafeExpenseFallback(id?: string) {
    return {
      id: id || "unknown",
      title: "—",
      amount: 0,
      amountFormatted: "$0.00",
      category: "Other",
      description: "",
      date: new Date(),
      dateFormatted: new Date().toLocaleDateString(),
      status: "PAID",
      notes: "",
      tenantId: "unknown",
    };
  }

  async getExpenses(tenantId: string, filters?: { search?: string, category?: string, status?: string }) {
    try {
      const where: Prisma.ExpenseWhereInput = {};
      
      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }
      
      if (filters?.category && filters.category !== 'all') {
        where.category = filters.category;
      }
      
      if (filters?.status && filters.status !== 'all') {
        where.status = filters.status.toUpperCase() as any;
      }

      const expenses = await this.repository.findMany(tenantId, {
        where,
        orderBy: { date: 'desc' }
      });

      return (expenses || []).map(e => this.mapToUI(e));
    } catch (error) {
      console.error("[ExpenseService.getExpenses] Error:", error);
      return [];
    }
  }

  async getExpenseStats(tenantId: string) {
    try {
      const stats = await this.repository.getExpensesStats(tenantId);
      return {
        ...stats,
        totalThisMonthFormatted: this.formatCurrency(stats.totalThisMonth),
        pendingAmountFormatted: this.formatCurrency(stats.pendingAmount),
      };
    } catch (error) {
      console.error("[ExpenseService.getExpenseStats] Error:", error);
      return { 
        totalThisMonth: 0, 
        totalThisMonthFormatted: "$0.00", 
        pendingAmount: 0, 
        pendingAmountFormatted: "$0.00",
        largestCategory: "None",
        largestCategoryAmount: 0
      };
    }
  }

  async createExpense(tenantId: string, data: any) {
    try {
      if (!data.title || !data.amount || !data.category || !data.date) {
        throw new Error("Missing required fields");
      }

      const result = await this.repository.create(tenantId, {
        title: this.normalizeString(data.title),
        amount: new Prisma.Decimal(data.amount),
        category: this.normalizeString(data.category),
        description: this.normalizeString(data.description),
        date: new Date(data.date),
        status: data.status?.toUpperCase() || 'PAID',
        notes: this.normalizeString(data.notes)
      });

      // Record in Treasury (Double-Entry)
      if (result.status === 'PAID') {
        await this.treasuryService.recordExpense(tenantId, {
          id: result.id,
          title: result.title,
          amount: (+(result.amount)),
          method: result.method || 'CASH'
        }).catch(err => console.error("[ExpenseService] Treasury record failed:", err));
      }

      return this.mapToUI(result);
    } catch (error) {
      console.error("[ExpenseService.createExpense] Error:", error);
      return this.getSafeExpenseFallback();
    }
  }

  async changeExpenseStatus(tenantId: string, id: string, status: string) {
    try {
      const result = await this.repository.update(tenantId, id, {
        status: status.toUpperCase() as any
      });
      return this.mapToUI(result);
    } catch (error) {
      console.error("[ExpenseService.changeExpenseStatus] Error:", error);
      return this.getSafeExpenseFallback(id);
    }
  }

  async updateExpense(tenantId: string, id: string, updates: any) {
    try {
      const result = await this.repository.update(tenantId, id, {
        ...updates,
        title: updates.title ? this.normalizeString(updates.title) : undefined,
        description: updates.description ? this.normalizeString(updates.description) : undefined,
        notes: updates.notes ? this.normalizeString(updates.notes) : undefined,
        ...(updates.date ? { date: new Date(updates.date) } : {}),
        ...(updates.amount ? { amount: new Prisma.Decimal(updates.amount) } : {}),
        updatedAt: new Date()
      });
      return this.mapToUI(result);
    } catch (error) {
      console.error("[ExpenseService.updateExpense] Error:", error);
      return this.getSafeExpenseFallback(id);
    }
  }

  async deleteExpense(tenantId: string, id: string) {
    try {
      return await this.repository.delete(tenantId, id);
    } catch (error) {
      console.error("[ExpenseService.deleteExpense] Error:", error);
      return false;
    }
  }

  private mapToUI(expense: any) {
    if (!expense) return this.getSafeExpenseFallback();
    try {
      return {
        id: expense.id,
        title: expense.title,
        amount: (+(expense.amount)) || 0,
        amountFormatted: this.formatCurrency(expense.amount),
        category: expense.category,
        description: expense.description,
        date: expense.date,
        dateFormatted: new Date(expense.date).toLocaleDateString(),
        status: expense.status,
        notes: expense.notes,
        tenantId: expense.tenantId,
      };
    } catch (error) {
      console.error("[ExpenseService.mapToUI] Mapping error:", error);
      return this.getSafeExpenseFallback(expense?.id);
    }
  }

  private formatCurrency(amount: any) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format((+(amount)) || 0);
    } catch {
      return "$0.00";
    }
  }
}
