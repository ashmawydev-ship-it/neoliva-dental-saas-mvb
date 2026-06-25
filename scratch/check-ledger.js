const { rawPrisma } = require('../src/lib/prisma');

async function run() {
  console.log("rawPrisma type:", typeof rawPrisma);
  console.log("rawPrisma.ledgerAccount exists:", !!rawPrisma.ledgerAccount);
  console.log("Models on rawPrisma:", Object.keys(rawPrisma).filter(k => !k.startsWith('$')));
}

run().catch(console.error);
