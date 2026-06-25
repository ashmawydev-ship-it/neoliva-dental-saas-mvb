import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { rawPrisma } from '@/lib/prisma';
import type { Role } from './permissions';

export type UserSession = {
  userId: string;
  dbUserId: string;
  tenantId: string;
  role: Role;
  permissions: string[];
  isActive: boolean;
};

export const getUserSession = cache(async (): Promise<UserSession | null> => {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log(`[DIAGNOSTIC][GET_USER_SESSION] All cookies received:`, JSON.stringify(allCookies.map(c => c.name)));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  let user: any = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error(`[DIAGNOSTIC][GET_USER_SESSION] Supabase auth error:`, error.message, error.status);
    }
    user = data.user;
  } catch (err: any) {
    console.error(`[DIAGNOSTIC][GET_USER_SESSION] Token verification exception:`, err?.message || err);
    return null;
  }
  if (!user) {
    console.log(`[DIAGNOSTIC][GET_USER_SESSION] No user found. Returning null.`);
    return null;
  }

  let tenantId = cookieStore.get('active_tenant_id')?.value;

  // Resolve internal database user ID from Supabase auth user ID
  const dbUser = await rawPrisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true }
  });
  if (!dbUser) return null;

  let membership;

  if (tenantId) {
    // Query specific tenant_membership
    membership = await rawPrisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: dbUser.id,
          tenantId
        }
      },
      select: {
        role: true,
        status: true,
        permissions: true,
        isActive: true,
        tenantId: true
      }
    });
  } else {
    // Fallback to first active membership
    membership = await rawPrisma.tenantMembership.findFirst({
      where: {
        userId: dbUser.id,
        status: 'ACTIVE',
        isActive: true
      },
      select: {
        role: true,
        status: true,
        permissions: true,
        isActive: true,
        tenantId: true
      }
    });
    if (membership) {
      tenantId = membership.tenantId;
    }
  }

  if (!membership || membership.status !== 'ACTIVE' || !membership.isActive) return null;

  return {
    userId: user.id,
    dbUserId: dbUser.id,
    tenantId: tenantId!,
    role: membership.role as Role,
    permissions: membership.permissions ?? [],
    isActive: membership.isActive,
  };
});
