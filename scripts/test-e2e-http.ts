async function runHttpE2ETests() {
  const BASE_URL = "http://localhost:3000";
  console.log(`Starting End-to-End HTTP tests against ${BASE_URL} ...\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Admin Login
  console.log("--- 1. POST /api/auth/login (Admin) ---");
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin@gias-hospital.com", password: "Admin@1234" }),
  });
  assert(adminRes.status === 200, "Admin login returns HTTP 200");
  const adminData = await adminRes.json();
  assert(adminData.user?.role === "ADMIN", "Admin user role is ADMIN");
  assert(!("passwordHash" in adminData.user), "passwordHash is omitted from response");
  assert(adminData.redirectUrl === "/admin", "Admin redirectUrl is /admin");

  const adminSetCookie = adminRes.headers.get("set-cookie") || "";
  assert(adminSetCookie.includes("gias_auth_token="), "set-cookie contains gias_auth_token");
  assert(adminSetCookie.toLowerCase().includes("httponly"), "Cookie has HttpOnly attribute");

  // Extract raw cookie value for subsequent requests
  const adminCookieMatch = adminSetCookie.match(/gias_auth_token=([^;]+)/);
  const adminCookie = adminCookieMatch ? `gias_auth_token=${adminCookieMatch[1]}` : "";

  // 2. GET /api/auth/me with Admin Cookie
  console.log("\n--- 2. GET /api/auth/me (Authenticated) ---");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: adminCookie },
  });
  assert(meRes.status === 200, "GET /api/auth/me returns HTTP 200 with valid session");
  const meData = await meRes.json();
  assert(meData.user?.email === "admin@gias-hospital.com", "GET /api/auth/me returns correct user email");
  assert(meData.user?.role === "ADMIN", "GET /api/auth/me returns correct user role");

  // 3. Doctor Login
  console.log("\n--- 3. POST /api/auth/login (Doctor) ---");
  const docRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "doctor@gias-hospital.com", password: "Doctor@1234" }),
  });
  assert(docRes.status === 200, "Doctor login returns HTTP 200");
  const docData = await docRes.json();
  assert(docData.user?.role === "DOCTOR", "Doctor role is DOCTOR");
  assert(docData.redirectUrl === "/doctor", "Doctor redirectUrl is /doctor");
  const docSetCookie = docRes.headers.get("set-cookie") || "";
  const docCookieMatch = docSetCookie.match(/gias_auth_token=([^;]+)/);
  const docCookie = docCookieMatch ? `gias_auth_token=${docCookieMatch[1]}` : "";

  // 4. Nurse Login
  console.log("\n--- 4. POST /api/auth/login (Nurse -> /staff) ---");
  const nurseRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "nurse@gias-hospital.com", password: "Nurse@1234" }),
  });
  assert(nurseRes.status === 200, "Nurse login returns HTTP 200");
  const nurseData = await nurseRes.json();
  assert(nurseData.user?.role === "NURSE", "Nurse role is NURSE");
  assert(nurseData.redirectUrl === "/staff", "Nurse redirectUrl is /staff");

  // 5. Invalid Password
  console.log("\n--- 5. POST /api/auth/login (Invalid Password) ---");
  const badRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin@gias-hospital.com", password: "WrongPassword999" }),
  });
  assert(badRes.status === 401, "Invalid password returns HTTP 401");
  const badData = await badRes.json();
  assert(badData.error.includes("Invalid"), "Returns friendly error message");

  // 6. Unauthenticated Access to Protected Route
  console.log("\n--- 6. Unauthenticated Access to /admin ---");
  const unauthRes = await fetch(`${BASE_URL}/admin`, {
    redirect: "manual",
  });
  assert(
    unauthRes.status === 307 || unauthRes.status === 302 || unauthRes.status === 308,
    "Unauthenticated request to /admin redirected by middleware"
  );
  const redirectLocation = unauthRes.headers.get("location") || "";
  assert(redirectLocation.includes("/login"), "Unauthenticated user redirected to /login");

  // 7. Role Enforcement: Doctor visiting /admin
  console.log("\n--- 7. Cross-Role Protection (Doctor accessing /admin) ---");
  const docAdminRes = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: docCookie },
    redirect: "manual",
  });
  assert(
    docAdminRes.status === 307 || docAdminRes.status === 302,
    "Doctor accessing /admin is redirected by middleware"
  );
  const docRedirectLocation = docAdminRes.headers.get("location") || "";
  assert(docRedirectLocation.includes("/doctor"), "Doctor is redirected to /doctor dashboard");

  // 8. Logout
  console.log("\n--- 8. POST /api/auth/logout ---");
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: adminCookie },
  });
  assert(logoutRes.status === 200, "Logout returns HTTP 200");
  const logoutSetCookie = logoutRes.headers.get("set-cookie") || "";
  assert(
    logoutSetCookie.includes("gias_auth_token=;") || logoutSetCookie.includes("Max-Age=0"),
    "Logout clears gias_auth_token cookie"
  );

  // 9. Unauthorized /api/auth/me
  console.log("\n--- 9. GET /api/auth/me without Cookie ---");
  const unauthMeRes = await fetch(`${BASE_URL}/api/auth/me`);
  assert(unauthMeRes.status === 401, "Unauthenticated GET /api/auth/me returns HTTP 401");

  console.log("\n=================================================");
  console.log(`  E2E HTTP SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runHttpE2ETests().catch((e) => {
  console.error("HTTP E2E Error:", e);
  process.exit(1);
});
