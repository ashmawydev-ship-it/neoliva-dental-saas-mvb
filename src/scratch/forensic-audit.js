
const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

async function forensicAudit() {
  const email = 'neoliva.store@gmail.com';
  console.log(`--- FORENSIC AUDIT: ${email} ---`);
  
  // 1. Check User record
  const user = await prisma.user.findFirst({
    where: { email: email },
    include: {
      memberships: {
        include: {
          tenant: true
        }
      }
    }
  });
  
  if (!user) {
    console.log("❌ USER_NOT_FOUND in DB.");
    // Check invitations
    const invite = await prisma.staffInvitation.findFirst({ where: { email } });
    if (invite) {
      console.log(`Found PENDING invitation: ${invite.id} (Status: ${invite.status})`);
    }
    return;
  }
  
  console.log(`✅ USER_FOUND: ID=${user.id}, SupabaseId=${user.supabaseId}`);
  console.log(`Memberships: ${user.memberships.length}`);
  
  user.memberships.forEach(m => {
    console.log(`- Membership: ID=${m.id}, Role=${m.role}, Status=${m.status}`);
    console.log(`  Tenant: ID=${m.tenantId}, Name=${m.tenant.name}, Status=${m.tenant.status}`);
  });
  
  // 2. Check Sessions
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log(`Recent Sessions: ${sessions.length}`);
  sessions.forEach(s => {
    console.log(`- Session: ID=${s.id}, Created=${s.createdAt}, Revoked=${s.isRevoked}`);
  });
  
  console.log("--- AUDIT COMPLETE ---");
}

forensicAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
