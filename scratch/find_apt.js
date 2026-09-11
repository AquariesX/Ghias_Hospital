const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:dev786@localhost:5432/gias_hospital_db' });
async function run() {
  await client.connect();
  const res = await client.query('SELECT id, "appointmentNumber" FROM "Appointment" ORDER BY "createdAt" DESC LIMIT 1');
  console.log('Latest appointment:', res.rows[0]);
  await client.end();
}
run();
