
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyReenableFlow() {
  console.log("--- START RE-ENABLE FLOW VERIFICATION ---");
  
  // 1. Find a disabled tenant
  const disabledTenant = await prisma.tenant.findFirst({
    where: { status: 'DISABLED' }
  });
  
  if (!disabledTenant) {
    console.log("No DISABLED tenant found to test. Creating one...");
    // Just find any approved one and flip it
    const anyTenant = await prisma.tenant.findFirst({ where: { status: 'APPROVED' } });
    if (!anyTenant) {
      console.error("No tenants found in DB.");
      return;
    }
    await prisma.tenant.update({
      where: { id: anyTenant.id },
      data: { status: 'DISABLED' }
    });
    console.log(`Tenant ${anyTenant.name} (${anyTenant.id}) is now DISABLED.`);
    testTenant(anyTenant.id);
  } else {
    console.log(`Found DISABLED tenant: ${disabledTenant.name} (${disabledTenant.id})`);
    testTenant(disabledTenant.id);
  }
}

async function testTenant(tenantId) {
  // 2. Flip to APPROVED
  console.log(`Updating tenant ${tenantId} to APPROVED...`);
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: 'APPROVED' }
  });
  
  console.log(`New Status: ${updated.status}`);
  
  if (updated.status === 'APPROVED') {
    console.log("✅ Tenant status updated successfully.");
  } else {
    console.error("❌ Failed to update tenant status.");
  }

  // 3. Verify Membership is still ACTIVE
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: tenantId }
  });
  
  console.log(`Found ${memberships.length} memberships for this tenant.`);
  const allActive = memberships.every(m => m.status === 'ACTIVE');
  if (allActive) {
    console.log("✅ All memberships are still ACTIVE.");
  } else {
    console.warn("⚠️ Some memberships are not ACTIVE.");
  }

  // 4. Verify no active sessions exist (should have been revoked when disabled)
  const activeSessions = await prisma.session.count({
    where: { tenantId: tenantId, isRevoked: false }
  });
  console.log(`Active sessions count: ${activeSessions}`);
  if (activeSessions === 0) {
    console.log("✅ No active sessions poisoned (all revoked).");
  } else {
    console.warn("⚠️ Stale active sessions found!");
  }

  console.log("--- VERIFICATION COMPLETE ---");
}

verifyReenableFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
