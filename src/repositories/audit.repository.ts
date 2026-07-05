const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/client";

export class AuditRepository {
  async create(tenantId: string, data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string | null;
  }) {
    return prisma.auditLog.create({
      data: {
        tenantId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        requestId: data.requestId,
      },
    });
  }

  async findMany(tenantId: string, where: any, limit: number, offset: number) {
    return prisma.auditLog.findMany({
      where: {
        ...where,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            memberships: {
              where: { tenantId },
              include: {
                staffProfile: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    });
  }

  async count(tenantId: string, where: any) {
    return prisma.auditLog.count({
      where: {
        ...where,
        tenantId,
      },
    });
  }

  async getDistinctActions(tenantId: string) {
    const records = await prisma.auditLog.findMany({
      where: { tenantId },
      distinct: ['action'],
      select: { action: true },
        take: DEFAULT_PAGE_SIZE
    });
    return records.map(r => r.action);
  }

  async getDistinctEntityTypes(tenantId: string) {
    const records = await prisma.auditLog.findMany({
      where: { tenantId },
      distinct: ['entityType'],
      select: { entityType: true },
        take: DEFAULT_PAGE_SIZE
    });
    return records.map(r => r.entityType);
  }
}
