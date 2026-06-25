import "server-only";
import { StaffRepository } from "@/repositories/staff.repository";
import { StaffRole } from "@/generated/client";

export class StaffService {
  static instance?: StaffService;

  constructor(
    private readonly repository = new StaffRepository()
  ) {}

  private normalizeString(val: string | undefined | null, fallback: string = ""): string {
    if (!val || typeof val !== 'string') return fallback;
    return val.trim();
  }

  private getSafeStaffFallback(id?: string) {
    return {
      id: id || "unknown",
      displayId: "STF-0000",
      name: "—",
      role: "STAFF" as StaffRole,
      title: "",
      email: "",
      phone: "",
      status: "Offline",
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: "unknown",
    };
  }

  private validateTenant(tenantId: string) {
    if (!tenantId) {
      throw new Error("[StaffService] Missing tenantId");
    }
  }

  private serializeStaff(staff: any) {
    if (!staff) return this.getSafeStaffFallback();
    try {
      return JSON.parse(JSON.stringify(staff));
    } catch (error) {
      console.error("[StaffService.serialize] Serialization error:", error);
      return this.getSafeStaffFallback(staff?.id);
    }
  }

  /**
   * Fetches the complete staff list for a tenant, including both active members
   * and pending invitations.
   * IDs returned for active members are TenantMembership IDs.
   */
  async getStaffList(tenantId: string) {
    try {
      this.validateTenant(tenantId);
      
      const [members, invitations] = await Promise.all([
        this.repository.findMembers(tenantId),
        this.repository.findInvitations(tenantId)
      ]);

      const activeStaff = members.map(m => ({
        id: m.id, // TenantMembership ID
        name: m.staffProfile?.name || m.user.email.split('@')[0],
        email: m.user.email,
        role: m.role,
        status: m.staffProfile?.status || 'Online',
        isPending: false,
        title: m.staffProfile?.title || 'Staff Member',
        joinedAt: m.joinedAt
      }));

      const pendingStaff = invitations.map(i => ({
        id: i.id, // Invitation ID
        name: i.fullName,
        email: i.email,
        role: i.role,
        status: 'Pending',
        isPending: true,
        title: i.jobTitle || 'Invited',
        joinedAt: i.createdAt
      }));

      return [...activeStaff, ...pendingStaff];
    } catch (error) {
      console.error("[StaffService.getStaffList] Error:", error);
      return [];
    }
  }

  /**
   * getStaffOptions
   *
   * Returns the compact staff list used for assignment dropdowns (e.g., room
   * staff assignment). Only active members are included.
   *
   * This method is the authoritative replacement for the inlined
   * `prisma.tenantMembership.findMany` that previously existed inside the
   * `getStaffOptionsAction` Server Action (Violation 2).
   */
  async getStaffOptions(tenantId: string): Promise<Array<{
    userId: string;
    name: string;
    role: string;
  }>> {
    try {
      this.validateTenant(tenantId);
      const members = await this.repository.findActiveMembers(tenantId);
      return members.map(m => ({
        userId: m.userId,
        name:   m.staffProfile?.name || m.user?.email || 'Unknown',
        role:   m.role,
      }));
    } catch (error) {
      console.error("[StaffService.getStaffOptions] Error:", error);
      return [];
    }
  }

  /**
   * Updates a staff member's profile using their membershipId.
   */
  async updateStaffMember(tenantId: string, membershipId: string, updates: any): Promise<any> {
    try {
      this.validateTenant(tenantId);
      
      const formattedUpdates = { 
        ...updates,
        name: updates.name ? this.normalizeString(updates.name) : undefined,
        email: updates.email ? this.normalizeString(updates.email).toLowerCase() : undefined,
        phone: updates.phone ? this.normalizeString(updates.phone) : undefined,
      };
      
      if (formattedUpdates.role) {
        // Ensure role matches StaffRole enum if needed, but repository handles Prisma.StaffUpdateInput
      }
      
      const result = await this.repository.updateByMembershipId(tenantId, membershipId, {
        ...formattedUpdates,
        updatedAt: new Date()
      });
      
      return this.serializeStaff(result);
    } catch (error) {
      console.error("[StaffService.updateStaffMember] Error:", error);
      return this.getSafeStaffFallback(membershipId);
    }
  }

  /**
   * Transactionally deletes a staff member's profile and membership.
   */
  async deleteStaffMember(tenantId: string, id: string): Promise<void> {
    try {
      this.validateTenant(tenantId);

      // Check if this ID is actually a pending invitation
      const { prisma } = await import("@/lib/prisma");
      const invitation = await prisma.staffInvitation.findUnique({
        where: { id }
      });

      if (invitation && invitation.tenantId === tenantId) {
        // Delete the invitation instead
        await this.repository.deleteInvitation(tenantId, id);
        return;
      }

      // Otherwise, it's an active staff membership
      await this.repository.deleteStaffMember(tenantId, id);
    } catch (error) {
      console.error("[StaffService.deleteStaffMember] Error:", error);
      throw error;
    }
  }
}
