require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(() => {
  console.log("Connected, casting column...");
  return client.query('ALTER TABLE "payments" ALTER COLUMN "method" TYPE TEXT USING "method"::TEXT;');
}).then(() => {
  console.log('Successfully cast payments.method to TEXT');
  process.exit(0);
}).catch(e => {
  console.error("Error executing query:", e);
  process.exit(1);
});
