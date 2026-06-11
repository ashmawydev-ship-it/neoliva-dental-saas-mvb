'use server'

import { withPermission } from "@/lib/rbac/guard";


import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { StaffService } from "@/services/staff.service";



import { EventService } from "@/services/event.service";

import { wrapAction } from "@/lib/observability/wrap-action";

const staffService = new StaffService();

import { createStaffInvitation } from "./auth";

const getCachedStaffList = unstable_cache(
  async (tenantId: string) => {
    return await staffService.getStaffList(tenantId);
  },
  ['staff'],
  { revalidate: 300, tags: ['staff'] }
);

/**
 * Server Action: Fetches all staff members.
 */
export async function getStaff() {
  try {
    return await withPermission('staff', 'read', async (session) => {
      const tenantId = session.tenantId!;
      const data = await getCachedStaffList(tenantId);
      
          const getInitials = (name: string) => {
            const parts = name?.split(' ') || [];
            if (parts.length >= 2) {
              return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
            }
            return (name?.[0] || 'S').toUpperCase();
          }
      
          const colors = [
            'from-blue-500 to-indigo-600',
            'from-violet-500 to-purple-600',
            'from-pink-500 to-rose-600',
            'from-emerald-500 to-teal-600',
            'from-amber-500 to-orange-600'
          ];
      
          return data.map((member, index) => {
            const colorIndex = index % colors.length;
            
            const formatRole = (roleStr: string) => {
              if (!roleStr) return 'Receptionist';
              return roleStr.charAt(0).toUpperCase() + roleStr.slice(1).toLowerCase();
            };
      
            return {
              id: member.id,
              name: member.name || 'Unknown',
              role: formatRole(member.role),
              email: member.email || '—',
              avatar: getInitials(member.name),
              color: colors[colorIndex],
              status: member.status,
              isPending: member.isPending
            }
          })
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
        return [];
  }
}

export const createStaff = wrapAction(
  'STAFF_CREATE',
  async (formData: { name: string; role: string; title: string; email: string; phone: string; invite: boolean }) => {
    return withPermission('staff', 'create', async (session) => {
      const tenantId = session.tenantId!;
      // We call the auth action which handles the token, hashing and secure DB creation
          const result = await createStaffInvitation({
            email: formData.email,
            fullName: formData.name,
            role: formData.role as any,
            jobTitle: formData.title
          }, tenantId);
      
          if (!result.success) {
            throw new Error(result.error || "Failed to create invitation");
          }
      
          revalidatePath('/staff');
          revalidateTag('staff', 'default');
          return { id: result.invitationId, ...formData };
    });
  },
  { module: 'staff', entityType: 'STAFF' }
);

/**
 * Server Action: Updates a staff member.
 */
export const updateStaff = wrapAction(
  'STAFF_UPDATE',
  async (id: string, updates: Partial<{ name: string; role: string; title: string; email: string; phone: string; status: string }>) => {
    return withPermission('staff', 'update', async (session) => {
      const tenantId = session.tenantId!;
      const result = await staffService.updateStaffMember(tenantId, id, updates);
      
          if (updates.role) {
            await EventService.trackEvent({
              tenantId,
              eventType: 'STAFF_ROLE_CHANGED',
              entityType: 'STAFF',
              entityId: id,
              metadata: { newRole: updates.role }
            });
          }
      
          revalidatePath('/staff');
          revalidateTag('staff', 'default');
          return result;
    });
  },
  { module: 'staff', entityType: 'STAFF' }
);

/**
 * Server Action: Deletes a staff member.
 */
export const deleteStaff = wrapAction(
  'STAFF_DELETE',
  async (id: string) => {
    return withPermission('staff', 'delete', async (session) => {
      const tenantId = session.tenantId!;
      await staffService.deleteStaffMember(tenantId, id);
      
          await EventService.trackEvent({
            tenantId,
            eventType: 'STAFF_DELETED',
            entityType: 'STAFF',
            entityId: id
          });
      
          revalidatePath('/staff');
          revalidateTag('staff', 'default');
          return { success: true, error: undefined };
    });
  },
  { module: 'staff', entityType: 'STAFF' }
);
