const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:dev786@localhost:5432/gias_hospital_db' });
async function run() {
  await client.connect();

  // Find Dr Ali Ghias Tarar
  const docRes = await client.query('SELECT * FROM "Doctor" WHERE "lastName" ILIKE \'%Tarar%\' LIMIT 1');
  if (docRes.rows.length === 0) {
    console.log('Doctor not found');
    await client.end();
    return;
  }
  const doctor = docRes.rows[0];

  // Find or create patient M. Safyan
  let patRes = await client.query('SELECT * FROM "Patient" WHERE "firstName" ILIKE \'%Safyan%\' LIMIT 1');
  let patientId;
  if (patRes.rows.length > 0) {
    patientId = patRes.rows[0].id;
    await client.query(`
      UPDATE "Patient" SET
        "mrNumber" = '15888-2026',
        "relatedPersonName" = 'Shahid Imran',
        "relationType" = 'Father',
        "phone" = '03419042901',
        "address" = 'Makhna Wali',
        "gender" = 'MALE',
        "dateOfBirth" = '2009-03-15'
      WHERE "id" = $1
    `, [patientId]);
  } else {
    const newPat = await client.query(`
      INSERT INTO "Patient" (
        "id", "patientNumber", "mrNumber", "firstName", "lastName", "gender", "dateOfBirth",
        "phone", "address", "bloodGroup", "relatedPersonName", "relationType",
        "emergencyContactName", "emergencyContactPhone", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 'PAT-015888', '15888-2026', 'M.', 'Safyan', 'MALE', '2009-03-15',
        '03419042901', 'Makhna Wali', 'B_POSITIVE', 'Shahid Imran', 'Father',
        'Shahid Imran', '03419042901', NOW(), NOW()
      ) RETURNING id
    `);
    patientId = newPat.rows[0].id;
  }

  // Find admin/creator user
  const userRes = await client.query('SELECT id FROM "User" LIMIT 1');
  const userId = userRes.rows[0].id;

  // Create or update appointment
  const aptRes = await client.query(`
    INSERT INTO "Appointment" (
      "id", "appointmentNumber", "mrNumber", "patientId", "doctorId", "departmentId",
      "appointmentType", "appointmentDate", "appointmentTime", "tokenNumber",
      "consultationFee", "reason", "status", "createdById", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), 'APT-2026-015888', '15888-2026', $1, $2, $3,
      'REGULAR', '2026-09-10', '11:35 AM', 24,
      2000, 'Consultation & Clinical Review', 'COMPLETED', $4,
      '2026-09-10 11:35:21', '2026-09-10 11:35:21'
    ) RETURNING id, "appointmentNumber"
  `, [patientId, doctor.id, doctor.departmentId, userId]);

  console.log('Created matching appointment:', aptRes.rows[0]);
  await client.end();
}
run();
