const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import "server-only";
import { InventoryRepository } from "@/repositories/inventory.repository";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "./notification.service";

export class InventoryService {
  constructor(
    private readonly inventoryRepository = new InventoryRepository(),
    private readonly notificationService = new NotificationService()
  ) {}

  private normalizeString(val: string | undefined | null, fallback: string = ""): string {
    if (!val || typeof val !== 'string') return fallback;
    return val.trim();
  }

  private getSafeItemFallback(id?: string) {
    return {
      id: id || "unknown",
      name: "—",
      category: "—",
      unit: "—",
      minimumStock: 0,
      currentStock: 0,
      status: "OK",
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: "unknown",
    };
  }

  private validateTenant(tenantId: string) {
    if (!tenantId) {
      throw new Error("[InventoryService] Missing tenantId");
    }
  }

  async createItemService(tenantId: string, data: {
    name: string;
    category: string;
    unit: string;
    minimumStock: number;
    initialStock?: number;
  }) {
    try {
      this.validateTenant(tenantId);
      const normalizedData = {
        ...data,
        name: this.normalizeString(data.name, "New Item"),
        category: this.normalizeString(data.category, "General"),
        unit: this.normalizeString(data.unit, "unit"),
      };
      const result = await this.inventoryRepository.createItem(tenantId, normalizedData);
      return this.serializeItem(result);
    } catch (error) {
      console.error("[InventoryService.createItem] Error:", error);
      return this.getSafeItemFallback();
    }
  }

  async getItemsService(tenantId: string, filters?: {
    search?: string;
    category?: string;
  }) {
    try {
      this.validateTenant(tenantId);
      const items = await this.inventoryRepository.getItems(tenantId, filters);
      
      const processedItems = (items || []).map(item => {
        try {
          const currentStock = this.calculateCurrentStock(item.stockEntries || []);
          return {
            ...item,
            currentStock,
            status: currentStock <= (item.minimumStock || 0) ? 'LOW' : 'OK',
            stockEntries: undefined
          };
        } catch (err) {
          console.error("Error processing inventory item:", err);
          return this.getSafeItemFallback(item.id);
        }
      });

      return processedItems;
    } catch (error) {
      console.error("[InventoryService.getItems] Error:", error);
      return [];
    }
  }

  async addStockService(tenantId: string, data: {
    itemId: string;
    quantity: number;
    reason: string;
  }) {
    try {
      this.validateTenant(tenantId);
      const result = await this.inventoryRepository.addStock(tenantId, {
        ...data,
        reason: this.normalizeString(data.reason, "Stock In")
      });
      return result;
    } catch (error) {
      console.error("[InventoryService.addStock] Error:", error);
      return null;
    }
  }

  async deductStockService(tenantId: string, data: {
    itemId: string;
    quantity: number;
    reason: string;
  }) {
    try {
      this.validateTenant(tenantId);
      const item = await this.inventoryRepository.findUnique(tenantId, data.itemId);
      if (!item) throw new Error("Item not found");

      const currentStock = this.calculateCurrentStock(item.stockEntries || []);
      if (data.quantity > currentStock) {
        throw new Error(`Insufficient stock. Available: ${currentStock} ${item.unit}`);
      }

      const result = await this.inventoryRepository.deductStock(tenantId, {
        ...data,
        reason: this.normalizeString(data.reason, "Stock Out")
      });

      // Check for low stock alert
      const updatedItem = await this.inventoryRepository.findUnique(tenantId, data.itemId);
      if (updatedItem) {
          const newStock = this.calculateCurrentStock(updatedItem.stockEntries || []);
          if (newStock <= (updatedItem.minimumStock || 0)) {
              await this.notificationService.notifyEvent(tenantId, 'LOW_STOCK_ALERT', {
                  itemName: updatedItem.name,
                  currentStock: newStock,
                  unit: updatedItem.unit,
                  metadata: { itemId: updatedItem.id }
              });
          }
      }

      return result;
    } catch (error) {
      console.error("[InventoryService.deductStock] Error:", error);
      throw error; 
    }
  }

  async getInventoryStatsService(tenantId: string) {
    try {
      this.validateTenant(tenantId);
      const items = await this.inventoryRepository.getItems(tenantId);
      
      let totalItems = (items || []).length;
      let lowStockAlerts = 0;
      let lastAuditDate: Date | null = null;

      (items || []).forEach(item => {
        const currentStock = this.calculateCurrentStock(item.stockEntries || []);
        if (currentStock <= (item.minimumStock || 0)) {
          lowStockAlerts++;
        }

        (item.stockEntries || []).forEach(entry => {
          if (!lastAuditDate || entry.createdAt > lastAuditDate) {
            lastAuditDate = entry.createdAt;
          }
        });
      });

      return {
        totalItems,
        lowStockAlerts,
        lastAuditDate: lastAuditDate ? (lastAuditDate as Date).toLocaleDateString() : '—'
      };
    } catch (error) {
      console.error("[InventoryService.getInventoryStats] Error:", error);
      return { totalItems: 0, lowStockAlerts: 0, lastAuditDate: '—' };
    }
  }

  async getItemHistoryService(tenantId: string, itemId: string) {
    try {
      this.validateTenant(tenantId);
      const history = await this.inventoryRepository.getStockEntries(tenantId, itemId);
      return history || [];
    } catch (error) {
      console.error("[InventoryService.getItemHistory] Error:", error);
      return [];
    }
  }

  async updateItemService(tenantId: string, id: string, data: {
    name?: string;
    category?: string;
    unit?: string;
    minimumStock?: number;
  }) {
    try {
      this.validateTenant(tenantId);
      const normalizedData = {
        ...data,
        name: data.name ? this.normalizeString(data.name) : undefined,
        category: data.category ? this.normalizeString(data.category) : undefined,
        unit: data.unit ? this.normalizeString(data.unit) : undefined,
      };
      const result = await this.inventoryRepository.updateItem(tenantId, id, normalizedData);
      return this.serializeItem(result);
    } catch (error) {
      console.error("[InventoryService.updateItem] Error:", error);
      return this.getSafeItemFallback(id);
    }
  }

  async deleteItemService(tenantId: string, id: string) {
    try {
      this.validateTenant(tenantId);
      return await this.inventoryRepository.deleteItem(tenantId, id);
    } catch (error) {
      console.error("[InventoryService.deleteItem] Error:", error);
      return false;
    }
  }

  async consumeItemsFromService(tenantId: string, serviceId: string) {
    try {
      this.validateTenant(tenantId);
      const usages = await prisma.serviceInventoryUsage.findMany({
        where: { serviceId, tenantId },
        include: { inventory: true },
          take: DEFAULT_PAGE_SIZE
    });

      if (!usages || usages.length === 0) return;

      for (const usage of usages) {
        try {
          const item = await this.inventoryRepository.getItems(usage.tenantId, { search: usage.inventory.name });
          const targetItem = item.find(i => i.name === usage.inventory.name);

          if (targetItem) {
            await this.deductStockService(usage.tenantId, {
              itemId: targetItem.id,
              quantity: usage.quantity,
              reason: `Auto-consumed by Service Completion`
            }).catch(err => console.error(`Failed to auto-consume item ${targetItem.name}:`, err));
          }
        } catch (innerErr) {
          console.error(`Error consuming item for service ${serviceId}:`, innerErr);
        }
      }
    } catch (error) {
      console.error("[InventoryService.consumeItemsFromService] Error:", error);
    }
  }

  private calculateCurrentStock(entries: any[]): number {
    return (entries || []).reduce((acc, entry) => {
      const qty = (+(entry.quantity)) || 0;
      if (entry.type === 'IN') return acc + qty;
      if (entry.type === 'OUT') return acc - qty;
      return acc;
    }, 0);
  }

  private serializeItem(item: any) {
    if (!item) return this.getSafeItemFallback();
    try {
      return item;
    } catch (error) {
      console.error("[InventoryService.serializeItem] Error:", error);
      return this.getSafeItemFallback(item.id);
    }
  }
}
