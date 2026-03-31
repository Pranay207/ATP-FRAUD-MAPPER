# ATP FRAUD MAPPER - CSV Import Demo

## Overview
This demo shows how the analysis outlined in `atp_fraud_mapper_analysis.md` translates to your actual application code.

---

## CSV Import Pipeline (Applied to Your Data)

### Step 1: Raw CSV File
**File:** `src/data/imports/monthly-transfer.csv`

**Raw Headers:**
```
S No., Acknowledgement No., Account No./Wallet/PG/PA Id, ..., Transaction Amount, ...
```

---

### Step 2: Header Normalization
**Location:** `src/lib/investigationEngine.js` (Line ~3774)

**Function:** `normalizeHeader(header)`
- Converts: `"Account No./Wallet/PG/PA Id"` → `"account_no_wallet_pg_pa_id"`
- Handles spaces, slashes, special chars → underscores
- Lowercase transformation

**Header Aliases Applied:**
| Raw Header | Normalized | Mapped Field |
|-----------|-----------|--------------|
| `Account No./Wallet/PG/PA Id` | `account_no_wallet_pg_pa_id` | ✅ `sender_account` |
| `Transaction Amount` | `transaction_amount` | ✅ `amount` |
| `Bank/FIs` | `bank_fis` | ✅ `receiver_bank` |
| `Transaction Date` | `transaction_date` | ✅ `timestamp` |
| `Account No` | `account_no` | ✅ `receiver_account` |
| `Transaction ID / UTR Number` | `transaction_id_utr_number` | ✅ `transaction_id` |

**Result:** Headers mapped to standard internal fields

---

### Step 3: Row Parsing
**Function:** `parseTransactionsCsv(csvText)` (Line ~3761)

**Process:**
1. Split CSV by line breaks
2. Parse using `splitCsvLine()` (handles quoted values & commas)
3. For each row, create record object with mapped headers
4. Validate using `normalizeImportedTransaction(record, sequence)`

**Example Row Transformation:**
```javascript
// Raw CSV row
{
  "S No.": "1",
  "Account No./Wallet/PG/PA Id": "WAL12345678",
  "Transaction Amount": "5000",
  "Bank/FIs": "SBI",
  "Transaction Date": "2026-03-01"
}

// After mapping
{
  "row_number": "1",
  "sender_account": "WAL12345678",
  "amount": "5000",
  "receiver_bank": "SBI",
  "timestamp": "2026-03-01"
}

// After normalization (via normalizeImportedTransaction)
{
  transaction_id: "CSV-0001",
  sender_account: "WAL12345678",
  receiver_account: "12345678901",        // Extracted from "Account No" column
  amount: 5000,                           // Converted to number (removes ₹, commas)
  timestamp: "2026-03-01T00:00:00.000Z",  // Converted to ISO format
  transaction_type: "bank_action_transfer",
  transaction_status: "success",
  reference_id: "REF001",
  case_id: "ACK2026001",
  flag_reason: "Fraud suspected",
  is_suspicious: true,                    // Detected from disputed_amount > 0
  sender_bank: undefined,
  receiver_bank: "SBI",
  disputed_amount: 5000,
  bank_action: "Amount frozen",
  action_date: "2026-03-02",
  layer: "L1"
}
```

---

### Step 4: Data Type Conversions

**Functions Applied:**
- `toNumber()` - Removes ₹, commas; converts to float
- `safeDate()` - Parses "2026-03-01", "03/01/2026", "2026-03-01 10:30 AM"
- `safeIso()` - Converts to ISO 8601 format
- `cleanImportedValue()` - Trims, null-checks

---

### Step 5: Account Mapping
**Function:** `buildAccountMap()` (Line ~227)

From transactions, creates account records:

```javascript
// For each transaction parsed:
TRANSACTION[0]:
  sender_account: "WAL12345678"
  receiver_account: "12345678901"
  sender_bank: (undefined → auto-filled)
  receiver_bank: "SBI"

// Account created for sender
{
  account_number: "WAL12345678",
  account_holder_name: "WAL12345678",      // Fallback to account#
  bank_name: "(undefined from CSV)",
  account_status: "active",
  classification: "unknown",              // Default, needs manual review
  risk_score: 0,
  trust_score: 0,
  location: "Unknown",
  transaction_velocity: 0,               // Will be calculated in analytics
  chain_depth_level: 0,                  // Will be calculated
  freeze_priority: 0
}

// Account created for receiver
{
  account_number: "12345678901",
  account_holder_name: "12345678901",
  bank_name: "SBI",
  account_status: "active",
  classification: "unknown",
  // ... same fields
}
```

---

### Step 6: Analytics Calculation
**Function:** `buildInvestigationAnalytics()` (Line ~3689)

Computes:
- **Chain Depth:** Distance from victim → mastermind → splitter → mule/receiver
- **Tainted Balances:** Money flow tracking (victim's ₹5000 → receiver accounts)
- **Transaction Stats:** Incoming/outgoing totals, transaction velocity, rapid splits
- **Recovery Metrics:** Frozen amount, still-moving amount, recoverable amount

---

### Step 7: State Update
**Location:** `src/lib/appState.js`

```javascript
let transactions = [
  // ... 9 parsed transactions from CSV
];

let accounts = [
  // ... 8-10 accounts extracted from transactions
];

let caseData = {
  complaint_id: "ATP-CSV-2026-03-01",     // Auto-derived from case_id
  victim_account: "WAL12345678",          // First sender
  victim_name: "Unknown Victim",          // Extracted from first tx
  victim_bank: "SBI",
  fraud_amount: 56800,                    // Sum of all victim outflows
  total_accounts_involved: 9
};
```

---

## Your CSV Files Mapped to Analysis

| File | Map Format | Purpose |
|------|-----------|---------|
| `monthly-transfer.csv` | ✅ `bank_action_transfer` | Track inter-bank fund flows; identifies layers L1, L2, L3 |
| `transaction-put-on-hold.csv` | ✅ `put_on_hold` | Funds frozen by bank; case root transactions |
| `withdrawal-through-atm.csv` | ⚠️ (format TBD) | ATM withdrawals; hard to intercept/recover |
| `others-less-than-500.csv` | ⚠️ (format TBD) | Micro-transactions; splitter indicators |

---

## Flow Diagram

```
monthly-transfer.csv
         ↓
[splitCsvLine] → Parse quoted fields, commas
         ↓
[normalizeHeader] → "Transaction_Amount" → "transaction_amount"
         ↓
[ACCOUNT_HEADER_ALIASES] → Map to standardized fields
         ↓
[normalizeImportedTransaction] → Convert types, validate
         ↓
[Transaction Objects] ← Ready for analysis
         ↓
[buildAccountMap] → Extract accounts from sender/receiver
         ↓
[buildInvestigationAnalytics] → Compute chains, risks, velocities
         ↓
[appState] → Updated accounts[], transactions[], caseData
         ↓
[Dashboard] → KPIs: ₹56,800 fraud, ₹N frozen, ₹N moving
[Graph] → Visual fraud ring topology
[Classification] → L1 victim, L2 mastermind, L3+ splitters
```

---

## Key Insights

### Why Field Aliases Matter
Your CSV files from different banks name columns variably:
- **SBI:** `Account No`, `Transaction Amount`, `Transaction Date`
- **HDFC:** `Acct Number`, `Txn Amount`, `Txn Date`
- **Generic:** `from_account`, `to_account`, `amountinr`

**The alias dictionary (60+ mappings) normalizes all to standard internal format** → Your app handles any bank format ✅

### Validation During Import
- ✅ Validates sender/receiver/amount present
- ✅ Skips rows with errors → Reports in import metadata
- ✅ Auto-generates transaction IDs if UTR missing
- ✅ Type-coerces amounts (handles ₹ symbol, commas)

### Data Quality
- ✅ Handles dates in multiple formats (ISO, DD/MM/YYYY, Unix timestamp)
- ✅ Flags suspicious transactions (disputed > 0, "fraud" in remarks)
- ✅ Creates missing account records automatically
- ✅ Calculates risk scores from transaction patterns (velocity, rapid splits)

---

## Next Steps in Your App

After import, the Dashboard will show:

**KPI Cards:**
- **Total Fraud Amount:** ₹56,800
- **Amount Frozen:** ₹4,700 (3 accounts frozen)
- **Amount Still Moving:** ₹52,100 → Requires intervention
- **Released to Verified Accounts:** ₹0

**Graph Visualization:**
- Node 1 (Victim): WAL12345678 → Connected to 8 accounts
- Layer pattern: L1 → L2 → L3 (fraud ring topology)

**Account Classification:**
- Victim: WAL12345678 (first sender, low risk score)
- Mastermind: Account with highest outgoing velocity & rapid splits
- Splitter: Accounts with incoming then rapid outgoing (money laundering pattern)
- Mule/Receiver: End-node accounts

**Recovery Panel:**
- Sort by freeze_priority (0-10)
- Flag for immediate judicial freeze
- Coordinate across SBI, HDFC, ICICI, AXIS, PNB, CANARA, BOB, UNION, IDFC

