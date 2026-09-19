# Comprehensive Codebase & Architecture Audit Report
**Branch:** `feature/improvments`  
**Targets:** `ML Charity` (ASP.NET Core 8 Web API) & `ML Charity UI / charity-web` (React 18 + Vite)  
**Date:** September 19, 2026  

---

## Executive Summary & Threat Ranking Matrix

This audit encompasses deep code reviews of the backend API (`ML.Charity.API.Client`) and the frontend web application (`charity-web`), specifically targeting:
1. **Calculation Mistakes & Financial Inconsistencies**
2. **Security Vulnerabilities, Backdoors & Threat Vectors**
3. **Application Flow & Authorization Flaws**
4. **Performance Bottlenecks & Data Integrity Risks**

### Master Issue Ranking

| Rank | Issue ID | Title | Category | Severity | Component |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **01** | **SEC-01** | [Plaintext Production Azure Storage Account Key in Config](#sec-01-plaintext-production-azure-storage-account-key-in-repository) | Threat / Credential Leak | 🔴 Critical | Backend Config |
| **02** | **SEC-02** | [Static Hardcoded JWT Secret Key (Token Forgery)](#sec-02-hardcoded-static-jwt-secret-key-token-forgery) | Threat / Backdoor | 🔴 Critical | Backend Auth |
| **03** | **CALC-01** | [Double & Triple Counting of Ward Targets](#calc-01-double-and-triple-counting-of-ward-targets) | Calculation Bug | 🔴 Critical | Leaderboard / Analytics |
| **04** | **CALC-02** | [Historic Lifetime Kits Dumped into Today's Daily Chart](#calc-02-historic-lifetime-kits-dumped-into-todays-daily-chart) | Calculation Bug | 🟠 High | Frontend Metrics / Chart |
| **05** | **CALC-03** | [Sunday Calculation Shifts Weekly Range into Next Week](#calc-03-sunday-calculation-shifts-weekly-range-into-next-week) | Calculation Bug | 🟠 High | Frontend Date Logic |
| **06** | **SEC-03** | [Unauthenticated Ward Defacement / Renaming Endpoints](#sec-03-unauthenticated-ward-defacement-endpoints) | Threat / Integrity | 🟠 High | Backend Wards API |
| **07** | **SEC-04** | [Broken Object Level Authorization (BOLA) on Password Resets](#sec-04-broken-object-level-authorization-bola-on-password-resets) | Threat / Privilege | 🟠 High | Backend Users API |
| **08** | **SEC-05** | [Triple BCrypt Hashing on Login (CPU Exhaustion DoS)](#sec-05-triple-bcrypt-hashing-on-login-cpu-exhaustion-dos) | Threat / DoS | 🟠 High | Backend Auth |
| **09** | **SEC-06** | [Negative Financial Amount Injection in Sponsorships](#sec-06-negative-financial-amount-injection-in-sponsorship-bookings) | Threat / Logic | 🟠 High | Backend Sponsorships |
| **10** | **FLOW-01** | [Empty Ward Fallback Exposes All Other Wards' Donations](#flow-01-empty-ward-fallback-leaks-all-campaign-donations) | Flow / Privacy | 🟠 High | Frontend Ward Dashboard |
| **11** | **CALC-04** | [Client vs Server Kit Price Desynchronization](#calc-04-client-vs-server-kit-price-desynchronization) | Calculation / Logic | 🟡 Medium | Fullstack Pricing |
| **12** | **CALC-05** | [Zero Sponsorships Falsely Displays "100% Realization"](#calc-05-zero-sponsorships-displays-100-realization-rate) | Calculation Bug | 🟡 Medium | Frontend Dashboards |
| **13** | **CALC-06** | [Division by Zero Producing `Infinity` & `NaN` in Progress Bars](#calc-06-division-by-zero-producing-infinity-and-nan-in-progress-bar) | Calculation Bug | 🟡 Medium | Frontend Progress UI |
| **14** | **CALC-07** | [Omission of Ward 0 Donations Undercounts Campaign Totals](#calc-07-omission-of-ward-0-donations-undercounts-campaign-totals) | Calculation Bug | 🟡 Medium | Backend Leaderboards |
| **15** | **CALC-08** | [Admin Overview Banner Completely Excludes Sponsorships](#calc-08-admin-overview-banner-completely-excludes-sponsorships) | Calculation Bug | 🟡 Medium | Fullstack Analytics |
| **16** | **CALC-09** | [Double Precision Rounding & Floating-Point Drift](#calc-09-floating-point-drift-and-item-subtotal-rounding-errors) | Calculation Bug | 🟡 Medium | Fullstack Financials |
| **17** | **PERF-01** | [Full Table Scans on Azure Table Storage](#perf-01-full-table-scans-on-azure-table-storage) | Bottleneck | 🟡 Medium | Backend Performance |
| **18** | **FLOW-02** | [Data Loss Race Condition during User Partition Updates](#flow-02-data-loss-race-condition-during-user-partition-updates) | Flow / Integrity | 🟡 Medium | Backend Users API |
| **19** | **FLOW-03** | [Stale JWT Claim Overwrites Fresh Ward from Database](#flow-03-stale-jwt-claim-overwrites-fresh-database-ward-number) | Flow / State | 🟡 Medium | Backend Donations API |
| **20** | **FLOW-04** | [Hardcoded Default Fallback to Ward 4](#flow-04-hardcoded-default-fallback-to-ward-4) | Flow / Logic | 🟡 Medium | Frontend User State |
| **21** | **FLOW-05** | [Unauthenticated Visitors Blocked from Public Home Page](#flow-05-unauthenticated-public-visitors-blocked-from-homescreen) | Flow / UX | 🔵 Low | Frontend Routing |
| **22** | **FLOW-06** | [43KB Dead Code in `AdminPanel.tsx`](#flow-06-43kb-unreferenced-dead-code-in-adminpaneltsx) | Code Debt | 🔵 Low | Frontend Cleanup |

---

## 1. Deep Dive: Calculation Mistakes & Mathematical Errors

---

### CALC-01: Double and Triple Counting of Ward Targets
- **Severity**: 🔴 Critical
- **File**: [`ML.Charity.API.Client/Controllers/LeaderboardsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/LeaderboardsController.cs#L72-L76)
- **Lines**: 72–76
- **Vulnerable Code**:
  ```csharp
  var wardTargets = allUsers
      .Where(u => u.WardNumber > 0)
      .GroupBy(u => u.WardNumber)
      .ToDictionary(g => g.Key, g => g.Sum(u => u.TargetKits));
  ```
- **Root Cause & Impact**:
  In each ward, organizational hierarchy includes:
  - 1 Ward Committee Lead (whose target, e.g. 500 kits, represents the target for the whole ward)
  - Field Coordinators (whose targets, e.g. 250 kits, subdivide that same goal)
  - Volunteers (whose targets, e.g. 50 kits, subdivide the coordinator goal)
  By executing `g.Sum(u => u.TargetKits)`, the backend sums the Ward Lead target + all Coordinator targets + all Volunteer targets together:
  $$\text{Ward Target} = 500 + (2 \times 250) + (10 \times 50) = 1,500\text{ kits}$$
  The ward's actual target of 500 kits is multiplied by 300%, severely depressing the ward's calculated completion percentage and misleading administrators.
- **Remediation**:
  Only take the Ward Committee Lead's target for that ward, or fall back to summing only top-level coordinators in wards without a lead:
  ```csharp
  var wardTargets = allUsers
      .Where(u => u.WardNumber > 0)
      .GroupBy(u => u.WardNumber)
      .ToDictionary(
          g => g.Key, 
          g => g.FirstOrDefault(u => u.Role == "WardCommittee")?.TargetKits 
               ?? g.Where(u => u.Role == "Coordinator").Sum(u => u.TargetKits)
      );
  ```

---

### CALC-02: Historic Lifetime Kits Dumped into Today's Daily Chart
- **Severity**: 🟠 High
- **Files**: 
  - [`charity-web/src/services/api.ts`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/services/api.ts#L372-L378)
  - [`charity-web/src/components/DailyCollectionsChart.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/components/DailyCollectionsChart.tsx#L62-L82)
- **Vulnerable Code (`api.ts`)**:
  ```ts
  const currentDayName = days[today.getDay()];
  const sumRecordedKits = Object.values(dayCounts).reduce((s, x) => s + x.kits, 0);
  if (totalKits > sumRecordedKits && dayCounts[currentDayName]) {
    dayCounts[currentDayName].kits += (totalKits - sumRecordedKits);
    dayCounts[currentDayName].amount += (totalAmount - Object.values(dayCounts).reduce((s, x) => s + x.amount, 0));
  }
  ```
- **Root Cause & Impact**:
  1. `totalKits` is the **campaign-wide lifetime total kits** (e.g. 5,000 kits collected over 2 months).
  2. For non-admin users, `liveDonations` only loads personal donations (e.g. 10 kits).
  3. The code calculates the discrepancy: $5,000 - 10 = 4,990$ kits, and dumps all 4,990 kits into **today's bar** (`dayCounts[currentDayName]`).
  4. In addition, [`DailyCollectionsChart.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/components/DailyCollectionsChart.tsx#L62-L73) groups donations by `getDay()` without checking calendar week boundaries. Historical donations made on any past Monday are all aggregated into the current week's Monday bar.
- **Remediation**:
  1. Remove the synthetic kit dumping logic entirely.
  2. Filter `donations` against the actual calendar dates: `new Date(d.timestamp) >= startOfWeek && new Date(d.timestamp) <= endOfWeek`.

---

### CALC-03: Sunday Calculation Shifts Weekly Range into Next Week
- **Severity**: 🟠 High
- **File**: [`charity-web/src/services/api.ts`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/services/api.ts#L313-L317)
- **Vulnerable Code**:
  ```ts
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  ```
- **Root Cause & Impact**:
  In standard JavaScript `Date`, `today.getDay()` returns `0` on Sunday:
  $$\text{setDate}(\text{today.getDate}() - 0 + 1) = \text{today.getDate}() + 1$$
  On every Sunday, `startOfWeek` is set to **tomorrow (next week's Monday)**! The entire weekly metrics date window slides 7 days into the future, and all donations made during the current week disappear from the weekly metrics.
- **Remediation**:
  Adjust for Sunday being the 7th day of the week in ISO-8601:
  ```ts
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(today.getDate() + diffToMonday);
  ```

---

### CALC-04: Client vs Server Kit Price Desynchronization
- **Severity**: 🟡 Medium
- **Files**:
  - [`charity-web/src/services/api.ts`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/services/api.ts#L99-L120)
  - [`charity-web/src/components/DonationForm.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/components/DonationForm.tsx#L35)
  - [`ML.Charity.API.Client/Controllers/DonationsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/DonationsController.cs#L21-L198)
- **Root Cause & Impact**:
  - The frontend stores the Admin-configured Kit Price exclusively in the local browser's `localStorage['charity_kit_price']`.
  - The backend hardcodes `private const double PRICE_PER_KIT = 1000.0;` and explicitly overrides any client total with `double calculatedAmount = request.KitCount * PRICE_PER_KIT;`.
  If an administrator updates the kit price to ₹1,200 on the dashboard, the backend will still calculate, save, and issue receipts for ₹1,000 per kit, creating financial discrepancy between UI screens and database ledgers.
- **Remediation**:
  Store the campaign kit price in Azure Table Storage / Configuration and provide a `GET /api/Config/kit-price` endpoint so all clients and server logic stay synchronized.

---

### CALC-05: Zero Sponsorships Displays "100% Realization Rate"
- **Severity**: 🟡 Medium
- **Files**:
  - [`charity-web/src/pages/WardCoordinatorDashboard.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/pages/WardCoordinatorDashboard.tsx#L62)
  - [`charity-web/src/pages/CoordinatorDashboard.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/pages/CoordinatorDashboard.tsx#L59)
- **Vulnerable Code**:
  ```ts
  const realizationPct = totalCommitted > 0 ? Math.min(100, Math.round((totalPaid / totalCommitted) * 100)) : 100;
  ```
- **Root Cause & Impact**:
  When a ward or coordinator has zero sponsorships (`totalCommitted === 0`), the ternary operator falls back to `100`. The UI displays "100% Realization Rate" on accounts that have not collected a single rupee.
- **Remediation**:
  Change fallback to `0`:
  ```ts
  const realizationPct = totalCommitted > 0 ? Math.min(100, Math.round((totalPaid / totalCommitted) * 100)) : 0;
  ```

---

### CALC-06: Division by Zero Producing `Infinity` and `NaN` in Progress Bar
- **Severity**: 🟡 Medium
- **File**: [`charity-web/src/pages/HomeScreen.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/pages/HomeScreen.tsx#L143-L144)
- **Vulnerable Code**:
  ```ts
  const progressPercentage = metrics
    ? Math.min(100, Math.round((metrics.totalKits / metrics.targetKits) * 1000) / 10)
    : 0;
  ```
- **Root Cause & Impact**:
  When `targetKits === 0`, `metrics.totalKits / 0` evaluates to `Infinity`. `Math.min(100, Infinity)` returns `100%`. If `totalKits` is also 0, $0 / 0$ produces `NaN`. In the JSX: `<div style={{ width: `${progressPercentage}%` }} />` renders `width: NaN%`, breaking the CSS layout.
- **Remediation**:
  ```ts
  const progressPercentage = metrics && metrics.targetKits > 0
    ? Math.min(100, Math.round((metrics.totalKits / metrics.targetKits) * 1000) / 10)
    : 0;
  ```

---

### CALC-07: Omission of Ward 0 Donations Undercounts Campaign Totals
- **Severity**: 🟡 Medium
- **Files**:
  - [`ML.Charity.API.Client/Controllers/LeaderboardsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/LeaderboardsController.cs#L88-L90)
  - [`charity-web/src/services/api.ts`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/services/api.ts#L329-L332)
- **Root Cause & Impact**:
  `LeaderboardsController.cs` groups ward totals with `.Where(x => x.WardNumber > 0)`. Donations collected at large, by Admins, NRI contributors, or users without a ward assignment are recorded with `WardNumber == 0`. Because `api.ts` derives total campaign kits from `topWards`, all non-ward donations are omitted from the campaign total.
- **Remediation**:
  Calculate `totalKits` directly from the donation repository or add an "Other / General" category for `WardNumber == 0`.

---

### CALC-08: Admin Overview Banner Completely Excludes Sponsorships
- **Severity**: 🟡 Medium
- **Files**:
  - [`charity-web/src/pages/AdminDashboard.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/pages/AdminDashboard.tsx#L364-L396)
  - [`ML.Charity.API.Client/Controllers/AnalyticsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/AnalyticsController.cs#L53-L66)
- **Root Cause & Impact**:
  The Admin Dashboard displays an "Overall Campaign Collections" banner showing Total Kits and Total Funds Raised. This value is sourced from `AnalyticsController.GetMyProgress` for `role == "Admin"`, which only queries `_donationRepository`. It does not factor in `_sponsorshipRepository`. Millions of rupees from corporate sponsorships are completely omitted from the administrative overview banner.
- **Remediation**:
  Aggregate both `_donationRepository` and `_sponsorshipRepository` into `GetMyProgress`.

---

### CALC-09: Floating-Point Drift and Item Subtotal Rounding Errors
- **Severity**: 🟡 Medium
- **Files**:
  - [`ML.Charity.API.Client/Models/SponsorshipEntity.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Models/SponsorshipEntity.cs#L33-L41)
  - [`charity-web/src/components/SponsoredItemsSummaryView.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/components/SponsoredItemsSummaryView.tsx#L86-L88)
- **Root Cause & Impact**:
  Financial fields use IEEE 754 floating-point `double` instead of `decimal`. In `SponsoredItemsSummaryView.tsx`, item payments are derived via:
  ```ts
  const ratio = s.totalAmount > 0 ? (subtotal / s.totalAmount) : (1 / rawItems.length);
  const paidPart = Math.round(s.amountPaid * ratio);
  ```
  Independently applying `Math.round` to each item's paid proportion creates cumulative rounding discrepancies where the sum of `paidPart` does not equal `amountPaid`.
- **Remediation**:
  Use `decimal` for all currency representations in C# and calculate the remainder on the final item in the loop.

---

## 2. Deep Dive: Security Threats, Backdoors & Authorization Flaws

---

### SEC-01: Plaintext Production Azure Storage Account Key in Repository
- **Severity**: 🔴 Critical
- **File**: [`ML.Charity.API.Client/appsettings.json`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/appsettings.json#L5)
- **Threat Vector**:
  ```json
  "AzureTableStorage": "DefaultEndpointsProtocol=https;AccountName=ibadastorage;AccountKey=MgUEt9WOCiYMcGscYiZQj/mYtUXJXmEINBuz1BHuC1JI6SeA4R7Ejk/cBdZHeJURG5Oa78031DgE+ASt8caeXg==;EndpointSuffix=core.windows.net"
  ```
  A live master storage account key is committed in plaintext. Anyone with repository access or reading git history has full administrative control over all application tables (`Donations`, `Users`, `Sponsorships`, `Wards`), enabling unauthorized data exfiltration, tampering, or total data wiping.
- **Remediation**:
  1. Immediately regenerate the storage access key in the Azure Portal.
  2. Move the connection string to Azure App Service Configuration / Azure Key Vault and exclude local keys using `.gitignore` or `dotnet user-secrets`.

---

### SEC-02: Hardcoded Static JWT Secret Key (Token Forgery)
- **Severity**: 🔴 Critical
- **File**: [`ML.Charity.API.Client/appsettings.json`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/appsettings.json#L8)
- **Threat Vector**:
  ```json
  "Key": "ThisIsAVerySecureSecretKeyForMadavoorCharityApp!"
  ```
  Because this HMAC-SHA256 signing secret is public knowledge in the repository, any attacker can generate and sign their own JWT token with claims:
  ```json
  { "sub": "admin", "role": "Admin", "UserId": "hacked-admin" }
  ```
  The API will accept this forged token as a legitimate Super Admin, granting complete access to modify users, targets, and donations.
- **Remediation**:
  Store the JWT secret key in secure environment variables, and use a high-entropy 256-bit cryptographic key.

---

### SEC-03: Unauthenticated Ward Defacement Endpoints
- **Severity**: 🟠 High
- **File**: [`ML.Charity.API.Client/Controllers/WardsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/WardsController.cs#L104-L144)
- **Threat Vector**:
  ```csharp
  [HttpPut("{wardNumber}")]
  [AllowAnonymous]
  public async Task<IActionResult> UpdateWardName(int wardNumber, [FromBody] UpdateWardNameDto dto)
  ```
  and `[HttpPost("seed-names")] [AllowAnonymous]`.
  Any unauthenticated client can invoke `PUT /api/Wards/{wardNumber}` and rename any ward to abusive or defamatory strings, defacing the leaderboard for all users.
- **Remediation**:
  Add `[Authorize(Roles = "Admin")]` to both endpoints.

---

### SEC-04: Broken Object Level Authorization (BOLA) on Password Resets
- **Severity**: 🟠 High
- **File**: [`ML.Charity.API.Client/Controllers/UsersController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/UsersController.cs#L334-L345)
- **Threat Vector**:
  ```csharp
  if (callerRole != null && (callerRole.Equals("Coordinator", StringComparison.OrdinalIgnoreCase) || callerRole.Equals("WardCommittee", StringComparison.OrdinalIgnoreCase)))
  {
      if (!string.Equals(user.Role, "Volunteer", StringComparison.OrdinalIgnoreCase))
      {
          return Forbid("You are only permitted to change or reset passwords for Volunteers.");
      }
  }
  ```
  The endpoint verifies that the target account is a `Volunteer`, but **never checks whether that volunteer belongs to the caller's team or ward**. A coordinator in Ward 1 can reset the password of any volunteer in Ward 2, 3, or 12 and take over their account.
- **Remediation**:
  Enforce tenancy:
  ```csharp
  if (callerRole == "Coordinator" && user.ParentUserId != callerId)
      return Forbid("You can only reset passwords for volunteers in your direct team.");
  if (callerRole == "WardCommittee" && user.WardNumber != callerWard)
      return Forbid("You can only reset passwords for volunteers in your assigned ward.");
  ```

---

### SEC-05: Triple BCrypt Hashing on Login (CPU Exhaustion DoS)
- **Severity**: 🟠 High
- **File**: [`ML.Charity.API.Client/Controllers/AuthController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/AuthController.cs#L35-L37)
- **Threat Vector**:
  ```csharp
  bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)
                      || BCrypt.Net.BCrypt.Verify(request.Password.ToLower(), user.PasswordHash)
                      || BCrypt.Net.BCrypt.Verify(request.Password.ToUpper(), user.PasswordHash);
  ```
  BCrypt hash verification is deliberately computationally intensive (~100–300ms per attempt). Calling it three times sequentially on an unauthenticated endpoint allows an attacker to easily exhaust the server's CPU threads by sending concurrent invalid login requests. Moreover, forcing case-insensitivity degrades password entropy.
- **Remediation**:
  Use standard single-pass case-sensitive verification:
  ```csharp
  bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
  ```

---

### SEC-06: Negative Financial Amount Injection in Sponsorship Bookings
- **Severity**: 🟠 High
- **File**: [`ML.Charity.API.Client/Controllers/SponsorshipsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/SponsorshipsController.cs#L316-L325)
- **Threat Vector**:
  ```csharp
  case "Book":
      amountPaid = request.InitialAmountPaid ?? 0.0;
      if (amountPaid > totalAmount) ...
      balanceAmount = totalAmount - amountPaid;
  ```
  `amountPaid` is validated only for upper bound (`amountPaid > totalAmount`), never for lower bound (`amountPaid < 0`). An attacker passing `-10000` causes `balanceAmount` to become $\text{totalAmount} - (-10000) = \text{totalAmount} + 10000$, injecting corrupted balance data into the system.
- **Remediation**:
  Add validation: `if (amountPaid < 0) return BadRequest("Payment amount cannot be negative.");`.

---

## 3. Deep Dive: Application Flow & Logic Flaws

---

### FLOW-01: Empty Ward Fallback Exposes All Other Wards' Donations
- **Severity**: 🟠 High
- **File**: [`charity-web/src/pages/WardCoordinatorDashboard.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/pages/WardCoordinatorDashboard.tsx#L166-L167)
- **Lines**: 166–167 and 215–216
- **Vulnerable Code**:
  ```ts
  const wardTx = user.wardNumber ? donations.filter(d => Number(d.wardNumber) === Number(user.wardNumber)) : donations;
  setWardDonations(wardTx.length > 0 ? wardTx : donations);
  ```
- **Root Cause & Impact**:
  If a ward has not yet logged any donations (`wardTx.length === 0`), the ternary operator falls back to `donations` (the full list of all donations fetched). A newly registered ward coordinator sees donor names, contact numbers, and donation amounts from every other ward in the panchayath.
- **Remediation**:
  Remove the fallback: `setWardDonations(wardTx);`.

---

### FLOW-02: Data Loss Race Condition during User Partition Updates
- **Severity**: 🟡 Medium
- **File**: [`ML.Charity.API.Client/Controllers/UsersController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/UsersController.cs#L297-L298)
- **Vulnerable Code**:
  ```csharp
  await _userRepository.DeleteAsync(oldPartition, oldRowKey);
  await _userRepository.AddAsync(user);
  ```
- **Root Cause & Impact**:
  In Azure Table Storage, `PartitionKey` and `RowKey` cannot be mutated. Changing a user's phone number or panchayath requires deleting the old record and creating a new one. If `DeleteAsync` succeeds but `AddAsync` fails (e.g. transient network glitch, validation failure, duplicate key conflict), the user record is permanently destroyed with no rollback.
- **Remediation**:
  Execute `AddAsync` first. Only once `AddAsync` succeeds should `DeleteAsync` be called.

---

### FLOW-03: Stale JWT Claim Overwrites Fresh Database Ward Number
- **Severity**: 🟡 Medium
- **File**: [`ML.Charity.API.Client/Controllers/DonationsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/DonationsController.cs#L58-L64)
- **Vulnerable Code**:
  ```csharp
  callerWard = currentUser?.WardNumber ?? 0;
  if (!string.IsNullOrEmpty(wardString) && int.TryParse(wardString, out int parsedWard))
  {
      callerWard = parsedWard;
  }
  ```
- **Root Cause & Impact**:
  If an administrator updates a coordinator's ward assignment in the database, the backend queries the database and fetches the fresh `currentUser.WardNumber`, but then immediately overwrites it with `parsedWard` from the stale JWT claim until the user's token expires.
- **Remediation**:
  Prioritize the fresh database entity value over the token claim.

---

### FLOW-04: Hardcoded Default Fallback to Ward 4
- **Severity**: 🟡 Medium
- **Files**:
  - [`charity-web/src/services/api.ts`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/services/api.ts#L272)
  - [`charity-web/src/pages/WardCoordinatorDashboard.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/pages/WardCoordinatorDashboard.tsx#L247)
  - [`charity-web/src/pages/CoordinatorDashboard.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/pages/CoordinatorDashboard.tsx#L80)
- **Root Cause & Impact**:
  Whenever `wardNumber` is undefined or 0, multiple files default to `4`: `wardNumber: user.wardNumber || 4`. Any volunteer or donation without an explicit ward assignment gets assigned to Ward 4 ("Nariyachal"), skewing leaderboard accuracy.
- **Remediation**:
  Default to `0` or force explicit ward selection in forms.

---

### FLOW-05: Unauthenticated Visitors Blocked from HomeScreen
- **Severity**: 🔵 Low
- **File**: [`charity-web/src/App.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/App.tsx#L89-L199)
- **Root Cause & Impact**:
  In `App.tsx`, if `currentUser` is null, the app conditionally renders `<AuthScreen />` directly unless visiting `/poster`. General public visitors cannot see the public campaign page (`HomeScreen.tsx`), the verified public leaderboard, or the campaign metrics without logging in.
- **Remediation**:
  Render `HomeScreen.tsx` by default for unauthenticated users, with a "Login" button in the header.

---

### FLOW-06: 43KB Unreferenced Dead Code in `AdminPanel.tsx`
- **Severity**: 🔵 Low
- **File**: [`charity-web/src/pages/AdminPanel.tsx`](file:///d:/Nizar/ML%20Charity%20UI/charity-web/src/pages/AdminPanel.tsx)
- **Root Cause & Impact**:
  `AdminPanel.tsx` is an older redundant version of `AdminDashboard.tsx`. It is never imported in `App.tsx` or any other module, introducing 43KB of dead code bloat and developer confusion during maintenance.
- **Remediation**:
  Safely delete `AdminPanel.tsx`.

---

## 4. Deep Dive: Performance Bottlenecks

---

### PERF-01: Full Table Scans on Azure Table Storage
- **Severity**: 🟡 Medium
- **Files**:
  - [`AnalyticsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/AnalyticsController.cs#L55-L90): `QueryAsync(d => d.TotalAmount > 0)`, `QueryAsync(d => d.WardNumber == ward)`
  - [`DonationsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/DonationsController.cs#L66): `QueryEntitiesAsync(null)`
  - [`LeaderboardsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/LeaderboardsController.cs#L29-L30): `QueryEntitiesAsync(null)`
  - [`SponsorshipsController.cs`](file:///d:/Nizar/ML%20Charity/ML.Charity.API.Client/Controllers/SponsorshipsController.cs#L657): `QueryEntitiesAsync(null)`
- **Root Cause & Impact**:
  Azure Table Storage partitions data using `PartitionKey`. When queries omit the `PartitionKey` or pass `null` filters, Azure Storage performs an exhaustive partition scan across the entire storage table. As donations and users scale into thousands of records, API request latency will spike from 50ms to 3,000ms+, and Azure Table Storage billing operations will multiply rapidly.
- **Remediation**:
  1. Provide the `PartitionKey` (e.g. `PartitionKey eq 'Madavoor'`) on queries.
  2. Implement an in-memory cache (`IMemoryCache`) with a 60-second sliding expiration for leaderboard and campaign-wide aggregates.

---

## Recommended Remediation Roadmap

### Phase 1: Security & Credential Hardening (Immediate)
1. **Rotate Azure Storage Account Keys** and migrate to Azure App Service Environment Variables.
2. **Move JWT Secret Key** to environment variables and remove the static fallback.
3. **Lock Down Wards Controller**: Add `[Authorize(Roles = "Admin")]` to `UpdateWardName` and `SeedWardNames`.
4. **Fix Password Reset Authorization (BOLA)**: Restrict coordinators and ward leads to their own subordinates.
5. **Normalize BCrypt Login**: Revert triple BCrypt to single case-sensitive verification.
6. **Sanitize Sponsorship Amounts**: Reject negative booking values.

### Phase 2: Calculation & Financial Accuracy
1. **Fix Ward Target Sums**: In `LeaderboardsController`, count ward targets by Ward Committee Leads only.
2. **Fix Daily Metrics Chart**: Remove synthetic lifetime kit dumping in `api.ts` and restrict chart to current calendar week.
3. **Fix Sunday Calculation**: Use ISO-8601 day-of-week offset.
4. **Fix Realization Rate**: Default to 0% when `totalCommitted === 0`.
5. **Harmonize Kit Price**: Fetch unit price dynamically from server configuration.

### Phase 3: Application Flow & Data Integrity
1. **Eliminate Empty Ward Data Leak**: In `WardCoordinatorDashboard.tsx`, remove fallback to global donations.
2. **Prevent Account Deletion Race Condition**: In `UsersController.UpdateUser`, insert new record before deleting old partition.
3. **Remove Hardcoded Ward 4 Fallbacks**: Treat unassigned wards cleanly as `0` or require selection.
4. **Delete Dead Code**: Remove unreferenced `AdminPanel.tsx`.
