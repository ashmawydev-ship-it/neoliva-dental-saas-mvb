const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.sgllyytutxnpfupltpof:ogNws2i8VoskYVSr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
  });

  await client.connect();

  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'invoice_items' 
    ORDER BY ordinal_position;
  `);

  console.table(res.rows);
  await client.end();
}

main().catch(console.error);
