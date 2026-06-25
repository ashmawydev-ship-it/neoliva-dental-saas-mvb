import "server-only";
import { SmsTemplateRepository } from '@/repositories/smsTemplate.repository';
import { Prisma } from '@/generated/client';

export type TemplateCategory = 'REMINDERS' | 'OCCASIONS' | 'CAMPAIGNS';

export interface SmsTemplateCreateInput {
  name: string;
  category: TemplateCategory;
  message: string;
  variables: string[];
  isActive: boolean;
}

export class SmsTemplateService {
  static instance?: SmsTemplateService;

  constructor(
    private readonly smsTemplateRepository = new SmsTemplateRepository()
  ) {}
  async getTemplates(tenantId: string) {
    try {
      if (!tenantId) throw new Error("Missing tenantId");
      return await this.smsTemplateRepository.findMany(tenantId);
    } catch (error: any) {
      console.warn("[SmsTemplateService] Failed to get templates:", error.message);
      throw error;
    }
  }

  async getTemplate(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) throw new Error("Missing tenantId or id");
      return await this.smsTemplateRepository.findUnique(tenantId, id);
    } catch (error: any) {
      console.warn(`[SmsTemplateService] Failed to get template ${id}:`, error.message);
      throw error;
    }
  }

  async createTemplate(tenantId: string, data: SmsTemplateCreateInput) {
    try {
      if (!tenantId) throw new Error("Missing tenantId");
      return await this.smsTemplateRepository.create(tenantId, {
        tenantId,
        name: data.name,
        category: data.category,
        message: data.message,
        variables: data.variables as Prisma.InputJsonValue,
        isActive: data.isActive
      });
    } catch (error: any) {
      console.warn("[SmsTemplateService] Failed to create template:", error.message);
      throw error;
    }
  }

  async updateTemplate(tenantId: string, id: string, data: Partial<SmsTemplateCreateInput>) {
    try {
      if (!tenantId || !id) throw new Error("Missing tenantId or id");
      return await this.smsTemplateRepository.update(tenantId, id, {
        name: data.name,
        category: data.category,
        message: data.message,
        variables: data.variables ? (data.variables as Prisma.InputJsonValue) : undefined,
        isActive: data.isActive
      });
    } catch (error: any) {
      console.warn(`[SmsTemplateService] Failed to update template ${id}:`, error.message);
      throw error;
    }
  }

  async deleteTemplate(tenantId: string, id: string) {
    try {
      if (!tenantId || !id) throw new Error("Missing tenantId or id");
      return await this.smsTemplateRepository.delete(tenantId, id);
    } catch (error: any) {
      console.warn(`[SmsTemplateService] Failed to delete template ${id}:`, error.message);
      throw error;
    }
  }

  async duplicateTemplate(tenantId: string, id: string) {
    try {
      const existing = await this.getTemplate(tenantId, id);
      if (!existing) throw new Error("Template not found");

      return await this.smsTemplateRepository.create(tenantId, {
        tenantId,
        name: `${existing.name} (Copy)`,
        category: existing.category,
        message: existing.message,
        variables: existing.variables || [],
        isActive: false
      });
    } catch (error: any) {
      console.warn(`[SmsTemplateService] Failed to duplicate template ${id}:`, error.message);
      throw error;
    }
  }
}

export const smsTemplateService = new SmsTemplateService();
