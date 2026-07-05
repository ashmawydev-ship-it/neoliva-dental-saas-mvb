const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import { Prisma, StockType } from "@/generated/client";
import { getPagination } from "@/lib/pagination";

export class InventoryRepository {
  async createItem(tenantId: string, data: Omit<Prisma.InventoryItemUncheckedCreateInput, 'tenantId'> & { initialStock?: number }) {
    return await prisma.$transaction(async (tx) => {
      const { initialStock, ...itemData } = data;
      
      const item = await tx.inventoryItem.create({
        data: {
          ...itemData,
          tenantId,
        },
      });

      if (initialStock && initialStock > 0) {
        await tx.stockEntry.create({
          data: {
            itemId: item.id,
            type: 'IN',
            quantity: initialStock,
            reason: 'Initial Stock',
            tenantId,
          },
        });
      }

      return item;
    });
  }

  async getItems(tenantId: string, filters?: {
    search?: string;
    category?: string;
    take?: number;
    skip?: number;
  }) {
    const where: Prisma.InventoryItemWhereInput = {
      tenantId,
      ...(filters?.category && filters.category !== 'all' ? { category: filters.category } : {}),
      ...(filters?.search ? {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { category: { contains: filters.search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const { take, skip } = getPagination(filters);

    const items = await prisma.inventoryItem.findMany({
      where,
      take,
      skip,
      orderBy: { name: 'asc' },
    });

    if (items.length === 0) return [];

    // Query aggregated stock entries for these items
    const stockGroups = await prisma.stockEntry.groupBy({
      by: ['itemId', 'type'],
      where: {
        tenantId,
        itemId: { in: items.map(i => i.id) }
      },
      _sum: {
        quantity: true
      },
      _max: {
        createdAt: true
      }
    });

    // Create a map for quick lookup
    const stockMap: Record<string, { IN: number; OUT: number; lastCreated: Date }> = {};
    for (const group of stockGroups) {
      if (!stockMap[group.itemId]) {
        stockMap[group.itemId] = { IN: 0, OUT: 0, lastCreated: new Date(0) };
      }
      const qty = (+(group._sum.quantity || 0));
      const createdAt = group._max.createdAt || new Date(0);
      
      if (group.type === 'IN') {
        stockMap[group.itemId].IN += qty;
      } else if (group.type === 'OUT') {
        stockMap[group.itemId].OUT += qty;
      }
      
      if (createdAt > stockMap[group.itemId].lastCreated) {
        stockMap[group.itemId].lastCreated = createdAt;
      }
    }

    // Attach aggregated stockEntries to match the expected shape
    return items.map(item => {
      const stock = stockMap[item.id];
      if (!stock) {
        return {
          ...item,
          stockEntries: [] as any[]
        };
      }
      return {
        ...item,
        stockEntries: [
          { 
            id: `mock-in-${item.id}`,
            itemId: item.id,
            type: 'IN' as const, 
            quantity: stock.IN, 
            reason: 'Aggregated Sum',
            referenceId: null,
            tenantId,
            createdAt: stock.lastCreated,
          },
          { 
            id: `mock-out-${item.id}`,
            itemId: item.id,
            type: 'OUT' as const, 
            quantity: stock.OUT, 
            reason: 'Aggregated Sum',
            referenceId: null,
            tenantId,
            createdAt: stock.lastCreated,
          }
        ] as any[]
      };
    });
  }

  async addStock(tenantId: string, data: {
    itemId: string;
    quantity: number;
    reason: string;
    referenceId?: string;
  }) {
    // Ownership check
    const item = await this.findUnique(tenantId, data.itemId);
    if (!item) throw new Error("Item not found or unauthorized");

    return await prisma.stockEntry.create({
      data: {
        itemId: data.itemId,
        type: 'IN',
        quantity: data.quantity,
        reason: data.reason,
        referenceId: data.referenceId,
        tenantId,
      },
    });
  }

  async deductStock(tenantId: string, data: {
    itemId: string;
    quantity: number;
    reason: string;
    referenceId?: string;
  }) {
    // Ownership check
    const item = await this.findUnique(tenantId, data.itemId);
    if (!item) throw new Error("Item not found or unauthorized");

    return await prisma.stockEntry.create({
      data: {
        itemId: data.itemId,
        type: 'OUT',
        quantity: data.quantity,
        reason: data.reason,
        referenceId: data.referenceId,
        tenantId,
      },
    });
  }

  async getStockEntries(tenantId: string, itemId: string) {
    return await prisma.stockEntry.findMany({
      where: {
        itemId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
        take: DEFAULT_PAGE_SIZE
    });
  }
  
  async findUnique(tenantId: string, id: string) {
    return await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: { stockEntries: true }
    });
  }

  async updateItem(tenantId: string, id: string, data: Prisma.InventoryItemUpdateInput) {
    return await prisma.inventoryItem.update({
      where: { id, tenantId },
      data,
    });
  }

  async deleteItem(tenantId: string, id: string) {
    return await prisma.inventoryItem.delete({
      where: { id, tenantId },
    });
  }
}
