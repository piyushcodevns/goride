/**
 * Comprehensive Admin Driver API Testing Script
 * 
 * Usage:
 *   node test-admin-drivers-api.js
 * 
 * This script tests all admin driver endpoints with various scenarios
 */

const http = require("http");
const https = require("https");

// ===== Configuration =====
const BASE_URL = process.env.API_URL || "http://localhost:5000";
const ADMIN_EMAIL = "piyushmaurya222007@gmail.com";
const ADMIN_PASSWORD = "YOUR_ADMIN_PASSWORD"; // Change this
const VALID_DRIVER_ID = "cms8oo3ft0002wvtsdl8arkrw"; // Change as needed

// ===== Test State =====
let adminToken = null;
let testResults = [];
let documentId = null;
let pendingDriverId = null;
let approvedDriverId = null;

// ===== Utility Functions =====

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(path, BASE_URL);
    const isHttps = urlObj.protocol === "https:";
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = client.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonData,
            rawBody: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data,
          });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function logTest(testName, expected, actual, passed) {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(
    `${status} | ${testName} | Expected: ${expected}, Got: ${actual}`
  );
  testResults.push({ testName, expected, actual, passed });
}

function printSummary() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST SUMMARY");
  console.log("=".repeat(80));
  const passed = testResults.filter((r) => r.passed).length;
  const total = testResults.length;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
  console.log(
    `Success Rate: ${((passed / total) * 100).toFixed(2)}%\n`
  );

  if (total - passed > 0) {
    console.log("Failed Tests:");
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.testName} (Expected: ${r.expected}, Got: ${r.actual})`);
      });
  }
}

// ===== Test Cases =====

async function test1_Login() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 1: LOGIN");
  console.log("=".repeat(80));

  const response = await request("POST", "/api/admin/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  const passed = response.status === 200;
  logTest("Login", 200, response.status, passed);

  if (passed && response.body?.token) {
    adminToken = response.body.token;
    console.log(`✓ Token saved: ${adminToken.substring(0, 20)}...`);
  } else {
    console.log("❌ No token received!");
    process.exit(1);
  }
}

async function test2_GetAllDrivers() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 2: DRIVER LIST");
  console.log("=".repeat(80));

  // All drivers
  let response = await request("GET", "/api/admin/drivers", null, adminToken);
  logTest("Get All Drivers", 200, response.status, response.status === 200);

  // With pagination
  response = await request(
    "GET",
    "/api/admin/drivers?page=1&limit=10",
    null,
    adminToken
  );
  logTest("Get Drivers with Pagination", 200, response.status, response.status === 200);

  // With search
  response = await request(
    "GET",
    "/api/admin/drivers?search=test",
    null,
    adminToken
  );
  logTest("Get Drivers with Search", 200, response.status, response.status === 200);

  // With status filter - PENDING
  response = await request(
    "GET",
    "/api/admin/drivers?status=PENDING",
    null,
    adminToken
  );
  logTest("Get Drivers - Status PENDING", 200, response.status, response.status === 200);
  if (response.status === 200 && response.body?.data?.length > 0) {
    pendingDriverId = response.body.data[0].id;
    console.log(`✓ Pending driver ID found: ${pendingDriverId}`);
  }

  // With status filter - APPROVED
  response = await request(
    "GET",
    "/api/admin/drivers?status=APPROVED",
    null,
    adminToken
  );
  logTest("Get Drivers - Status APPROVED", 200, response.status, response.status === 200);
  if (response.status === 200 && response.body?.data?.length > 0) {
    approvedDriverId = response.body.data[0].id;
    console.log(`✓ Approved driver ID found: ${approvedDriverId}`);
  }

  // With status filter - REJECTED
  response = await request(
    "GET",
    "/api/admin/drivers?status=REJECTED",
    null,
    adminToken
  );
  logTest("Get Drivers - Status REJECTED", 200, response.status, response.status === 200);

  // With status filter - SUSPENDED
  response = await request(
    "GET",
    "/api/admin/drivers?status=SUSPENDED",
    null,
    adminToken
  );
  logTest("Get Drivers - Status SUSPENDED", 200, response.status, response.status === 200);

  // With availability
  response = await request(
    "GET",
    "/api/admin/drivers?availability=OFFLINE",
    null,
    adminToken
  );
  logTest("Get Drivers - Availability OFFLINE", 200, response.status, response.status === 200);

  // With sorting - averageRating
  response = await request(
    "GET",
    "/api/admin/drivers?sortBy=averageRating&sortOrder=desc",
    null,
    adminToken
  );
  logTest("Get Drivers - Sort by averageRating", 200, response.status, response.status === 200);

  // With sorting - experience
  response = await request(
    "GET",
    "/api/admin/drivers?sortBy=experience&sortOrder=desc",
    null,
    adminToken
  );
  logTest("Get Drivers - Sort by experience", 200, response.status, response.status === 200);

  // With sorting - totalRatings
  response = await request(
    "GET",
    "/api/admin/drivers?sortBy=totalRatings&sortOrder=desc",
    null,
    adminToken
  );
  logTest("Get Drivers - Sort by totalRatings", 200, response.status, response.status === 200);

  // With sorting - createdAt
  response = await request(
    "GET",
    "/api/admin/drivers?sortBy=createdAt&sortOrder=desc",
    null,
    adminToken
  );
  logTest("Get Drivers - Sort by createdAt", 200, response.status, response.status === 200);

  // With sorting - updatedAt
  response = await request(
    "GET",
    "/api/admin/drivers?sortBy=updatedAt&sortOrder=desc",
    null,
    adminToken
  );
  logTest("Get Drivers - Sort by updatedAt", 200, response.status, response.status === 200);
}

async function test3_GetPendingDrivers() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 3: PENDING DRIVERS");
  console.log("=".repeat(80));

  let response = await request(
    "GET",
    "/api/admin/drivers/pending",
    null,
    adminToken
  );
  logTest("Get Pending Drivers", 200, response.status, response.status === 200);

  response = await request(
    "GET",
    "/api/admin/drivers/pending?page=1&limit=10",
    null,
    adminToken
  );
  logTest("Get Pending Drivers with Pagination", 200, response.status, response.status === 200);
}

async function test4_GetDriverDetails() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 4: DRIVER DETAILS");
  console.log("=".repeat(80));

  const response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}`,
    null,
    adminToken
  );
  logTest("Get Driver Details", 200, response.status, response.status === 200);
}

async function test5_GetVehicle() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 5: VEHICLE INFORMATION");
  console.log("=".repeat(80));

  const response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/vehicle`,
    null,
    adminToken
  );
  logTest("Get Driver Vehicle", 200, response.status, response.status === 200);
}

async function test6_GetTrips() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 6: DRIVER TRIPS");
  console.log("=".repeat(80));

  let response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/trips`,
    null,
    adminToken
  );
  logTest("Get Driver Trips", 200, response.status, response.status === 200);

  response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/trips?page=1&limit=20`,
    null,
    adminToken
  );
  logTest("Get Driver Trips with Pagination", 200, response.status, response.status === 200);
}

async function test7_GetRatings() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 7: DRIVER RATINGS");
  console.log("=".repeat(80));

  let response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/ratings`,
    null,
    adminToken
  );
  logTest("Get Driver Ratings", 200, response.status, response.status === 200);

  response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/ratings?page=1&limit=20`,
    null,
    adminToken
  );
  logTest("Get Driver Ratings with Pagination", 200, response.status, response.status === 200);
}

async function test8_GetKYC() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 8: DRIVER KYC");
  console.log("=".repeat(80));

  const response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/kyc`,
    null,
    adminToken
  );
  const passed = response.status === 200;
  logTest("Get Driver KYC", 200, response.status, passed);

  if (passed && response.body?.aadhaar) {
    const isAadhaarMasked = /\*/.test(response.body.aadhaar);
    console.log(
      `✓ Aadhaar Masking: ${isAadhaarMasked ? "✅ Masked" : "❌ Not Masked"}`
    );
    if (!isAadhaarMasked) {
      console.log(`  ⚠️  WARNING: Raw Aadhaar found in response!`);
    }
  }
}

async function test9_GetStatistics() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 9: DRIVER STATISTICS");
  console.log("=".repeat(80));

  const response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/statistics`,
    null,
    adminToken
  );
  logTest("Get Driver Statistics", 200, response.status, response.status === 200);
}

async function test10_GetEarnings() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 10: DRIVER EARNINGS");
  console.log("=".repeat(80));

  const response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/earnings`,
    null,
    adminToken
  );
  logTest("Get Driver Earnings", 200, response.status, response.status === 200);
}

async function test11_Documents() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 11: DRIVER DOCUMENTS");
  console.log("=".repeat(80));

  // Get documents
  let response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/documents`,
    null,
    adminToken
  );
  logTest("Get Driver Documents", 200, response.status, response.status === 200);

  if (response.status === 200 && response.body?.data?.length > 0) {
    documentId = response.body.data[0].id;
    console.log(`✓ Document ID found: ${documentId}`);

    // Approve document
    const approveResponse = await request(
      "PATCH",
      `/api/admin/drivers/documents/${documentId}/approve`,
      {},
      adminToken
    );
    logTest("Approve Document", 200, approveResponse.status, approveResponse.status === 200);
  } else {
    console.log("⚠️  No documents found to test approve/reject");
  }

  // Test reject with different document (if available)
  if (documentId) {
    const rejectResponse = await request(
      "PATCH",
      `/api/admin/drivers/documents/${documentId}/reject`,
      { reason: "Document is unclear and requires re-upload." },
      adminToken
    );
    logTest(
      "Reject Document",
      200,
      rejectResponse.status,
      rejectResponse.status === 200
    );
  }
}

async function test12_Wallet() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 12: DRIVER WALLET");
  console.log("=".repeat(80));

  const response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/wallet`,
    null,
    adminToken
  );
  logTest("Get Driver Wallet", 200, response.status, response.status === 200);

  if (response.status === 200) {
    const hasRequiredFields =
      "balance" in response.body &&
      "totalEarnings" in response.body &&
      "totalWithdrawn" in response.body;
    console.log(`✓ Required fields present: ${hasRequiredFields ? "✅" : "❌"}`);
  }
}

async function test13_WalletTransactions() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 13: WALLET TRANSACTIONS");
  console.log("=".repeat(80));

  const response = await request(
    "GET",
    `/api/admin/drivers/${VALID_DRIVER_ID}/wallet/transactions?page=1&limit=20`,
    null,
    adminToken
  );
  logTest("Get Wallet Transactions", 200, response.status, response.status === 200);
}

async function test14_DriverApprove() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 14: DRIVER APPROVE");
  console.log("=".repeat(80));

  if (!pendingDriverId) {
    console.log("⚠️  No pending driver found for approve test");
    return;
  }

  const response = await request(
    "PATCH",
    `/api/admin/drivers/${pendingDriverId}/approve`,
    {},
    adminToken
  );
  logTest("Approve Driver", 200, response.status, response.status === 200);

  if (response.status === 200) {
    const status = response.body?.status || response.body?.driver?.status;
    console.log(`✓ Driver status after approval: ${status}`);
  }
}

async function test15_DriverReject() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 15: DRIVER REJECT");
  console.log("=".repeat(80));

  if (!pendingDriverId) {
    console.log("⚠️  No pending driver found for reject test");
    return;
  }

  const response = await request(
    "PATCH",
    `/api/admin/drivers/${pendingDriverId}/reject`,
    {
      reason: "Driver documents do not meet verification requirements.",
    },
    adminToken
  );
  logTest("Reject Driver", 200, response.status, response.status === 200);

  if (response.status === 200) {
    const status = response.body?.status || response.body?.driver?.status;
    console.log(`✓ Driver status after rejection: ${status}`);
  }
}

async function test16_DriverSuspend() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 16: DRIVER SUSPEND");
  console.log("=".repeat(80));

  if (!approvedDriverId) {
    console.log("⚠️  No approved driver found for suspend test");
    return;
  }

  const response = await request(
    "PATCH",
    `/api/admin/drivers/${approvedDriverId}/suspend`,
    { reason: "Driver temporarily suspended for policy review." },
    adminToken
  );
  logTest("Suspend Driver", 200, response.status, response.status === 200);

  if (response.status === 200) {
    const status = response.body?.status || response.body?.driver?.status;
    console.log(`✓ Driver status after suspension: ${status}`);
  }
}

async function test17_DriverActivate() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 17: DRIVER ACTIVATE");
  console.log("=".repeat(80));

  if (!approvedDriverId) {
    console.log("⚠️  No suspended driver found for activate test");
    return;
  }

  const response = await request(
    "PATCH",
    `/api/admin/drivers/${approvedDriverId}/activate`,
    {},
    adminToken
  );
  logTest("Activate Driver", 200, response.status, response.status === 200);

  if (response.status === 200) {
    const status = response.body?.status || response.body?.driver?.status;
    console.log(`✓ Driver status after activation: ${status}`);
  }
}

async function test18_NegativeTests() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 18: NEGATIVE TESTS");
  console.log("=".repeat(80));

  // Invalid driver ID
  let response = await request(
    "GET",
    "/api/admin/drivers/invalid-driver-id",
    null,
    adminToken
  );
  logTest("Invalid Driver ID", 404, response.status, response.status === 404);

  // Invalid reason (too short)
  response = await request(
    "PATCH",
    `/api/admin/drivers/${VALID_DRIVER_ID}/reject`,
    { reason: "x" },
    adminToken
  );
  logTest(
    "Invalid Reason (too short)",
    400,
    response.status,
    response.status === 400
  );

  // Missing reason
  response = await request(
    "PATCH",
    `/api/admin/drivers/${VALID_DRIVER_ID}/reject`,
    {},
    adminToken
  );
  logTest("Missing Reason", 400, response.status, response.status === 400);

  // Invalid status
  response = await request(
    "GET",
    "/api/admin/drivers?status=INVALID",
    null,
    adminToken
  );
  logTest("Invalid Status", 400, response.status, response.status === 400);

  // Invalid pagination
  response = await request(
    "GET",
    "/api/admin/drivers?page=0&limit=999",
    null,
    adminToken
  );
  logTest("Invalid Pagination", 400, response.status, response.status === 400);

  // No token
  response = await request("GET", "/api/admin/drivers");
  logTest("No Token", 401, response.status, response.status === 401);

  // Wrong permission (this test assumes such a token exists)
  // Skipped for now as we don't have a token without permission
  console.log("⚠️  Skipping 'Wrong permission' test - requires separate token setup");
}

// ===== Main Execution =====

async function runAllTests() {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("GORIDE ADMIN DRIVER API - COMPREHENSIVE TEST SUITE");
    console.log("=".repeat(80));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Valid Driver ID: ${VALID_DRIVER_ID}`);
    console.log("");

    await test1_Login();
    await test2_GetAllDrivers();
    await test3_GetPendingDrivers();
    await test4_GetDriverDetails();
    await test5_GetVehicle();
    await test6_GetTrips();
    await test7_GetRatings();
    await test8_GetKYC();
    await test9_GetStatistics();
    await test10_GetEarnings();
    await test11_Documents();
    await test12_Wallet();
    await test13_WalletTransactions();
    await test14_DriverApprove();
    await test15_DriverReject();
    await test16_DriverSuspend();
    await test17_DriverActivate();
    await test18_NegativeTests();

    printSummary();
  } catch (error) {
    console.error("Test suite error:", error);
    process.exit(1);
  }
}

runAllTests();
