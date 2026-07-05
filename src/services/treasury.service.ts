import { TreasuryRepository } from "@/repositories/treasury.repository";
import { AccountType, Prisma, PaymentMethod } from "@/generated/client";

export class TreasuryService {
  static instance?: TreasuryService;
  constructor(
    private readonly treasuryRepository = new TreasuryRepository()
  ) {}

  /**
   * System Accounts Names
   */
  public static SYSTEM_ACCOUNTS = {
    CASH: "Cash",
    BANK: "Bank",
    REVENUE: "Revenue",
    EXPENSE: "General Expense",
    RECEIVABLE: "Accounts Receivable",
    PAYABLE: "Accounts Payable",
  };

  /**
   * Ensure standard system accounts exist for a tenant
   */
  async ensureSystemAccounts(tenantId: string, tx?: Prisma.TransactionClient) {
    const existing = await this.treasuryRepository.getAccounts(tenantId, tx);
    const existingNames = new Set(existing.map((a) => a.name));

    const accountsToCreate = [
      { name: TreasuryService.SYSTEM_ACCOUNTS.CASH, type: AccountType.ASSET },
      { name: TreasuryService.SYSTEM_ACCOUNTS.BANK, type: AccountType.ASSET },
      { name: TreasuryService.SYSTEM_ACCOUNTS.RECEIVABLE, type: AccountType.ASSET },
      { name: TreasuryService.SYSTEM_ACCOUNTS.PAYABLE, type: AccountType.LIABILITY },
      { name: TreasuryService.SYSTEM_ACCOUNTS.REVENUE, type: AccountType.REVENUE },
      { name: TreasuryService.SYSTEM_ACCOUNTS.EXPENSE, type: AccountType.EXPENSE },
    ];

    for (const acc of accountsToCreate) {
      if (!existingNames.has(acc.name)) {
        await this.treasuryRepository.createAccount(tenantId, { ...acc, isSystem: true }, tx);
      }
    }
  }

  /**
   * Create a balanced Journal Entry
   */
  async createJournalEntry(tenantId: string, data: {
    reference?: string;
    description?: string;
    createdBy?: string;
    lines: {
      accountName: string;
      debit: number;
      credit: number;
    }[];
  }, tx?: Prisma.TransactionClient) {
    // 1. Validate balance
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);

    // Using small epsilon for decimal precision
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Unbalanced Journal Entry: Debits (${totalDebit}) !== Credits (${totalCredit})`);
    }

    if (data.lines.length < 2) {
      throw new Error("Journal Entry must have at least 2 lines");
    }

    // 2. Resolve accounts
    const accountMappings = await Promise.all(
      data.lines.map(async (line) => {
        const account = await this.treasuryRepository.findAccountByName(tenantId, line.accountName, tx);
        if (!account) throw new Error(`Account not found: ${line.accountName}`);
        return {
          accountId: account.id,
          debit: new Prisma.Decimal(line.debit),
          credit: new Prisma.Decimal(line.credit),
        };
      })
    );

    // 3. Persist
    return this.treasuryRepository.createJournalEntry(tenantId, {
      ...data,
      lines: accountMappings,
    }, tx);
  }

  /**
   * Record an Invoice (Revenue Recognition)
   * DR: Accounts Receivable
   * CR: Revenue
   */
  async recordInvoiceCreation(tenantId: string, invoice: { id: string; displayId?: string; totalAmount: number; patientName: string }, tx?: Prisma.TransactionClient) {
    return this.createJournalEntry(tenantId, {
      reference: invoice.id,
      description: `Invoice ${invoice.displayId || invoice.id} for ${invoice.patientName}`,
      lines: [
        { accountName: TreasuryService.SYSTEM_ACCOUNTS.RECEIVABLE, debit: invoice.totalAmount, credit: 0 },
        { accountName: TreasuryService.SYSTEM_ACCOUNTS.REVENUE, debit: 0, credit: invoice.totalAmount },
      ],
    }, tx);
  }

  /**
   * Record a Payment
   * DR: Cash/Bank
   * CR: Accounts Receivable
   */
  async recordPayment(tenantId: string, payment: { amount: number; method: PaymentMethod; invoiceId?: string; displayId?: string }, tx?: Prisma.TransactionClient) {
    const assetAccount = payment.method === 'CASH' 
      ? TreasuryService.SYSTEM_ACCOUNTS.CASH 
      : TreasuryService.SYSTEM_ACCOUNTS.BANK;

    return this.createJournalEntry(tenantId, {
      reference: payment.invoiceId,
      description: `Payment ${payment.displayId || ""} via ${payment.method}`,
      lines: [
        { accountName: assetAccount, debit: payment.amount, credit: 0 },
        { accountName: TreasuryService.SYSTEM_ACCOUNTS.RECEIVABLE, debit: 0, credit: payment.amount },
      ],
    }, tx);
  }

  /**
   * Record an Expense
   * DR: Expense
   * CR: Cash/Bank
   */
  async recordExpense(tenantId: string, expense: { id: string; title: string; amount: number; method?: string }) {
    const assetAccount = expense.method === 'CASH' 
      ? TreasuryService.SYSTEM_ACCOUNTS.CASH 
      : TreasuryService.SYSTEM_ACCOUNTS.BANK;

    return this.createJournalEntry(tenantId, {
      reference: expense.id,
      description: `Expense: ${expense.title}`,
      lines: [
        { accountName: TreasuryService.SYSTEM_ACCOUNTS.EXPENSE, debit: expense.amount, credit: 0 },
        { accountName: assetAccount, debit: 0, credit: expense.amount },
      ],
    });
  }

  /**
   * Financial Reports
   */

  async getTrialBalance(tenantId: string) {
    // Ensure system accounts exist before fetching balances
    await this.ensureSystemAccounts(tenantId);

    const balances = await this.treasuryRepository.getAccountBalances(tenantId);
    const accounts = await this.treasuryRepository.getAccounts(tenantId);

    const report = accounts.map(acc => {
      const bal = balances.find(b => b.accountId === acc.id);
      const debit = new Prisma.Decimal(bal?._sum?.debit || 0);
      const credit = new Prisma.Decimal(bal?._sum?.credit || 0);
      
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        debit: debit,
        credit: credit,
        balance: (acc.type === 'ASSET' || acc.type === 'EXPENSE' ? debit.minus(credit) : credit.minus(debit))
      };
    });

    return report;
  }

  async getProfitAndLoss(tenantId: string) {
    const trialBalance = await this.getTrialBalance(tenantId);
    
    const revenue = trialBalance
      .filter(a => a.type === AccountType.REVENUE)
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);
      
    const expenses = trialBalance
      .filter(a => a.type === AccountType.EXPENSE)
      .reduce((sum, a) => sum + a.balance, 0);

    return {
      revenue,
      expenses,
      netProfit: revenue - expenses
    };
  }

  async getCashFlow(tenantId: string) {
    const trialBalance = await this.getTrialBalance(tenantId);
    
    const cash = trialBalance.find(a => a.name === TreasuryService.SYSTEM_ACCOUNTS.CASH)?.balance || 0;
    const bank = trialBalance.find(a => a.name === TreasuryService.SYSTEM_ACCOUNTS.BANK)?.balance || 0;

    return {
      operatingCash: cash + bank,
      totalCash: cash + bank
    };
  }
}
