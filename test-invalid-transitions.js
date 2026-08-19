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
  console.log("=== STARTING TRANSITION TESTS ===");
  const t = Date.now();
  
  // Setup Auth
  const email = "superadmin@goride.com";
  const password = "GoRide@2026!";
  const loginRes = await makeRequest("/admin/auth/login", "POST", { email, password });
  const token = loginRes.data.data.accessToken;

  // 1. SUSPENDED -> REJECTED
  console.log("\\n--- 1. SUSPENDED -> REJECTED ---");
  // Create an approved driver
  const approvedDriver = await prisma.driver.create({
    data: { 
      userId: (await prisma.user.create({ data: { fullName: "ApprDrv", email: `appr_${t}@test.com`, phone: `${t}`.slice(-10), password: "x" }})).id, 
      status: "APPROVED", licenseNumber: `LIC-A-${t}`, aadharNumber: `AAD-A-${t}`, experience: 5 
    }
  });

  console.log(`Created APPROVED Driver ID: ${approvedDriver.id}`);
  
  let res = await makeRequest(`/admin/drivers/${approvedDriver.id}/suspend`, "PATCH", { reason: "Testing suspension flow" }, token);
  console.log("Suspend API Response:", res.status, res.data?.message);
  
  res = await makeRequest(`/admin/drivers/${approvedDriver.id}/reject`, "PATCH", { reason: "Testing invalid transition" }, token);
  console.log("Reject API Response (Expected 409):", res.status, res.data);

  // 2. PENDING -> SUSPENDED
  console.log("\\n--- 2. PENDING -> SUSPENDED ---");
  const pendingDriver = await prisma.driver.create({
    data: { 
      userId: (await prisma.user.create({ data: { fullName: "PendDrv", email: `pend_${t}@test.com`, phone: `${t+1}`.slice(-10), password: "x" }})).id, 
      status: "PENDING", licenseNumber: `LIC-P-${t}`, aadharNumber: `AAD-P-${t}`, experience: 1 
    }
  });
  console.log(`Created PENDING Driver ID: ${pendingDriver.id}`);
  
  res = await makeRequest(`/admin/drivers/${pendingDriver.id}/suspend`, "PATCH", { reason: "Testing invalid transition" }, token);
  console.log("Suspend API Response (Expected 409):", res.status, res.data);

  console.log("\\n=== TESTS FINISHED ===");
  process.exit(0);
}

runTests().catch(console.error);
