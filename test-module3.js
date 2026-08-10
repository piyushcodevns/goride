async function runTests() {
  const BASE_URL = "http://localhost:5000";
  let accessToken, refreshToken, sessionId;

  console.log("--- 1. Admin Login ---");
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "testadmin@goride.com", password: "GoRide@2026!" })
  });
  const loginData = await loginRes.json();
  console.log("Login Response:", loginData);
  if (loginData.success) {
    accessToken = loginData.data.accessToken;
    refreshToken = loginData.data.refreshToken;
    sessionId = loginData.data.sessionId;
    console.log("✅ access token, refresh token, sessionId received.");
  } else {
    console.error("Login failed. Cannot proceed.");
    return;
  }

  console.log("\n--- 2. Dashboard ---");
  const dashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  console.log("Dashboard Status:", dashRes.status, await dashRes.json());

  console.log("\n--- 3. Users list ---");
  const usersQueries = [
    "?page=1&limit=20",
    "?page=1&limit=10",
    "?search=piyush",
    "?isActive=true",
    "?isVerified=true",
    "?emailVerified=true",
    "?role=USER",
    "?sortBy=createdAt&sortOrder=desc"
  ];
  let firstUserId;
  for (const q of usersQueries) {
    const listRes = await fetch(`${BASE_URL}/api/admin/users${q}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await listRes.json();
    console.log(`Query: ${q} => Status: ${listRes.status}, Count: ${data.data?.items?.length}`);
    if (!firstUserId && data.data?.items?.length > 0) {
      firstUserId = data.data.items[0].id;
    }
  }

  if (!firstUserId) {
    console.error("No users found to perform details/history tests.");
    return;
  }
  console.log(`\nUsing User ID: ${firstUserId} for further tests.`);

  console.log("\n--- 4. User details ---");
  const detailRes = await fetch(`${BASE_URL}/api/admin/users/${firstUserId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  console.log("User details status:", detailRes.status, await detailRes.json());

  console.log("\n--- 5. User histories ---");
  const histories = ["rides", "payments", "coupons", "notifications"];
  for (const h of histories) {
    const hRes = await fetch(`${BASE_URL}/api/admin/users/${firstUserId}/${h}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const d = await hRes.json();
    console.log(`/${h} => Status: ${hRes.status}, Count: ${d.data?.items?.length}`);
  }

  console.log("\n--- 6. Suspend & Activate ---");
  const suspRes = await fetch(`${BASE_URL}/api/admin/users/${firstUserId}/suspend`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  console.log("Suspend response:", suspRes.status, await suspRes.json());

  const actRes = await fetch(`${BASE_URL}/api/admin/users/${firstUserId}/activate`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  console.log("Activate response:", actRes.status, await actRes.json());

  console.log("\n--- 8. Refresh token & Logout ---");
  const refreshRes = await fetch(`${BASE_URL}/api/admin/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  console.log("Refresh response:", refreshRes.status, await refreshRes.json());

  const logoutRes = await fetch(`${BASE_URL}/api/admin/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  console.log("Logout response:", logoutRes.status, await logoutRes.json());

  const postLogoutRefreshRes = await fetch(`${BASE_URL}/api/admin/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  console.log("Refresh after logout response:", postLogoutRefreshRes.status, await postLogoutRefreshRes.json());
}

runTests().catch(console.error);
