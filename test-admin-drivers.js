const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

const BASE_URL = "http://localhost:5000/api";

async function makeRequest(endpoint, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log("=== STARTING ADMIN DRIVER TESTS ===");
  const t = Date.now();
  
  // 0. Setup and Auth
  const email = "superadmin@goride.com";
  const password = "GoRide@2026!";
  let admin = await prisma.user.findFirst({ where: { email } });
  if (!admin) {
    const hash = await bcrypt.hash(password, 10);
    admin = await prisma.user.create({
      data: {
        fullName: "Super Admin", email, phone: "9999999991", password: hash,
        role: "ADMIN", isActive: true, isVerified: true, emailVerified: true
      }
    });
  }

  const loginRes = await makeRequest("/admin/auth/login", "POST", { email, password });
  if (!loginRes.data || !loginRes.data.success) {
    console.error("Failed to login admin", loginRes.data);
    return;
  }
  const token = loginRes.data.data.accessToken;

  // Let's create dummy drivers for testing
  // Pending driver
  const pendingDriverUser = await prisma.user.create({
    data: {
      fullName: "Pending Driver", email: `pending${t}@test.com`, phone: `11${t.toString().slice(-8)}`,
      password: "pass", role: "DRIVER", isActive: true
    }
  });
  const pendingDriver = await prisma.driver.create({
    data: { userId: pendingDriverUser.id, status: "PENDING", licenseNumber: `LIC-PENDING-${t}`, aadharNumber: `AADHAR-PENDING-${t}`, experience: 2 }
  });

  // Approved driver
  const approvedDriverUser = await prisma.user.create({
    data: {
      fullName: "Approved Driver", email: `approved${t}@test.com`, phone: `22${t.toString().slice(-8)}`,
      password: "pass", role: "DRIVER", isActive: true
    }
  });
  const approvedDriver = await prisma.driver.create({
    data: { userId: approvedDriverUser.id, status: "APPROVED", licenseNumber: `LIC-APPROVED-${t}`, aadharNumber: `AADHAR-APPROVED-${t}`, experience: 5, availability: "OFFLINE" }
  });

  // Rejected driver
  const rejectedDriverUser = await prisma.user.create({
    data: {
      fullName: "Rejected Driver", email: `rejected${t}@test.com`, phone: `33${t.toString().slice(-8)}`,
      password: "pass", role: "DRIVER", isActive: true
    }
  });
  const rejectedDriver = await prisma.driver.create({
    data: { userId: rejectedDriverUser.id, status: "REJECTED", licenseNumber: `LIC-REJECTED-${t}`, aadharNumber: `AADHAR-REJECTED-${t}`, experience: 1 }
  });

  // Suspended driver
  const suspendedDriverUser = await prisma.user.create({
    data: {
      fullName: "Suspended Driver", email: `suspended${t}@test.com`, phone: `44${t.toString().slice(-8)}`,
      password: "pass", role: "DRIVER", isActive: true
    }
  });
  const suspendedDriver = await prisma.driver.create({
    data: { userId: suspendedDriverUser.id, status: "SUSPENDED", licenseNumber: `LIC-SUSPENDED-${t}`, aadharNumber: `AADHAR-SUSPENDED-${t}`, experience: 3 }
  });


  console.log("\\n--- 1. Driver List ---");
  let res = await makeRequest("/admin/drivers", "GET", null, token);
  console.log("1.1 Basic list:", res.status === 200, res.data?.success === true);
  
  res = await makeRequest("/admin/drivers?page=1&limit=5", "GET", null, token);
  console.log("1.2 Pagination:", res.status === 200);

  res = await makeRequest("/admin/drivers?search=Pending", "GET", null, token);
  console.log("1.3 Search (name):", res.status === 200, res.data?.data?.items?.length > 0);

  res = await makeRequest("/admin/drivers?search=LIC-PENDING", "GET", null, token);
  console.log("1.3 Search (license):", res.status === 200, res.data?.data?.items?.length > 0);

  res = await makeRequest("/admin/drivers?status=PENDING", "GET", null, token);
  console.log("1.4 Status filter:", res.status === 200);

  res = await makeRequest("/admin/drivers?sortBy=experience&sortOrder=asc", "GET", null, token);
  console.log("1.6 Sorting:", res.status === 200);

  console.log("\\n--- 2. Pending Drivers ---");
  res = await makeRequest("/admin/drivers/pending", "GET", null, token);
  console.log("Pending drivers only:", res.status === 200, res.data?.data?.items?.every(d => d.status === 'PENDING'));

  console.log("\\n--- 3. Driver Details ---");
  res = await makeRequest(`/admin/drivers/${approvedDriver.id}`, "GET", null, token);
  console.log("Valid driver ID:", res.status === 200);
  
  res = await makeRequest(`/admin/drivers/invalid-id-123`, "GET", null, token);
  console.log("Invalid driver ID:", res.status === 404);

  console.log("\\n--- 8. Approve Driver ---");
  res = await makeRequest(`/admin/drivers/${pendingDriver.id}/approve`, "PATCH", {}, token);
  console.log("Approve pending:", res.status === 200, res.data?.data?.status === 'APPROVED');
  
  res = await makeRequest(`/admin/drivers/${pendingDriver.id}/approve`, "PATCH", {}, token);
  console.log("Approve already approved:", res.status === 409);

  console.log("\\n--- 9. Reject Driver ---");
  const pendingDriver2User = await prisma.user.create({
    data: {
      fullName: "Pending Driver 2", email: `pending2${t}@test.com`, phone: `55${t.toString().slice(-8)}`,
      password: "pass", role: "DRIVER", isActive: true
    }
  });
  const pendingDriver2 = await prisma.driver.create({
    data: { userId: pendingDriver2User.id, status: "PENDING", licenseNumber: `LIC-PENDING2-${t}`, aadharNumber: `AADHAR-PENDING2-${t}`, experience: 1 }
  });
  
  res = await makeRequest(`/admin/drivers/${pendingDriver2.id}/reject`, "PATCH", { reason: "Missing docs" }, token);
  console.log("Reject pending:", res.status === 200, res.data?.data?.status === 'REJECTED');

  res = await makeRequest(`/admin/drivers/${pendingDriver2.id}/reject`, "PATCH", {}, token);
  console.log("Reject without reason (400 validation):", res.status === 400);

  console.log("\\n--- 10. Suspend Driver ---");
  res = await makeRequest(`/admin/drivers/${approvedDriver.id}/suspend`, "PATCH", { reason: "Policy" }, token);
  console.log("Suspend approved:", res.status === 200, res.data?.data?.status === 'SUSPENDED');
  
  res = await makeRequest(`/admin/drivers/${approvedDriver.id}/suspend`, "PATCH", { reason: "Policy" }, token);
  console.log("Suspend already suspended:", res.status === 409);

  console.log("\\n--- 11. Activate Driver ---");
  res = await makeRequest(`/admin/drivers/${suspendedDriver.id}/activate`, "PATCH", {}, token);
  console.log("Activate suspended:", res.status === 200, res.data?.data?.status === 'APPROVED');

  res = await makeRequest(`/admin/drivers/${suspendedDriver.id}/activate`, "PATCH", {}, token);
  console.log("Activate already active:", res.status === 409);

  // 12. Invalid Status Transitions
  // Create fresh drivers for each state
  const t2 = Date.now() + 1000;
  const d_pending = await prisma.driver.create({
    data: { userId: (await prisma.user.create({ data: { fullName: "T1", email: `t1_${t2}@test.com`, phone: `${t2}`.slice(-10), password: "x" }})).id, status: "PENDING", licenseNumber: `LIC-T1-${t2}`, aadharNumber: `AAD-T1-${t2}`, experience: 1 }
  });
  const d_approved = await prisma.driver.create({
    data: { userId: (await prisma.user.create({ data: { fullName: "T2", email: `t2_${t2+1}@test.com`, phone: `${t2+1}`.slice(-10), password: "x" }})).id, status: "APPROVED", licenseNumber: `LIC-T2-${t2+1}`, aadharNumber: `AAD-T2-${t2+1}`, experience: 1 }
  });
  const d_rejected = await prisma.driver.create({
    data: { userId: (await prisma.user.create({ data: { fullName: "T3", email: `t3_${t2+2}@test.com`, phone: `${t2+2}`.slice(-10), password: "x" }})).id, status: "REJECTED", licenseNumber: `LIC-T3-${t2+2}`, aadharNumber: `AAD-T3-${t2+2}`, experience: 1 }
  });
  const d_suspended = await prisma.driver.create({
    data: { userId: (await prisma.user.create({ data: { fullName: "T4", email: `t4_${t2+3}@test.com`, phone: `${t2+3}`.slice(-10), password: "x" }})).id, status: "SUSPENDED", licenseNumber: `LIC-T4-${t2+3}`, aadharNumber: `AAD-T4-${t2+3}`, experience: 1 }
  });

  console.log("\\n--- 12. Invalid Status Transitions ---");
  res = await makeRequest(`/admin/drivers/${d_rejected.id}/approve`, "PATCH", {}, token);
  console.log("REJECTED -> APPROVED (409):", res.status === 409);

  res = await makeRequest(`/admin/drivers/${d_suspended.id}/reject`, "PATCH", {reason: "test"}, token);
  console.log("SUSPENDED -> REJECTED (409):", res.status === 409);

  res = await makeRequest(`/admin/drivers/${d_pending.id}/suspend`, "PATCH", {reason:"test"}, token);
  console.log("PENDING -> SUSPENDED (409):", res.status === 409);

  res = await makeRequest(`/admin/drivers/${d_approved.id}/reject`, "PATCH", {reason:"test"}, token);
  console.log("APPROVED -> REJECTED (409):", res.status === 409);
  
  res = await makeRequest(`/admin/drivers/${d_pending.id}/activate`, "PATCH", {}, token);
  console.log("PENDING -> ACTIVATE (409):", res.status === 409);
  
  console.log("\\n--- 13. Validation Testing ---");
  res = await makeRequest("/admin/drivers?status=INVALID", "GET", null, token);
  console.log("Invalid status (400):", res.status === 400);

  console.log("\\n=== TESTS FINISHED ===");
  process.exit(0);
}

runTests().catch(console.error);
