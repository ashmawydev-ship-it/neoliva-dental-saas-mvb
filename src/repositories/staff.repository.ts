import { prisma, rawPrisma } from "@/lib/prisma";
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

  /**
   * findActiveMembers — Narrow projection for staff-selection dropdowns.
   *
   * Returns only the fields needed to populate a staff option list
   * (userId, email, staffProfile name, and membership role).
   * This replaces the inlined prisma.tenantMembership.findMany() that
   * previously lived inside the getStaffOptionsAction Server Action.
   */
  async findActiveMembers(tenantId: string): Promise<Array<{
    userId: string;
    role: string;
    user: { id: string; email: string };
    staffProfile: { name: string } | null;
  }>> {
    return prisma.tenantMembership.findMany({
      where: { tenantId, isActive: true },
      select: {
        userId:  true,
        role:    true,
        user:    { select: { id: true, email: true } },
        staffProfile: { select: { name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    }) as any;
  }

  async findInvitations(tenantId: string): Promise<any[]> {
    return prisma.staffInvitation.findMany({
      where: { tenantId, status: 'PENDING' },
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

  async deleteInvitation(tenantId: string, id: string): Promise<void> {
    await prisma.staffInvitation.deleteMany({
      where: { id, tenantId }
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

  // Invitation & Acceptance Operations
  async findPendingInvitation(email: string) {
    return prisma.staffInvitation.findFirst({
      where: { email, status: 'PENDING' }
    });
  }

  async findInvitationByToken(tokenHash: string) {
    return prisma.staffInvitation.findUnique({
      where: { tokenHash },
      include: { tenant: true }
    });
  }

  async findPendingInvitationByTenant(tenantId: string, email: string) {
    return prisma.staffInvitation.findFirst({
      where: { tenantId, email, status: 'PENDING' }
    });
  }

  async acceptInvitation(supabaseUserId: string, invite: { id: string, email: string, tenantId: string, role: any, fullName: string }) {
    return rawPrisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: invite.email },
        update: { supabaseId: supabaseUserId },
        create: {
          supabaseId: supabaseUserId,
          email: invite.email
        }
      });

      const membership = await tx.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: invite.tenantId,
          role: invite.role,
          status: 'ACTIVE'
        }
      });

      await tx.staff.create({
        data: {
          name: invite.fullName,
          email: invite.email,
          role: invite.role,
          tenantId: invite.tenantId,
          membershipId: membership.id,
          status: 'Online'
        }
      });

      await tx.staffInvitation.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      });

      return { user, membership };
    });
  }

  async findStaff(tenantId: string, role?: any, select?: Prisma.StaffSelect) {
    return prisma.staff.findMany({
      where: {
        tenantId,
        ...(role ? { role } : {}),
      },
      select,
    });
  }
}
