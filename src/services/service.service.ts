import "server-only";
import { ServiceRepository } from "@/repositories/service.repository";
import { ServiceCategory } from "@/generated/client";

export class ServiceService {
  static instance?: ServiceService;

  constructor(
    private readonly repository = new ServiceRepository()
  ) {}

  private normalizeString(val: string | undefined | null): string {
    return (val || "").trim();
  }

  private getSafeServiceFallback(id?: string) {
    return {
      id: id || "unknown",
      name: "—",
      description: "",
      price: 0,
      duration: 30,
      category: "GENERAL" as ServiceCategory,
      isActive: true,
      popular: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: "unknown",
    };
  }

  async getServices(tenantId: string) {
    try {
      const services = await this.repository.findMany(tenantId, {
        orderBy: { name: 'asc' }
      });
      return (services || []).map(s => this.serializeService(s));
    } catch (error) {
      console.error("[ServiceService.getServices] Error:", error);
      return [];
    }
  }

  async createService(tenantId: string, data: {
    name: string;
    category: ServiceCategory;
    price: number;
    duration: number;
    description?: string;
    popular?: boolean;
  }) {
    try {
      const result = await this.repository.create(tenantId, {
        name: this.normalizeString(data.name),
        category: data.category,
        price: Number(data.price) || 0,
        duration: Number(data.duration) || 30,
        description: this.normalizeString(data.description),
        popular: !!data.popular
      });
      return this.serializeService(result);
    } catch (error) {
      console.error("[ServiceService.createService] Error:", error);
      return this.getSafeServiceFallback();
    }
  }

  async updateService(tenantId: string, id: string, data: Partial<{
    name: string;
    category: ServiceCategory;
    price: number;
    duration: number;
    description: string;
    popular: boolean;
  }>) {
    try {
      const result = await this.repository.update(tenantId, id, {
        name: data.name ? this.normalizeString(data.name) : undefined,
        category: data.category,
        price: data.price !== undefined ? Number(data.price) : undefined,
        duration: data.duration !== undefined ? Number(data.duration) : undefined,
        description: data.description ? this.normalizeString(data.description) : undefined,
        popular: data.popular !== undefined ? !!data.popular : undefined,
        updatedAt: new Date()
      });
      return this.serializeService(result);
    } catch (error) {
      console.error("[ServiceService.updateService] Error:", error);
      return this.getSafeServiceFallback(id);
    }
  }

  async deleteService(tenantId: string, id: string) {
    try {
      const result = await this.repository.softDelete(tenantId, id);
      return this.serializeService(result);
    } catch (error) {
      console.error("[ServiceService.deleteService] Error:", error);
      return this.getSafeServiceFallback(id);
    }
  }

  private serializeService(s: any) {
    if (!s) return this.getSafeServiceFallback();
    try {
      return JSON.parse(JSON.stringify({
        ...s,
        price: s.price ? Number(s.price) : 0,
      }));
    } catch (error) {
      console.error("[ServiceService.serialize] Serialization error:", error);
      return this.getSafeServiceFallback(s?.id);
    }
  }
}
