
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function auditMemberships() {
  const emails = ['ashmawyalaa@gmail.com', 'neoliva.store@gmail.com'];
  
  console.log('--- MEMBERSHIP AUDIT ---');
  
  for (const email of emails) {
    console.log(`\nAuditing: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: true
          }
        }
      }
    });
    
    if (!user) {
      console.error(`[ERROR] User record not found in Prisma for ${email}`);
      continue;
    }
    
    console.log(`User found: ID=${user.id}, SupabaseID=${user.supabaseId}`);
    console.log(`Memberships count: ${user.memberships.length}`);
    
    user.memberships.forEach((m, i) => {
      console.log(`  Membership #${i+1}:`);
      console.log(`    Tenant: ${m.tenant.name} (${m.tenant.slug})`);
      console.log(`    Status: ${m.status}`);
      console.log(`    Role: ${m.role}`);
      console.log(`    Tenant Status: ${m.tenant.status}`);
    });
  }
}

auditMemberships()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
