import { prisma } from "@/lib/prisma";
import { Staff, Prisma } from "@/generated/client";

export class StaffRepository {
  async findMembers(tenantId: string): Promise<any[]> {
    return prisma.tenantMembership.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          }
        },
        staffProfile: true
      },
      orderBy: { joinedAt: 'desc' }
    });
  }

  async findInvitations(tenantId: string): Promise<any[]> {
    return prisma.staffInvitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find a staff profile by membership ID.
   * This aligns with the new relational model where membershipId is the primary link.
   */
  async findByMembershipId(tenantId: string, membershipId: string): Promise<Staff | null> {
    return prisma.staff.findFirst({
      where: {
        membershipId,
        tenantId,
      },
    });
  }

  async createInvitation(tenantId: string, data: any) {
    return prisma.staffInvitation.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  /**
   * Update staff profile using membership ID.
   */
  async updateByMembershipId(tenantId: string, membershipId: string, data: Prisma.StaffUpdateInput): Promise<Staff> {
    return prisma.staff.update({
      where: {
        membershipId,
        tenantId,
      },
      data,
    });
  }

  /**
   * Transactional deletion of staff member.
   * Deletes BOTH the staff profile and the tenant membership record.
   */
  async deleteStaffMember(tenantId: string, membershipId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Delete Staff Profile (if exists)
      await tx.staff.deleteMany({
        where: {
          membershipId,
          tenantId,
        }
      });

      // 2. Delete Tenant Membership
      await tx.tenantMembership.delete({
        where: {
          id: membershipId,
          tenantId,
        }
      });
    });
  }

  // Legacy compatibility (can be removed later if not used)
  async update(tenantId: string, id: string, data: Prisma.StaffUpdateInput): Promise<Staff> {
    return this.updateByMembershipId(tenantId, id, data);
  }

  async delete(tenantId: string, id: string): Promise<any> {
    return this.deleteStaffMember(tenantId, id);
  }
}
