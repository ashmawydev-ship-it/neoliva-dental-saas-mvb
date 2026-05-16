import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function auditPrismaUsers() {
  const emails = ['ashmawyalaa@gmail.com', 'neoliva.store@gmail.com'];
  
  for (const email of emails) {
    console.log(`\n--- Prisma User: ${email} ---`);
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
    
    if (user) {
      console.log(`- ID: ${user.id}`);
      console.log(`- SupabaseId: ${user.supabaseId}`);
      console.log(`- Memberships: ${user.memberships.length}`);
      user.memberships.forEach(m => {
        console.log(`  - Membership ID: ${m.id}`);
        console.log(`    - Tenant: ${m.tenant.name} (${m.tenant.id})`);
        console.log(`    - Status: ${m.status}`);
        console.log(`    - Role: ${m.role}`);
        console.log(`    - Tenant Status: ${m.tenant.status}`);
      });
    } else {
      console.log(`NOT FOUND in Prisma.`);
    }
  }
  
  await prisma.$disconnect();
}

auditPrismaUsers().catch(console.error);
