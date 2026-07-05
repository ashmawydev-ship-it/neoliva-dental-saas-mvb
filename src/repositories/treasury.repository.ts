const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import { AccountType, Prisma } from "@/generated/client";

export class TreasuryRepository {
  /**
   * Helper to ensure we have a valid client with the required models
   */
  private getClient(tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    // Check for a core treasury model to ensure the client is up to date
    if (!client.ledgerAccount) {
      throw new Error("[TreasuryRepository] Critical models (ledgerAccount) missing from Prisma client. Re-run prisma generate.");
    }
    return client;
  }

  /**
   * Get all accounts for a tenant
   */
  async getAccounts(tenantId: string, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    return client.ledgerAccount.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Find account by name
   */
  async findAccountByName(tenantId: string, name: string, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    return client.ledgerAccount.findFirst({
      where: { tenantId, name },
    });
  }

  /**
   * Create a system account
   */
  async createAccount(tenantId: string, data: { name: string; type: AccountType; isSystem?: boolean }, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    return client.ledgerAccount.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Create a journal entry with its lines in a transaction
   */
  async createJournalEntry(tenantId: string, data: {
    reference?: string;
    description?: string;
    createdBy?: string;
    lines: {
      accountId: string;
      debit: number | Prisma.Decimal;
      credit: number | Prisma.Decimal;
    }[];
  }, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);

    // Validate that all accounts belong to the current tenant
    const accountIds = data.lines.map(line => line.accountId);
    const validAccountsCount = await client.ledgerAccount.count({
      where: {
        id: { in: accountIds },
        tenantId
      }
    });

    if (validAccountsCount !== accountIds.length) {
      throw new Error("One or more accounts do not belong to this tenant or do not exist.");
    }

    return client.journalEntry.create({
      data: {
        tenantId,
        reference: data.reference,
        description: data.description,
        createdBy: data.createdBy,
        lines: {
          create: data.lines,
        },
      },
      include: {
        lines: true,
      },
    });
  }

  /**
   * Get ledger for a specific account
   */
  async getLedger(tenantId: string, accountId: string) {
    const client = this.getClient();
    return client.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          tenantId,
        },
      },
      include: {
        journalEntry: true,
      },
      orderBy: {
        journalEntry: {
          createdAt: "desc",
        },
      },
        take: DEFAULT_PAGE_SIZE
    });
  }

  /**
   * Get balances for all accounts (Trial Balance)
   */
  async getAccountBalances(tenantId: string) {
    try {
      const client = this.getClient();
      const lines = await client.journalLine.groupBy({
        by: ["accountId"],
        where: {
          journalEntry: {
            tenantId,
          },
        },
        _sum: {
          debit: true,
          credit: true,
        },
      });

      return lines;
    } catch (err: any) {
      console.error("[TreasuryRepository] getAccountBalances failed:", err);
      // Fallback to empty array to prevent cascading runtime failures in UI
      return [];
    }
  }

  /**
   * Find many payments with relations
   */
  async findPayments(tenantId: string, filters?: { invoiceId?: string; patientId?: string; take?: number }) {
    const client = this.getClient();
    
    // Construct where clause
    const whereClause: any = { tenantId };
    if (filters?.invoiceId) whereClause.invoiceId = filters.invoiceId;
    if (filters?.patientId) whereClause.invoice = { patientId: filters.patientId };

    return client.payment.findMany({
      where: whereClause,
      include: {
        invoice: {
          include: { patient: true }
        }
      },
      orderBy: {
        paidAt: "desc",
      },
        take: Math.min(filters?.take ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    });
  }
}
