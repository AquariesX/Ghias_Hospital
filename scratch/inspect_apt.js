const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:dev786@localhost:5432/gias_hospital_db' });
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT a.id, a."appointmentNumber", a."tokenNumber", a."doctorId",
           d."firstName" as doc_first, d."lastName" as doc_last, d."nameUrdu", d."specializationUrdu",
           p."firstName" as pat_first, p."lastName" as pat_last, p."mrNumber"
    FROM "Appointment" a
    JOIN "Doctor" d ON a."doctorId" = d.id
    JOIN "Patient" p ON a."patientId" = p.id
    WHERE a.id = '4b98641d-3b00-46ac-ad7f-ee5789763f49'
  `);
  console.log(JSON.stringify(res.rows[0], null, 2));
  await client.end();
}
run();
