const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:dev786@localhost:5432/gias_hospital_db' });
async function run() {
  await client.connect();
  await client.query(`
    ALTER TABLE "Doctor"
    ADD COLUMN IF NOT EXISTS "nameUrdu" TEXT,
    ADD COLUMN IF NOT EXISTS "specializationUrdu" TEXT,
    ADD COLUMN IF NOT EXISTS "qualificationsUrdu" TEXT,
    ADD COLUMN IF NOT EXISTS "subSpecialtyUrdu" TEXT,
    ADD COLUMN IF NOT EXISTS "designationEnglish" TEXT;
  `);
  console.log("Columns added successfully!");
  const res = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'Doctor\'');
  console.log(res.rows.map(r => r.column_name));
  await client.end();
}
run();
