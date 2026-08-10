const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function testPermissions() {
  const email = "finance@goride.com";
  const password = "GoRide@2026!";
  const hash = await bcrypt.hash(password, 10);
  
  let financeAdmin = await prisma.user.findFirst({
    where: { email }
  });

  if (!financeAdmin) {
    financeAdmin = await prisma.user.create({
      data: {
        fullName: "Finance Manager Test",
        email,
        phone: "9999999999",
        password: hash,
        role: "FINANCE_MANAGER",
        isActive: true,
        isVerified: true,
        emailVerified: true
      }
    });
  }

  const BASE_URL = "http://localhost:5000";
  
  // 1. Log in
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error("Login failed:", loginData);
    return;
  }
  const accessToken = loginData.data.accessToken;
  
  // 2. Try to suspend a user (we need a valid user ID, let's query one via prisma)
  const anyUser = await prisma.user.findFirst({ where: { role: { in: ["USER", "DRIVER"] } } });
  if (!anyUser) {
    console.log("No user found to test suspend.");
    return;
  }

  console.log(`Trying to suspend user ${anyUser.id} as FINANCE_MANAGER...`);
  
  const suspRes = await fetch(`${BASE_URL}/api/admin/users/${anyUser.id}/suspend`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  console.log("Suspend response status:", suspRes.status);
  console.log("Suspend response body:", await suspRes.json());
  
  if (suspRes.status === 403) {
    console.log("✅ Permission test passed (403 Forbidden).");
  } else {
    console.error("❌ Permission test failed (Did not get 403).");
  }

  await prisma.$disconnect();
}

testPermissions().catch(e => console.error(e));
