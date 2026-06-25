import "server-only";
import { TreatmentPlanRepository } from "@/repositories/treatment-plan.repository";
import { Prisma } from "@/generated/client";

export class TreatmentPlanService {
  static instance?: TreatmentPlanService;

  constructor(
    private readonly repository = new TreatmentPlanRepository()
  ) {}

  private normalizeString(val: string | undefined | null, fallback: string = ""): string {
    if (!val || typeof val !== 'string') return fallback;
    return val.trim();
  }

  private getSafePlanFallback(id?: string) {
    return {
      id: id || "unknown",
      title: "—",
      status: "ACTIVE",
      notes: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      items: []
    };
  }

  private validateTenant(tenantId: string) {
    if (!tenantId) {
      throw new Error("[TreatmentPlanService] Missing tenantId");
    }
  }

  private serializePlan(plan: any) {
    if (!plan) return this.getSafePlanFallback();
    try {
      return JSON.parse(JSON.stringify(plan));
    } catch (error) {
      console.error("[TreatmentPlanService.serialize] Serialization error:", error);
      return this.getSafePlanFallback(plan?.id);
    }
  }

  async getTreatmentPlans(tenantId: string, patientId: string) {
    try {
      this.validateTenant(tenantId);
      if (!patientId) return [];
      const plans = await this.repository.findMany(tenantId, {
        where: { patientId },
        select: {
          id: true,
          patientId: true,
          title: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          invoices: { select: { id: true, displayId: true } },
          items: {
            include: { doctor: { select: { id: true, name: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return (plans || []).map(plan => this.serializePlan(plan));
    } catch (error) {
      console.error("[TreatmentPlanService.getTreatmentPlans] Error:", error);
      return [];
    }
  }

  async createTreatmentPlan(tenantId: string, patientId: string, data: any) {
    try {
      this.validateTenant(tenantId);
      if (!patientId) throw new Error("Missing patientId");

      const result = await this.repository.create(tenantId, {
        patient: { connect: { id: patientId } },
        title: this.normalizeString(data.title, "Untitled Plan"),
        status: data.status || 'ACTIVE',
        notes: this.normalizeString(data.notes),
        items: {
          create: (data.phases || []).map((ph: any, i: number) => ({
            tenant: { connect: { id: tenantId } },
            serviceName: this.normalizeString(ph.name, "Phase " + (i + 1)),
            service: ph.serviceId ? { connect: { id: ph.serviceId } } : undefined,
            doctor: ph.doctorId ? { connect: { id: ph.doctorId } } : undefined,
            toothList: ph.toothList?.join(',') || null,
            step: i + 1,
            status: ph.status || 'PLANNED',
            price: parseFloat(ph.price?.toString().replace(/[^0-9.]/g, "")) || 0,
            scheduledDate: ph.date && ph.date !== 'TBD' ? new Date(ph.date) : null,
            notes: this.normalizeString(ph.notes)
          }))
        }
      });
      return this.serializePlan(result);
    } catch (error) {
      console.error("[TreatmentPlanService.createTreatmentPlan] Error:", error);
      return this.getSafePlanFallback();
    }
  }

  async updatePlanStatus(tenantId: string, planId: string, status: string) {
    try {
      this.validateTenant(tenantId);
      const result = await this.repository.update(tenantId, planId, {
        status: status as any,
        updatedAt: new Date()
      });
      return this.serializePlan(result);
    } catch (error) {
      console.error("[TreatmentPlanService.updatePlanStatus] Error:", error);
      return this.getSafePlanFallback(planId);
    }
  }

  async deleteTreatmentPlan(tenantId: string, planId: string) {
    try {
      this.validateTenant(tenantId);
      
      // Check if there are any generated invoices linked to this plan
      const linkedInvoice = await this.repository.findMany(tenantId, {
        where: { id: planId },
        select: { invoices: { select: { id: true } } }
      });
      if (linkedInvoice?.[0]?.invoices?.length > 0) {
        throw new Error("Cannot delete a treatment plan that has a linked invoice.");
      }

      return await this.repository.delete(tenantId, planId);
    } catch (error: any) {
      console.error("[TreatmentPlanService.deleteTreatmentPlan] Error:", error);
      throw error;
    }
  }

  async addTreatmentPhase(tenantId: string, planId: string, phaseData: any, step: number) {
    try {
      this.validateTenant(tenantId);
      const result = await this.repository.createItem(tenantId, {
        plan: { connect: { id: planId } },
        serviceName: this.normalizeString(phaseData.name, "New Phase"),
        service: phaseData.serviceId ? { connect: { id: phaseData.serviceId } } : undefined,
        doctor: phaseData.doctorId ? { connect: { id: phaseData.doctorId } } : undefined,
        toothList: phaseData.toothList?.join(',') || null,
        step: step,
        status: phaseData.status || 'PLANNED',
        price: parseFloat(phaseData.price?.toString().replace(/[^0-9.]/g, "")) || 0,
        scheduledDate: phaseData.date && phaseData.date !== 'TBD' ? new Date(phaseData.date) : null,
        notes: this.normalizeString(phaseData.notes)
      });
      return JSON.parse(JSON.stringify(result));
    } catch (error) {
      console.error("[TreatmentPlanService.addTreatmentPhase] Error:", error);
      return null;
    }
  }

  async updatePhaseStatus(tenantId: string, phaseId: string, status: string) {
    try {
      this.validateTenant(tenantId);
      const result = await this.repository.updateItem(tenantId, phaseId, {
        status: status as any,
        updatedAt: new Date()
      });
      return JSON.parse(JSON.stringify(result));
    } catch (error) {
      console.error("[TreatmentPlanService.updatePhaseStatus] Error:", error);
      return null;
    }
  }

  async deleteTreatmentPhase(tenantId: string, phaseId: string) {
    try {
      this.validateTenant(tenantId);
      return await this.repository.deleteItem(tenantId, phaseId);
    } catch (error) {
      console.error("[TreatmentPlanService.deleteTreatmentPhase] Error:", error);
      return false;
    }
  }
}

