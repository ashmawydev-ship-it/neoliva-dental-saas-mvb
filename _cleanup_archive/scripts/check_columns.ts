import { prisma } from './src/lib/prisma';

async function main() {
  const result = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoice_items' ORDER BY ordinal_position;`;
  console.log(result);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
