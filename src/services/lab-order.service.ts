import "server-only";
import { LabOrderRepository } from "@/repositories/lab-order.repository";
import { LabOrderStatus } from "@/generated/client";

import { NotificationService } from "./notification.service";

export class LabOrderService {
  static instance?: LabOrderService;

  constructor(
    private readonly repository = new LabOrderRepository(),
    private readonly notificationService = NotificationService.instance || new NotificationService()
  ) {}
  private normalizeString(val: string | undefined | null, fallback: string = ""): string {
    if (!val || typeof val !== 'string') return fallback;
    return val.trim();
  }

  private getSafeOrderFallback(id?: string) {
    return {
      id: id || "unknown",
      displayId: "LAB-0000",
      labName: "—",
      itemType: "—",
      toothNumber: null,
      cost: 0,
      status: "PENDING" as LabOrderStatus,
      sentAt: null,
      dueDate: null,
      receivedAt: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      patientName: "—",
      patientDisplayId: "",
    };
  }

  private validateTenant(tenantId: string) {
    if (!tenantId) {
      throw new Error("[LabOrderService] Missing tenantId");
    }
  }

  /**
   * Helper to ensure LabOrder objects are serializable for Client Components
   */
  private serializeLabOrder(order: any) {
    if (!order) return this.getSafeOrderFallback();
    try {
      const result = {
        ...order,
        cost: order.cost ? (+(order.cost)) : 0,
        patientName: order.patient?.name || "—",
        patientDisplayId: order.patient?.displayId || "",
      };
      return result;
    } catch (error) {
      console.error("[LabOrderService.serialize] Serialization error:", error);
      return this.getSafeOrderFallback(order?.id);
    }
  }

  /**
   * Fetches and formats the list of lab orders for the UI
   */
  async getLabOrdersList(tenantId: string) {
    try {
      this.validateTenant(tenantId);
      const orders = await this.repository.findMany(tenantId, {
        orderBy: { createdAt: 'desc' }
      });
      return (orders || []).map(order => this.serializeLabOrder(order));
    } catch (error) {
      console.error("[LabOrderService.getLabOrdersList] Error:", error);
      return [];
    }
  }

  /**
   * Calculates statistics for the lab orders dashboard
   */
  async getLabOrdersStats(tenantId: string) {
    try {
      this.validateTenant(tenantId);
      const stats = await this.repository.getStats(tenantId);
      return stats || { activeCases: 0, dueThisWeek: 0, received: 0, monthlyCost: 0 };
    } catch (error) {
      console.error("[LabOrderService.getLabOrdersStats] Error:", error);
      return { activeCases: 0, dueThisWeek: 0, received: 0, monthlyCost: 0 };
    }
  }

  /**
   * Creates a new lab order
   */
  async createLabOrder(tenantId: string, data: {
    patientId: string;
    appointmentId?: string;
    labName: string;
    itemType: string;
    toothNumber?: string;
    cost?: number;
    dueDate?: string;
    notes?: string;
  }) {
    try {
      this.validateTenant(tenantId);
      // Validation
      if (!data.patientId || !data.labName || !data.itemType) {
        throw new Error("Missing required fields: patientId, labName, or itemType");
      }

      const createData: any = {
        displayId: `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
        labName: this.normalizeString(data.labName, "Unknown Lab"),
        itemType: this.normalizeString(data.itemType, "General"),
        toothNumber: data.toothNumber ? this.normalizeString(data.toothNumber) : null,
        cost: data.cost ? (+(data.cost)) : 0,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes ? this.normalizeString(data.notes) : null,
        status: 'PENDING',
        patientId: data.patientId,
        appointmentId: data.appointmentId || null,
      };

      const newOrder = await this.repository.create(tenantId, createData);
      return this.serializeLabOrder(newOrder);
    } catch (error) {
      console.error("[LabOrderService.createLabOrder] Error:", error);
      return this.getSafeOrderFallback();
    }
  }

  /**
   * Updates the status of a lab order and manages lifecycle dates
   */
  async updateLabOrderStatus(tenantId: string, id: string, status: LabOrderStatus) {
    try {
      this.validateTenant(tenantId);
      const updated = await this.repository.updateStatus(tenantId, id, status);
      const serialized = this.serializeLabOrder(updated);

      if (status === 'RECEIVED') {
          await this.notificationService.notifyEvent(tenantId, 'LAB_READY', {
              patientName: serialized.patientName || "Patient",
              itemType: serialized.itemType,
              metadata: { orderId: serialized.id }
          });
      }

      return serialized;
    } catch (error) {
      console.error("[LabOrderService.updateLabOrderStatus] Error:", error);
      return this.getSafeOrderFallback(id);
    }
  }

  /**
   * Simple delete for management
   */
  async deleteLabOrder(tenantId: string, id: string) {
    try {
      this.validateTenant(tenantId);
      const deleted = await this.repository.delete(tenantId, id);
      return this.serializeLabOrder(deleted);
    } catch (error) {
      console.error("[LabOrderService.deleteLabOrder] Error:", error);
      return this.getSafeOrderFallback(id);
    }
  }
}

