# GoRide Admin Driver API - Testing Guide

## Prerequisites

1. **API Server Running**: Make sure your server is running on `http://localhost:3000` or update the BASE_URL in the test script.
2. **Admin Account**: Use your admin credentials for login
3. **Valid Driver ID**: Have a valid driver ID ready (example: `cms8oo3ft0002wvtsdl8arkrw`)

---

## Quick Start with Test Script

### Option 1: Automated Testing

```bash
# Run the comprehensive test suite
node test-admin-drivers-api.js
```

**What it does:**
- Logs in and saves the token automatically
- Tests all 18 test suites
- Generates a summary report with pass/fail statistics
- Identifies pending/approved drivers for status change tests

### Option 2: Manual Testing with cURL

First, get a token:

```bash
TOKEN=$(curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"piyushmaurya222007@gmail.com","password":"YOUR_ADMIN_PASSWORD"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

---

## API Endpoints Reference

### 1. **LOGIN** ✅
```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "piyushmaurya222007@gmail.com",
    "password": "YOUR_ADMIN_PASSWORD"
  }'
```
**Expected Status**: `200`  
**Save the token for all subsequent requests**

---

### 2. **DRIVER LIST** ✅

#### Get All Drivers
```bash
curl -X GET http://localhost:3000/api/admin/drivers \
  -H "Authorization: Bearer $TOKEN"
```

#### With Pagination
```bash
curl -X GET "http://localhost:3000/api/admin/drivers?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

#### Search
```bash
curl -X GET "http://localhost:3000/api/admin/drivers?search=test" \
  -H "Authorization: Bearer $TOKEN"
```

#### Filter by Status
```bash
# PENDING
curl -X GET "http://localhost:3000/api/admin/drivers?status=PENDING" \
  -H "Authorization: Bearer $TOKEN"

# APPROVED
curl -X GET "http://localhost:3000/api/admin/drivers?status=APPROVED" \
  -H "Authorization: Bearer $TOKEN"

# REJECTED
curl -X GET "http://localhost:3000/api/admin/drivers?status=REJECTED" \
  -H "Authorization: Bearer $TOKEN"

# SUSPENDED
curl -X GET "http://localhost:3000/api/admin/drivers?status=SUSPENDED" \
  -H "Authorization: Bearer $TOKEN"
```

#### Filter by Availability
```bash
curl -X GET "http://localhost:3000/api/admin/drivers?availability=OFFLINE" \
  -H "Authorization: Bearer $TOKEN"
```

#### Sort by Different Fields
```bash
# By Average Rating (Descending)
curl -X GET "http://localhost:3000/api/admin/drivers?sortBy=averageRating&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"

# By Experience (Descending)
curl -X GET "http://localhost:3000/api/admin/drivers?sortBy=experience&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"

# By Total Ratings (Descending)
curl -X GET "http://localhost:3000/api/admin/drivers?sortBy=totalRatings&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"

# By Created Date (Descending)
curl -X GET "http://localhost:3000/api/admin/drivers?sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"

# By Updated Date (Descending)
curl -X GET "http://localhost:3000/api/admin/drivers?sortBy=updatedAt&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200` for all

---

### 3. **PENDING DRIVERS** ✅

```bash
curl -X GET http://localhost:3000/api/admin/drivers/pending \
  -H "Authorization: Bearer $TOKEN"
```

#### With Pagination
```bash
curl -X GET "http://localhost:3000/api/admin/drivers/pending?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

---

### 4. **DRIVER DETAILS** ✅

```bash
curl -X GET http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

---

### 5. **VEHICLE INFORMATION** ✅

```bash
curl -X GET http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/vehicle \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

---

### 6. **DRIVER TRIPS** ✅

```bash
curl -X GET http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/trips \
  -H "Authorization: Bearer $TOKEN"
```

#### With Pagination
```bash
curl -X GET "http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/trips?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

---

### 7. **DRIVER RATINGS** ✅

```bash
curl -X GET http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/ratings \
  -H "Authorization: Bearer $TOKEN"
```

#### With Pagination
```bash
curl -X GET "http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/ratings?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

---

### 8. **DRIVER KYC** ⚠️

```bash
curl -X GET http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/kyc \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

**⚠️ IMPORTANT**: Response must contain **MASKED** Aadhaar, not raw Aadhaar number.  
Example of masked Aadhaar: `XXXX XXXX 1234` (not actual digits revealed)

---

### 9. **DRIVER STATISTICS** ✅

```bash
curl -X GET http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/statistics \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

---

### 10. **DRIVER EARNINGS** ✅

```bash
curl -X GET http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/earnings \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

---

### 11. **DRIVER DOCUMENTS** ✅

#### Get Documents
```bash
curl -X GET http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/documents \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`  
**Action**: Copy the document ID from the response

#### Approve Document
```bash
curl -X PATCH http://localhost:3000/api/admin/drivers/documents/{DOCUMENT_ID}/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Status**: `200`

#### Reject Document
```bash
curl -X PATCH http://localhost:3000/api/admin/drivers/documents/{DOCUMENT_ID}/reject \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Document is unclear and requires re-upload."
  }'
```

**Expected Status**: `200`

---

### 12. **WALLET** ✅

```bash
curl -X GET http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/wallet \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

**Expected Response Format**:
```json
{
  "balance": 0,
  "totalEarnings": 0,
  "totalWithdrawn": 0
}
```

---

### 13. **WALLET TRANSACTIONS** ✅

```bash
curl -X GET "http://localhost:3000/api/admin/drivers/cms8oo3ft0002wvtsdl8arkrw/wallet/transactions?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status**: `200`

**Valid Response (if no transactions)**:
```json
{
  "transactions": [],
  "total": 0
}
```

---

### 14. **DRIVER APPROVE** ⚠️

**Use a PENDING driver ID**

```bash
curl -X PATCH http://localhost:3000/api/admin/drivers/{PENDING_DRIVER_ID}/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Status**: `200`  
**Expected Status After**: `APPROVED`

---

### 15. **DRIVER REJECT** ⚠️

**Use a suitable driver ID**

```bash
curl -X PATCH http://localhost:3000/api/admin/drivers/{DRIVER_ID}/reject \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Driver documents do not meet verification requirements."
  }'
```

**Expected Status**: `200`  
**Expected Status After**: `REJECTED`

---

### 16. **DRIVER SUSPEND** ⚠️

**Use an APPROVED driver ID**

```bash
curl -X PATCH http://localhost:3000/api/admin/drivers/{APPROVED_DRIVER_ID}/suspend \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Driver temporarily suspended for policy review."
  }'
```

**Expected Status**: `200`  
**Expected Status After**: `SUSPENDED`

---

### 17. **DRIVER ACTIVATE** ✅

**Use the suspended driver ID from previous step**

```bash
curl -X PATCH http://localhost:3000/api/admin/drivers/{SUSPENDED_DRIVER_ID}/activate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Status**: `200`  
**Expected Status After**: `APPROVED`

---

## Negative Test Cases 🔴

### 1. Invalid Driver ID
```bash
curl -X GET http://localhost:3000/api/admin/drivers/invalid-driver-id \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Status**: `404`

### 2. Invalid Reason (too short)
```bash
curl -X PATCH http://localhost:3000/api/admin/drivers/{DRIVER_ID}/reject \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "x"}'
```
**Expected Status**: `400`

### 3. Missing Reason
```bash
curl -X PATCH http://localhost:3000/api/admin/drivers/{DRIVER_ID}/reject \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Expected Status**: `400`

### 4. Invalid Status Filter
```bash
curl -X GET "http://localhost:3000/api/admin/drivers?status=INVALID" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Status**: `400`

### 5. Invalid Pagination
```bash
curl -X GET "http://localhost:3000/api/admin/drivers?page=0&limit=999" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Status**: `400`

### 6. No Token
```bash
curl -X GET http://localhost:3000/api/admin/drivers
```
**Expected Status**: `401`

### 7. Wrong Permission
Requires an admin token without `driver:view` or `driver:manage` permissions.
```bash
curl -X GET http://localhost:3000/api/admin/drivers \
  -H "Authorization: Bearer $UNPRIVILEGED_TOKEN"
```
**Expected Status**: `403`

---

## Testing Checklist

- [ ] Test 1: Login - Get and save token
- [ ] Test 2: Driver List (all 5 variations)
- [ ] Test 3: Pending Drivers
- [ ] Test 4: Driver Details
- [ ] Test 5: Vehicle Information
- [ ] Test 6: Driver Trips
- [ ] Test 7: Driver Ratings
- [ ] Test 8: KYC (verify masked Aadhaar)
- [ ] Test 9: Statistics
- [ ] Test 10: Earnings
- [ ] Test 11: Documents (approve/reject)
- [ ] Test 12: Wallet
- [ ] Test 13: Wallet Transactions
- [ ] Test 14: Driver Approve
- [ ] Test 15: Driver Reject
- [ ] Test 16: Driver Suspend
- [ ] Test 17: Driver Activate
- [ ] Test 18: Negative Tests (all 7 cases)

---

## Environment Variables

Update `test-admin-drivers-api.js`:

```javascript
const BASE_URL = process.env.API_URL || "http://localhost:3000";
const ADMIN_EMAIL = "piyushmaurya222007@gmail.com";
const ADMIN_PASSWORD = "YOUR_ADMIN_PASSWORD"; // 👈 Change this
const VALID_DRIVER_ID = "cms8oo3ft0002wvtsdl8arkrw"; // 👈 Change this
```

Or set environment variable:
```bash
API_URL=http://localhost:3000 node test-admin-drivers-api.js
```

---

## Expected Test Results

All 18 test suites should return:
- ✅ Most endpoints: **200 OK**
- ⚠️ Invalid requests: **400 Bad Request**
- ⚠️ Missing token: **401 Unauthorized**
- ⚠️ Missing permission: **403 Forbidden**
- ⚠️ Not found: **404 Not Found**

**Success Rate Target**: **100%** (All tests passing)

---

## Troubleshooting

### Issue: "Invalid token"
- Make sure you copied the token correctly
- Check token hasn't expired
- Re-run login

### Issue: "Permission denied (403)"
- Verify admin account has `driver:view` and `driver:manage` permissions
- Check admin role configuration

### Issue: "Driver not found (404)"
- Verify driver ID is correct
- Use the valid driver ID provided

### Issue: "No pending drivers found"
- Create a new driver account to get a pending driver
- Or wait for driver registration to be tested

---

## Postman Collection Alternative

To convert to Postman:
1. Create new Postman collection
2. Add each endpoint as a request
3. Use environment variable `{{token}}` for authorization
4. Run collection as test suite

---

**Last Updated**: 2026-08-14
