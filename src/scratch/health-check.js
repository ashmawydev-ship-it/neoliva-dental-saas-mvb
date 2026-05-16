
const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function checkAuthLogic() {
  console.log("Checking Auth Logic synchronization...");
  
  const tenants = await prisma.tenant.findMany({
    take: 5,
    select: { id: true, name: true, status: true }
  });
  
  console.table(tenants);
  
  const activeSessions = await prisma.session.count({
    where: { isRevoked: false }
  });
  console.log(`Current active sessions: ${activeSessions}`);
}

checkAuthLogic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
