const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:dev786@localhost:5432/gias_hospital_db' });
async function run() {
  await client.connect();
  const res = await client.query('SELECT id, "firstName", "lastName", specialization, qualifications, experience FROM "Doctor"');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run();
