require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const memberships = await prisma.tenantMembership.findMany({ include: { staffProfile: true, user: true } });
  const invitations = await prisma.staffInvitation.findMany();
  console.log('Memberships:', memberships.map(m => ({ email: m.user?.email, staffId: m.staffProfile?.id })));
  console.log('Invitations:', invitations.map(i => ({ email: i.email, status: i.status })));
}
main().finally(() => prisma.$disconnect());
