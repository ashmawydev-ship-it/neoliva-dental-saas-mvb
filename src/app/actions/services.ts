'use server'

import { withPermission } from "@/lib/rbac/guard";


import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { ServiceService } from "@/services/service.service";
import { ServiceCategory } from "@/generated/client";




import { wrapAction } from "@/lib/observability/wrap-action";

const serviceService = new ServiceService();

const getCachedServices = unstable_cache(
  async (tenantId: string) => {
    return await serviceService.getServices(tenantId);
  },
  ['services-v3'],
  { revalidate: 300, tags: ['services'] }
);

/**
 * Server Action: Fetches all dental services.
 */
export async function getServices() {
  try {
    return await withPermission('settings', 'read', async (session) => {
      const tenantId = session.tenantId!;
      const data = await getCachedServices(tenantId);
          return data.map(service => ({ ...service, price: Number(service.price) }));
    });
  } catch (error) {
    console.error('[Actions] Error fetching services:', error);
        return [];
  }
}

/**
 * Server Action: Creates a new dental service.
 */
export const createServiceAction = wrapAction(
  'SERVICE_CREATE',
  async (data: {
    name: string;
    category: ServiceCategory;
    price: number;
    duration: number;
    description?: string;
    popular?: boolean;
  }) => {
    return withPermission('settings', 'create', async (session) => {
      const tenantId = session.tenantId!;
      const result = await serviceService.createService(tenantId, data);
          revalidatePath('/services');
          revalidatePath('/appointments'); 
          revalidateTag('services', 'default');
          return { ...result, price: Number(result.price) };
    });
  },
  { module: 'settings', entityType: 'SERVICE' }
);

/**
 * Server Action: Updates a dental service.
 */
export const updateServiceAction = wrapAction(
  'SERVICE_UPDATE',
  async (id: string, data: Partial<{
    name: string;
    category: ServiceCategory;
    price: number;
    duration: number;
    description: string;
    popular: boolean;
  }>) => {
    return withPermission('settings', 'update', async (session) => {
      const tenantId = session.tenantId!;
      const result = await serviceService.updateService(tenantId, id, data);
          revalidatePath('/services');
          revalidateTag('services', 'default');
          return { ...result, price: Number(result.price) };
    });
  },
  { module: 'settings', entityType: 'SERVICE' }
);

/**
 * Server Action: Deletes a dental service.
 */
export const deleteServiceAction = wrapAction(
  'SERVICE_DELETE',
  async (id: string) => {
    return withPermission('settings', 'delete', async (session) => {
      const tenantId = session.tenantId!;
      const result = await serviceService.deleteService(tenantId, id);
          revalidatePath('/services');
          revalidateTag('services', 'default');
          return result;
    });
  },
  { module: 'settings', entityType: 'SERVICE' }
);
