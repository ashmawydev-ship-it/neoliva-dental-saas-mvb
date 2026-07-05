const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

export class SmsTemplateRepository {
  /**
   * Safe getter for the Prisma model to prevent crashes if the dev server
   * hasn't picked up the latest generated client schema.
   */
  private get model() {
    if (!prisma.smsTemplate) {
      throw new Error("SmsTemplate model is missing from the Prisma client. Please restart the dev server.");
    }
    return prisma.smsTemplate;
  }

  async findMany(tenantId: string) {
    return await this.model.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async findUnique(tenantId: string, id: string) {
    if (!id) {
      throw new Error("SmsTemplateRepository.findUnique: id is required");
    }
    return await this.model.findUnique({
      where: { id, tenantId }
    });
  }

  async create(tenantId: string, data: Prisma.SmsTemplateUncheckedCreateInput) {
    return await this.model.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  async update(tenantId: string, id: string, data: Prisma.SmsTemplateUpdateInput) {
    return await this.model.update({
      where: { id, tenantId },
      data
    });
  }

  async delete(tenantId: string, id: string) {
    return await this.model.delete({
      where: { id, tenantId }
    });
  }
}
