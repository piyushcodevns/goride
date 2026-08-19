# Admin Driver API - Quick Reference Checklist

## Setup
- [ ] Update `test-admin-drivers-api.js` with:
  - Admin email: `piyushmaurya222007@gmail.com`
  - Admin password: `YOUR_ADMIN_PASSWORD`
  - Valid driver ID: `cms8oo3ft0002wvtsdl8arkrw`
- [ ] Start API server on `http://localhost:3000`
- [ ] Run: `node test-admin-drivers-api.js`

---

## Test Results Expected

### ✅ GET Endpoints (Should return 200)
| Endpoint | Description |
|----------|-------------|
| `/api/admin/drivers` | All drivers |
| `/api/admin/drivers?page=1&limit=10` | With pagination |
| `/api/admin/drivers?search=test` | Search |
| `/api/admin/drivers?status=PENDING` | Filter by status |
| `/api/admin/drivers?status=APPROVED` | Filter by status |
| `/api/admin/drivers?status=REJECTED` | Filter by status |
| `/api/admin/drivers?status=SUSPENDED` | Filter by status |
| `/api/admin/drivers?availability=OFFLINE` | Filter by availability |
| `/api/admin/drivers?sortBy=averageRating&sortOrder=desc` | Sort |
| `/api/admin/drivers?sortBy=experience&sortOrder=desc` | Sort |
| `/api/admin/drivers?sortBy=totalRatings&sortOrder=desc` | Sort |
| `/api/admin/drivers?sortBy=createdAt&sortOrder=desc` | Sort |
| `/api/admin/drivers?sortBy=updatedAt&sortOrder=desc` | Sort |
| `/api/admin/drivers/pending` | Pending drivers |
| `/api/admin/drivers/{id}` | Driver details |
| `/api/admin/drivers/{id}/vehicle` | Vehicle info |
| `/api/admin/drivers/{id}/trips` | Driver trips |
| `/api/admin/drivers/{id}/ratings` | Driver ratings |
| `/api/admin/drivers/{id}/kyc` | KYC (masked Aadhaar ⚠️) |
| `/api/admin/drivers/{id}/statistics` | Statistics |
| `/api/admin/drivers/{id}/earnings` | Earnings |
| `/api/admin/drivers/{id}/documents` | Documents |
| `/api/admin/drivers/{id}/wallet` | Wallet |
| `/api/admin/drivers/{id}/wallet/transactions` | Wallet transactions |

### ⚠️ PATCH Endpoints (Status Changes)
| Endpoint | Body | Expected Status |
|----------|------|-----------------|
| `/api/admin/drivers/{id}/approve` | `{}` | `200` |
| `/api/admin/drivers/{id}/reject` | `{"reason": "..."}` | `200` |
| `/api/admin/drivers/{id}/suspend` | `{"reason": "..."}` | `200` |
| `/api/admin/drivers/{id}/activate` | `{}` | `200` |
| `/api/admin/drivers/documents/{id}/approve` | `{}` | `200` |
| `/api/admin/drivers/documents/{id}/reject` | `{"reason": "..."}` | `200` |

### ❌ Negative Tests (Should fail)
| Test | Expected Status |
|------|-----------------|
| Invalid driver ID: `/api/admin/drivers/invalid-id` | `404` |
| Invalid reason (too short) | `400` |
| Missing reason | `400` |
| Invalid status filter | `400` |
| Invalid pagination | `400` |
| No authorization token | `401` |
| Wrong permission | `403` |

---

## Critical Validations

### KYC Response ⚠️
- [ ] Aadhaar must be MASKED (e.g., `XXXX XXXX 1234`)
- [ ] Raw Aadhaar should never appear in response

### Wallet Response ⚠️
- [ ] Must include: `balance`, `totalEarnings`, `totalWithdrawn`
- [ ] All fields should be numeric

### Wallet Transactions ⚠️
- [ ] Empty response is valid: `{"transactions": [], "total": 0}`
- [ ] Must include pagination info

### Status Transitions ⚠️
- [ ] PENDING → APPROVED ✅
- [ ] PENDING → REJECTED ✅
- [ ] APPROVED → SUSPENDED ✅
- [ ] SUSPENDED → APPROVED (via activate) ✅

---

## Test Summary Template

```
Total Tests: 18
Passed: ___ / ___
Failed: ___ / ___
Success Rate: ___%

Failed Tests (if any):
- 
- 

KYC Aadhaar Masking: ✅ / ❌
Wallet Fields Present: ✅ / ❌
Auth Token Validation: ✅ / ❌
Permission Validation: ✅ / ❌
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| 401 Unauthorized | Re-run login, check token |
| 403 Forbidden | Admin missing driver permissions |
| 404 Not Found | Driver ID doesn't exist |
| 400 Bad Request | Invalid pagination/status/reason |
| Aadhaar not masked | Fix KYC masking in controller |

---

## Files Created

1. **`test-admin-drivers-api.js`** - Automated test suite (run with `node`)
2. **`API-TESTING-GUIDE.md`** - Detailed testing guide with cURL examples
3. **`QUICK-REFERENCE.md`** - This file

---

**Ready to test? Run:** `node test-admin-drivers-api.js`
