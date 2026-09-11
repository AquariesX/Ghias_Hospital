const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:dev786@localhost:5432/gias_hospital_db' });
async function run() {
  await client.connect();
  // Check if Dr Ali Ghias Tarar exists
  const res = await client.query('SELECT * FROM "Doctor" WHERE "firstName" ILIKE \'%Ali%\' OR "lastName" ILIKE \'%Tarar%\'');
  console.log('Found:', res.rows.length);
  if (res.rows.length > 0) {
    console.log(res.rows);
    const d = res.rows[0];
    await client.query(`
      UPDATE "Doctor" SET
        "nameUrdu" = $1,
        "specializationUrdu" = $2,
        "qualificationsUrdu" = $3,
        "subSpecialtyUrdu" = $4,
        "designationEnglish" = $5,
        "qualifications" = $6
      WHERE "id" = $7
    `, [
      "ڈاکٹر علی غیاث تارڑ",
      "ماہر امراض دل، شوگر، معدہ، جگر",
      "ایم بی بی ایس، ایف سی پی ایس (میڈیسن)",
      "سابق کنسلٹنٹ فزیشن، جنرل ہسپتال لاہور۔ چیف ایگزیکٹو غیاث ہسپتال پھالیہ",
      "Consultant Physician DHQ Hospital M.B.Din",
      "M.B.B.S  F.C.P.S (Medicine)",
      d.id
    ]);
    console.log('Updated existing doctor with template!');
  } else {
    // Get department
    const deptRes = await client.query('SELECT id FROM "Department" LIMIT 1');
    const deptId = deptRes.rows[0]?.id || null;
    await client.query(`
      INSERT INTO "Doctor" (
        "id", "doctorNumber", "firstName", "lastName", "specialization", "phone", "email",
        "qualifications", "experience", "consultationFee", "regularFee", "followUpFee", "emergencyFee",
        "availability", "status", "departmentId", "nameUrdu", "specializationUrdu", "qualificationsUrdu",
        "subSpecialtyUrdu", "designationEnglish", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 'DOC-00000', 'Dr Ali Ghias', 'Tarar', 'Consultant Physician', '03464949577', 'dr.alighias@giashospital.org',
        'M.B.B.S  F.C.P.S (Medicine)', '15', 2000, 2000, 1000, 3000,
        'AVAILABLE', 'ACTIVE', $1,
        'ڈاکٹر علی غیاث تارڑ',
        'ماہر امراض دل، شوگر، معدہ، جگر',
        'ایم بی بی ایس، ایف سی پی ایس (میڈیسن)',
        'سابق کنسلٹنٹ فزیشن، جنرل ہسپتال لاہور۔ میڈیکل اسپیشلسٹ',
        'Consultant Physician DHQ Hospital M.B.Din',
        NOW(), NOW()
      )
    `, [deptId]);
    console.log('Created Dr Ali Ghias Tarar doctor record with full template!');
  }

  // Also give sensible Urdu template defaults for other existing doctors so every doctor has their own template
  const allDocs = await client.query('SELECT id, "firstName", "lastName", specialization, qualifications FROM "Doctor"');
  for (const doc of allDocs.rows) {
    if (!doc.nameUrdu) {
      const urduName = doc.firstName.includes("Dr") ? `${doc.firstName} ${doc.lastName}` : `ڈاکٹر ${doc.firstName.trim()} ${doc.lastName.trim()}`;
      await client.query(`
        UPDATE "Doctor" SET
          "nameUrdu" = COALESCE("nameUrdu", $1),
          "specializationUrdu" = COALESCE("specializationUrdu", $2),
          "qualificationsUrdu" = COALESCE("qualificationsUrdu", $3),
          "designationEnglish" = COALESCE("designationEnglish", $4)
        WHERE "id" = $5
      `, [
        urduName,
        `ماہر امراض (${doc.specialization})`,
        doc.qualifications || "ایم بی بی ایس",
        `Consultant (${doc.specialization})`,
        doc.id
      ]);
    }
  }
  console.log('All doctors configured with default templates!');
  await client.end();
}
run();
